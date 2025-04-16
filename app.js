// Select DOM elements
const videoPlayer = document.getElementById('video-player');
const channelInput = document.getElementById('channel-url');
const addChannelBtn = document.getElementById('add-channel-btn');
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
  channelList.innerHTML = '';
  channels.forEach((channel) => {
    const listItem = document.createElement('li');
    listItem.className = 'mb-2 flex justify-between items-center';
    
    const channelLink = document.createElement('button');
    channelLink.textContent = channel.name;
    channelLink.className = 'text-blue-500 hover:underline';
    channelLink.addEventListener('click', () => playChannel(channel.url));
    
    listItem.appendChild(channelLink);
    channelList.appendChild(listItem);
  });
}

// Fetch channels from the JSON file and render them
loadChannelsBtn.addEventListener('click', () => {
  fetch('channels.json')
    .then((response) => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    })
    .then((channels) => {
      renderChannelList(channels);
    })
    .catch((error) => {
      console.error('Error fetching channel list:', error);
      alert('Failed to load channel list. Please try again.');
    });
});

// Add Channel Button Click Event
addChannelBtn.addEventListener('click', () => {
  const url = channelInput.value.trim();
  if (!url) {
    alert('Please enter a valid channel URL.');
    return;
  }

  const channelName = prompt('Enter a name for this channel:');
  if (!channelName) {
    alert('Channel name is required.');
    return;
  }

  // Play the added channel
  playChannel(url);

  // Add the channel to the list
  renderChannelList([{ name: channelName, url }]);
  channelInput.value = '';
});