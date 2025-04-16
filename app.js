// Select DOM elements
const videoPlayer = document.getElementById('video-player');
const loadChannelsBtn = document.getElementById('load-channels-btn');
const channelList = document.getElementById('channel-list');
const channelCount = document.getElementById('channel-count');
const newStreamUrlInput = document.getElementById('new-stream-url');
const addStreamBtn = document.getElementById('add-stream-btn');

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

// Function to render the channel list with name, URL, and language
function renderChannelList(channels) {
  // Sort channels alphabetically by name
  channels.sort((a, b) => (a.name || '').localeCompare(b.name || ''));

  // Clear existing channels
  channelList.innerHTML = '';

  // Render each channel
  channels.forEach((channel) => {
    const channelCard = document.createElement('div');
    channelCard.className = 'flex flex-col mb-4 p-2 border rounded shadow';

    // Channel details
    const name = document.createElement('h3');
    name.textContent = `Name: ${channel.name || 'Unknown Channel'}`;
    name.className = 'font-semibold text-lg';

    const language = document.createElement('p');
    language.textContent = `Language: ${channel.language || 'Unknown'}`;
    language.className = 'text-gray-600 text-sm';

    const playButton = document.createElement('button');
    playButton.textContent = 'Play Stream';
    playButton.className = 'bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 mt-2';
    playButton.addEventListener('click', () => playChannel(channel.url));

    channelCard.appendChild(name);
    channelCard.appendChild(language);
    channelCard.appendChild(playButton);
    channelList.appendChild(channelCard);
  });

  // Update the channel count
  channelCount.textContent = channels.length;
}

// Fetch channels and match them with feeds and channel details
async function loadAndDisplayChannels() {
  try {
    // Fetch data from APIs
    const [streams, feeds, channels] = await Promise.all([
      fetch('https://iptv-org.github.io/api/streams.json').then((res) => res.json()),
      fetch('https://iptv-org.github.io/api/feeds.json').then((res) => res.json()),
      fetch('https://iptv-org.github.io/api/channels.json').then((res) => res.json()),
    ]);

    // Enrich streams with feed and channel details
    const enrichedChannels = streams
      .map((stream) => {
        const feed = feeds.find((f) => f.id === stream.channel);
        const channel = channels.find((c) => c.id === stream.channel);

        if (feed && channel) {
          return {
            name: channel.name,
            language: feed.language,
            url: stream.url,
          };
        }
        return null; // Exclude mismatched entries
      })
      .filter((channel) => channel !== null); // Remove null entries

    // Render enriched channels
    renderChannelList(enrichedChannels);
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

  // Play the new stream directly
  playChannel(url);

  // Add the new stream temporarily to the list
  const newChannel = { name: 'Custom Stream', language: 'Unknown', url: url };
  renderChannelList([newChannel]);
  newStreamUrlInput.value = '';
});

// Load channels on button click
loadChannelsBtn.addEventListener('click', loadAndDisplayChannels);