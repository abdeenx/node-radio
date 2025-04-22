// API utility functions

// Base API URL
const API_BASE_URL = '/api';

// API endpoints
const API_ENDPOINTS = {
  auth: {
    register: '/auth/register',
    profile: '/auth/profile',
    logout: '/auth/logout'
  },
  tracks: {
    list: '/tracks',
    get: (id) => `/tracks/${id}`,
    upload: {
      signature: '/tracks/upload/signature'
    },
    delete: (id) => `/tracks/${id}`,
    play: (id) => `/tracks/${id}/play`
  },
  rooms: {
    list: '/rooms',
    get: (id) => `/rooms/${id}`,
    create: '/rooms',
    addTrack: (id) => `/rooms/${id}/playlist`,
    removeTrack: (roomId, trackIndex) => `/rooms/${roomId}/playlist/${trackIndex}`,
    updateState: (id) => `/rooms/${id}/state`
  }
};

// Generic API request function
async function apiRequest(endpoint, method = 'GET', data = null, requiresAuth = true) {
  try {
    const headers = {
      'Content-Type': 'application/json'
    };

    // Add authorization header if required and user is authenticated
    if (requiresAuth) {
      if (!isAuthenticated) {
        throw new Error('User not authenticated');
      }
      
      try {
        // Get fresh token (might refresh if expired)
        const token = await getAccessToken();
        headers['Authorization'] = `Bearer ${token}`;
      } catch (error) {
        console.error('Failed to get access token:', error);
        showToast('Authentication error. Please login again.', 'error');
        throw new Error('Authentication required');
      }
    }

    const options = {
      method,
      headers,
      credentials: 'same-origin'
    };

    // Add request body for methods that require it
    if (data && ['POST', 'PUT', 'PATCH'].includes(method)) {
      options.body = JSON.stringify(data);
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, options);

    // Check if response is OK
    if (!response.ok) {
      // Handle authentication errors
      if (response.status === 401 || response.status === 403) {
        // Clear current auth state and redirect to login
        showToast('Your session has expired. Please login again.', 'warning');
        setTimeout(() => {
          login();
        }, 1500);
        throw new Error('Authentication failed');
      }
      
      const errorData = await response.json().catch(() => ({
        error: `HTTP error ${response.status}`
      }));
      throw new Error(errorData.error || errorData.message || `API request failed with status ${response.status}`);
    }

    // Return parsed JSON response if not empty, or just the response object
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return await response.json();
    } else {
      return response;
    }
  } catch (error) {
    console.error('API request error:', error);
    if (error.message !== 'Authentication failed') {
      showToast(`API error: ${error.message}`, 'error');
    }
    throw error;
  }
}

// Track related API calls
const trackApi = {
  // Get all tracks
  getAllTracks: async () => {
    return await apiRequest(API_ENDPOINTS.tracks.list, 'GET', null, false);
  },

  // Get single track by ID
  getTrack: async (id) => {
    return await apiRequest(API_ENDPOINTS.tracks.get(id), 'GET', null, false);
  },

  // Get upload signature from Cloudinary
  getUploadSignature: async () => {
    return await apiRequest(API_ENDPOINTS.tracks.upload.signature, 'GET');
  },

  // Save track metadata after upload
  saveTrack: async (trackData) => {
    return await apiRequest(API_ENDPOINTS.tracks.list, 'POST', trackData);
  },

  // Delete track
  deleteTrack: async (id) => {
    return await apiRequest(API_ENDPOINTS.tracks.delete(id), 'DELETE');
  },

  // Increment play count
  incrementPlayCount: async (id) => {
    return await apiRequest(API_ENDPOINTS.tracks.play(id), 'POST', null, false);
  }
};

// Room related API calls
const roomApi = {
  // Get all rooms
  getAllRooms: async () => {
    return await apiRequest(API_ENDPOINTS.rooms.list, 'GET', null, false);
  },

  // Get single room by ID
  getRoom: async (id) => {
    return await apiRequest(API_ENDPOINTS.rooms.get(id), 'GET', null, false);
  },

  // Create a new room
  createRoom: async (roomData) => {
    return await apiRequest(API_ENDPOINTS.rooms.create, 'POST', roomData);
  },

  // Add track to room playlist
  addTrackToPlaylist: async (roomId, trackId) => {
    return await apiRequest(API_ENDPOINTS.rooms.addTrack(roomId), 'POST', { trackId });
  },

  // Remove track from room playlist
  removeTrackFromPlaylist: async (roomId, trackIndex) => {
    return await apiRequest(API_ENDPOINTS.rooms.removeTrack(roomId, trackIndex), 'DELETE');
  },

  // Update room state
  updateRoomState: async (roomId, stateData) => {
    return await apiRequest(API_ENDPOINTS.rooms.updateState(roomId), 'PUT', stateData);
  }
};

// Authentication related API calls
const authApi = {
  // Get user profile
  getUserProfile: async () => {
    return await apiRequest(API_ENDPOINTS.auth.profile, 'GET');
  },
  
  // Logout (backend cleanup)
  logout: async () => {
    if (isAuthenticated) {
      try {
        await apiRequest(API_ENDPOINTS.auth.logout, 'POST');
      } catch (error) {
        console.log('Backend logout error (continuing):', error);
      }
    }
  }
};

// Utility function to format time in MM:SS format
function formatTime(seconds) {
  if (isNaN(seconds) || seconds < 0) {
    return '0:00';
  }
  
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

// Toast notification function
function showToast(message, type = 'info', duration = 3000) {
  const toastContainer = document.getElementById('toast-container');
  
  // Create toast element
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  
  // Add to container
  toastContainer.appendChild(toast);
  
  // Show the toast
  setTimeout(() => {
    toast.classList.add('show');
  }, 10);
  
  // Hide and remove after duration
  setTimeout(() => {
    toast.classList.remove('show');
    
    // Remove from DOM after animation completes
    setTimeout(() => {
      toastContainer.removeChild(toast);
    }, 500);
  }, duration);
} 