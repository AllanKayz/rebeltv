// Select DOM elements
const videoPlayer = document.getElementById('video-player');
const channelList = document.getElementById('channel-list');
const channelCount = document.getElementById('channel-count');
const searchInput = document.getElementById('search-channels');
const newStreamUrlInput = document.getElementById('new-stream-url');
const addStreamBtn = document.getElementById('add-stream-btn');
const epgModal = document.getElementById('epg-modal');
const epgChannelName = document.getElementById('epg-channel-name');
const epgGuide = document.getElementById('epg-guide');
const closeEpgModal = document.getElementById('close-epg-modal');

let channels = []; // Store channels globally
let allChannels = []; // Store all channels for filtering
let currentPage = 0;
const channelsPerPage = 50;
let isLoading = false;
let hasMoreChannels = true;

// Initialize video player
function playChannel(channel) {
  const { url, name } = channel;

  // Update now playing info first
  const nowPlayingCard = document.getElementById('now-playing-card');
  const nowPlayingDescription = document.getElementById('now-playing-description');

  nowPlayingDescription.textContent = name;
  nowPlayingCard.style.display = 'block';

  // Update theme on card
  const body = document.body;
  const theme = body.classList.contains('dark') ? 'dark' : 'light';
  if (theme === 'light') {
    nowPlayingCard.style.backgroundColor = '#ffffff';
    nowPlayingCard.style.border = '1px solid #e2e8f0';
  } else {
    nowPlayingCard.style.backgroundColor = '#1e293b';
    nowPlayingCard.style.border = '1px solid #334155';
  }

  // Then, set up the video player
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

// Render channel list with lazy loading
function renderChannelList(filteredChannels = null) {
  const channelsToRender = filteredChannels || allChannels;
  
  // Calculate the range of channels to display
  const startIndex = currentPage * channelsPerPage;
  const endIndex = startIndex + channelsPerPage;
  const channelsSlice = channelsToRender.slice(0, endIndex);
  
  // Clear channel list only on first page or when filtering
  if (currentPage === 0 || filteredChannels) {
    channelList.innerHTML = '';
  }
  
  channelsSlice.sort((a, b) => a.name.localeCompare(b.name));
  
  channelsSlice.forEach(channel => {
    const channelCard = document.createElement('div');
    channelCard.className = 'channel-card';

    const leftContainer = document.createElement('div');
    leftContainer.className = 'flex items-center cursor-pointer';
    leftContainer.addEventListener('click', () => playChannel(channel));

    const logo = document.createElement('img');
    logo.className = 'channel-logo';
    logo.src = channel.logo || 'placeholder.png'; // Fallback image
    logo.alt = `${channel.name} logo`;
    logo.onerror = () => { logo.src = 'placeholder.png'; }; // Handle broken images

    const name = document.createElement('span');
    name.textContent = channel.name;

    leftContainer.append(logo, name);
    channelCard.append(leftContainer);

    if (channel.id) { // Only show EPG button for non-custom streams
      const epgButton = document.createElement('button');
      epgButton.className = 'icon-btn';
      epgButton.innerHTML = `<i class="fas fa-calendar-alt"></i>`;
      epgButton.addEventListener('click', () => openEpgModal(channel));
      channelCard.append(epgButton);
    }

    channelList.appendChild(channelCard);
  });

  channelCount.textContent = channelsToRender.length;
  hasMoreChannels = endIndex < channelsToRender.length;
  isLoading = false;
}

// Fetch channels with pagination
async function fetchChannels(page = 0) {
  try {
    isLoading = true;
    
    const [streamsRes, channelsRes] = await Promise.all([
      fetch('https://iptv-org.github.io/api/streams.json'),
      fetch('https://iptv-org.github.io/api/channels.json'),
    ]);

    const streams = await streamsRes.json();
    const channelData = await channelsRes.json();

    const channelsMap = new Map(channelData.map(c => [c.id, c]));

    const newChannels = streams
      .map(stream => {
        const channelInfo = channelsMap.get(stream.channel);
        if (!channelInfo) return null;

        return {
          name: channelInfo.name,
          url: stream.url,
          logo: channelInfo.logo,
          id: channelInfo.id,
        };
      })
      .filter(Boolean);

    // If it's the first page, replace all channels
    if (page === 0) {
      allChannels = newChannels;
      channels = [...newChannels];
    } else {
      // For subsequent pages, append to existing channels
      allChannels = [...allChannels, ...newChannels];
      channels = [...channels, ...newChannels];
    }

    renderChannelList();
  } catch (error) {
    console.error('Error loading channels:', error);
    alert('Failed to load channels.');
    isLoading = false;
  }
}

// Load more channels when scrolling
function setupInfiniteScroll() {
  channelList.addEventListener('scroll', () => {
    if (isLoading || !hasMoreChannels) return;
    
    const { scrollTop, scrollHeight, clientHeight } = channelList;
    
    // Load more when user is near the bottom
    if (scrollTop + clientHeight >= scrollHeight - 100) {
      currentPage++;
      fetchChannels(currentPage);
    }
  });
}

// Add and play a new stream
addStreamBtn.addEventListener('click', () => {
  const url = newStreamUrlInput.value.trim();

  if (!url) {
    alert('Please enter a valid stream URL.');
    return;
  }

  const newChannel = { name: 'Custom Stream', url: url, logo: 'placeholder.png' };
  channels.push(newChannel);
  allChannels.push(newChannel);
  renderChannelList();
  playChannel(newChannel);
  newStreamUrlInput.value = '';
});

// EPG Modal Functions
async function openEpgModal(channel) {
  epgChannelName.textContent = channel.name;
  epgGuide.innerHTML = '<li>Loading...</li>';
  epgModal.classList.remove('hidden');

  try {
    const today = new Date().toISOString().slice(0, 10);
    const response = await fetch(`https://iptv-org.github.io/api/epg.json?channel=${channel.id}&date=${today}`);
    const programs = await response.json();

    epgGuide.innerHTML = '';
    if (programs.length > 0) {
      programs.forEach(program => {
        const item = document.createElement('li');
        item.textContent = `${new Date(program.start).toLocaleTimeString()} - ${program.title}`;
        epgGuide.appendChild(item);
      });
    } else {
      epgGuide.innerHTML = '<li>No program guide available.</li>';
    }
  } catch (error) {
    console.error('Error fetching EPG data:', error);
    epgGuide.innerHTML = '<li>Error loading guide.</li>';
  }
}

closeEpgModal.addEventListener('click', () => {
  epgModal.classList.add('hidden');
});

// Search functionality
searchInput.addEventListener('input', e => {
  const query = e.target.value.toLowerCase();
  const filtered = allChannels.filter(c => c.name.toLowerCase().includes(query));
  
  // Reset pagination when searching
  currentPage = 0;
  renderChannelList(filtered);
});

// Initial load
function initializeApp() {
  fetchChannels(0);
  setupInfiniteScroll();
}

initializeApp();