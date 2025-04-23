// Main App Module

// Initialize the application
function initApp() {
  console.log('Initializing application...');
  
  // First ensure the create room modal is hidden
  hideCreateRoomModal();
  
  // Initialize socket connection
  initSocketConnection();
  
  // Fetch initial data
  fetchTracks();
  fetchRooms();
  
  // Set up UI interactions
  setupUIInteractions();
  
  console.log('Application initialized successfully');
}

// Helper function to hide the create room modal
function hideCreateRoomModal() {
  const modal = document.getElementById('create-room-modal');
  if (modal) {
    modal.classList.add('hidden');
  }
}

// Helper function to show the create room modal only if user is authenticated
function showCreateRoomModal() {
  // Check if user is authenticated
  if (window.auth && typeof window.auth.isAuthenticated === 'function') {
    window.auth.isAuthenticated().then(isAuthenticated => {
      if (isAuthenticated) {
        const modal = document.getElementById('create-room-modal');
        if (modal) {
          modal.classList.remove('hidden');
        }
      } else {
        console.warn('User tried to create a room but is not authenticated');
        showToast('Please log in to create a room', TOAST_TYPES.WARNING);
      }
    }).catch(error => {
      console.error('Error checking authentication status:', error);
      showToast('Please log in to create a room', TOAST_TYPES.WARNING);
    });
  } else {
    console.warn('Auth client not available');
    showToast('Please log in to create a room', TOAST_TYPES.WARNING);
  }
}

// If user is already authenticated, init will be called from auth.js
// Otherwise, we'll wait for authentication

// Error handling for global errors
window.addEventListener('error', (event) => {
  console.error('Global error:', event.error);
  showToast('Application error: ' + event.error.message, TOAST_TYPES.ERROR);
});

// Initialize socket connection
function initSocketConnection() {
  try {
    // Create socket connection
    window.socket = io();
    
    // Set up socket event listeners
    window.socket.on('connect', () => {
      console.log('Socket connected:', window.socket.id);
      showToast('Connected to server', TOAST_TYPES.SUCCESS);
    });
    
    window.socket.on('disconnect', () => {
      console.log('Socket disconnected');
      showToast('Disconnected from server', TOAST_TYPES.WARNING);
    });
    
    window.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      showToast('Connection error: ' + error.message, TOAST_TYPES.ERROR);
    });
  } catch (error) {
    console.error('Failed to initialize socket connection:', error);
    showToast('Failed to connect to server', TOAST_TYPES.ERROR);
  }
}

// Fetch tracks from the server
async function fetchTracks() {
  try {
    const tracks = await trackApi.getAllTracks();
    updateTrackLibrary(tracks);
  } catch (error) {
    console.error('Failed to fetch tracks:', error);
    showToast('Failed to load tracks', TOAST_TYPES.ERROR);
  }
}

// Fetch rooms from the server
async function fetchRooms() {
  try {
    const rooms = await roomApi.getAllRooms();
    updateRoomsList(rooms);
  } catch (error) {
    console.error('Failed to fetch rooms:', error);
    showToast('Failed to load rooms', TOAST_TYPES.ERROR);
  }
}

// Set up UI interactions
function setupUIInteractions() {
  // Create room button
  const createRoomButton = document.getElementById('create-room-button');
  if (createRoomButton) {
    createRoomButton.addEventListener('click', () => {
      showCreateRoomModal();
    });
  }
  
  // Cancel create room button
  const cancelCreateRoomButton = document.getElementById('cancel-create-room');
  if (cancelCreateRoomButton) {
    cancelCreateRoomButton.addEventListener('click', () => {
      hideCreateRoomModal();
    });
  }
}

// Update the track library UI
function updateTrackLibrary(tracks) {
  const trackLibrary = document.getElementById('track-library');
  if (!trackLibrary) return;
  
  if (!tracks || tracks.length === 0) {
    trackLibrary.innerHTML = '<p class="text-gray-400 text-center">No tracks available</p>';
    return;
  }
  
  trackLibrary.innerHTML = '';
  tracks.forEach(track => {
    const trackElement = document.createElement('div');
    trackElement.className = 'bg-gray-700 rounded-md p-3 flex justify-between items-center';
    trackElement.innerHTML = `
      <div>
        <h3 class="font-medium">${track.title}</h3>
        <p class="text-sm text-gray-400">${track.artist}</p>
      </div>
      <button class="add-to-playlist-btn text-blue-500 hover:text-blue-400" data-track-id="${track._id}">
        <i class="fas fa-plus"></i>
      </button>
    `;
    trackLibrary.appendChild(trackElement);
  });
  
  // Add event listeners to add-to-playlist buttons
  const addButtons = document.querySelectorAll('.add-to-playlist-btn');
  addButtons.forEach(button => {
    button.addEventListener('click', async (e) => {
      const trackId = e.currentTarget.dataset.trackId;
      // This will be implemented when room functionality is ready
      console.log('Add track to playlist:', trackId);
    });
  });
}

// Update the rooms list UI
function updateRoomsList(rooms) {
  const roomsList = document.getElementById('rooms-list');
  if (!roomsList) return;
  
  if (!rooms || rooms.length === 0) {
    roomsList.innerHTML = '<p class="text-gray-400 text-center">No rooms available</p>';
    return;
  }
  
  roomsList.innerHTML = '';
  rooms.forEach(room => {
    const roomElement = document.createElement('div');
    roomElement.className = 'bg-gray-700 rounded-md p-3 flex justify-between items-center';
    roomElement.innerHTML = `
      <div>
        <h3 class="font-medium">${room.name}</h3>
        <p class="text-sm text-gray-400">${room.description || 'No description'}</p>
      </div>
      <button class="join-room-btn text-blue-500 hover:text-blue-400" data-room-id="${room._id}">
        <i class="fas fa-sign-in-alt"></i>
      </button>
    `;
    roomsList.appendChild(roomElement);
  });
  
  // Add event listeners to join-room buttons
  const joinButtons = document.querySelectorAll('.join-room-btn');
  joinButtons.forEach(button => {
    button.addEventListener('click', async (e) => {
      const roomId = e.currentTarget.dataset.roomId;
      // This will be implemented when room functionality is ready
      console.log('Join room:', roomId);
    });
  });
}

// Create room form submission
document.addEventListener('DOMContentLoaded', () => {
  const createRoomForm = document.getElementById('create-room-form');
  if (createRoomForm) {
    createRoomForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const nameInput = document.getElementById('room-name-input');
      const descriptionInput = document.getElementById('room-description-input');
      
      if (!nameInput || !nameInput.value.trim()) {
        showToast('Please enter a room name', TOAST_TYPES.ERROR);
        return;
      }
      
      const roomData = {
        name: nameInput.value.trim(),
        description: descriptionInput ? descriptionInput.value.trim() : ''
      };
      
      try {
        const createdRoom = await roomApi.createRoom(roomData);
        
        // Hide modal
        const modal = document.getElementById('create-room-modal');
        if (modal) {
          modal.classList.add('hidden');
        }
        
        // Clear form
        if (nameInput) nameInput.value = '';
        if (descriptionInput) descriptionInput.value = '';
        
        // Refresh rooms list
        fetchRooms();
        
        showToast(`Room "${createdRoom.name}" created successfully`, TOAST_TYPES.SUCCESS);
      } catch (error) {
        console.error('Failed to create room:', error);
        showToast('Failed to create room: ' + error.message, TOAST_TYPES.ERROR);
      }
    });
  }
}); 