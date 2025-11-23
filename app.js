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
// Add this to your EPG modal markup for guide source display
const epgSourceInfo = document.getElementById('epg-source-info'); 

let channels = []; // Store channels globally
let allChannels = []; // Store all channels for filtering
let currentPage = 0;
const channelsPerPage = 50;
let isLoading = false;
let hasMoreChannels = true;

// Extra metadata holders
let channelLogosMap = {};
let guidesByChannel = {};
let feedsByChannel = {};

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
  nowPlayingCard.style.backgroundColor = theme === 'light' ? '#ffffff' : '#1e293b';
  nowPlayingCard.style.border = theme === 'light' ? '1px solid #e2e8f0' : '1px solid #334155';

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

// Get logo using channels.json > logos.json fallback
function getChannelLogo(channelId, primaryLogo) {
  if (primaryLogo) return primaryLogo;
  return channelLogosMap[channelId] || 'placeholder.png';
}

// Get guides for a channel
function getGuideSources(channelId) {
  return guidesByChannel[channelId] || [];
}

// Get feeds for channel
function getFeeds(channelId) {
  return feedsByChannel[channelId] || [];
}

// Render channel list with lazy loading & new metadata
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
    logo.src = getChannelLogo(channel.id, channel.logo); // Use fallback logic
    logo.alt = `${channel.name} logo`;
    logo.onerror = () => { logo.src = 'placeholder.png'; }; // Handle broken images

    const name = document.createElement('span');
    name.textContent = channel.name;
    leftContainer.append(logo, name);
    channelCard.append(leftContainer);

    // Show EPG button and sources info
    /*
    if (channel.id) { 
      const epgButton = document.createElement('button');
      epgButton.className = 'icon-btn';
      epgButton.innerHTML = `<i class="fas fa-calendar-alt"></i>`;
      epgButton.addEventListener('click', () => openEpgModal(channel));

      const guideSources = getGuideSources(channel.id);
      if (guideSources.length > 0) {
        const guideInfo = document.createElement('span');
        guideInfo.className = 'epg-guide-info';
        guideInfo.title = 'EPG sources: ' + guideSources.map(g => g.name).join(', ');
        guideInfo.innerHTML = `<i class="fas fa-info-circle"></i>`;
        epgButton.appendChild(guideInfo);
      }

      channelCard.append(epgButton);
    } */

    // Show feeds icons
    const feeds = getFeeds(channel.id);
    /*
    if (feeds.length > 0) {
      const feedsContainer = document.createElement('div');
      feedsContainer.className = 'feeds-list';
      feeds.forEach(feed => {
        const a = document.createElement('a');
        a.href = feed.url;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        a.className = 'feed-icon';
        a.title = feed.type;
        a.innerHTML = feed.type === 'website' ? '<i class="fas fa-globe"></i>' :
          feed.type === 'facebook' ? '<i class="fab fa-facebook"></i>' :
          feed.type === 'twitter' ? '<i class="fab fa-twitter"></i>' :
          '<i class="fas fa-link"></i>';
        feedsContainer.appendChild(a);
      });
      channelCard.append(feedsContainer);
    }

    channelList.appendChild(channelCard);
  });*/

  channelCount.textContent = channelsToRender.length;
  hasMoreChannels = endIndex < channelsToRender.length;
  isLoading = false;
}

// Fetch channels + extra metadata
async function fetchChannels(page = 0) {
  try {
    isLoading = true;
    
    const [streamsRes, channelsRes, channelLogosRes, guidesRes, feedsRes] = await Promise.all([
      fetch('https://iptv-org.github.io/api/streams.json'),
      fetch('https://iptv-org.github.io/api/channels.json'),
      fetch('https://iptv-org.github.io/api/logos.json'),
      fetch('https://iptv-org.github.io/api/guides.json'),
      fetch('https://iptv-org.github.io/api/feeds.json'),
    ]);

    const streams = await streamsRes.json();
    const channelData = await channelsRes.json();
    const channelLogos = await channelLogosRes.json();
    const guides = await guidesRes.json();
    const feeds = await feedsRes.json();

    const channelsMap = new Map(channelData.map(c => [c.id, c]));
    channelLogosMap = {};
    channelLogos.forEach(l => { channelLogosMap[l.channel] = l.url; });

    guidesByChannel = {};
    guides.forEach(g => {
      if (!guidesByChannel[g.channel]) guidesByChannel[g.channel] = [];
      guidesByChannel[g.channel].push(g);
    });

    feedsByChannel = {};
    feeds.forEach(f => {
      if (!feedsByChannel[f.channel]) feedsByChannel[f.channel] = [];
      feedsByChannel[f.channel].push(f);
    });

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

  // Show guide source(s) info at top
  const guideSources = getGuideSources(channel.id);
  if (epgSourceInfo) {
    epgSourceInfo.textContent =
      guideSources.length > 0
        ? "Guide sources: " + guideSources.map(g => g.name).join(', ')
        : "No EPG sources found.";
  }

  try {
    const today = new Date().toISOString().slice(0, 10);
    const response = await fetch(`https://iptv-org.github.io/api/guides.json?channel=${channel.id}&date=${today}`);
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
