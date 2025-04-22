// Auth0 Configuration - Replace with your actual Auth0 app details
const auth0Config = {
  domain: 'dev-4ehbbvfyj6j25ymb.us.auth0.com', // Your Auth0 domain
  clientId: 'gD07PIb4P7W1NlJqwCXcj9qjZh8XVHRx', // Your Auth0 client ID
  audience: 'https://api.noderadio.com', // Keep this as is
  redirectUri: window.location.origin, // Dynamic redirect URI
  cacheLocation: 'localstorage' // For persistent logins
};

// Make auth client accessible globally
window.auth = null;

// DOM elements
const loginButton = document.getElementById('login-button');
const logoutButton = document.getElementById('logout-button');
const loginMessage = document.getElementById('login-message');
const appContent = document.getElementById('app-content');

// Check if debug logging is available
function logDebug(message, category = 'auth') {
  console.log(`[AUTH] ${message}`);
  if (typeof debugLog === 'function') {
    debugLog(message, category);
  }
}

// Initialize Auth0 client
async function initAuth() {
  logDebug('Initializing Auth0...', 'auth');
  
  try {
    // Check if Auth0 SDK is available in window
    if (typeof createAuth0Client !== 'function') {
      logDebug('Auth0 SDK not found in global scope', 'auth');
      throw new Error('Auth0 SDK not available. Please check your internet connection.');
    }
    
    logDebug('Creating Auth0 client with domain: ' + auth0Config.domain, 'auth');
    
    // Create Auth0 client
    window.auth = await createAuth0Client({
      domain: auth0Config.domain,
      clientId: auth0Config.clientId,
      authorizationParams: {
        redirect_uri: auth0Config.redirectUri,
        audience: auth0Config.audience
      },
      cacheLocation: auth0Config.cacheLocation
    });
    
    logDebug('Auth0 client created successfully', 'auth');

    // Check for authentication state on page load
    try {
      // If returning from Auth0 redirect
      if (window.location.search.includes('code=') && window.location.search.includes('state=')) {
        logDebug('Auth redirect detected, handling callback', 'auth');
        // Handle the redirect and get the authentication result
        const result = await window.auth.handleRedirectCallback();
        
        // You can use the result object to check appState or other info passed on login
        logDebug('Auth redirect result received', 'auth');
        
        // Clear the URL parameters
        window.history.replaceState({}, document.title, window.location.pathname);
      }

      // Check if user is authenticated
      logDebug('Checking if user is authenticated', 'auth');
      const isAuthenticated = await window.auth.isAuthenticated();

      if (isAuthenticated) {
        logDebug('User is authenticated', 'auth');
        // Get user info and token
        const userProfile = await window.auth.getUser();
        const accessToken = await window.auth.getTokenSilently();
        
        logDebug(`User authenticated: ${userProfile.email}`, 'auth');
        
        // Register user on our backend
        try {
          await registerUser(userProfile, accessToken);
        } catch (registerError) {
          logDebug(`Registration error: ${registerError.message}`, 'auth');
          // Continue anyway - we can still use the app
        }
        
        // Update UI to show authenticated state
        updateAuthUI(true);
        
        // Initialize the app if the function exists
        if (typeof initApp === 'function') {
          initApp();
        } else {
          logDebug('initApp function not found', 'auth');
        }
      } else {
        logDebug('User is not authenticated', 'auth');
        updateAuthUI(false);
      }
    } catch (authError) {
      logDebug(`Authentication state error: ${authError.message}`, 'auth');
      updateAuthUI(false);
      showToast('Authentication error: ' + authError.message, 'error');
    }
  } catch (error) {
    logDebug(`Auth0 initialization error: ${error.message}`, 'auth');
    updateAuthUI(false);
    showToast('Authentication service error: ' + error.message, 'error');
  }
}

// Register user with our backend
async function registerUser(userProfile, accessToken) {
  if (!accessToken) {
    throw new Error('No access token available');
  }
  
  logDebug('Registering user with backend...', 'auth');
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
  logDebug('User registered successfully', 'auth');
  showToast('Welcome back, ' + (userProfile.nickname || userProfile.name) + '!', 'success');
  return userData;
}

// Update UI based on authentication state
function updateAuthUI(authenticated) {
  logDebug(`Updating UI: authenticated=${authenticated}`, 'auth');
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
    logDebug('Initiating login...', 'auth');
    if (!window.auth) {
      logDebug('Auth0 client not initialized', 'auth');
      showToast('Authentication service not ready. Please try again.', 'error');
      return;
    }
    
    logDebug('Redirecting to Auth0 login page', 'auth');
    await window.auth.loginWithRedirect({
      authorizationParams: {
        redirect_uri: auth0Config.redirectUri
      }
    });
    // Note: Code after this won't execute immediately since there's a redirect
  } catch (error) {
    logDebug(`Login error: ${error.message}`, 'auth');
    showToast('Login error: ' + error.message, 'error');
  }
}

// Logout function
async function logout() {
  try {
    logDebug('Logging out...', 'auth');
    if (!window.auth) {
      logDebug('Auth0 client not initialized', 'auth');
      showToast('Authentication service not ready. Please try again.', 'error');
      return;
    }
    
    // Call backend logout endpoint if available
    if (typeof authApi !== 'undefined' && authApi.logout) {
      try {
        await authApi.logout();
      } catch (logoutError) {
        logDebug(`Backend logout error: ${logoutError.message}`, 'auth');
      }
    }
    
    // Logout from Auth0
    logDebug('Redirecting to Auth0 logout page', 'auth');
    await window.auth.logout({
      logoutParams: {
        returnTo: window.location.origin
      }
    });
    // Note: Auth0 will redirect after logout
  } catch (error) {
    logDebug(`Logout error: ${error.message}`, 'auth');
    showToast('Logout error: ' + error.message, 'error');
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
  logDebug(`Toast: ${type} - ${message}`, 'ui');
  
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

// Add event listeners (must be done after DOM is loaded)
function setupEventListeners() {
  logDebug('Setting up Auth0 event listeners', 'auth');
  
  if (loginButton) {
    logDebug('Login button found, adding event listener', 'auth');
    // Remove any existing listeners to prevent duplicates
    loginButton.removeEventListener('click', handleLoginClick);
    // Add click handler
    loginButton.addEventListener('click', handleLoginClick);
  } else {
    logDebug('Login button not found in the DOM!', 'auth');
  }
  
  if (logoutButton) {
    logDebug('Logout button found, adding event listener', 'auth');
    // Remove any existing listeners to prevent duplicates
    logoutButton.removeEventListener('click', handleLogoutClick);
    // Add click handler
    logoutButton.addEventListener('click', handleLogoutClick);
  } else {
    logDebug('Logout button not found in the DOM!', 'auth');
  }
}

// Button click handlers
function handleLoginClick(e) {
  e.preventDefault();
  logDebug('Login button clicked', 'auth');
  // Add a visual indicator that the button was clicked
  loginButton.classList.add('bg-blue-800');
  setTimeout(() => loginButton.classList.remove('bg-blue-800'), 300);
  login();
}

function handleLogoutClick(e) {
  e.preventDefault();
  logDebug('Logout button clicked', 'auth');
  // Add a visual indicator that the button was clicked
  logoutButton.classList.add('bg-red-800');
  setTimeout(() => logoutButton.classList.remove('bg-red-800'), 300);
  logout();
}

// Initialize Auth0 when the page loads
document.addEventListener('DOMContentLoaded', function() {
  logDebug('DOM Content Loaded - Initializing Auth...', 'auth');
  setupEventListeners();
  initAuth();
});

// Export functions to the global scope for debugging
window.authDebug = {
  login,
  logout,
  initAuth,
  setupEventListeners
}; 