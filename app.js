// Select DOM elements
const videoPlayer = document.getElementById('video-player');
const loadChannelsBtn = document.getElementById('load-channels-btn');
const channelList = document.getElementById('channel-list');
const channelCount = document.getElementById('channel-count');
const newStreamUrlInput = document.getElementById('new-stream-url');
const addStreamBtn = document.getElementById('add-stream-btn');
const searchInput = document.getElementById('search-channels'); // New search input

let channels = []; // Store the loaded channels globally for search and rendering

// Function to initialize the video player with HLS.js
function playChannel(url) {
  if (Hls.isSupported()) {
    const hls = new Hls();
    hls.loadSource(url);
    hls.attachMedia(videoPlayer);
    hls.on(Hls.Events.MANIFEST_PARSED, () => {
      videoPlayer.play();
    });
  } else if (videoPlayer.canPlayType('application/vnd.apple.mpegurl')) {
    videoPlayer.src = url;
    videoPlayer.play();
  } else {
    alert('Your browser does not support HLS streaming.');
  }
}

// Function to render the channel list
function renderChannelList(filteredChannels = channels) {
  // Sort channels alphabetically by name
  filteredChannels.sort((a, b) => (a.name || '').localeCompare(b.name || ''));

  // Clear the existing channel list
  channelList.innerHTML = '';

  // Render each channel
  filteredChannels.forEach((channel) => {
    const channelCard = document.createElement('div');
    channelCard.className = 'channel-card flex justify-between items-center p-4 mb-2 border rounded shadow';

    // Channel name
    const nameElement = document.createElement('span');
    nameElement.textContent = channel.name || 'Unknown Channel';
    nameElement.className = 'text-gray-800 font-medium';

    // Play button with icon
    const playButton = document.createElement('button');
    playButton.className = 'icon-btn flex items-center justify-center p-2 rounded bg-blue-500 text-white hover:bg-blue-600';
    playButton.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M14.752 11.168l-6.518-4.21A1 1 0 007 7.788v8.423a1 1 0 001.234.97l6.518-2.23a1 1 0 00.482-.97v-2.423a1 1 0 00-.482-.97z" />
      </svg>
    `;
    playButton.addEventListener('click', () => playChannel(channel.url));

    // Append elements to the card
    channelCard.appendChild(nameElement);
    channelCard.appendChild(playButton);
    channelList.appendChild(channelCard);
  });

  // Update the channel count
  channelCount.textContent = filteredChannels.length;
}

// Fetch and display channels
async function loadAndDisplayChannels() {
  try {
    const streams = await fetch('https://iptv-org.github.io/api/streams.json').then((res) => res.json());
    channels = streams.map((stream) => ({
      name: stream.channel || 'Unknown Channel', // Keep "name" variable
      url: stream.url,
    }));
    renderChannelList();
  } catch (error) {
    console.error('Error loading channels:', error);
    alert('Failed to load channels. Please try again.');
  }
}

// Add and play a new stream
addStreamBtn.addEventListener('click', () => {
  const url = newStreamUrlInput.value.trim();

  if (!url) {
    alert('Please enter a valid stream URL.');
    return;
  }

  const newChannel = { name: 'Custom Stream', url: url }; // Keep "name" variable
  channels.push(newChannel);
  renderChannelList();
  playChannel(url);
  newStreamUrlInput.value = '';
});

// Search channels on input
searchInput.addEventListener('input', (event) => {
  const query = event.target.value.toLowerCase();
  const filteredChannels = channels.filter((channel) =>
    channel.name.toLowerCase().includes(query)
  );
  renderChannelList(filteredChannels);
});

// Load channels on button click
loadChannelsBtn.addEventListener('click', loadAndDisplayChannels);