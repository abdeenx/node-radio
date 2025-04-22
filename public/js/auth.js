// Auth0 Configuration - Replace with your actual Auth0 app details
const auth0Config = {
  domain: 'dev-example.us.auth0.com', // Replace with your Auth0 domain
  clientId: 'YOUR_CLIENT_ID', // Replace with your Auth0 client ID
  audience: 'https://api.noderadio.com', // Replace with your API audience
  redirectUri: window.location.origin, // Will be updated for production
  cacheLocation: 'localstorage' // Use localstorage for better persistence
};

// Expose createAuth0Client if not available globally (fallback)
window.createAuth0Client = window.createAuth0Client || createAuth0Client;

// Auth0 client instance
let auth0Client = null;
let isAuthenticated = false;
let userProfile = null;
let accessToken = null;

// DOM elements
const loginButton = document.getElementById('login-button');
const logoutButton = document.getElementById('logout-button');
const loginMessage = document.getElementById('login-message');
const appContent = document.getElementById('app-content');

// Initialize Auth0 client
async function initAuth() {
  try {
    console.log('Initializing Auth0...');
    
    // Make sure Auth0 is loaded
    if (typeof window.createAuth0Client !== 'function') {
      console.error('Auth0 SDK not loaded. Trying fallback...');
      
      // Add a fallback script if Auth0 fails to load
      if (!document.getElementById('auth0-fallback')) {
        const script = document.createElement('script');
        script.id = 'auth0-fallback';
        script.src = 'https://cdn.jsdelivr.net/npm/@auth0/auth0-spa-js@2.1.3/dist/auth0-spa-js.production.min.js';
        script.async = true;
        script.onload = () => {
          console.log('Auth0 SDK loaded via fallback');
          initAuth(); // Try again after loading
        };
        document.head.appendChild(script);
      }
      
      throw new Error('Auth0 SDK not loaded. Check your internet connection and try again.');
    }
    
    // Create Auth0 client
    auth0Client = await window.createAuth0Client({
      domain: auth0Config.domain,
      clientId: auth0Config.clientId,
      authorizationParams: {
        redirect_uri: auth0Config.redirectUri,
        audience: auth0Config.audience
      },
      cacheLocation: auth0Config.cacheLocation
    });

    // Check for authentication state on page load
    try {
      // If returning from Auth0 redirect
      if (window.location.search.includes('code=') && window.location.search.includes('state=')) {
        // Handle the redirect and get the authentication result
        const result = await auth0Client.handleRedirectCallback();
        
        // You can use the result object to check appState or other info passed on login
        console.log('Auth redirect result:', result);
        
        // Clear the URL parameters
        window.history.replaceState({}, document.title, window.location.pathname);
      }

      // Check if user is authenticated
      isAuthenticated = await auth0Client.isAuthenticated();

      if (isAuthenticated) {
        console.log('User is authenticated');
        // Get user info and token
        userProfile = await auth0Client.getUser();
        accessToken = await auth0Client.getTokenSilently();
        
        console.log('User profile:', userProfile);
        
        // Register user on our backend
        try {
          await registerUser();
        } catch (registerError) {
          console.error('Registration error:', registerError);
          // Continue anyway - we can still use the app
        }
        
        // Update UI to show authenticated state
        updateAuthUI(true);
        
        // Initialize the app if the function exists
        if (typeof initApp === 'function') {
          initApp();
        } else {
          console.warn('initApp function not found');
        }
      } else {
        console.log('User is not authenticated');
        updateAuthUI(false);
      }
    } catch (authError) {
      console.error('Authentication state error:', authError);
      updateAuthUI(false);
      showToast('Authentication error: ' + authError.message, 'error');
    }
  } catch (error) {
    console.error('Auth0 initialization error:', error);
    updateAuthUI(false);
    showToast('Authentication service error: ' + error.message, 'error');
  }
}

// Register user with our backend
async function registerUser() {
  if (!accessToken) {
    throw new Error('No access token available');
  }
  
  console.log('Registering user with backend...');
  const response = await fetch('/api/auth/register', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`
    },
    body: JSON.stringify({
      sub: userProfile.sub,
      email: userProfile.email,
      nickname: userProfile.nickname || userProfile.name,
      picture: userProfile.picture
    })
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(errorData.error || `Failed to register user: ${response.status}`);
  }
  
  const userData = await response.json();
  console.log('User registered successfully:', userData);
  showToast('Welcome back, ' + (userProfile.nickname || userProfile.name) + '!', 'success');
  return userData;
}

// Update UI based on authentication state
function updateAuthUI(authenticated) {
  if (authenticated) {
    loginButton.classList.add('hidden');
    logoutButton.classList.remove('hidden');
    loginMessage.classList.add('hidden');
    appContent.classList.remove('hidden');
  } else {
    loginButton.classList.remove('hidden');
    logoutButton.classList.add('hidden');
    loginMessage.classList.remove('hidden');
    appContent.classList.add('hidden');
  }
}

// Login function
async function login() {
  try {
    console.log('Initiating login...');
    await auth0Client.loginWithRedirect({
      authorizationParams: {
        redirect_uri: auth0Config.redirectUri
      }
    });
    // Note: Code after this won't execute immediately since there's a redirect
  } catch (error) {
    console.error('Login error:', error);
    showToast('Login error: ' + error.message, 'error');
  }
}

// Logout function
async function logout() {
  try {
    console.log('Logging out...');
    
    // Call backend logout endpoint if available
    if (typeof authApi !== 'undefined' && authApi.logout) {
      try {
        await authApi.logout();
      } catch (logoutError) {
        console.warn('Backend logout error (continuing):', logoutError);
      }
    }
    
    // Logout from Auth0
    await auth0Client.logout({
      logoutParams: {
        returnTo: window.location.origin
      }
    });
    // Note: Auth0 will redirect after logout
  } catch (error) {
    console.error('Logout error:', error);
    showToast('Logout error: ' + error.message, 'error');
  }
}

// Refresh token function (useful for long sessions)
async function refreshAuthToken() {
  try {
    console.log('Refreshing auth token...');
    accessToken = await auth0Client.getTokenSilently();
    return accessToken;
  } catch (error) {
    console.error('Token refresh error:', error);
    // If refresh fails, user might need to login again
    if (error.error === 'login_required') {
      showToast('Your session has expired. Please log in again.', 'warning');
      setTimeout(() => {
        login();
      }, 2000);
    }
    throw error;
  }
}

// Get user token (with automatic refresh if needed)
async function getAccessToken() {
  if (!isAuthenticated) {
    throw new Error('User not authenticated');
  }
  
  try {
    return await auth0Client.getTokenSilently();
  } catch (error) {
    if (error.error === 'login_required') {
      // Token expired, try to refresh
      return await refreshAuthToken();
    }
    throw error;
  }
}

// Custom toast function if the main one is not available
function showToast(message, type = 'info', duration = 3000) {
  // Check if the main showToast function is defined in api.js
  if (window.showToast) {
    window.showToast(message, type, duration);
    return;
  }
  
  // Fallback implementation
  console.log(`${type.toUpperCase()}: ${message}`);
  
  // Create a basic toast if container exists
  const toastContainer = document.getElementById('toast-container');
  if (toastContainer) {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    toast.style.padding = '10px 16px';
    toast.style.marginBottom = '8px';
    toast.style.borderRadius = '4px';
    toast.style.backgroundColor = type === 'error' ? '#f44336' : 
                                 type === 'success' ? '#4caf50' : 
                                 type === 'warning' ? '#ff9800' : '#2196f3';
    toast.style.color = 'white';
    toastContainer.appendChild(toast);
    setTimeout(() => {
      toastContainer.removeChild(toast);
    }, duration);
  }
}

// Add a global error handler for auth errors
window.addEventListener('unhandledrejection', function(event) {
  const error = event.reason;
  console.error('Unhandled promise rejection:', error);
  if (error && error.error === 'login_required' || error.error === 'invalid_token') {
    console.warn('Authentication token issue detected, redirecting to login');
    if (auth0Client) {
      login();
    }
  }
});

// Event listeners
if (loginButton) {
  loginButton.addEventListener('click', login);
}
if (logoutButton) {
  logoutButton.addEventListener('click', logout);
}

// Initialize Auth0 when the page loads
document.addEventListener('DOMContentLoaded', initAuth); 