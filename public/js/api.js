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

// Initialize the API handler with our base URL
const api = window.apiHandler || new ApiHandler(API_BASE_URL);

// Track API methods
const trackApi = {
  getAllTracks: async () => {
    const response = await api.get('/tracks');
    return response.data;
  },
  
  getTrack: async (trackId) => {
    const response = await api.get(`/tracks/${trackId}`);
    return response.data;
  },
  
  createTrack: async (trackData) => {
    const response = await api.post('/tracks', trackData);
    return response.data;
  },
  
  updateTrack: async (trackId, trackData) => {
    const response = await api.put(`/tracks/${trackId}`, trackData);
    return response.data;
  },
  
  deleteTrack: async (trackId) => {
    const response = await api.delete(`/tracks/${trackId}`);
    return response.data;
  },
  
  uploadTrack: async (formData) => {
    // Special case for file uploads - need to use fetch directly
    // Don't set Content-Type header as it will be set automatically with the correct boundary
    const token = localStorage.getItem('auth_token');
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    
    try {
      const response = await fetch(`${API_BASE_URL}/tracks/upload`, {
        method: 'POST',
        body: formData,
        headers
      });
      
      // Process the response through our normalizer
      return api.normalizeResponse(response);
    } catch (error) {
      showToast(`Upload failed: ${error.message}`, 'error');
      throw error;
    }
  },
  
  // Get upload signature from Cloudinary
  getUploadSignature: async () => {
    const response = await api.get('/tracks/upload/signature');
    return response.data;
  },
  
  // Increment play count
  incrementPlayCount: async (id) => {
    const response = await api.post(`/tracks/${id}/play`);
    return response.data;
  }
};

// Room API methods
const roomApi = {
  getAllRooms: async () => {
    const response = await api.get('/rooms');
    return response.data;
  },
  
  getRoom: async (roomId) => {
    const response = await api.get(`/rooms/${roomId}`);
    return response.data;
  },
  
  createRoom: async (roomData) => {
    const response = await api.post('/rooms', roomData);
    return response.data;
  },
  
  updateRoom: async (roomId, roomData) => {
    const response = await api.put(`/rooms/${roomId}`, roomData);
    return response.data;
  },
  
  deleteRoom: async (roomId) => {
    const response = await api.delete(`/rooms/${roomId}`);
    return response.data;
  },
  
  joinRoom: async (roomId) => {
    const response = await api.post(`/rooms/${roomId}/join`);
    return response.data;
  },
  
  leaveRoom: async (roomId) => {
    const response = await api.post(`/rooms/${roomId}/leave`);
    return response.data;
  },
  
  addTrackToRoom: async (roomId, trackId) => {
    const response = await api.post(`/rooms/${roomId}/tracks`, { trackId });
    return response.data;
  },
  
  removeTrackFromRoom: async (roomId, trackId) => {
    const response = await api.delete(`/rooms/${roomId}/tracks/${trackId}`);
    return response.data;
  },
  
  // Add track to room playlist
  addTrackToPlaylist: async (roomId, trackId) => {
    const response = await api.post(`/rooms/${roomId}/playlist`, { trackId });
    return response.data;
  },
  
  // Remove track from room playlist
  removeTrackFromPlaylist: async (roomId, trackIndex) => {
    const response = await api.delete(`/rooms/${roomId}/playlist/${trackIndex}`);
    return response.data;
  },
  
  // Update room state
  updateRoomState: async (roomId, stateData) => {
    const response = await api.put(`/rooms/${roomId}/state`, stateData);
    return response.data;
  }
};

// User API methods
const userApi = {
  getCurrentUser: async () => {
    const response = await api.get('/users/me');
    return response.data;
  },
  
  updateProfile: async (userData) => {
    const response = await api.put('/users/me', userData);
    return response.data;
  }
};

// Authentication related API calls
const authApi = {
  // Get user profile
  getUserProfile: async () => {
    const response = await api.get('/auth/profile');
    return response.data;
  },
  
  // Logout (backend cleanup)
  logout: async () => {
    const response = await api.post('/auth/logout');
    return response.data;
  }
};

// Utility to format seconds to mm:ss format
function formatTime(seconds) {
  if (isNaN(seconds) || seconds < 0) return '0:00';
  
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

// Export the API utilities
window.trackApi = trackApi;
window.roomApi = roomApi;
window.userApi = userApi;
window.authApi = authApi;

async function apiRequest(endpoint, method = 'GET', body = null, requiresAuth = true, retries = 2) {
  try {
    // Get authentication token if authentication is required
    let headers = {
      'Content-Type': 'application/json'
    };

    if (requiresAuth) {
      try {
        const token = await auth.getTokenSilently();
        headers['Authorization'] = `Bearer ${token}`;
      } catch (authError) {
        console.error('Authentication error:', authError);
        showToast('Authentication error. Please log in again.', TOAST_TYPES.ERROR);
        // Optional: Redirect to login page after a short delay
        setTimeout(() => {
          if (typeof login === 'function') {
            login();
          }
        }, 1500);
        throw new Error('Authentication failed');
      }
    }

    const options = {
      method,
      headers,
      credentials: 'same-origin' // Include cookies in the request
    };

    if (body && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
      options.body = JSON.stringify(body);
    }

    // Network request with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
    options.signal = controller.signal;

    try {
      const response = await fetch(`/api/${endpoint}`, options);
      clearTimeout(timeoutId); // Clear timeout on success
      
      // Handle response status codes
      if (!response.ok) {
        // Special handling for authentication errors
        if (response.status === 401 || response.status === 403) {
          showToast('Your session has expired. Please login again.', TOAST_TYPES.WARNING);
          setTimeout(() => {
            if (typeof login === 'function') {
              login();
            }
          }, 1500);
          throw new Error('Authentication failed');
        }
        
        // Try to get error details from response
        try {
          const errorData = await response.json();
          throw new Error(errorData.message || `Request failed with status ${response.status}`);
        } catch (jsonError) {
          // If JSON parsing fails, throw generic error with status
          throw new Error(`Request failed with status ${response.status}: ${response.statusText}`);
        }
      }
      
      // Handle successful responses
      try {
        // Check if the response has JSON content
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          return await response.json();
        } else {
          // For non-JSON responses
          return { success: true, status: response.status };
        }
      } catch (jsonError) {
        console.warn('Response is not valid JSON but request was successful:', jsonError);
        return { success: true, status: response.status };
      }
    } catch (fetchError) {
      clearTimeout(timeoutId); // Clear timeout on error
      
      // Determine if error is retryable
      const isRetryable = 
        fetchError.name === 'AbortError' || 
        fetchError.message === 'Failed to fetch' || 
        !navigator.onLine || 
        (fetchError.message && fetchError.message.includes('network'));
      
      // Attempt retry if we have retries left and error is retryable
      if (retries > 0 && isRetryable) {
        console.log(`Retrying request to ${endpoint} (${retries} attempts left)`);
        
        // Add exponential backoff - wait longer between each retry
        const backoffTime = Math.min(1000 * (2 ** (3 - retries)), 8000);
        await new Promise(resolve => setTimeout(resolve, backoffTime));
        
        // Try again with one fewer retry
        return apiRequest(endpoint, method, body, requiresAuth, retries - 1);
      }
      
      // If no retries left or not retryable, handle the error
      if (fetchError.name === 'AbortError') {
        showToast('Request timed out. Please try again.', TOAST_TYPES.ERROR);
        throw new Error('Request timed out');
      } else if (fetchError.message === 'Failed to fetch' || !navigator.onLine) {
        showNetworkToast(false);
        throw new Error('Network connection lost');
      } else {
        throw fetchError; // Rethrow other errors
      }
    }
  } catch (error) {
    // Root level error handling
    console.error(`API request error (${endpoint}):`, error);
    
    // Don't display toast again for errors already handled
    if (!['Authentication failed', 'Request timed out', 'Network connection lost'].includes(error.message)) {
      showToast(error.message || 'An unexpected error occurred', TOAST_TYPES.ERROR);
    }
    
    throw error; // Rethrow for component-level handling if needed
  }
} 