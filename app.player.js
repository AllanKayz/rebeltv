// Player UX: loading indicator, error handling, automatic fallback, retry/back, deep-linking

// Player status elements
const playerStatus = document.getElementById('player-status');
const playerLoading = document.getElementById('player-loading');
const playerError = document.getElementById('player-error');
const playerRetry = document.getElementById('player-retry');
const playerBack = document.getElementById('player-back');

let currentPlayback = { channelId: null, attemptedIndex: 0, attemptedSources: [] };
let lastFocusedElement = null;

function showPlayerLoading(message) {
  if (playerLoading && playerStatus) {
    playerLoading.classList.remove('hidden');
    playerError.classList.add('hidden');
    playerLoading.querySelector('p').textContent = message || 'Connecting to stream…';
  }
}

function hidePlayerLoading() {
  if (playerLoading) playerLoading.classList.add('hidden');
}

function showPlayerError() {
  if (playerError && playerStatus) {
    playerError.classList.remove('hidden');
    playerLoading.classList.add('hidden');
    // focus retry button for accessibility
    playerRetry.focus();
  }
}

function hidePlayerError() {
  if (playerError) playerError.classList.add('hidden');
}

function openPlayerOverlay() {
  lastFocusedElement = document.activeElement;
  playerOverlay.classList.remove('hidden');
  playerOverlay.setAttribute('aria-hidden', 'false');
  // focus close button
  document.getElementById('close-player').focus();
}

function closePlayerOverlay() {
  playerOverlay.classList.add('hidden');
  playerOverlay.setAttribute('aria-hidden', 'true');
  hidePlayerError();
  hidePlayerLoading();
  if (player && player.pause) player.pause();
  // restore focus
  if (lastFocusedElement && typeof lastFocusedElement.focus === 'function') lastFocusedElement.focus();
}

// Helper: attempt to play a particular source index for a channel, with optional retry
async function attemptPlayChannel(channel, startIndex = 0) {
  if (!channel || !channel.allStreams || channel.allStreams.length === 0) {
    showPlayerError();
    return;
  }

  openPlayerOverlay();

  currentPlayback.channelId = channel.id;
  currentPlayback.attemptedIndex = startIndex;
  currentPlayback.attemptedSources = channel.allStreams;

  // Try sources sequentially
  for (let i = startIndex; i < channel.allStreams.length; i++) {
    const src = channel.allStreams[i];
    currentPlayback.attemptedIndex = i;
    showPlayerLoading(`Trying source ${i + 1} of ${channel.allStreams.length}…`);

    try {
      const type = src.url.includes('.m3u8') ? 'application/x-mpegURL' : 'video/mp4';
      player.src({ src: src.url, type });
      // Wait for player to emit 'playing' or 'error' within a timeout
      const played = await waitForPlayOrError(10000);
      if (played) {
        hidePlayerLoading();
        hidePlayerError();
        return; // success
      }
    } catch (e) {
      console.warn('Playback attempt failed for source', src.url, e);
    }
    // small backoff before trying next
    await new Promise(r => setTimeout(r, 600));
  }

  // all sources failed
  hidePlayerLoading();
  showPlayerError();
}

// Wait for player to either start playing or emit an error event, with timeout
function waitForPlayOrError(timeout = 10000) {
  return new Promise((resolve) => {
    let resolved = false;
    function onPlaying() {
      if (resolved) return; resolved = true; cleanup(); resolve(true);
    }
    function onError() {
      if (resolved) return; resolved = true; cleanup(); resolve(false);
    }
    function onTimeout() {
      if (resolved) return; resolved = true; cleanup(); resolve(false);
    }
    function cleanup() {
      if (!player) return;
      player.off('playing', onPlaying);
      player.off('error', onError);
      clearTimeout(timer);
    }

    if (!player) { resolve(false); return; }

    player.on('playing', onPlaying);
    player.on('error', onError);

    const timer = setTimeout(onTimeout, timeout);
  });
}

// Hook retry and back buttons
playerRetry.addEventListener('click', () => {
  const channel = channels.find(ch => ch.id === currentPlayback.channelId);
  if (channel) {
    // start from next source after attemptedIndex
    const nextIndex = Math.min(currentPlayback.attemptedIndex + 1, 0);
    attemptPlayChannel(channel, nextIndex);
  }
});

playerBack.addEventListener('click', () => {
  closePlayerOverlay();
});

// Close overlay button
document.getElementById('close-player').addEventListener('click', closePlayerOverlay);

// Deep-linking: open channel if hash present
function parseHashAndOpen() {
  const hash = window.location.hash || '';
  if (!hash.startsWith('#channel=')) return;
  const id = hash.replace('#channel=', '');
  if (!id) return;
  // wait for channels to be loaded
  if (channels.length === 0) return;
  const channel = channels.find(ch => ch.id === id);
  if (channel) {
    // open player for the channel
    attemptPlayChannel(channel, 0);
  } else {
    // invalid id — show friendly message
    alert('Channel not found.');
  }
}

window.addEventListener('hashchange', parseHashAndOpen);

// When user clicks a channel card earlier in code (createChannelCard), it calls playStream
// Replace playStream to integrate with attemptPlayChannel and deep-link update
const originalPlayStream = playStream;
function playStream(streamUrl, name, category, logo, allStreams) {
  // Find channel by matching name+logo+streams heuristics — prefer explicit id if provided
  const channel = channels.find(ch => ch.streamUrl === streamUrl || ch.name === name || (allStreams && ch.allStreams && ch.allStreams.some(s => allStreams.some(a => a.url === s.url))));
  if (channel) {
    // update hash for deep-linking
    window.location.hash = `channel=${channel.id}`;
    // use attemptPlayChannel which supports fallback
    attemptPlayChannel(channel, 0);
  } else {
    // fallback to original behaviour for custom streams
    openPlayerOverlay();
    showPlayerLoading();
    originalPlayStream(streamUrl, name, category, logo, allStreams);
    // hide loading after a small delay — videojs will control playback
    setTimeout(() => hidePlayerLoading(), 1500);
  }
}

