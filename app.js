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

// Render channel list
function renderChannelList(filteredChannels = channels) {
  channelList.innerHTML = '';
  filteredChannels.sort((a, b) => a.name.localeCompare(b.name));

  filteredChannels.forEach(channel => {
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

  channelCount.textContent = filteredChannels.length;
}

// Fetch and display channels
async function loadAndDisplayChannels() {
  try {
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

    renderChannelList();
  } catch (error) {
    console.error('Error loading channels:', error);
    alert('Failed to load channels.');
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
  renderChannelList();
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
    const response = await fetch(`https://iptv-org.github.io/api/programmes.json?channel=${channel.id}&date=${today}`);
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
  const filtered = channels.filter(c => c.name.toLowerCase().includes(query));
  renderChannelList(filtered);
});

// Initial load
loadAndDisplayChannels();
