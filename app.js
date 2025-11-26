// Select DOM elements
const videoPlayer = document.getElementById('video-player');
const channelList = document.getElementById('channel-list');
const channelListContainer = document.getElementById('channel-list-container');
const channelCount = document.getElementById('channel-count');
const searchInput = document.getElementById('search-channels');
const newStreamUrlInput = document.getElementById('new-stream-url');
const addStreamBtn = document.getElementById('add-stream-btn');
const epgModal = document.getElementById('epg-modal');
const epgChannelName = document.getElementById('epg-channel-name');
const epgGuide = document.getElementById('epg-guide');
const closeEpgModal = document.getElementById('close-epg-modal');
const nowPlayingTitle = document.getElementById('now-playing-title');
const nowPlayingDescription = document.getElementById('now-playing-description');

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

  // Update now playing info
  nowPlayingTitle.textContent = name;
  nowPlayingDescription.textContent = `Currently playing ${name}. Enjoy the stream!`;

  // Set up the video player
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

// Render channel list with the new grid layout
function renderChannelList(filteredChannels = null) {
  const channelsToRender = filteredChannels || allChannels;
  
  const channelsSlice = channelsToRender.slice(0, (currentPage + 1) * channelsPerPage);

  // Clear channel list only on first page or when filtering
  if (currentPage === 0 || filteredChannels) {
    channelList.innerHTML = '';
  }
  
  channelsSlice.forEach(channel => {
    const channelCard = document.createElement('div');
    channelCard.className = 'channel-card';
    channelCard.addEventListener('click', () => {
      playChannel(channel);
      document.querySelectorAll('.channel-card.active').forEach(c => c.classList.remove('active'));
      channelCard.classList.add('active');
    });


    const logo = document.createElement('img');
    logo.className = 'channel-logo';
    logo.src = getChannelLogo(channel.id, channel.logo);
    logo.alt = `${channel.name} logo`;
    logo.onerror = () => { logo.src = 'placeholder.png'; };

    const name = document.createElement('span');
    name.className = 'channel-name';
    name.textContent = channel.name;

    const cardOverlay = document.createElement('div');
    cardOverlay.className = 'card-overlay';

    // Show EPG button
    if (channel.id && getGuideSources(channel.id).length > 0) {
      const epgButton = document.createElement('button');
      epgButton.className = 'icon-btn';
      epgButton.innerHTML = `<i class="fas fa-calendar-alt"></i>`;
      epgButton.addEventListener('click', (e) => {
        e.stopPropagation();
        openEpgModal(channel)
      });
      cardOverlay.appendChild(epgButton);
    } 

    // Show feeds icons
    const feeds = getFeeds(channel.id);
    if (feeds.length > 0) {
      feeds.forEach(feed => {
        const a = document.createElement('a');
        a.href = feed.url;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        a.className = 'icon-btn';
        a.title = feed.type;
        a.innerHTML = feed.type === 'website' ? '<i class="fas fa-globe"></i>' :
          feed.type === 'facebook' ? '<i class="fab fa-facebook"></i>' :
          feed.type === 'twitter' ? '<i class="fab fa-twitter"></i>' :
          '<i class="fas fa-link"></i>';
        a.addEventListener('click', (e) => e.stopPropagation());
        cardOverlay.appendChild(a);
      });
    }

    channelCard.append(logo, name, cardOverlay);
    channelList.appendChild(channelCard);
  });

  channelCount.textContent = channelsToRender.length;
  hasMoreChannels = channelsSlice.length < channelsToRender.length;
  isLoading = false;
}

// Fetch channels + extra metadata
async function fetchChannels() {
  if (isLoading || !hasMoreChannels) return;

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

      allChannels = newChannels;
      allChannels.sort((a, b) => a.name.localeCompare(b.name));
      renderChannelList();

  } catch (error) {
    console.error('Error loading channels:', error);
    alert('Failed to load channels.');
    isLoading = false;
  }
}

// Load more channels when scrolling
function setupInfiniteScroll() {
  channelListContainer.addEventListener('scroll', () => {
    if (isLoading || !hasMoreChannels) return;
    
    const { scrollTop, scrollHeight, clientHeight } = channelListContainer;
    
    // Load more when user is near the bottom
    if (scrollTop + clientHeight >= scrollHeight - 200) {
      currentPage++;
      renderChannelList();
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
  allChannels.unshift(newChannel); // Add to the top of the list
  currentPage = 0; // Reset to show from the beginning
  renderChannelList(allChannels);
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
  
  currentPage = 0;
  renderChannelList(filtered);
});

// Initial load
function initializeApp() {
  fetchChannels();
  setupInfiniteScroll();
}

initializeApp();
