/**
 * Node Radio - API Handler
 * Handles API requests with robust error handling and response normalization
 */

// Import utilities
// const { debugLog, showToast } = require('./utils');

class ApiHandler {
  constructor(baseUrl = '') {
    this.baseUrl = baseUrl || window.location.origin;
    this.defaultTimeout = 30000; // 30 seconds
  }

  /**
   * Normalize API responses to a consistent format
   * @param {Object} response - The API response object
   * @returns {Promise<Object>} Normalized response
   */
  async normalizeResponse(response) {
    // Default structure
    const normalized = {
      success: response.ok,
      status: response.status,
      statusText: response.statusText,
      data: null,
      error: null
    };

    // Check content type to handle properly
    const contentType = response.headers.get('content-type');
    
    if (contentType && contentType.includes('application/json')) {
      try {
        const jsonData = await response.json();
        
        // Some APIs include success/data/error fields already
        if (jsonData.hasOwnProperty('success')) {
          normalized.success = jsonData.success;
        }
        
        // Extract data field if exists, otherwise use whole response
        normalized.data = jsonData.data || jsonData;
        
        // Extract error if exists
        if (jsonData.error) {
          normalized.error = jsonData.error;
        } else if (jsonData.message && !response.ok) {
          normalized.error = jsonData.message;
        }
      } catch (err) {
        normalized.success = false;
        normalized.error = 'Failed to parse JSON response';
        debugLog('JSON parse error: ' + err.message, 'api');
      }
    } else {
      // Handle non-JSON responses
      try {
        normalized.data = await response.text();
      } catch (err) {
        normalized.error = 'Failed to read response';
        debugLog('Text read error: ' + err.message, 'api');
      }
    }

    // If the request was not successful and we don't have an error message yet
    if (!normalized.success && !normalized.error) {
      normalized.error = normalized.statusText || `Request failed with status: ${normalized.status}`;
    }

    return normalized;
  }

  /**
   * Make an API request with robust error handling
   * @param {string} endpoint - API endpoint
   * @param {Object} options - Request options
   * @returns {Promise<Object>} Normalized response
   */
  async request(endpoint, options = {}) {
    const url = endpoint.startsWith('http') ? endpoint : `${this.baseUrl}${endpoint}`;
    
    // Default request options
    const requestOptions = {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    };

    // Add auth token if we have it and it's not explicitly disabled
    if (options.withAuth !== false) {
      try {
        const token = localStorage.getItem('auth_token');
        if (token) {
          requestOptions.headers.Authorization = `Bearer ${token}`;
        }
      } catch (err) {
        debugLog('Auth token access error: ' + err.message, 'api');
        showToast('Authentication error. Please log in again.', 'error');
        // Redirect to login if we can't get the token
        setTimeout(() => {
          window.location.href = '/login';
        }, 2000);
        throw new Error('Authentication failed');
      }
    }

    // Add body if provided
    if (options.body && typeof options.body === 'object') {
      requestOptions.body = JSON.stringify(options.body);
    }

    // Setup timeout handling
    const timeout = options.timeout || this.defaultTimeout;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    requestOptions.signal = controller.signal;

    try {
      debugLog(`API ${requestOptions.method} request to: ${url}`, 'api');
      
      const response = await fetch(url, requestOptions);
      clearTimeout(timeoutId);
      
      const normalized = await this.normalizeResponse(response);
      
      // Handle common status codes
      if (response.status === 401) {
        showToast('Your session has expired. Please log in again.', 'error');
        localStorage.removeItem('auth_token');
        setTimeout(() => {
          window.location.href = '/login';
        }, 2000);
      } else if (response.status === 403) {
        showToast('You do not have permission to perform this action.', 'error');
      } else if (response.status >= 500) {
        showToast('Server error. Please try again later.', 'error');
      } else if (!normalized.success && normalized.error) {
        showToast(normalized.error, 'error');
      }
      
      return normalized;
    } catch (err) {
      clearTimeout(timeoutId);
      
      // Handle specific fetch errors
      if (err.name === 'AbortError') {
        showToast('Request timed out. Please check your connection and try again.', 'error');
        return {
          success: false,
          status: 0,
          statusText: 'Timeout',
          data: null,
          error: 'Request timed out after ' + timeout/1000 + ' seconds'
        };
      } else if (!navigator.onLine) {
        showToast('You are offline. Please check your internet connection.', 'error');
        return {
          success: false,
          status: 0,
          statusText: 'Offline',
          data: null,
          error: 'Network connection unavailable'
        };
      } else {
        showToast('Network error. Please try again.', 'error');
        debugLog('Fetch error: ' + err.message, 'api');
        return {
          success: false,
          status: 0,
          statusText: 'Error',
          data: null,
          error: err.message || 'Network request failed'
        };
      }
    }
  }

  // Convenience methods for different HTTP methods
  async get(endpoint, options = {}) {
    return this.request(endpoint, { ...options, method: 'GET' });
  }

  async post(endpoint, data = {}, options = {}) {
    return this.request(endpoint, { ...options, method: 'POST', body: data });
  }

  async put(endpoint, data = {}, options = {}) {
    return this.request(endpoint, { ...options, method: 'PUT', body: data });
  }

  async patch(endpoint, data = {}, options = {}) {
    return this.request(endpoint, { ...options, method: 'PATCH', body: data });
  }

  async delete(endpoint, options = {}) {
    return this.request(endpoint, { ...options, method: 'DELETE' });
  }
}

// Create and export a singleton instance
const apiHandler = new ApiHandler();

// Make functions globally available
window.apiHandler = apiHandler;
window.debugLog = debugLog;
window.showToast = showToast; 