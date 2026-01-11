document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const channelsGrid = document.getElementById('channel-grid');
    const loadingState = document.getElementById('loading-state');
    const categoryFilter = document.getElementById('category-filter');
    const countryFilter = document.getElementById('country-filter');
    const languageFilter = document.getElementById('language-filter');
    const showBlockedToggle = document.getElementById('show-blocked');
    const searchBar = document.getElementById('search-bar');
    const resultsCount = document.getElementById('results-count');
    
    const playerOverlay = document.getElementById('player-overlay');
    const videoPlayer = document.getElementById('video-player');
    const closePlayer = document.getElementById('close-player');
    const playingName = document.getElementById('playing-name');
    const playingCategory = document.getElementById('playing-category');
    const playingLogo = document.getElementById('playing-logo');

    const sourceSelectorContainer = document.getElementById('source-selector-container');
    const sourceList = document.getElementById('source-list');

    const themeSwitcher = document.getElementById('theme-switcher');
    const htmlElement = document.documentElement;
    
    const sidebar = document.getElementById('sidebar');
    const mobileMenuToggle = document.getElementById('mobile-menu-toggle');
    const closeMobileMenu = document.getElementById('close-mobile-menu');
    const collapseSidebarBtn = document.getElementById('collapse-sidebar');
    const expandSidebarBtn = document.getElementById('expand-sidebar');
    
    const toggleAddStream = document.getElementById('toggle-add-stream');
    const customStreamForm = document.getElementById('custom-stream-form');
    const customStreamNameInput = document.getElementById('custom-stream-name');
    const customStreamUrlInput = document.getElementById('custom-stream-url');
    const customStreamsList = document.getElementById('custom-streams-list');

    const loadMoreSentinel = document.getElementById('load-more-sentinel');
    const sentinelLoader = loadMoreSentinel.querySelector('.sentinel-loader');

    // --- State ---
    const API_BASE_URL = 'https://iptv-org.github.io/api';
    let channels = [];
    let streams = {};
    let blocklist = new Set();
    let externalLogos = {};
    let customStreams = [];
    let logoObserver;
    let sentinelObserver;
    let player;

    // --- Lazy Loading State ---
    let currentlyFilteredChannels = [];
    let currentPage = 1;
    const itemsPerPage = 40;

    // --- Sidebar Management ---
    function toggleMobileMenu() {
        sidebar.classList.toggle('hidden-mobile');
        sidebar.classList.toggle('visible-mobile');
    }

    function toggleDesktopSidebar(isCollapsed) {
        if (isCollapsed) {
            sidebar.classList.add('sidebar-collapsed');
            expandSidebarBtn.classList.remove('hidden');
        } else {
            sidebar.classList.remove('sidebar-collapsed');
            expandSidebarBtn.classList.add('hidden');
        }
        localStorage.setItem('sidebarCollapsed', isCollapsed);
    }

    mobileMenuToggle.addEventListener('click', toggleMobileMenu);
    closeMobileMenu.addEventListener('click', toggleMobileMenu);

    collapseSidebarBtn.addEventListener('click', () => toggleDesktopSidebar(true));
    expandSidebarBtn.addEventListener('click', () => toggleDesktopSidebar(false));

    function loadInitialSidebarState() {
        if (window.innerWidth > 1024) {
            const isCollapsed = localStorage.getItem('sidebarCollapsed') === 'true';
            toggleDesktopSidebar(isCollapsed);
        }
    }

    // --- UI Helpers ---
    toggleAddStream.addEventListener('click', () => {
        customStreamForm.classList.toggle('hidden');
        toggleAddStream.querySelector('i').classList.toggle('fa-plus-circle');
        toggleAddStream.querySelector('i').classList.toggle('fa-minus-circle');
    });

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
        if (typeof videojs !== 'undefined') {
            player = videojs(videoPlayer, {
                autoplay: true,
                controls: true,
                preload: 'auto',
                fluid: true,
                responsive: true
            });
        }
    }

    function playStream(streamUrl, name = 'Custom Stream', category = 'Manual Link', logo = 'placeholder.png', allStreams = []) {
        if (streamUrl) {
            playingName.textContent = name;
            playingCategory.textContent = category;
            playingLogo.src = logo || 'placeholder.png';
            playingLogo.onerror = () => { playingLogo.src = 'placeholder.png'; };

            // Handle Source Selector
            if (allStreams && allStreams.length > 1) {
                sourceSelectorContainer.classList.remove('hidden');
                renderSourceSelector(allStreams, name, category, logo);
            } else {
                sourceSelectorContainer.classList.add('hidden');
            }

            playerOverlay.classList.remove('hidden');
            const type = streamUrl.includes('.m3u8') ? 'application/x-mpegURL' : 'video/mp4';
            player.src({ src: streamUrl, type });
        } else {
            alert('Stream URL is not available.');
        }
    }

    function renderSourceSelector(allStreams, name, category, logo) {
        sourceList.innerHTML = '';
        allStreams.forEach((stream, index) => {
            const btn = document.createElement('button');
            const currentSrc = player.src();
            const isCurrent = currentSrc === stream.url;
            
            btn.className = `px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                isCurrent 
                ? 'bg-primary text-white shadow-lg shadow-primary/30' 
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`;
            
            const resolution = stream.height ? `${stream.height}p` : '';
            const status = stream.status ? `(${stream.status})` : '';
            btn.textContent = `Source ${index + 1} ${resolution} ${status}`.trim();
            
            btn.onclick = () => {
                const type = stream.url.includes('.m3u8') ? 'application/x-mpegURL' : 'video/mp4';
                player.src({ src: stream.url, type });
                player.play();
                renderSourceSelector(allStreams, name, category, logo);
            };
            sourceList.appendChild(btn);
        });
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
            customStreamsList.innerHTML = `<p class="text-xs text-slate-500 text-center py-2">No custom streams added.</p>`;
            return;
        }
        customStreams.forEach(stream => {
            const streamEl = document.createElement('div');
            streamEl.className = 'group flex items-center justify-between p-2 bg-slate-100 dark:bg-slate-800 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer';
            
            streamEl.innerHTML = `
                <div class="flex items-center gap-2 flex-grow min-w-0">
                    <i class="fas fa-play-circle text-primary text-sm"></i>
                    <p class="text-xs font-semibold truncate" title="${stream.name}">${stream.name}</p>
                </div>
                <button class="delete-stream-btn text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity ml-2 px-1">
                    <i class="fas fa-times-circle"></i>
                </button>
            `;

            streamEl.addEventListener('click', () => playStream(stream.url, stream.name));
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
        customStreamForm.classList.add('hidden');
        toggleAddStream.querySelector('i').classList.replace('fa-minus-circle', 'fa-plus-circle');
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
            loadingState.classList.remove('hidden');
            channelsGrid.innerHTML = '';
            
            const [channelsRes, streamsRes, blocklistRes, logosRes] = await Promise.all([
                fetch(`${API_BASE_URL}/channels.json`),
                fetch(`${API_BASE_URL}/streams.json`),
                fetch(`${API_BASE_URL}/blocklist.json`),
                fetch(`${API_BASE_URL}/logos.json`)
            ]);
            
            const channelsData = await channelsRes.json();
            const streamsData = await streamsRes.json();
            const blocklistData = await blocklistRes.json();
            const logosData = await logosRes.json();

            streams = streamsData.reduce((acc, stream) => {
                if (!acc[stream.channel]) acc[stream.channel] = [];
                acc[stream.channel].push(stream);
                return acc;
            }, {});
            
            blocklist = new Set(blocklistData.map(item => item.channel));
            
            externalLogos = logosData.reduce((acc, logo) => {
                acc[logo.channel] = logo.url;
                return acc;
            }, {});

            channels = channelsData
                .filter(ch => streams[ch.id])
                .map(ch => ({ 
                    ...ch, 
                    streamUrl: streams[ch.id][0].url, // Default to first stream
                    allStreams: streams[ch.id],
                    isBlocked: blocklist.has(ch.id),
                    logo: ch.logo || externalLogos[ch.id]
                }));

            const [countriesRes, categoriesRes, languagesRes] = await Promise.all([
                fetch(`${API_BASE_URL}/countries.json`),
                fetch(`${API_BASE_URL}/categories.json`),
                fetch(`${API_BASE_URL}/languages.json`)
            ]);
            
            populateFilters(await categoriesRes.json(), await countriesRes.json(), await languagesRes.json());
            
            loadingState.classList.add('hidden');
            filterAndRenderPublicChannels();

        } catch (error) {
            console.error('Error fetching public channels:', error);
            loadingState.classList.add('hidden');
            channelsGrid.innerHTML = '<div class="text-center col-span-full py-20"><i class="fas fa-exclamation-triangle text-4xl text-red-500 mb-4 block"></i><p class="text-slate-500">Error loading channels. Please try again later.</p></div>';
        }
    }

    function populateFilters(categories, countries, languages) {
        const populate = (filterEl, items, label) => {
            items.sort((a,b) => a.name.localeCompare(b.name)).forEach(item => {
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

    function setupSentinelObserver() {
        if (sentinelObserver) sentinelObserver.disconnect();

        sentinelObserver = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting && currentPage * itemsPerPage < currentlyFilteredChannels.length) {
                loadNextBatch();
            }
        }, { rootMargin: '200px' });

        sentinelObserver.observe(loadMoreSentinel);
    }

    function loadNextBatch() {
        sentinelLoader.classList.remove('hidden');
        
        // Slight delay to allow loader to be seen (and prevent accidental double triggers)
        setTimeout(() => {
            currentPage++;
            const start = (currentPage - 1) * itemsPerPage;
            const end = start + itemsPerPage;
            const batch = currentlyFilteredChannels.slice(start, end);
            
            appendChannelBatch(batch);
            sentinelLoader.classList.add('hidden');
        }, 300);
    }

    function renderPublicChannels(filteredChannels) {
        currentlyFilteredChannels = filteredChannels;
        currentPage = 1;
        
        channelsGrid.innerHTML = '';
        resultsCount.textContent = `${filteredChannels.length} channels found`;

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
        }, { rootMargin: '0px 0px 300px 0px' });

        if (filteredChannels.length === 0) {
            channelsGrid.innerHTML = '<div class="text-center col-span-full py-20 text-slate-500"><i class="fas fa-search-minus text-4xl mb-4 block"></i>No channels match your criteria.</div>';
            loadMoreSentinel.classList.add('hidden');
            return;
        }

        loadMoreSentinel.classList.remove('hidden');
        const initialBatch = filteredChannels.slice(0, itemsPerPage);
        appendChannelBatch(initialBatch);
        setupSentinelObserver();
    }

    function appendChannelBatch(batch) {
        const fragment = document.createDocumentFragment();
        batch.forEach(channel => {
            const card = document.createElement('div');
            card.className = 'premium-card group channel-card-glow cursor-pointer h-full flex flex-col';
            card.innerHTML = `
                <div class="h-32 flex items-center justify-center bg-white p-6 overflow-hidden relative">
                    <img class="channel-logo w-full h-full object-contain transition-transform duration-500 group-hover:scale-110" 
                        src="placeholder.png" 
                        data-src="${channel.logo || 'placeholder.png'}" 
                        alt="${channel.name}">
                    <div class="absolute inset-0 bg-primary/0 group-hover:bg-primary/5 transition-colors"></div>
                    <div class="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <div class="bg-primary text-white w-8 h-8 rounded-full flex items-center justify-center shadow-lg">
                            <i class="fas fa-play text-[10px]"></i>
                        </div>
                    </div>
                </div>
                <div class="p-4 flex-grow">
                    <h3 class="font-bold text-sm truncate text-slate-900 dark:text-white" title="${channel.name}">${channel.name}</h3>
                    <div class="flex items-center gap-2 mt-1">
                        <span class="text-[10px] px-2 py-0.5 bg-slate-100 dark:bg-slate-700 rounded-full text-slate-500 dark:text-slate-400 capitalize">
                            ${channel.category || 'General'}
                        </span>
                        ${channel.country ? `
                            <span class="text-[10px] text-slate-400 font-medium uppercase">${channel.country}</span>
                        ` : ''}
                        ${channel.isBlocked ? `
                            <span class="text-[10px] px-2 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full font-bold">Blocked</span>
                        ` : ''}
                        ${channel.allStreams && channel.allStreams.length > 1 ? `
                            <span class="text-[10px] px-2 py-0.5 bg-primary/10 text-primary rounded-full font-bold">
                                ${channel.allStreams.length} Sources
                            </span>
                        ` : ''}
                    </div>
                </div>
            `;
            
            if (channel.isBlocked) {
                card.classList.add('opacity-60', 'grayscale-[0.5]');
            }
            
            card.addEventListener('click', () => {
                playStream(channel.streamUrl, channel.name, channel.category, channel.logo, channel.allStreams);
            });

            fragment.appendChild(card);
            logoObserver.observe(card);
        });
        channelsGrid.appendChild(fragment);
    }

    function filterAndRenderPublicChannels() {
        const searchTerm = searchBar.value.toLowerCase();
        const selectedCategory = categoryFilter.value;
        const selectedCountry = countryFilter.value;
        const selectedLanguage = languageFilter.value;
        const showBlocked = showBlockedToggle.checked;

        const filtered = channels.filter(ch => 
            (!searchTerm || ch.name.toLowerCase().includes(searchTerm)) &&
            (!selectedCategory || ch.category === selectedCategory) &&
            (!selectedCountry || ch.country === selectedCountry) &&
            (!selectedLanguage || (ch.languages && ch.languages.includes(selectedLanguage))) &&
            (showBlocked || !ch.isBlocked)
        );
        
        // Reset scroll position when filtering
        document.getElementById('main-content-scroll').scrollTo(0, 0);
        
        renderPublicChannels(filtered);
    }

    // --- Event Listeners ---
    [searchBar, categoryFilter, countryFilter, languageFilter, showBlockedToggle].forEach(el => {
        el.addEventListener('input', filterAndRenderPublicChannels);
        el.addEventListener('change', filterAndRenderPublicChannels);
    });

    // --- Initial Load ---
    function initializeApp() {
        loadInitialTheme();
        loadInitialSidebarState();
        initializePlayer();
        loadCustomStreams();
        fetchPublicChannels();
    }

    initializeApp();
});