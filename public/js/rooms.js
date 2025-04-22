// Rooms Module

// DOM elements
const roomsList = document.getElementById('rooms-list');
const createRoomButton = document.getElementById('create-room-button');
const createRoomModal = document.getElementById('create-room-modal');
const createRoomForm = document.getElementById('create-room-form');
const roomNameInput = document.getElementById('room-name-input');
const roomDescriptionInput = document.getElementById('room-description-input');
const cancelCreateRoomButton = document.getElementById('cancel-create-room');

// Initialize rooms
async function initRooms() {
  // Add event listeners
  createRoomButton.addEventListener('click', showCreateRoomModal);
  cancelCreateRoomButton.addEventListener('click', hideCreateRoomModal);
  createRoomForm.addEventListener('submit', handleCreateRoom);
  
  // Load rooms
  await loadRooms();
}

// Load rooms from the API
async function loadRooms() {
  try {
    const rooms = await roomApi.getAllRooms();
    renderRooms(rooms);
  } catch (error) {
    console.error('Error loading rooms:', error);
    showToast('Error loading rooms', 'error');
  }
}

// Render rooms in the UI
function renderRooms(rooms) {
  if (!rooms || rooms.length === 0) {
    roomsList.innerHTML = '<p class="text-gray-400 text-center">No rooms available</p>';
    return;
  }
  
  // Clear rooms list
  roomsList.innerHTML = '';
  
  // Add rooms to list
  rooms.forEach(room => {
    const roomItem = document.createElement('div');
    roomItem.className = 'room-item bg-gray-700 p-3 rounded-md cursor-pointer hover:bg-gray-600';
    roomItem.dataset.roomId = room._id;
    
    roomItem.innerHTML = `
      <h3 class="font-medium">${room.name}</h3>
      <p class="text-sm text-gray-400">Created by ${room.createdBy.nickname}</p>
    `;
    
    // Add click event to join room
    roomItem.addEventListener('click', () => {
      joinRoom(room._id);
    });
    
    roomsList.appendChild(roomItem);
  });
}

// Show create room modal
function showCreateRoomModal() {
  createRoomModal.classList.remove('hidden');
  roomNameInput.focus();
}

// Hide create room modal
function hideCreateRoomModal() {
  createRoomModal.classList.add('hidden');
  // Reset form
  createRoomForm.reset();
}

// Handle create room form submission
async function handleCreateRoom(event) {
  event.preventDefault();
  
  const name = roomNameInput.value.trim();
  const description = roomDescriptionInput.value.trim();
  
  if (!name) {
    showToast('Room name is required', 'error');
    return;
  }
  
  try {
    const roomData = {
      name,
      description
    };
    
    const createdRoom = await roomApi.createRoom(roomData);
    
    hideCreateRoomModal();
    showToast('Room created successfully', 'success');
    
    // Reload rooms and join the new room
    await loadRooms();
    joinRoom(createdRoom._id);
  } catch (error) {
    console.error('Error creating room:', error);
    showToast('Error creating room: ' + error.message, 'error');
  }
} 