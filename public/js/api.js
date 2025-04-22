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

// Get the current auth token
async function getAuthToken() {
  if (!window.auth) {
    console.warn('Auth client not available');
    return null;
  }
  
  try {
    // Check if authenticated before requesting token
    const isAuthenticated = await window.auth.isAuthenticated();
    if (!isAuthenticated) {
      console.warn('User not authenticated, cannot get token');
      return null;
    }
    
    return await window.auth.getTokenSilently();
  } catch (error) {
    console.error('Failed to get auth token:', error);
    return null;
  }
}

// Generic fetch wrapper with error handling
async function fetchAPI(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  
  // Default headers
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  };
  
  // Get auth token if available
  const token = await getAuthToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  // Create request options
  const requestOptions = {
    ...options,
    headers,
    credentials: 'same-origin'
  };
  
  // Make the request
  try {
    console.log(`API Request: ${options.method || 'GET'} ${url}`);
    const response = await fetch(url, requestOptions);
    
    // Handle non-2xx responses
    if (!response.ok) {
      // Handle authentication errors
      if (response.status === 401 || response.status === 403) {
        // Clear current auth state and redirect to login
        showToast('Your session has expired. Please login again.', 'warning');
        setTimeout(() => {
          if (typeof login === 'function') {
            login();
          }
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
        showToast('Authentication error. Please log in again.', 'error');
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
          showToast('Your session has expired. Please login again.', 'warning');
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
        showToast('Request timed out. Please try again.', 'error');
        throw new Error('Request timed out');
      } else if (fetchError.message === 'Failed to fetch' || !navigator.onLine) {
        showToast('Network error. Please check your connection.', 'error');
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
      showToast(error.message || 'An unexpected error occurred', 'error');
    }
    
    throw error; // Rethrow for component-level handling if needed
  }
} 