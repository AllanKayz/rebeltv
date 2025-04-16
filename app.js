// Select DOM elements
const videoPlayer = document.getElementById('video-player');
const loadChannelsBtn = document.getElementById('load-channels-btn');
const channelList = document.getElementById('channel-list');

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
function renderChannelList(channels) {
  // Sort channels alphabetically by name
  channels.sort((a, b) => (a.name || '').localeCompare(b.name || ''));

  // Clear existing channels
  const channelList = document.getElementById('channel-list');
  channelList.innerHTML = '';

  // Render sorted channels
  channels.forEach((channel) => {
    const listItem = document.createElement('li');
    listItem.className = 'mb-2 flex justify-between items-center';

    const channelLink = document.createElement('button');
    channelLink.textContent = channel.name || 'Unknown Channel';
    channelLink.className = 'text-blue-500 hover:underline';
    channelLink.addEventListener('click', () => playChannel(channel.url));

    listItem.appendChild(channelLink);
    channelList.appendChild(listItem);
  });
}

// Fetch channels from the IPTV streams JSON and render them
loadChannelsBtn.addEventListener('click', () => {
  fetch('https://iptv-org.github.io/api/streams.json')
    .then((response) => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    })
    .then((data) => {
      // Filter channels with valid URLs and render them
      const validChannels = data.filter((channel) => channel.url);
      renderChannelList(validChannels);
    })
    .catch((error) => {
      console.error('Error fetching channels:', error);
      alert('Failed to load channel list. Please try again.');
    });
});