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

let channels = []; // Store all channels globally
let filteredChannels = []; // Store filtered channels for search
let displayedChannels = []; // Currently displayed channels
let isLoading = false;
let currentBatch = 0;
const BATCH_SIZE = 50; // Number of channels to load per batch

// Initialize video player
function playChannel(url) {
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
function renderChannelList(channelsToRender = displayedChannels, append = false) {
  if (!append) {
    channelList.innerHTML = '';
    currentBatch = 0;
  }

  // Sort channels alphabetically
  channelsToRender.sort((a, b) => a.name.localeCompare(b.name));

  channelsToRender.forEach(channel => {
    const channelCard = document.createElement('div');
    channelCard.className = 'channel-card';

    const leftContainer = document.createElement('div');
    leftContainer.className = 'flex items-center cursor-pointer';
    leftContainer.addEventListener('click', () => playChannel(channel.url));

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

  channelCount.textContent = `${displayedChannels.length} of ${filteredChannels.length} channels`;
}

// Load next batch of channels
function loadNextBatch() {
  if (isLoading || currentBatch * BATCH_SIZE >= filteredChannels.length) {
    return;
  }

  isLoading = true;
  
  // Show loading indicator
  const loadingIndicator = document.createElement('div');
  loadingIndicator.className = 'loading-indicator';
  loadingIndicator.textContent = 'Loading more channels...';
  channelList.appendChild(loadingIndicator);

  // Simulate loading delay for better UX (remove in production)
  setTimeout(() => {
    const startIndex = currentBatch * BATCH_SIZE;
    const endIndex = startIndex + BATCH_SIZE;
    const nextBatch = filteredChannels.slice(startIndex, endIndex);
    
    displayedChannels = displayedChannels.concat(nextBatch);
    currentBatch++;
    
    // Remove loading indicator
    channelList.removeChild(loadingIndicator);
    
    // Render the new batch
    renderChannelList(nextBatch, true);
    
    isLoading = false;
  }, 300);
}

// Check if user has scrolled to bottom
function isScrollNearBottom() {
  const { scrollTop, scrollHeight, clientHeight } = document.documentElement;
  return scrollTop + clientHeight >= scrollHeight - 100; // 100px from bottom
}

// Fetch and display channels with lazy loading
async function loadAndDisplayChannels() {
  try {
    // Show initial loading state
    channelList.innerHTML = '<div class="loading-indicator">Loading channels...</div>';
    
    const [streamsRes, channelsRes] = await Promise.all([
      fetch('https://iptv-org.github.io/api/streams.json'),
      fetch('https://iptv-org.github.io/api/channels.json'),
    ]);

    const streams = await streamsRes.json();
    const channelData = await channelsRes.json();

    const channelsMap = new Map(channelData.map(c => [c.id, c]));

    channels = streams
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

    // Initialize filtered channels with all channels
    filteredChannels = [...channels];
    displayedChannels = [];
    
    // Load first batch
    loadNextBatch();
  } catch (error) {
    console.error('Error loading channels:', error);
    channelList.innerHTML = '<div class="error-message">Failed to load channels. Please try again later.</div>';
  }
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
  filteredChannels.push(newChannel);
  displayedChannels.push(newChannel);
  
  // Re-render to show the new channel
  renderChannelList([newChannel], true);
  playChannel(url);
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
    const programmes = await response.json();

    epgGuide.innerHTML = '';
    if (programmes && programmes.length > 0) {
      // Get today's programmes for this channel
      const channelProgrammes = programmes.filter(program => 
        program.channel === channel.id && 
        program.start.startsWith(today)
      ).slice(0, 20); // Limit to 20 programmes
      
      if (channelProgrammes.length > 0) {
        channelProgrammes.forEach(program => {
          const item = document.createElement('li');
          item.textContent = `${new Date(program.start).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - ${program.title}`;
          epgGuide.appendChild(item);
        });
      } else {
        epgGuide.innerHTML = '<li>No programmes available for today.</li>';
      }
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

// Search functionality with lazy loading
searchInput.addEventListener('input', e => {
  const query = e.target.value.toLowerCase();
  
  if (query === '') {
    filteredChannels = [...channels];
  } else {
    filteredChannels = channels.filter(c => c.name.toLowerCase().includes(query));
  }
  
  displayedChannels = [];
  currentBatch = 0;
  renderChannelList();
  loadNextBatch(); // Load first batch of search results
});

// Scroll event for infinite scrolling
window.addEventListener('scroll', () => {
  if (isScrollNearBottom() && !isLoading) {
    loadNextBatch();
  }
});

// Initial load
loadAndDisplayChannels();