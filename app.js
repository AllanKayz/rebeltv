document.addEventListener('DOMContentLoaded', () => {
    const API_BASE_URL = 'https://iptv-org.github.io/api';
    const channelsGrid = document.getElementById('channel-grid');
    const categoryFilter = document.getElementById('category-filter');
    const countryFilter = document.getElementById('country-filter');
    const languageFilter = document.getElementById('language-filter');
    const searchBar = document.getElementById('search-bar');
    const playerOverlay = document.getElementById('player-overlay');
    const videoPlayer = document.getElementById('video-player');
    const closePlayer = document.getElementById('close-player');

    let channels = [];
    let streams = {};
    let logoObserver;

    async function fetchData() {
        try {
            const [channelsRes, countriesRes, categoriesRes, streamsRes, languagesRes] = await Promise.all([
                fetch(`${API_BASE_URL}/channels.json`),
                fetch(`${API_BASE_URL}/countries.json`),
                fetch(`${API_BASE_URL}/categories.json`),
                fetch(`${API_BASE_URL}/streams.json`),
                fetch(`${API_BASE_URL}/languages.json`)
            ]);

            const channelsData = await channelsRes.json();
            const countriesData = await countriesRes.json();
            const categoriesData = await categoriesRes.json();
            const streamsData = await streamsRes.json();
            const languagesData = await languagesRes.json();

            streams = streamsData.reduce((acc, stream) => {
                acc[stream.channel] = stream.url;
                return acc;
            }, {});

            channels = channelsData.map(channel => ({
                ...channel,
                streamUrl: streams[channel.id],
            }));

            populateFilters(categoriesData, countriesData, languagesData);
            renderChannels(channels);

        } catch (error) {
            console.error('Error fetching data:', error);
            channelsGrid.innerHTML = '<p>Error loading channels. Please try again later.</p>';
        }
    }

    function populateFilters(categories, countries, languages) {
        categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category.id;
            option.textContent = category.name;
            categoryFilter.appendChild(option);
        });

        countries.forEach(country => {
            const option = document.createElement('option');
            option.value = country.code;
            option.textContent = country.name;
            countryFilter.appendChild(option);
        });
        
        languages.forEach(lang => {
            const option = document.createElement('option');
            option.value = lang.code;
            option.textContent = lang.name;
            languageFilter.appendChild(option);
        });
    }

    function renderChannels(filteredChannels) {
        channelsGrid.innerHTML = '';
        if (logoObserver) logoObserver.disconnect();

        logoObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const card = entry.target;
                    const logo = card.querySelector('.channel-logo');
                    logo.src = logo.dataset.src;
                    logo.onerror = () => { logo.src = 'placeholder.png'; };
                    observer.unobserve(card);
                }
            });
        }, { rootMargin: '0px 0px 200px 0px' }); // Load images 200px before they enter the viewport

        filteredChannels.forEach(channel => {
            if (!channel.streamUrl) return;

            const card = document.createElement('div');
            card.className = 'channel-card';
            card.dataset.channelId = channel.id;

            const logoContainer = document.createElement('div');
            logoContainer.className = 'channel-logo-container';

            const logo = document.createElement('img');
            logo.className = 'channel-logo';
            logo.src = 'placeholder.png'; // Start with a placeholder
            logo.dataset.src = channel.logo || 'placeholder.png';
            logo.alt = `${channel.name} Logo`;

            logoContainer.appendChild(logo);

            const info = document.createElement('div');
            info.className = 'channel-info';

            const name = document.createElement('p');
            name.className = 'channel-name';
            name.textContent = channel.name;

            const category = document.createElement('p');
            category.className = 'channel-category';
            category.textContent = channel.category || 'General';

            info.appendChild(name);
            info.appendChild(category);
            card.appendChild(logoContainer);
            card.appendChild(info);
            channelsGrid.appendChild(card);

            logoObserver.observe(card);
        });
    }

    function filterAndRender() {
        const searchTerm = searchBar.value.toLowerCase();
        const selectedCategory = categoryFilter.value;
        const selectedCountry = countryFilter.value;
        const selectedLanguage = languageFilter.value;

        const filteredChannels = channels.filter(channel => {
            const nameMatch = channel.name.toLowerCase().includes(searchTerm);
            const categoryMatch = !selectedCategory || channel.category === selectedCategory;
            const countryMatch = !selectedCountry || channel.country === selectedCountry;
            const languageMatch = !selectedLanguage || (channel.languages && channel.languages.includes(selectedLanguage));

            return nameMatch && categoryMatch && countryMatch && languageMatch;
        });

        renderChannels(filteredChannels);
    }

    function playChannel(channelId) {
        const streamUrl = streams[channelId];
        if (streamUrl) {
            if (Hls.isSupported() && streamUrl.includes('.m3u8')) {
                const hls = new Hls();
                hls.loadSource(streamUrl);
                hls.attachMedia(videoPlayer);
                hls.on(Hls.Events.MANIFEST_PARSED, () => {
                    videoPlayer.play();
                });
            } else {
                videoPlayer.src = streamUrl;
                videoPlayer.play();
            }
            playerOverlay.style.display = 'flex';
        } else {
            alert('Stream not available for this channel.');
        }
    }

    // Event Listeners
    searchBar.addEventListener('input', filterAndRender);
    categoryFilter.addEventListener('change', filterAndRender);
    countryFilter.addEventListener('change', filterAndRender);
    languageFilter.addEventListener('change', filterAndRender);

    channelsGrid.addEventListener('click', (e) => {
        const card = e.target.closest('.channel-card');
        if (card) {
            playChannel(card.dataset.channelId);
        }
    });

    closePlayer.addEventListener('click', () => {
        videoPlayer.pause();
        videoPlayer.src = '';
        playerOverlay.style.display = 'none';
    });

    // Initial data fetch
    fetchData();
});