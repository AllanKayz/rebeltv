document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const channelsGrid = document.getElementById('channel-grid');
    const categoryFilter = document.getElementById('category-filter');
    const countryFilter = document.getElementById('country-filter');
    const languageFilter = document.getElementById('language-filter');
    const searchBar = document.getElementById('search-bar');
    const playerOverlay = document.getElementById('player-overlay');
    const videoPlayer = document.getElementById('video-player');
    const closePlayer = document.getElementById('close-player');
    const themeSwitcher = document.getElementById('theme-switcher');
    const htmlElement = document.documentElement;
    const customStreamForm = document.getElementById('custom-stream-form');
    const customStreamNameInput = document.getElementById('custom-stream-name');
    const customStreamUrlInput = document.getElementById('custom-stream-url');
    const customStreamsList = document.getElementById('custom-streams-list');

    // --- State ---
    const API_BASE_URL = 'https://iptv-org.github.io/api';
    let channels = [];
    let streams = {};
    let customStreams = [];
    let logoObserver;
    let player;

    // --- Theme Management ---
    function applyTheme(theme) {
        htmlElement.classList.toggle('dark', theme === 'dark');
    }

    function toggleTheme() {
        const newTheme = htmlElement.classList.contains('dark') ? 'light' : 'dark';
        applyTheme(newTheme);
        localStorage.setItem('theme', newTheme);
    }

    themeSwitcher.addEventListener('click', toggleTheme);

    function loadInitialTheme() {
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme) {
            applyTheme(savedTheme);
        } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            applyTheme('dark');
        }
    }

    // --- Player ---
    function initializePlayer() {
        player = videojs(videoPlayer, {
            autoplay: true,
            controls: true,
            preload: 'auto',
            fluid: true
        });
    }

    function playStream(streamUrl) {
        if (streamUrl) {
            playerOverlay.classList.remove('hidden');
            const type = streamUrl.includes('.m3u8') ? 'application/x-mpegURL' : 'video/mp4';
            player.src({ src: streamUrl, type });
        } else {
            alert('Stream URL is not available.');
        }
    }

    closePlayer.addEventListener('click', () => {
        player.pause();
        player.src('');
        playerOverlay.classList.add('hidden');
    });

    // --- Custom Streams ---
    function saveCustomStreams() {
        localStorage.setItem('customStreams', JSON.stringify(customStreams));
    }

    function loadCustomStreams() {
        const saved = localStorage.getItem('customStreams');
        customStreams = saved ? JSON.parse(saved) : [];
        renderCustomStreams();
    }

    function renderCustomStreams() {
        customStreamsList.innerHTML = '';
        if (customStreams.length === 0) {
            customStreamsList.innerHTML = `<p class="text-sm text-light-text-light dark:text-light-text-dark text-center">No custom streams yet.</p>`;
        }
        customStreams.forEach(stream => {
            const streamEl = document.createElement('div');
            streamEl.className = 'custom-stream-item flex items-center justify-between p-2 bg-background-light dark:bg-background-dark rounded-lg';
            streamEl.dataset.id = stream.id;
            
            streamEl.innerHTML = `
                <p class="font-semibold truncate cursor-pointer flex-grow" title="${stream.name}">${stream.name}</p>
                <button class="delete-stream-btn text-red-500 hover:text-red-700 opacity-0 transition-opacity ml-2">
                    <i class="fas fa-trash-alt"></i>
                </button>
            `;

            streamEl.querySelector('p').addEventListener('click', () => playStream(stream.url));
            streamEl.querySelector('.delete-stream-btn').addEventListener('click', (e) => {
                e.stopPropagation();
                deleteCustomStream(stream.id);
            });

            customStreamsList.appendChild(streamEl);
        });
    }

    function addCustomStream(e) {
        e.preventDefault();
        const name = customStreamNameInput.value.trim() || 'Custom Stream';
        const url = customStreamUrlInput.value.trim();

        if (!url || !url.startsWith('http')) {
            alert('Please enter a valid stream URL.');
            return;
        }

        customStreams.push({ id: Date.now(), name, url });
        saveCustomStreams();
        renderCustomStreams();
        customStreamForm.reset();
    }

    function deleteCustomStream(id) {
        customStreams = customStreams.filter(stream => stream.id !== id);
        saveCustomStreams();
        renderCustomStreams();
    }

    customStreamForm.addEventListener('submit', addCustomStream);

    // --- IPTV-ORG Channels ---
    async function fetchPublicChannels() {
        try {
            const [channelsRes, streamsRes] = await Promise.all([
                fetch(`${API_BASE_URL}/channels.json`),
                fetch(`${API_BASE_URL}/streams.json`),
            ]);
            const channelsData = await channelsRes.json();
            const streamsData = await streamsRes.json();

            streams = streamsData.reduce((acc, stream) => {
                acc[stream.channel] = stream.url;
                return acc;
            }, {});

            channels = channelsData.map(ch => ({ ...ch, streamUrl: streams[ch.id] }));

            const [countriesRes, categoriesRes, languagesRes] = await Promise.all([
                fetch(`${API_BASE_URL}/countries.json`),
                fetch(`${API_BASE_URL}/categories.json`),
                fetch(`${API_BASE_URL}/languages.json`)
            ]);
            populateFilters(await categoriesRes.json(), await countriesRes.json(), await languagesRes.json());
            filterAndRenderPublicChannels();

        } catch (error) {
            console.error('Error fetching public channels:', error);
            channelsGrid.innerHTML = '<p class="text-center text-red-500 col-span-full">Error loading public channels.</p>';
        }
    }

    function populateFilters(categories, countries, languages) {
        const populate = (filterEl, items) => {
            items.forEach(item => {
                const option = document.createElement('option');
                option.value = item.id || item.code;
                option.textContent = item.name;
                filterEl.appendChild(option);
            });
        }
        populate(categoryFilter, categories);
        populate(countryFilter, countries);
        populate(languageFilter, languages);
    }

    function renderPublicChannels(filteredChannels) {
        channelsGrid.innerHTML = '';
        if (logoObserver) logoObserver.disconnect();

        logoObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const card = entry.target;
                    const logo = card.querySelector('.channel-logo');
                    logo.src = logo.dataset.src;
                    logo.onerror = () => { logo.src = 'placeholder.png'; }; // Fallback image
                    observer.unobserve(card);
                }
            });
        }, { rootMargin: '0px 0px 300px 0px' });

        if (filteredChannels.length === 0) {
            channelsGrid.innerHTML = '<p class="text-center col-span-full">No channels found.</p>';
            return;
        }

        filteredChannels.forEach(channel => {
            if (!channel.streamUrl) return;
            const card = document.createElement('div');
            card.className = 'channel-card';
            card.dataset.streamUrl = channel.streamUrl;
            card.innerHTML = `
                <div class="channel-logo-container">
                    <img class="channel-logo" src="placeholder.png" data-src="${channel.logo || 'placeholder.png'}" alt="${channel.name} Logo">
                </div>
                <div class="channel-info">
                    <p class="channel-name">${channel.name}</p>
                    <p class="channel-category">${channel.category || 'General'}</p>
                </div>
            `;
            channelsGrid.appendChild(card);
            logoObserver.observe(card);
        });
    }

    function filterAndRenderPublicChannels() {
        const searchTerm = searchBar.value.toLowerCase();
        const selectedCategory = categoryFilter.value;
        const selectedCountry = countryFilter.value;
        const selectedLanguage = languageFilter.value;

        const filtered = channels.filter(ch => 
            (!searchTerm || ch.name.toLowerCase().includes(searchTerm)) &&
            (!selectedCategory || ch.category === selectedCategory) &&
            (!selectedCountry || ch.country === selectedCountry) &&
            (!selectedLanguage || (ch.languages && ch.languages.includes(selectedLanguage)))
        );
        renderPublicChannels(filtered);
    }

    // --- Event Listeners ---
    [searchBar, categoryFilter, countryFilter, languageFilter].forEach(el => {
        el.addEventListener('input', filterAndRenderPublicChannels);
        el.addEventListener('change', filterAndRenderPublicChannels);
    });

    channelsGrid.addEventListener('click', (e) => {
        const card = e.target.closest('.channel-card');
        if (card && card.dataset.streamUrl) {
            playStream(card.dataset.streamUrl);
        }
    });

    // --- Initial Load ---
    function initializeApp() {
        loadInitialTheme();
        initializePlayer();
        loadCustomStreams();
        fetchPublicChannels();
    }

    initializeApp();
});