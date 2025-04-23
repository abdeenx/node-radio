/**
 * Node Radio - App Bundle
 * This file contains all the application logic bundled together
 */

// App Modules
const App = {
  // State
  state: {
    isAuthenticated: false,
    user: null,
    currentRoom: null,
    tracks: [],
    rooms: [],
    currentTrack: null,
    isPlaying: false
  },

  // Initialize the application
  init: function() {
    debugLog('App initializing...', 'app');
    
    // Initialize UI
    this.initUI();
    
    // Initialize socket connection
    this.initSocket();
    
    // Load initial data
    this.fetchTracks();
    this.fetchRooms();
    
    // Set up event listeners
    this.setupEventListeners();
    
    debugLog('App initialized', 'app');
  },
  
  // Initialize UI components
  initUI: function() {
    debugLog('Setting up UI', 'app');
    
    // Set up app container
    const appContent = document.getElementById('app-content');
    if (appContent) {
      // Basic app structure
      appContent.innerHTML = `
        <div class="app-grid">
          <!-- Left sidebar -->
          <div class="sidebar">
            <div class="panel">
              <h2>Rooms</h2>
              <div id="rooms-list" class="list-container">
                <p class="loading-placeholder">Loading rooms...</p>
              </div>
              <button id="create-room-button" class="btn full-width">Create Room</button>
            </div>
            
            <div class="panel">
              <h2>Upload Track</h2>
              <form id="upload-form">
                <div class="form-group">
                  <label for="track-title">Title</label>
                  <input type="text" id="track-title" required>
                </div>
                <div class="form-group">
                  <label for="track-artist">Artist</label>
                  <input type="text" id="track-artist" required>
                </div>
                <div class="form-group">
                  <label for="track-file">Audio File</label>
                  <input type="file" id="track-file" accept="audio/*" required>
                </div>
                <button type="submit" class="btn btn-success full-width">Upload</button>
              </form>
              <div id="upload-progress" class="progress-container hidden">
                <div class="progress-bar">
                  <div id="upload-progress-bar" style="width: 0%"></div>
                </div>
                <p id="upload-status">Uploading: 0%</p>
              </div>
            </div>
          </div>
          
          <!-- Main content -->
          <div class="main-content">
            <!-- Room info -->
            <div id="room-info" class="panel hidden">
              <h2 id="room-name">Room Name</h2>
              <p id="room-description">Room description</p>
            </div>
            
            <!-- Player -->
            <div id="player-container" class="panel hidden">
              <div class="player-info">
                <h3 id="now-playing-title">Not Playing</h3>
                <p id="now-playing-artist">Select a track to begin</p>
              </div>
              
              <audio id="audio-player" class="hidden"></audio>
              
              <div class="player-controls">
                <button id="prev-button" class="btn-icon">
                  <i class="fas fa-step-backward"></i>
                </button>
                <button id="play-button" class="btn-icon btn-play">
                  <i class="fas fa-play"></i>
                </button>
                <button id="next-button" class="btn-icon">
                  <i class="fas fa-step-forward"></i>
                </button>
                <div class="volume-control">
                  <i class="fas fa-volume-down"></i>
                  <input id="volume-slider" type="range" min="0" max="100" value="100">
                </div>
              </div>
              
              <div class="progress-container">
                <span id="current-time">0:00</span>
                <div id="seek-container" class="progress-bar">
                  <div id="seek-bar" style="width: 0%"></div>
                </div>
                <span id="duration">0:00</span>
              </div>
            </div>
            
            <!-- Playlist -->
            <div id="playlist-container" class="panel hidden">
              <h2>Playlist</h2>
              <div id="playlist" class="list-container">
                <p class="placeholder">No tracks in playlist</p>
              </div>
            </div>
            
            <!-- Library -->
            <div id="library-container" class="panel">
              <h2>Track Library</h2>
              <div id="track-library" class="list-container">
                <p class="loading-placeholder">Loading tracks...</p>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Modals -->
        <div id="create-room-modal" class="modal hidden">
          <div class="modal-overlay"></div>
          <div class="modal-content">
            <h2>Create Room</h2>
            <form id="create-room-form">
              <div class="form-group">
                <label for="room-name-input">Room Name</label>
                <input type="text" id="room-name-input" required>
              </div>
              <div class="form-group">
                <label for="room-description-input">Description</label>
                <textarea id="room-description-input" rows="3"></textarea>
              </div>
              <div class="form-actions">
                <button type="button" id="cancel-create-room" class="btn">Cancel</button>
                <button type="submit" class="btn btn-primary">Create</button>
              </div>
            </form>
          </div>
        </div>
      `;
      
      // Add styles for app components
      this.addStyles();
    }
  },
  
  // Add required styles
  addStyles: function() {
    const styleElement = document.createElement('style');
    styleElement.textContent = `
      /* App Grid Layout */
      .app-grid {
        display: grid;
        grid-template-columns: 300px 1fr;
        gap: 20px;
      }
      
      @media (max-width: 768px) {
        .app-grid {
          grid-template-columns: 1fr;
        }
      }
      
      /* Panels */
      .panel {
        background-color: #1e1e1e;
        border-radius: 8px;
        padding: 16px;
        margin-bottom: 20px;
      }
      
      .panel h2 {
        margin-top: 0;
        margin-bottom: 16px;
        font-size: 1.25rem;
        font-weight: 600;
      }
      
      /* Lists */
      .list-container {
        margin-bottom: 16px;
      }
      
      .list-item {
        background-color: #2a2a2a;
        border-radius: 4px;
        padding: 12px;
        margin-bottom: 8px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        cursor: pointer;
        transition: background-color 0.2s;
      }
      
      .list-item:hover {
        background-color: #333333;
      }
      
      .loading-placeholder {
        color: #888;
        text-align: center;
        padding: 20px 0;
      }
      
      /* Forms */
      .form-group {
        margin-bottom: 16px;
      }
      
      .form-group label {
        display: block;
        margin-bottom: 4px;
        font-size: 0.875rem;
      }
      
      .form-group input,
      .form-group textarea {
        width: 100%;
        padding: 8px;
        background-color: #2a2a2a;
        border: 1px solid #444;
        border-radius: 4px;
        color: white;
      }
      
      .form-group input:focus,
      .form-group textarea:focus {
        outline: none;
        border-color: #3861fb;
      }
      
      .form-actions {
        display: flex;
        justify-content: flex-end;
        gap: 8px;
      }
      
      /* Buttons */
      .btn {
        background-color: #3861fb;
        color: white;
        border: none;
        border-radius: 4px;
        padding: 8px 16px;
        cursor: pointer;
        transition: background-color 0.2s;
      }
      
      .btn:hover {
        background-color: #2d4ec8;
      }
      
      .btn-success {
        background-color: #43a047;
      }
      
      .btn-success:hover {
        background-color: #388e3c;
      }
      
      .btn-icon {
        background: none;
        border: none;
        color: white;
        font-size: 1.25rem;
        cursor: pointer;
        padding: 4px;
      }
      
      .btn-icon:hover {
        color: #3861fb;
      }
      
      .btn-play {
        font-size: 2rem;
      }
      
      .full-width {
        width: 100%;
      }
      
      /* Modal */
      .modal {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 100;
      }
      
      .modal-overlay {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background-color: rgba(0, 0, 0, 0.75);
      }
      
      .modal-content {
        position: relative;
        background-color: #1e1e1e;
        border-radius: 8px;
        padding: 24px;
        width: 90%;
        max-width: 500px;
        z-index: 101;
      }
      
      /* Player */
      .player-controls {
        display: flex;
        align-items: center;
        margin-bottom: 16px;
      }
      
      .volume-control {
        display: flex;
        align-items: center;
        margin-left: auto;
      }
      
      .volume-control i {
        margin-right: 8px;
      }
      
      .progress-container {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      
      .progress-bar {
        flex-grow: 1;
        height: 6px;
        background-color: #444;
        border-radius: 3px;
        overflow: hidden;
        cursor: pointer;
      }
      
      .progress-bar > div {
        height: 100%;
        background-color: #3861fb;
        transition: width 0.1s linear;
      }
    `;
    document.head.appendChild(styleElement);
  },
  
  // Initialize socket connection
  initSocket: function() {
    try {
      debugLog('Initializing socket connection', 'socket');
      
      // Check if socket.io is available
      if (typeof io !== 'function') {
        debugLog('Socket.io not found, loading script', 'socket');
        
        // Load socket.io script
        const script = document.createElement('script');
        script.src = '/socket.io/socket.io.js';
        script.onload = () => {
          debugLog('Socket.io loaded, connecting', 'socket');
          this.connectSocket();
        };
        script.onerror = (err) => {
          debugLog('Failed to load socket.io: ' + err, 'socket');
          showToast('Failed to connect to server', 'error');
        };
        document.body.appendChild(script);
      } else {
        this.connectSocket();
      }
    } catch (error) {
      debugLog('Socket initialization error: ' + error.message, 'socket');
      showToast('Failed to connect to server', 'error');
    }
  },
  
  // Connect to socket server
  connectSocket: function() {
    try {
      window.socket = io();
      
      // Socket events
      window.socket.on('connect', () => {
        debugLog('Socket connected: ' + window.socket.id, 'socket');
        showToast('Connected to server', 'success');
      });
      
      window.socket.on('disconnect', () => {
        debugLog('Socket disconnected', 'socket');
        showToast('Disconnected from server', 'warning');
      });
      
      window.socket.on('connect_error', (error) => {
        debugLog('Socket connection error: ' + error.message, 'socket');
        showToast('Connection error', 'error');
      });
      
      // Game events
      window.socket.on('roomState', (state) => {
        debugLog('Received room state', 'socket');
        this.updateRoomState(state);
      });
      
      window.socket.on('playbackUpdate', (data) => {
        debugLog('Received playback update', 'socket');
        this.updatePlayback(data);
      });
      
      window.socket.on('nowPlaying', (track) => {
        debugLog('Received now playing update', 'socket');
        this.setCurrentTrack(track);
      });
    } catch (error) {
      debugLog('Socket connection error: ' + error.message, 'socket');
      showToast('Failed to connect to server', 'error');
    }
  },
  
  // Setup event listeners
  setupEventListeners: function() {
    debugLog('Setting up event listeners', 'app');
    
    // Create room button
    const createRoomButton = document.getElementById('create-room-button');
    if (createRoomButton) {
      createRoomButton.addEventListener('click', () => {
        this.showModal('create-room-modal');
      });
    }
    
    // Cancel create room
    const cancelCreateRoom = document.getElementById('cancel-create-room');
    if (cancelCreateRoom) {
      cancelCreateRoom.addEventListener('click', () => {
        this.hideModal('create-room-modal');
      });
    }
    
    // Create room form
    const createRoomForm = document.getElementById('create-room-form');
    if (createRoomForm) {
      createRoomForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleCreateRoom();
      });
    }
    
    // Upload form
    const uploadForm = document.getElementById('upload-form');
    if (uploadForm) {
      uploadForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleUploadTrack();
      });
    }
    
    // Player controls
    const playButton = document.getElementById('play-button');
    if (playButton) {
      playButton.addEventListener('click', () => {
        this.togglePlayback();
      });
    }
    
    const prevButton = document.getElementById('prev-button');
    if (prevButton) {
      prevButton.addEventListener('click', () => {
        this.playPreviousTrack();
      });
    }
    
    const nextButton = document.getElementById('next-button');
    if (nextButton) {
      nextButton.addEventListener('click', () => {
        this.playNextTrack();
      });
    }
    
    const volumeSlider = document.getElementById('volume-slider');
    if (volumeSlider) {
      volumeSlider.addEventListener('input', (e) => {
        this.setVolume(e.target.value);
      });
    }
    
    const seekContainer = document.getElementById('seek-container');
    if (seekContainer) {
      seekContainer.addEventListener('click', (e) => {
        const rect = seekContainer.getBoundingClientRect();
        const pos = (e.clientX - rect.left) / rect.width;
        this.seekTo(pos);
      });
    }
  },
  
  // Fetch tracks from server
  fetchTracks: function() {
    debugLog('Fetching tracks', 'app');
    
    // Mock data for now
    setTimeout(() => {
      const tracks = [
        { id: '1', title: 'Example Track 1', artist: 'Artist 1' },
        { id: '2', title: 'Example Track 2', artist: 'Artist 2' },
        { id: '3', title: 'Example Track 3', artist: 'Artist 3' }
      ];
      
      this.state.tracks = tracks;
      this.renderTracks();
      
      debugLog('Tracks loaded', 'app');
    }, 1000);
  },
  
  // Fetch rooms from server
  fetchRooms: function() {
    debugLog('Fetching rooms', 'app');
    
    // Mock data for now
    setTimeout(() => {
      const rooms = [
        { id: '1', name: 'Example Room 1', description: 'A room for example 1' },
        { id: '2', name: 'Example Room 2', description: 'A room for example 2' }
      ];
      
      this.state.rooms = rooms;
      this.renderRooms();
      
      debugLog('Rooms loaded', 'app');
    }, 1000);
  },
  
  // Render tracks in the library
  renderTracks: function() {
    const trackLibrary = document.getElementById('track-library');
    if (!trackLibrary) return;
    
    if (this.state.tracks.length === 0) {
      trackLibrary.innerHTML = '<p class="loading-placeholder">No tracks available</p>';
      return;
    }
    
    trackLibrary.innerHTML = '';
    
    this.state.tracks.forEach(track => {
      const trackElement = document.createElement('div');
      trackElement.className = 'list-item track-item';
      trackElement.dataset.trackId = track.id;
      
      trackElement.innerHTML = `
        <div>
          <h3>${track.title}</h3>
          <p>${track.artist}</p>
        </div>
        <button class="btn-icon add-to-playlist" data-track-id="${track.id}">
          <i class="fas fa-plus"></i>
        </button>
      `;
      
      trackLibrary.appendChild(trackElement);
      
      // Add event listener
      const addButton = trackElement.querySelector('.add-to-playlist');
      if (addButton) {
        addButton.addEventListener('click', (e) => {
          e.stopPropagation();
          this.addToPlaylist(track.id);
        });
      }
      
      trackElement.addEventListener('click', () => {
        this.playTrack(track.id);
      });
    });
  },
  
  // Render rooms list
  renderRooms: function() {
    const roomsList = document.getElementById('rooms-list');
    if (!roomsList) return;
    
    if (this.state.rooms.length === 0) {
      roomsList.innerHTML = '<p class="loading-placeholder">No rooms available</p>';
      return;
    }
    
    roomsList.innerHTML = '';
    
    this.state.rooms.forEach(room => {
      const roomElement = document.createElement('div');
      roomElement.className = 'list-item room-item';
      roomElement.dataset.roomId = room.id;
      
      roomElement.innerHTML = `
        <div>
          <h3>${room.name}</h3>
          <p>${room.description || 'No description'}</p>
        </div>
        <button class="btn-icon join-room" data-room-id="${room.id}">
          <i class="fas fa-sign-in-alt"></i>
        </button>
      `;
      
      roomsList.appendChild(roomElement);
      
      // Add event listener
      const joinButton = roomElement.querySelector('.join-room');
      if (joinButton) {
        joinButton.addEventListener('click', (e) => {
          e.stopPropagation();
          this.joinRoom(room.id);
        });
      }
      
      roomElement.addEventListener('click', () => {
        this.showRoomDetails(room.id);
      });
    });
  },
  
  // Show modal
  showModal: function(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.remove('hidden');
      
      // Focus first input
      setTimeout(() => {
        const firstInput = modal.querySelector('input');
        if (firstInput) {
          firstInput.focus();
        }
      }, 100);
    }
  },
  
  // Hide modal
  hideModal: function(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.add('hidden');
      
      // Reset form
      const form = modal.querySelector('form');
      if (form) {
        form.reset();
      }
    }
  },
  
  // Handle create room form submission
  handleCreateRoom: function() {
    const nameInput = document.getElementById('room-name-input');
    const descriptionInput = document.getElementById('room-description-input');
    
    if (!nameInput || !nameInput.value.trim()) {
      showToast('Please enter a room name', 'error');
      return;
    }
    
    const roomData = {
      name: nameInput.value.trim(),
      description: descriptionInput ? descriptionInput.value.trim() : ''
    };
    
    debugLog('Creating room: ' + roomData.name, 'app');
    
    // Mock API call
    setTimeout(() => {
      const newRoom = {
        id: Date.now().toString(),
        ...roomData
      };
      
      // Add to state
      this.state.rooms.push(newRoom);
      
      // Re-render rooms
      this.renderRooms();
      
      // Hide modal
      this.hideModal('create-room-modal');
      
      // Show toast
      showToast('Room created: ' + newRoom.name, 'success');
      
      // Join the new room
      this.joinRoom(newRoom.id);
    }, 500);
  },
  
  // Add track to playlist
  addToPlaylist: function(trackId) {
    debugLog('Adding track to playlist: ' + trackId, 'app');
    
    if (!this.state.currentRoom) {
      showToast('Please join a room first', 'warning');
      return;
    }
    
    // Find track
    const track = this.state.tracks.find(t => t.id === trackId);
    if (!track) {
      showToast('Track not found', 'error');
      return;
    }
    
    // Mock API call
    setTimeout(() => {
      showToast('Added to playlist: ' + track.title, 'success');
    }, 300);
  },
  
  // Join room
  joinRoom: function(roomId) {
    debugLog('Joining room: ' + roomId, 'app');
    
    // Find room
    const room = this.state.rooms.find(r => r.id === roomId);
    if (!room) {
      showToast('Room not found', 'error');
      return;
    }
    
    // Update state
    this.state.currentRoom = room;
    
    // Update UI
    this.updateRoomUI(room);
    
    // Show toast
    showToast('Joined room: ' + room.name, 'success');
    
    // Join room via socket
    if (window.socket) {
      window.socket.emit('joinRoom', roomId);
    }
  },
  
  // Update room UI
  updateRoomUI: function(room) {
    const roomInfo = document.getElementById('room-info');
    const roomName = document.getElementById('room-name');
    const roomDescription = document.getElementById('room-description');
    const playerContainer = document.getElementById('player-container');
    const playlistContainer = document.getElementById('playlist-container');
    
    if (roomInfo) {
      roomInfo.classList.remove('hidden');
    }
    
    if (roomName) {
      roomName.textContent = room.name;
    }
    
    if (roomDescription) {
      roomDescription.textContent = room.description || 'No description';
    }
    
    if (playerContainer) {
      playerContainer.classList.remove('hidden');
    }
    
    if (playlistContainer) {
      playlistContainer.classList.remove('hidden');
    }
  },
  
  // Show room details
  showRoomDetails: function(roomId) {
    // Same as join for now
    this.joinRoom(roomId);
  },
  
  // Toggle playback
  togglePlayback: function() {
    this.state.isPlaying = !this.state.isPlaying;
    
    const playButton = document.getElementById('play-button');
    if (playButton) {
      playButton.innerHTML = this.state.isPlaying ? 
        '<i class="fas fa-pause"></i>' : 
        '<i class="fas fa-play"></i>';
    }
    
    // Toggle playback via socket
    if (window.socket && this.state.currentRoom) {
      window.socket.emit('togglePlay', this.state.currentRoom.id);
    }
  },
  
  // Play track
  playTrack: function(trackId) {
    // Find track
    const track = this.state.tracks.find(t => t.id === trackId);
    if (!track) {
      showToast('Track not found', 'error');
      return;
    }
    
    this.state.currentTrack = track;
    this.state.isPlaying = true;
    
    // Update UI
    this.updateNowPlaying(track);
    
    // Play via socket
    if (window.socket && this.state.currentRoom) {
      window.socket.emit('playTrack', {
        roomId: this.state.currentRoom.id,
        trackId
      });
    }
  },
  
  // Update now playing UI
  updateNowPlaying: function(track) {
    const title = document.getElementById('now-playing-title');
    const artist = document.getElementById('now-playing-artist');
    const playButton = document.getElementById('play-button');
    
    if (title) {
      title.textContent = track.title;
    }
    
    if (artist) {
      artist.textContent = track.artist;
    }
    
    if (playButton) {
      playButton.innerHTML = '<i class="fas fa-pause"></i>';
    }
  },
  
  // Handle upload track
  handleUploadTrack: function() {
    const titleInput = document.getElementById('track-title');
    const artistInput = document.getElementById('track-artist');
    const fileInput = document.getElementById('track-file');
    
    if (!titleInput || !titleInput.value.trim()) {
      showToast('Please enter a track title', 'error');
      return;
    }
    
    if (!artistInput || !artistInput.value.trim()) {
      showToast('Please enter an artist name', 'error');
      return;
    }
    
    if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
      showToast('Please select an audio file', 'error');
      return;
    }
    
    const trackData = {
      title: titleInput.value.trim(),
      artist: artistInput.value.trim(),
      file: fileInput.files[0]
    };
    
    debugLog('Uploading track: ' + trackData.title, 'app');
    
    // Show progress
    const uploadProgress = document.getElementById('upload-progress');
    const uploadProgressBar = document.getElementById('upload-progress-bar');
    const uploadStatus = document.getElementById('upload-status');
    
    if (uploadProgress) {
      uploadProgress.classList.remove('hidden');
    }
    
    // Mock upload progress
    let progress = 0;
    const interval = setInterval(() => {
      progress += 10;
      
      if (uploadProgressBar) {
        uploadProgressBar.style.width = `${progress}%`;
      }
      
      if (uploadStatus) {
        uploadStatus.textContent = `Uploading: ${progress}%`;
      }
      
      if (progress >= 100) {
        clearInterval(interval);
        
        // Mock finished upload
        setTimeout(() => {
          if (uploadProgress) {
            uploadProgress.classList.add('hidden');
          }
          
          // Reset form
          const uploadForm = document.getElementById('upload-form');
          if (uploadForm) {
            uploadForm.reset();
          }
          
          // Add track to state
          const newTrack = {
            id: Date.now().toString(),
            title: trackData.title,
            artist: trackData.artist
          };
          
          this.state.tracks.push(newTrack);
          
          // Re-render tracks
          this.renderTracks();
          
          // Show toast
          showToast('Track uploaded: ' + newTrack.title, 'success');
        }, 500);
      }
    }, 300);
  }
};

// Initialize the app
function initApp() {
  App.init();
}

// Export to global scope
window.App = App; 