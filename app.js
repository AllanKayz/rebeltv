// Select DOM elements
const loadingOverlay = document.getElementById('loading-overlay');
const videoPlayer = document.getElementById('video-player');
const channelGuide = document.getElementById('channel-guide');
const searchInput = document.getElementById('search-channels');
const addStreamBtn = document.getElementById('add-stream-btn');
const themeToggle = document.getElementById('theme-toggle');
const installButton = document.getElementById('install-button');
const categoryFilters = document.getElementById('category-filters');
const addStreamModal = document.getElementById('add-stream-modal');
const streamUrlInput = document.getElementById('stream-url-input');
const confirmStreamBtn = document.getElementById('confirm-stream-btn');
const cancelStreamBtn = document.getElementById('cancel-stream-btn');

let allChannels = [];
let guidesByChannel = {};
let categories = [];

// Theme Functions
function setTheme(theme) {
    if (theme === 'light') {
        document.body.classList.remove('dark-theme');
    } else {
        document.body.classList.add('dark-theme');
    }
}

function setupTheme() {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    setTheme(savedTheme);

    themeToggle.addEventListener('click', () => {
        const currentTheme = document.body.classList.contains('dark-theme') ? 'dark' : 'light';
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        setTheme(newTheme);
        localStorage.setItem('theme', newTheme);
    });
}


// Initialize video player
function playChannel(channel) {
    if (Hls.isSupported()) {
        const hls = new Hls();
        hls.loadSource(channel.url);
        hls.attachMedia(videoPlayer);
        hls.on(Hls.Events.MANIFEST_PARSED, () => videoPlayer.play());
    } else if (videoPlayer.canPlayType('application/vnd.apple.mpegurl')) {
        videoPlayer.src = channel.url;
        videoPlayer.addEventListener('loadedmetadata', () => videoPlayer.play());
    } else {
        alert('HLS streaming not supported.');
    }
}

// Render program guide
function renderProgramGuide(filteredChannels = null) {
    const channelsToRender = filteredChannels || allChannels;
    channelGuide.innerHTML = '';

    channelsToRender.forEach(channel => {
        const channelRow = document.createElement('div');
        channelRow.className = 'flex items-center border-b dark:border-gray-700 light:border-gray-200 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700';
        channelRow.addEventListener('click', () => playChannel(channel));

        const channelInfo = document.createElement('div');
        channelInfo.className = 'w-48 flex-shrink-0 p-2';
        channelInfo.innerHTML = `
            <div class="flex items-center">
                <img src="${channel.logo || 'placeholder.png'}" class="w-10 h-10 mr-2 rounded-md">
                <span class="font-semibold">${channel.name}</span>
            </div>
        `;
        channelRow.appendChild(channelInfo);

        const programs = document.createElement('div');
        programs.className = 'flex-1 whitespace-nowrap overflow-x-auto';
        const guide = guidesByChannel[channel.id] || [];
        if (guide.length > 0) {
            guide.forEach(program => {
                const startDate = new Date(program.start);
                const endDate = new Date(program.end);
                const startTime = !isNaN(startDate) ? startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A';
                const endTime = !isNaN(endDate) ? endDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A';

                programs.innerHTML += `<div class="inline-block p-2 border-l dark:border-gray-700 light:border-gray-200 w-64">
                    <p class="font-bold">${program.title || 'No title available'}</p>
                    <p class="text-sm text-gray-400">${startTime} - ${endTime}</p>
                </div>`;
            });
        } else {
            programs.innerHTML = `<div class="inline-block p-2 text-gray-400">No program information available.</div>`;
        }
        channelRow.appendChild(programs);
        channelGuide.appendChild(channelRow);
    });

    if (!loadingOverlay.classList.contains('hidden')) {
        loadingOverlay.classList.add('hidden');
    }
}

// Render category filters
function renderCategoryFilters() {
    categoryFilters.innerHTML = '';
    categories.forEach(category => {
        const filter = document.createElement('a');
        filter.href = '#';
        filter.className = 'block p-2 text-sm rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700';
        filter.textContent = category;
        filter.addEventListener('click', (e) => {
            e.preventDefault();
            const filtered = allChannels.filter(c => c.categories.includes(category));
            renderProgramGuide(filtered);
        });
        categoryFilters.appendChild(filter);
    });
}

// Fetch channels and guides
async function fetchData() {
    loadingOverlay.classList.remove('hidden');
    try {
        const [streamsRes, channelsRes, guidesRes] = await Promise.all([
            fetch('https://iptv-org.github.io/api/streams.json'),
            fetch('https://iptv-org.github.io/api/channels.json'),
            fetch('https://iptv-org.github.io/api/guides.json'),
        ]);
        const streams = await streamsRes.json();
        const channelData = await channelsRes.json();
        const guides = await guidesRes.json();
        const channelsMap = new Map(channelData.map(c => [c.id, c]));

        guides.forEach(g => {
            if (!guidesByChannel[g.channel]) guidesByChannel[g.channel] = [];
            guidesByChannel[g.channel].push(g);
        });

        allChannels = streams
            .map(stream => {
                const channelInfo = channelsMap.get(stream.channel);
                return channelInfo ? { ...channelInfo, url: stream.url } : null;
            })
            .filter(Boolean)
            .sort((a, b) => a.name.localeCompare(b.name));

        categories = [...new Set(allChannels.flatMap(c => c.categories || []))].sort();
        renderCategoryFilters();
        renderProgramGuide();
    } catch (error) {
        console.error('Error fetching data:', error);
        alert('Failed to load channels. Please try again later.');
    }
}

// Search functionality
searchInput.addEventListener('input', e => {
    const query = e.target.value.toLowerCase();
    const filtered = allChannels.filter(c => c.name.toLowerCase().includes(query));
    renderProgramGuide(filtered);
});

// Add stream modal
addStreamBtn.addEventListener('click', () => {
    addStreamModal.classList.remove('hidden');
});

cancelStreamBtn.addEventListener('click', () => {
    addStreamModal.classList.add('hidden');
});

confirmStreamBtn.addEventListener('click', () => {
    const url = streamUrlInput.value.trim();
    if (url) {
        const newChannel = { name: 'Custom Stream', url: url, logo: 'placeholder.png' };
        allChannels.unshift(newChannel);
        renderProgramGuide();
        playChannel(newChannel);
        streamUrlInput.value = '';
        addStreamModal.classList.add('hidden');
    }
});


// PWA installation
let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    installButton.classList.remove('hidden');
});
installButton.addEventListener('click', async () => {
    if (deferredPrompt) {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        deferredPrompt = null;
        if (outcome === 'accepted') {
            installButton.classList.add('hidden');
        }
    }
});

// Initial setup
function initializeApp() {
    setupTheme();
    fetchData();
}

initializeApp();
