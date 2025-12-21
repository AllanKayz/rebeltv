
document.addEventListener('DOMContentLoaded', () => {
    const loadingOverlay = document.getElementById('loading-overlay');
    const videoPlayer = document.getElementById('video-player');
    const channelList = document.getElementById('channel-list');
    const searchInput = document.getElementById('search-channels');
    const newStreamUrlInput = document.getElementById('new-stream-url');
    const addStreamBtn = document.getElementById('add-stream-btn');
    const epgModal = document.getElementById('epg-modal');
    const epgChannelName = document.getElementById('epg-channel-name');
    const epgGuide = document.getElementById('epg-guide');
    const closeEpgModal = document.getElementById('close-epg-modal');
    const nowPlayingTitle = document.getElementById('now-playing-title');
    const nowPlayingDescription = document.getElementById('now-playing-description');
    const nowPlayingLogo = document.getElementById('now-playing-logo');
    const menuToggle = document.getElementById('menu-toggle');
    const sidebar = document.getElementById('sidebar');
    const sidebarOverlay = document.getElementById('sidebar-overlay');

    let hls;
    let allChannels = [];
    let filteredChannels = [];
    let currentChannelIndex = 0;
    const channelsPerBatch = 50;

    const fetchJSON = async (url) => {
        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            return await response.json();
        } catch (error) {
            console.error(`Failed to fetch ${url}:`, error);
            return [];
        }
    };

    const playChannel = (channel) => {
        if (hls) {
            hls.destroy();
        }
        hls = new Hls();
        hls.loadSource(channel.url);
        hls.attachMedia(videoPlayer);
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
            videoPlayer.play().catch(e => console.error("Autoplay was prevented:", e));
        });
        hls.on(Hls.Events.ERROR, (event, data) => {
            if (data.fatal) {
                switch(data.type) {
                    case Hls.ErrorTypes.NETWORK_ERROR:
                        console.error('Fatal network error encountered, trying to recover...');
                        hls.startLoad();
                        break;
                    case Hls.ErrorTypes.MEDIA_ERROR:
                        console.error('Fatal media error encountered, trying to recover...');
                        hls.recoverMediaError();
                        break;
                    default:
                        console.error('An unrecoverable error occurred', data);
                        hls.destroy();
                        break;
                }
            }
        });

        nowPlayingTitle.textContent = channel.name;
        nowPlayingDescription.textContent = `Currently playing ${channel.name}. Enjoy the stream!`;
        nowPlayingLogo.src = channel.logo || 'placeholder.png';
        nowPlayingLogo.onerror = () => { nowPlayingLogo.src = 'placeholder.png'; };
        
        document.querySelectorAll('.channel-card.active-channel').forEach(c => c.classList.remove('active-channel'));
        const activeCard = channelList.querySelector(`[data-channel-id='${channel.id}']`);
        if (activeCard) {
            activeCard.classList.add('active-channel');
        }

        if (window.innerWidth < 768) {
            sidebar.classList.add('-translate-x-full');
            sidebarOverlay.classList.add('hidden');
        }
    };

    const renderChannel = (channel) => {
        const channelCard = document.createElement('div');
        channelCard.className = 'channel-card p-3 rounded-lg flex items-center space-x-3 cursor-pointer border-2 border-transparent';
        channelCard.dataset.channelId = channel.id;
        channelCard.innerHTML = `
            <img data-src="${channel.logo || 'placeholder.png'}" alt="${channel.name} Logo" class="lazy w-12 h-12 rounded-md bg-gray-700/50">
            <span class="font-semibold truncate">${channel.name}</span>
        `;
        channelCard.addEventListener('click', () => playChannel(channel));
        return channelCard;
    };
    
    const renderChannels = (channels, append = false) => {
        if (!append) {
            channelList.innerHTML = '';
        }
        const fragment = document.createDocumentFragment();
        channels.forEach(channel => {
            fragment.appendChild(renderChannel(channel));
        });
        channelList.appendChild(fragment);
        lazyLoadImages();
    };

    const loadMoreChannels = () => {
        const nextBatch = filteredChannels.slice(currentChannelIndex, currentChannelIndex + channelsPerBatch);
        renderChannels(nextBatch, true);
        currentChannelIndex += channelsPerBatch;
    };

    let observer;
    const lazyLoadImages = () => {
        if (observer) observer.disconnect();
        observer = new IntersectionObserver((entries, obs) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    img.src = img.dataset.src;
                    img.classList.remove('lazy');
                    obs.unobserve(img);
                }
            });
        }, { root: channelList, rootMargin: "0px 0px 200px 0px" });

        document.querySelectorAll('img.lazy').forEach(img => {
            observer.observe(img);
        });
    };

    const filterChannels = () => {
        const query = searchInput.value.toLowerCase();
        filteredChannels = allChannels.filter(c => c.name.toLowerCase().includes(query));
        currentChannelIndex = 0;
        renderChannels([]); // Clear the list
        loadMoreChannels();
    };

    const init = async () => {
        loadingOverlay.style.display = 'flex';

        const streams = await fetchJSON('https://iptv-org.github.io/api/streams.json');
        const channels = await fetchJSON('https://iptv-org.github.io/api/channels.json');
        
        const channelsMap = new Map(channels.map(c => [c.id, c]));

        allChannels = streams
            .map(stream => {
                const channelInfo = channelsMap.get(stream.channel);
                return channelInfo ? {
                    id: channelInfo.id,
                    name: channelInfo.name,
                    url: stream.url,
                    logo: channelInfo.logo,
                } : null;
            })
            .filter(Boolean)
            .sort((a, b) => a.name.localeCompare(b.name));

        filteredChannels = [...allChannels];
        loadMoreChannels();

        searchInput.addEventListener('input', filterChannels);
        
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting) {
                    loadMoreChannels();
                }
            },
            { threshold: 1.0 }
        );

        const sentinel = document.createElement('div');
        sentinel.id = 'sentinel';
        channelList.appendChild(sentinel);
        observer.observe(sentinel);

        addStreamBtn.addEventListener('click', () => {
            const url = newStreamUrlInput.value.trim();
            if (url) {
                const newChannel = { id: `custom-${Date.now()}`, name: 'Custom Stream', url, logo: 'placeholder.png' };
                allChannels.unshift(newChannel);
                filterChannels();
                playChannel(newChannel);
                newStreamUrlInput.value = '';
            }
        });

        loadingOverlay.style.display = 'none';

        const setupUIEventListeners = () => {
            menuToggle.addEventListener('click', () => {
                sidebar.classList.toggle('-translate-x-full');
                sidebarOverlay.classList.toggle('hidden');
            });

            sidebarOverlay.addEventListener('click', () => {
                sidebar.classList.add('-translate-x-full');
                sidebarOverlay.classList.add('hidden');
            });
        };

        setupUIEventListeners();
    };

    init();
});
