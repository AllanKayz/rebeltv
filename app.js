// Select DOM elements
const videoPlayer = document.getElementById('video-player');
const videoPlayerContainer = document.getElementById('video-player-container');
const channelsContainer = document.getElementById('channels-container');
const searchInput = document.getElementById('search-channels');
const newStreamUrlInput = document.getElementById('new-stream-url');
const addStreamBtn = document.getElementById('add-stream-btn');
const loadMoreBtn = document.getElementById('load-more-btn');
const loadingOverlay = document.getElementById('loading-overlay');
const themeToggle = document.getElementById('theme-toggle');
const installButton = document.getElementById('install-button');
const epgButton = document.getElementById('epg-button');
const epgModal = document.getElementById('epg-modal');
const closeEpgModalBtn = document.getElementById('close-epg-modal');
const epgContent = document.getElementById('epg-content');
const body = document.body;

let allChannels = [];
let allFeeds = [];
let allGuides = [];
let currentPage = 0;
const CATEGORIES_PER_PAGE = 10;

function playChannel(channel) {
  const { url } = channel;
  videoPlayerContainer.classList.remove('hidden');
  videoPlayer.scrollIntoView({ behavior: 'smooth' });

  if (Hls.isSupported()) {
    const hls = new Hls();
    hls.loadSource(url);
    hls.attachMedia(videoPlayer);
    hls.on(Hls.Events.MANIFEST_PARSED, () => videoPlayer.play());
  } else if (videoPlayer.canPlayType('application/vnd.apple.mpegurl')) {
    videoPlayer.src = url;
    videoPlayer.addEventListener('loadedmetadata', () => videoPlayer.play());
  } else {
    alert('HLS streaming not supported.');
  }
}

function renderChannels(channels = allChannels, loadMore = false) {
    if (!loadMore) {
        channelsContainer.innerHTML = '';
        currentPage = 0;
    }

    const categories = [...new Set(channels.map(c => c.category || 'General'))];
    const startIndex = currentPage * CATEGORIES_PER_PAGE;
    const endIndex = startIndex + CATEGORIES_PER_PAGE;
    const categoriesToRender = categories.slice(startIndex, endIndex);

    if (categoriesToRender.length === 0 && loadMore) {
        loadMoreBtn.classList.add('hidden');
        return;
    }

    categoriesToRender.forEach(category => {
        if (document.getElementById(`category-${category.replace(/\s+/g, '-')}`)) return;

        const categoryContainer = document.createElement('div');
        categoryContainer.id = `category-${category.replace(/\s+/g, '-')}`;
        const categoryTitle = document.createElement('h2');
        categoryTitle.className = 'text-2xl font-bold mb-4';
        categoryTitle.textContent = category;
        categoryContainer.appendChild(categoryTitle);

        const categoryRow = document.createElement('div');
        categoryRow.className = 'category-row gap-4';

        const channelsInCategory = channels.filter(c => (c.category || 'General') === category);
        channelsInCategory.forEach(channel => {
            const channelCard = document.createElement('div');
            channelCard.className = 'channel-card rounded-lg overflow-hidden cursor-pointer flex flex-col';

            const imgContainer = document.createElement('div');
            imgContainer.className = 'w-full h-40 bg-gray-700 flex items-center justify-center relative';
            imgContainer.addEventListener('click', () => playChannel(channel));

            if (channel.logo) {
                const img = document.createElement('img');
                img.src = channel.logo;
                img.alt = channel.name;
                img.className = 'w-full h-full object-cover';
                img.onerror = () => {
                    img.remove();
                    const placeholderText = document.createElement('span');
                    placeholderText.className = 'text-gray-400';
                    placeholderText.textContent = 'No Image';
                    imgContainer.appendChild(placeholderText);
                };
                imgContainer.appendChild(img);
            } else {
                const placeholderText = document.createElement('span');
                placeholderText.className = 'text-gray-400';
                placeholderText.textContent = 'No Image';
                imgContainer.appendChild(placeholderText);
            }
            channelCard.appendChild(imgContainer);

            const channelInfo = document.createElement('div');
            channelInfo.className = 'p-2 flex-grow flex flex-col justify-center items-center';

            const channelName = document.createElement('p');
            channelName.className = 'text-center';
            channelName.textContent = channel.name;
            channelInfo.appendChild(channelName);

            const feedLinks = document.createElement('div');
            feedLinks.className = 'flex space-x-2 mt-2';
            const channelFeeds = allFeeds.find(feed => feed.channel === channel.id);
            if (channelFeeds) {
                channelFeeds.urls.forEach(feedUrl => {
                    const link = document.createElement('a');
                    link.href = feedUrl.url;
                    link.target = '_blank';
                    const icon = document.createElement('i');
                    icon.className = `fab fa-${feedUrl.type}`;
                    link.appendChild(icon);
                    feedLinks.appendChild(link);
                });
            }
            channelInfo.appendChild(feedLinks);
            channelCard.appendChild(channelInfo);

            categoryRow.appendChild(channelCard);
        });
        categoryContainer.appendChild(categoryRow);
        channelsContainer.appendChild(categoryContainer);
    });

    if (loadingOverlay && !loadingOverlay.classList.contains('hidden')) {
        loadingOverlay.classList.add('hidden');
    }
}

function renderEpg() {
    epgContent.innerHTML = '';
    const now = new Date();

    allChannels.slice(0, 50).forEach(channel => { // Limit to first 50 channels for performance
        const channelRow = document.createElement('div');
        channelRow.className = 'flex items-center border-b border-gray-700 py-2';

        const channelLogo = document.createElement('img');
        channelLogo.src = channel.logo || 'placeholder.png';
        channelLogo.alt = channel.name;
        channelLogo.className = 'w-12 h-12 object-contain mr-4';
        channelLogo.onerror = () => (channelLogo.src = 'placeholder.png');
        channelRow.appendChild(channelLogo);

        const channelDetails = document.createElement('div');
        const channelName = document.createElement('p');
        channelName.className = 'font-bold';
        channelName.textContent = channel.name;
        channelDetails.appendChild(channelName);

        const programInfo = document.createElement('p');
        const currentProgram = allGuides.find(g => g.channel === channel.id && new Date(g.start) <= now && new Date(g.end) > now);
        programInfo.textContent = currentProgram ? `${currentProgram.title} (${new Date(currentProgram.start).toLocaleTimeString()} - ${new Date(currentProgram.end).toLocaleTimeString()})` : 'No program information available';
        channelDetails.appendChild(programInfo);

        channelRow.appendChild(channelDetails);
        epgContent.appendChild(channelRow);
    });
}

async function fetchData() {
    try {
        const [streamsRes, feedsRes, guidesRes] = await Promise.all([
            fetch('https://iptv-org.github.io/api/streams.json'),
            fetch('https://iptv-org.github.io/api/feeds.json'),
            fetch('https://iptv-org.github.io/api/guides.json')
        ]);

        if (!streamsRes.ok || !feedsRes.ok || !guidesRes.ok) {
            throw new Error(`HTTP error!`);
        }

        allChannels = await streamsRes.json();
        allFeeds = await feedsRes.json();
        allGuides = await guidesRes.json();

        renderChannels();
    } catch (error) {
        console.error('Failed to fetch data:', error);
        alert('Failed to load data. Please try again later.');
    } finally {
        if (loadingOverlay && !loadingOverlay.classList.contains('hidden')) {
            loadingOverlay.classList.add('hidden');
        }
    }
}

function initializeApp() {
    fetchData();
}

epgButton.addEventListener('click', () => {
    renderEpg();
    epgModal.classList.remove('hidden');
});

closeEpgModalBtn.addEventListener('click', () => {
    epgModal.classList.add('hidden');
});

searchInput.addEventListener('input', e => {
    const query = e.target.value.toLowerCase().trim();
    const filteredChannels = allChannels.filter(c => c.name.toLowerCase().includes(query));
    renderChannels(filteredChannels);
});

addStreamBtn.addEventListener('click', () => {
    const url = newStreamUrlInput.value.trim();
    if (!url) return;
    const newChannel = { name: 'Custom Stream', url, logo: '', category: 'Custom' };
    allChannels.unshift(newChannel);
    renderChannels();
    playChannel(newChannel);
    newStreamUrlInput.value = '';
});

loadMoreBtn.addEventListener('click', () => {
    currentPage++;
    renderChannels(allChannels, true);
});

const savedTheme = localStorage.getItem('theme') || 'dark';
setTheme(savedTheme);

themeToggle.addEventListener('click', () => {
  const newTheme = body.classList.contains('dark') ? 'light' : 'dark';
  setTheme(newTheme);
  localStorage.setItem('theme', newTheme);
});

function setTheme(theme) {
    const icon = themeToggle.querySelector('i');
    if (theme === 'light') {
        body.classList.remove('dark');
        body.classList.add('light');
        icon.classList.remove('fa-sun');
        icon.classList.add('fa-moon');
    } else {
        body.classList.remove('light');
        body.classList.add('dark');
        icon.classList.remove('fa-moon');
        icon.classList.add('fa-sun');
    }
}

let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    installButton.classList.remove('hidden');
});

installButton.addEventListener('click', async () => {
    if (deferredPrompt) {
        deferredPrompt.prompt();
        await deferredPrompt.userChoice;
        deferredPrompt = null;
        installButton.classList.add('hidden');
    }
});

initializeApp();
