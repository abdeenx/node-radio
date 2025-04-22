// Audio Player Module

// Socket.io connection
let socket;

// Player state
let playerState = {
  currentTrack: null,
  isPlaying: false,
  currentTime: 0,
  volume: 1.0,
  roomId: null,
  playlist: [],
  syncInterval: null,
  seeking: false,
  lastSyncTime: 0
};

// DOM elements
const audioPlayer = document.getElementById('audio-player');
const playButton = document.getElementById('play-button');
const prevButton = document.getElementById('prev-button');
const nextButton = document.getElementById('next-button');
const currentTimeDisplay = document.getElementById('current-time');
const durationDisplay = document.getElementById('duration');
const seekBar = document.getElementById('seek-bar');
const seekContainer = document.getElementById('seek-container');
const volumeSlider = document.getElementById('volume-slider');
const nowPlayingTitle = document.getElementById('now-playing-title');
const nowPlayingArtist = document.getElementById('now-playing-artist');
const playerContainer = document.getElementById('player-container');
const playlistContainer = document.getElementById('playlist-container');
const playlistElement = document.getElementById('playlist');
const roomInfo = document.getElementById('room-info');
const roomName = document.getElementById('room-name');
const roomDescription = document.getElementById('room-description');

// Initialize player
function initPlayer() {
  // Set default volume
  audioPlayer.volume = playerState.volume;
  volumeSlider.value = playerState.volume * 100;
  
  // Add event listeners
  playButton.addEventListener('click', togglePlay);
  prevButton.addEventListener('click', playPrevious);
  nextButton.addEventListener('click', playNext);
  volumeSlider.addEventListener('input', handleVolumeChange);
  audioPlayer.addEventListener('timeupdate', updateTimeDisplay);
  audioPlayer.addEventListener('loadedmetadata', updateDuration);
  audioPlayer.addEventListener('ended', handleTrackEnd);
  
  // Seek functionality
  seekContainer.addEventListener('click', handleSeek);
  
  // Initialize Socket.io connection
  socket = io();
  
  // Socket event listeners
  socket.on('connect', () => {
    console.log('Connected to Socket.io server');
  });
  
  socket.on('roomState', handleRoomState);
  socket.on('playbackUpdate', handlePlaybackUpdate);
  socket.on('seekUpdate', handleSeekUpdate);
  socket.on('nowPlaying', handleNowPlaying);
  socket.on('playlistUpdate', handlePlaylistUpdate);
  socket.on('volumeUpdate', handleRemoteVolumeChange);
}

// Join a room
function joinRoom(roomId) {
  // Leave current room if already in one
  if (playerState.roomId) {
    socket.emit('leaveRoom', playerState.roomId);
  }
  
  // Update state
  playerState.roomId = roomId;
  
  // Join new room
  socket.emit('joinRoom', roomId);
  
  // Show room info and player
  roomInfo.classList.remove('hidden');
  playerContainer.classList.remove('hidden');
  playlistContainer.classList.remove('hidden');
  
  // Load room data
  loadRoomData(roomId);
}

// Load room data
async function loadRoomData(roomId) {
  try {
    const roomData = await roomApi.getRoom(roomId);
    
    // Update room info
    roomName.textContent = roomData.name;
    roomDescription.textContent = roomData.description || 'No description';
    
    // Mark room as active in the rooms list
    const roomItems = document.querySelectorAll('.room-item');
    roomItems.forEach(item => {
      if (item.dataset.roomId === roomId) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });
  } catch (error) {
    console.error('Error loading room data:', error);
    showToast('Error loading room data', 'error');
  }
}

// Handle room state update
function handleRoomState(state) {
  console.log('Room state received:', state);
  
  playerState.playlist = state.playlist || [];
  playerState.isPlaying = state.isPlaying;
  playerState.currentTime = state.currentTime;
  
  // Update playlist UI
  renderPlaylist();
  
  // Load current track if available
  if (state.currentTrack) {
    loadTrack(state.currentTrack);
    
    // Set current time
    if (audioPlayer.readyState > 0) {
      audioPlayer.currentTime = state.currentTime;
    }
    
    // Start or pause playback
    if (state.isPlaying) {
      audioPlayer.play().catch(error => {
        console.error('Error playing audio:', error);
      });
      playButton.innerHTML = '<i class="fas fa-pause"></i>';
    } else {
      audioPlayer.pause();
      playButton.innerHTML = '<i class="fas fa-play"></i>';
    }
  }
}

// Toggle play/pause
function togglePlay() {
  if (!playerState.roomId || !playerState.currentTrack) {
    showToast('No track selected', 'info');
    return;
  }
  
  socket.emit('togglePlay', playerState.roomId);
}

// Play previous track
function playPrevious() {
  if (!playerState.roomId) {
    showToast('No room joined', 'info');
    return;
  }
  
  socket.emit('prevTrack', playerState.roomId);
}

// Play next track
function playNext() {
  if (!playerState.roomId) {
    showToast('No room joined', 'info');
    return;
  }
  
  socket.emit('nextTrack', playerState.roomId);
}

// Handle volume change
function handleVolumeChange() {
  const volume = volumeSlider.value / 100;
  audioPlayer.volume = volume;
  playerState.volume = volume;
  
  // Broadcast volume change to others for UI consistency
  if (playerState.roomId) {
    socket.emit('volumeChange', {
      roomId: playerState.roomId,
      volume: volume
    });
  }
}

// Handle remote volume change
function handleRemoteVolumeChange(volume) {
  // Only update the UI, not the actual playback volume
  volumeSlider.value = volume * 100;
}

// Handle seek
function handleSeek(event) {
  if (!playerState.roomId || !playerState.currentTrack) return;
  
  const rect = seekContainer.getBoundingClientRect();
  const clickPosition = (event.clientX - rect.left) / rect.width;
  const seekTime = audioPlayer.duration * clickPosition;
  
  // Update local state
  playerState.seeking = true;
  audioPlayer.currentTime = seekTime;
  
  // Emit seek event to server
  socket.emit('seek', {
    roomId: playerState.roomId,
    time: seekTime
  });
  
  playerState.seeking = false;
}

// Handle remote seek update
function handleSeekUpdate(time) {
  if (playerState.seeking) return;
  
  audioPlayer.currentTime = time;
}

// Update time display
function updateTimeDisplay() {
  // Update current time display
  currentTimeDisplay.textContent = formatTime(audioPlayer.currentTime);
  
  // Update seek bar
  if (audioPlayer.duration) {
    const progress = (audioPlayer.currentTime / audioPlayer.duration) * 100;
    seekBar.style.width = `${progress}%`;
  }
}

// Update duration display
function updateDuration() {
  durationDisplay.textContent = formatTime(audioPlayer.duration);
}

// Handle track end
function handleTrackEnd() {
  if (playerState.roomId) {
    socket.emit('nextTrack', playerState.roomId);
  }
}

// Handle playback update
function handlePlaybackUpdate(data) {
  console.log('Playback update:', data);
  
  playerState.isPlaying = data.isPlaying;
  
  if (data.isPlaying) {
    // Start playback if not already playing
    if (audioPlayer.paused) {
      audioPlayer.play().catch(error => {
        console.error('Error playing audio:', error);
      });
    }
    playButton.innerHTML = '<i class="fas fa-pause"></i>';
  } else {
    audioPlayer.pause();
    playButton.innerHTML = '<i class="fas fa-play"></i>';
  }
  
  // Update current time if needed
  if (Math.abs(audioPlayer.currentTime - data.currentTime) > 1 && !playerState.seeking) {
    audioPlayer.currentTime = data.currentTime;
  }
}

// Handle now playing update
function handleNowPlaying(track) {
  console.log('Now playing:', track);
  loadTrack(track);
}

// Load track
function loadTrack(track) {
  playerState.currentTrack = track;
  
  // Update audio source
  audioPlayer.src = track.cloudinaryUrl;
  
  // Update now playing info
  nowPlayingTitle.textContent = track.title;
  nowPlayingArtist.textContent = track.artist;
  
  // Mark active track in playlist
  const trackItems = document.querySelectorAll('.playlist-track');
  trackItems.forEach(item => {
    if (item.dataset.trackId === track.id) {
      item.classList.add('active');
    } else {
      item.classList.remove('active');
    }
  });
  
  // Increment play count
  if (track.id) {
    trackApi.incrementPlayCount(track.id).catch(error => {
      console.error('Error incrementing play count:', error);
    });
  }
}

// Handle playlist update
function handlePlaylistUpdate(playlist) {
  console.log('Playlist update:', playlist);
  playerState.playlist = playlist;
  renderPlaylist();
}

// Render playlist
function renderPlaylist() {
  if (!playerState.playlist || playerState.playlist.length === 0) {
    playlistElement.innerHTML = '<p class="text-gray-400 text-center">No tracks in playlist</p>';
    return;
  }
  
  // Clear playlist
  playlistElement.innerHTML = '';
  
  // Add tracks to playlist
  playerState.playlist.forEach((item, index) => {
    const trackItem = document.createElement('div');
    trackItem.className = 'track-item playlist-track bg-gray-700 p-3 rounded-md flex justify-between items-center';
    trackItem.dataset.trackId = item.id;
    trackItem.dataset.index = index;
    
    // Mark active track
    if (playerState.currentTrack && item.id === playerState.currentTrack.id) {
      trackItem.classList.add('active');
    }
    
    trackItem.innerHTML = `
      <div>
        <h3 class="font-medium">${item.title}</h3>
        <p class="text-sm text-gray-400">${item.artist}</p>
      </div>
      <div class="flex items-center space-x-2">
        <span class="text-sm text-gray-400">${formatTime(item.duration)}</span>
        <button class="remove-track-btn text-red-500 hover:text-red-400" data-index="${index}">
          <i class="fas fa-times"></i>
        </button>
      </div>
    `;
    
    playlistElement.appendChild(trackItem);
  });
  
  // Add event listeners to remove buttons
  const removeButtons = document.querySelectorAll('.remove-track-btn');
  removeButtons.forEach(button => {
    button.addEventListener('click', (event) => {
      event.stopPropagation();
      const index = button.dataset.index;
      removeTrackFromPlaylist(index);
    });
  });
}

// Remove track from playlist
async function removeTrackFromPlaylist(index) {
  if (!playerState.roomId) return;
  
  try {
    await roomApi.removeTrackFromPlaylist(playerState.roomId, index);
    showToast('Track removed from playlist', 'success');
  } catch (error) {
    console.error('Error removing track from playlist:', error);
    showToast('Error removing track from playlist', 'error');
  }
}

// Add track to playlist
async function addTrackToPlaylist(trackId) {
  if (!playerState.roomId) {
    showToast('Please join a room first', 'info');
    return;
  }
  
  try {
    await roomApi.addTrackToPlaylist(playerState.roomId, trackId);
    showToast('Track added to playlist', 'success');
  } catch (error) {
    console.error('Error adding track to playlist:', error);
    showToast('Error adding track to playlist', 'error');
  }
} 