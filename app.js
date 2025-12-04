// Select DOM elements
const loadingOverlay = document.getElementById('loading-overlay');
const videoPlayer = document.getElementById('video-player');
const channelGrid = document.getElementById('channel-grid');
const searchInput = document.getElementById('search-channels');
const newStreamUrlInput = document.getElementById('new-stream-url');
const addStreamBtn = document.getElementById('add-stream-btn');
const epgModal = document.getElementById('epg-modal');
const epgChannelName = document.getElementById('epg-channel-name');
const epgGuide = document.getElementById('epg-guide');
const closeEpgModal = document.getElementById('close-epg-modal');
const nowPlayingTitle = document.getElementById('now-playing-title');
const nowPlayingDescription = document.getElementById('now-playing-description');

let allChannels = [];
let channelLogosMap = {};

// Initialize video player
function playChannel(channel) {
  const { url, name } = channel;

  nowPlayingTitle.textContent = name;
  nowPlayingDescription.textContent = `Currently playing ${name}. Enjoy the stream!`;

  window.scrollTo({ top: 0, behavior: 'smooth' });

  if (Hls.isSupported()) {
    const hls = new Hls();
    hls.loadSource(url);
    hls.attachMedia(videoPlayer);
    hls.on(Hls.Events.MANIFEST_PARSED, () => {
      videoPlayer.play().catch(e => console.error("Autoplay was prevented:", e));
    });
  } else if (videoPlayer.canPlayType('application/vnd.apple.mpegurl')) {
    videoPlayer.src = url;
    videoPlayer.addEventListener('loadedmetadata', () => {
      videoPlayer.play().catch(e => console.error("Autoplay was prevented:", e));
    });
  } else {
    alert('HLS streaming not supported.');
  }
}

// Get logo, using primary logo first, then the logos map, finally a placeholder
function getChannelLogo(channel) {
  return channel.logo || channelLogosMap[channel.id] || 'placeholder.png';
}

// Render channel grid with categorized rows
function renderChannelGrid(channelsToRender = null) {
  channelGrid.innerHTML = '';

  const channels = channelsToRender || allChannels;

  if (channelsToRender) {
    // Render a single grid for search results
    const searchResultRow = createChannelRow('Search Results', channels);
    channelGrid.appendChild(searchResultRow);
  } else {
    // Group channels by category for the main view
    const channelsByCategory = channels.reduce((acc, channel) => {
      const category = channel.category || 'General';
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(channel);
      return acc;
    }, {});

    // Create a row for each category
    for (const category in channelsByCategory) {
      const row = createChannelRow(category, channelsByCategory[category]);
      channelGrid.appendChild(row);
    }
  }

  // Hide loading overlay
  if (loadingOverlay && !loadingOverlay.classList.contains('hidden')) {
    loadingOverlay.classList.add('hidden');
  }
}

// Create a single channel row (category)
function createChannelRow(title, channels) {
  const row = document.createElement('div');
  row.className = 'channel-row';

  const rowTitle = document.createElement('h2');
  rowTitle.className = 'channel-row-title';
  rowTitle.textContent = title;

  const list = document.createElement('div');
  list.className = 'channel-list';

  channels.forEach(channel => {
    const card = document.createElement('div');
    card.className = 'channel-card';
    card.addEventListener('click', () => playChannel(channel));

    const logo = document.createElement('img');
    logo.className = 'channel-logo';
    logo.src = getChannelLogo(channel);
    logo.alt = `${channel.name} logo`;
    logo.onerror = () => { logo.src = 'placeholder.png'; };

    const name = document.createElement('span');
    name.className = 'channel-name';
    name.textContent = channel.name;

    const cardOverlay = document.createElement('div');
    cardOverlay.className = 'card-overlay';

    if (channel.guides && channel.guides.length > 0) {
      const epgButton = document.createElement('button');
      epgButton.className = 'icon-btn';
      epgButton.innerHTML = `<i class="fas fa-calendar-alt"></i>`;
      epgButton.addEventListener('click', (e) => {
        e.stopPropagation();
        openEpgModal(channel);
      });
      cardOverlay.appendChild(epgButton);
    }

    card.append(logo, name, cardOverlay);
    list.appendChild(card);
  });

  row.append(rowTitle, list);
  return row;
}

// EPG Modal Functions
async function openEpgModal(channel) {
  epgChannelName.textContent = channel.name;
  epgGuide.innerHTML = '<li>Loading...</li>';
  epgModal.classList.remove('hidden');

  try {
    const programs = channel.guides;

    epgGuide.innerHTML = '';
    if (programs && programs.length > 0) {
      programs.forEach(program => {
        const item = document.createElement('li');
        item.textContent = `${new Date(program.start).toLocaleTimeString()} - ${program.title}`;
        epgGuide.appendChild(item);
      });
    } else {
      epgGuide.innerHTML = '<li>No program guide available.</li>';
    }
  } catch (error) {
    console.error('Error processing EPG data:', error);
    epgGuide.innerHTML = '<li>Error loading guide.</li>';
  }
}

closeEpgModal.addEventListener('click', () => {
  epgModal.classList.add('hidden');
});

// Fetch essential data first, then supplementary data
async function fetchData() {
  try {
    const [streamsRes, channelsRes] = await Promise.all([
      fetch('https://iptv-org.github.io/api/streams.json'),
      fetch('https://iptv-org.github.io/api/channels.json'),
    ]);
    const streams = await streamsRes.json();
    const channelData = await channelsRes.json();
    const channelsMap = new Map(channelData.map(c => [c.id, c]));

    allChannels = streams
      .map(stream => {
        const channelInfo = channelsMap.get(stream.channel);
        return channelInfo ? { ...channelInfo, url: stream.url, guides: [] } : null;
      })
      .filter(Boolean)
      .sort((a, b) => a.name.localeCompare(b.name));

    renderChannelGrid();
    fetchSupplementaryData();

  } catch (error) {
    console.error('Error loading initial channel data:', error);
    channelGrid.innerHTML = '<p class="text-red-500">Failed to load channels. See console for details.</p>';
    if (loadingOverlay && !loadingOverlay.classList.contains('hidden')) {
      loadingOverlay.classList.add('hidden');
    }
  }
}

async function fetchSupplementaryData() {
  try {
      const [logosRes, guidesRes] = await Promise.all([
          fetch('https://iptv-org.github.io/api/logos.json'),
          fetch('https://iptv-org.github.io/api/guides.json')
      ]);
      const logos = await logosRes.json();
      const guides = await guidesRes.json();

      logos.forEach(l => { channelLogosMap[l.channel] = l.url; });

      const guidesByChannel = guides.reduce((acc, guide) => {
          if (!acc[guide.channel]) acc[guide.channel] = [];
          acc[guide.channel].push(guide);
          return acc;
      }, {});

      allChannels.forEach(channel => {
          if (guidesByChannel[channel.id]) {
              channel.guides = guidesByChannel[channel.id];
          }
      });

      renderChannelGrid();

  } catch (error) {
      console.error('Error loading supplementary channel data:', error);
  }
}

// Search functionality
searchInput.addEventListener('input', e => {
  const query = e.target.value.toLowerCase().trim();

  if (query) {
    const filtered = allChannels.filter(c => c.name.toLowerCase().includes(query));
    renderChannelGrid(filtered);
  } else {
    renderChannelGrid();
  }
});

// Add and play a new stream
addStreamBtn.addEventListener('click', () => {
  const url = newStreamUrlInput.value.trim();

  if (!url) {
    alert('Please enter a valid stream URL.');
    return;
  }

  const newChannel = { name: 'Custom Stream', url: url, logo: 'placeholder.png', category: 'Custom' };
  allChannels.unshift(newChannel);
  renderChannelGrid();
  playChannel(newChannel);
  newStreamUrlInput.value = '';
});

// Theme Toggle
const themeToggle = document.getElementById('theme-toggle');
const body = document.body;

const savedTheme = localStorage.getItem('theme') || 'dark';
setTheme(savedTheme);

themeToggle.addEventListener('click', () => {
  const currentTheme = body.classList.contains('dark') ? 'dark' : 'light';
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
  setTheme(newTheme);
  localStorage.setItem('theme', newTheme);
});

function setTheme(theme) {
  if (theme === 'light') {
    body.classList.remove('dark');
    body.classList.add('light');
    themeToggle.classList.add('active');
  } else {
    body.classList.remove('light');
    body.classList.add('dark');
    themeToggle.classList.remove('active');
  }
}

// Initial load
function initializeApp() {
  fetchData();
}

initializeApp();
