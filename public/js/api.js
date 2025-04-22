// API utilities for the application
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

// Generic fetch wrapper with error handling
async function fetchAPI(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  
  // Default headers
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  };
  
  // Get auth token if available
  try {
    const token = await window.auth?.getTokenSilently();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  } catch (error) {
    console.error('Failed to get auth token:', error);
  }
  
  // Create request options
  const requestOptions = {
    ...options,
    headers,
    credentials: 'same-origin'
  };
  
  // Make the request
  try {
    const response = await fetch(url, requestOptions);
    
    // Handle non-2xx responses
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
      
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || errorData.error || `API error: ${response.status} ${response.statusText}`);
    }
    
    // Check if response is JSON
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return await response.json();
    } else {
      return response;
    }
  } catch (error) {
    console.error(`API error (${url}):`, error);
    if (error.message !== 'Authentication failed') {
      showToast(`API error: ${error.message}`, 'error');
    }
    throw error;
  }
}

// Track API methods
const trackApi = {
  getAllTracks: async () => {
    return fetchAPI('/tracks');
  },
  
  getTrack: async (trackId) => {
    return fetchAPI(`/tracks/${trackId}`);
  },
  
  createTrack: async (trackData) => {
    return fetchAPI('/tracks', {
      method: 'POST',
      body: JSON.stringify(trackData)
    });
  },
  
  updateTrack: async (trackId, trackData) => {
    return fetchAPI(`/tracks/${trackId}`, {
      method: 'PUT',
      body: JSON.stringify(trackData)
    });
  },
  
  deleteTrack: async (trackId) => {
    return fetchAPI(`/tracks/${trackId}`, {
      method: 'DELETE'
    });
  },
  
  uploadTrack: async (formData) => {
    return fetch(`${API_BASE_URL}/tracks/upload`, {
      method: 'POST',
      body: formData,
      // Do not set Content-Type header as it will be set automatically with the correct boundary
      headers: {
        Authorization: `Bearer ${await window.auth?.getTokenSilently().catch(() => '')}`
      }
    }).then(response => {
      if (!response.ok) {
        return response.json().then(data => {
          throw new Error(data.message || `Upload failed: ${response.status} ${response.statusText}`);
        });
      }
      return response.json();
    });
  },
  
  // Get upload signature from Cloudinary
  getUploadSignature: async () => {
    return fetchAPI('/tracks/upload/signature');
  },
  
  // Increment play count
  incrementPlayCount: async (id) => {
    return fetchAPI(`/tracks/${id}/play`, {
      method: 'POST'
    });
  }
};

// Room API methods
const roomApi = {
  getAllRooms: async () => {
    return fetchAPI('/rooms');
  },
  
  getRoom: async (roomId) => {
    return fetchAPI(`/rooms/${roomId}`);
  },
  
  createRoom: async (roomData) => {
    return fetchAPI('/rooms', {
      method: 'POST',
      body: JSON.stringify(roomData)
    });
  },
  
  updateRoom: async (roomId, roomData) => {
    return fetchAPI(`/rooms/${roomId}`, {
      method: 'PUT',
      body: JSON.stringify(roomData)
    });
  },
  
  deleteRoom: async (roomId) => {
    return fetchAPI(`/rooms/${roomId}`, {
      method: 'DELETE'
    });
  },
  
  joinRoom: async (roomId) => {
    return fetchAPI(`/rooms/${roomId}/join`, {
      method: 'POST'
    });
  },
  
  leaveRoom: async (roomId) => {
    return fetchAPI(`/rooms/${roomId}/leave`, {
      method: 'POST'
    });
  },
  
  addTrackToRoom: async (roomId, trackId) => {
    return fetchAPI(`/rooms/${roomId}/tracks`, {
      method: 'POST',
      body: JSON.stringify({ trackId })
    });
  },
  
  removeTrackFromRoom: async (roomId, trackId) => {
    return fetchAPI(`/rooms/${roomId}/tracks/${trackId}`, {
      method: 'DELETE'
    });
  },
  
  // Add track to room playlist
  addTrackToPlaylist: async (roomId, trackId) => {
    return fetchAPI(`/rooms/${roomId}/playlist`, {
      method: 'POST',
      body: JSON.stringify({ trackId })
    });
  },
  
  // Remove track from room playlist
  removeTrackFromPlaylist: async (roomId, trackIndex) => {
    return fetchAPI(`/rooms/${roomId}/playlist/${trackIndex}`, {
      method: 'DELETE'
    });
  },
  
  // Update room state
  updateRoomState: async (roomId, stateData) => {
    return fetchAPI(`/rooms/${roomId}/state`, {
      method: 'PUT',
      body: JSON.stringify(stateData)
    });
  }
};

// User API methods
const userApi = {
  getCurrentUser: async () => {
    return fetchAPI('/users/me');
  },
  
  updateProfile: async (userData) => {
    return fetchAPI('/users/me', {
      method: 'PUT',
      body: JSON.stringify(userData)
    });
  }
};

// Authentication related API calls
const authApi = {
  // Get user profile
  getUserProfile: async () => {
    return fetchAPI('/auth/profile');
  },
  
  // Logout (backend cleanup)
  logout: async () => {
    return fetchAPI('/auth/logout', {
      method: 'POST'
    });
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

// Export the API utilities
window.trackApi = trackApi;
window.roomApi = roomApi;
window.userApi = userApi;
window.authApi = authApi; 