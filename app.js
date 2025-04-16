// Select DOM elements
const videoPlayer = document.getElementById('video-player');
const channelList = document.getElementById('channel-list');
const channelCount = document.getElementById('channel-count');
const newStreamUrlInput = document.getElementById('new-stream-url');
const addStreamBtn = document.getElementById('add-stream-btn');
const searchInput = document.getElementById('search-channels');

let channels = []; // Store the loaded channels globally
let groupedChannels = {}; // Store channels grouped by category

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

// Function to render the channel list grouped by category
function renderGroupedChannelList(filteredGroupedChannels = groupedChannels) {
  // Clear existing channel list
  channelList.innerHTML = '';

  // Render each category
  for (const [category, channels] of Object.entries(filteredGroupedChannels)) {
    // Create category header
    const categoryHeader = document.createElement('h3');
    categoryHeader.textContent = category;
    categoryHeader.className = 'text-lg font-bold mt-4 mb-2 text-gray-700';
    channelList.appendChild(categoryHeader);

    // Render channels under the category
    channels.forEach((channel) => {
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
  }

  // Update the channel count
  const totalChannels = Object.values(filteredGroupedChannels).flat().length;
  channelCount.textContent = totalChannels;
}

// Function to group channels by category
function groupChannelsByCategory(channels) {
  return channels.reduce((grouped, channel) => {
    const category = channel.category || 'Uncategorized';
    if (!grouped[category]) {
      grouped[category] = [];
    }
    grouped[category].push(channel);
    return grouped;
  }, {});
}

// Fetch and display channels on app initialization
async function initializeChannels() {
  try {
    // Fetch streams.json and channels.json
    const streams = await fetch('https://iptv-org.github.io/api/streams.json').then((res) => res.json());
    const channelsJson = await fetch('https://iptv-org.github.io/api/channels.json').then((res) => res.json());

    // Match streams with channels.json and add categories
    channels = streams.map((stream) => {
      const matchedChannel = channelsJson.find((channel) => channel.url === stream.url);
      return {
        name: matchedChannel?.name || stream.channel || 'Unknown Channel',
        url: stream.url,
        category: matchedChannel?.category || 'Uncategorized',
      };
    });

    // Group channels by category
    groupedChannels = groupChannelsByCategory(channels);

    // Render the grouped channel list
    renderGroupedChannelList();
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

  const newChannel = { name: 'Custom Stream', url: url, category: 'Custom' };
  channels.push(newChannel);

  // Update grouped channels and re-render
  groupedChannels = groupChannelsByCategory(channels);
  renderGroupedChannelList();

  playChannel(url);
  newStreamUrlInput.value = '';
});

// Search channels on input
searchInput.addEventListener('input', (event) => {
  const query = event.target.value.toLowerCase();

  // Filter channels by search query
  const filteredGroupedChannels = {};
  for (const [category, channels] of Object.entries(groupedChannels)) {
    const filteredChannels = channels.filter((channel) =>
      channel.name.toLowerCase().includes(query)
    );
    if (filteredChannels.length > 0) {
      filteredGroupedChannels[category] = filteredChannels;
    }
  }

  // Render the filtered channel list
  renderGroupedChannelList(filteredGroupedChannels);
});

// Automatically load channels on app initialization
initializeChannels();