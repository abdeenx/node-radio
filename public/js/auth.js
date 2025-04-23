// Auth0 Configuration - Use environment variables if available
// When deployed to Vercel, these will be injected by the server
const auth0Config = {
  domain: window.AUTH0_DOMAIN || 'dev-4ehbbvfyj6j25ymb.us.auth0.com', // Your Auth0 domain
  clientId: window.AUTH0_CLIENT_ID || 'gD07PIb4P7W1NlJqwCXcj9qjZh8XVHRx', // Your Auth0 client ID
  audience: window.AUTH0_AUDIENCE || 'https://api.noderadio.com', // API audience
  redirectUri: window.location.origin, // Dynamic redirect URI
  cacheLocation: 'localstorage' // For persistent logins
};

// Make auth client accessible globally
window.auth = null;

// DOM elements - Use querySelector as a backup if getElementById fails
const loginButton = document.getElementById('login-button') || document.querySelector('button[id="login-button"]');
const logoutButton = document.getElementById('logout-button') || document.querySelector('button[id="logout-button"]');
const loginMessage = document.getElementById('login-message') || document.querySelector('div[id="login-message"]');
const appContent = document.getElementById('app-content') || document.querySelector('div[id="app-content"]');

// Check if debug logging is available
function logDebug(message, category = 'auth') {
  console.log(`[AUTH] ${message}`);
  if (typeof debugLog === 'function') {
    debugLog(message, category);
  } else if (typeof window.debugLog === 'function') {
    window.debugLog(message, category);
  }
}

// Initialize Auth0 client
async function initAuth() {
  logDebug('Initializing Auth0...', 'auth');
  
  try {
    // First, check if elements were found
    if (!loginButton) {
      console.error('Login button not found in DOM!');
      logDebug('Login button not found in DOM!', 'auth');
    }
    
    // Set default styling for login button - ensure it's visible
    if (loginButton) {
      loginButton.style.display = 'inline-block';
      loginButton.style.backgroundColor = '#3B82F6'; // blue-500
      loginButton.style.color = 'white';
      loginButton.style.padding = '0.5rem 1rem';
      loginButton.style.borderRadius = '0.375rem';
      loginButton.style.cursor = 'pointer';
    }
    
    // Check if Auth0 SDK is available in window
    if (typeof createAuth0Client !== 'function') {
      logDebug('Auth0 SDK not found in global scope, using fallback', 'auth');
      
      // Use the fallback or direct login approach
      setupEventListeners();
      updateAuthUI(false);
      return;
    }
    
    logDebug('Creating Auth0 client with domain: ' + auth0Config.domain, 'auth');
    
    // Create Auth0 client
    window.auth = await createAuth0Client(auth0Config);
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
      showToast('Authentication error: ' + authError.message, TOAST_TYPES.ERROR);
    }
  } catch (error) {
    logDebug(`Auth0 initialization error: ${error.message}`, 'auth');
    updateAuthUI(false);
    showToast('Authentication service error: ' + error.message, TOAST_TYPES.ERROR);
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
  showToast('Welcome back, ' + (userProfile.nickname || userProfile.name) + '!', TOAST_TYPES.SUCCESS);
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
      showToast('Authentication service not ready. Please try again.', TOAST_TYPES.ERROR);
      return false;
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
    showToast('Login error: ' + error.message, TOAST_TYPES.ERROR);
    return false;
  }
}

// Logout function
async function logout() {
  try {
    logDebug('Logging out...', 'auth');
    if (!window.auth) {
      logDebug('Auth0 client not initialized', 'auth');
      showToast('Authentication service not ready. Please try again.', TOAST_TYPES.ERROR);
      return false;
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
    showToast('Logout error: ' + error.message, TOAST_TYPES.ERROR);
    return false;
  }
}

// Custom toast function if the main one is not available
function showToast(message, type = TOAST_TYPES.INFO, duration = 3000) {
  // Use the global showToast function from toast.js
  if (window.showToast && window.showToast !== showToast) {
    window.showToast(message, type, duration);
    return;
  }
  
  // Log message even if we can't show a toast
  logDebug(`Toast: ${type} - ${message}`, 'ui');
  
  // Fallback implementation for development/testing
  console.log(`%c TOAST [${type}]: ${message}`, 
    `background: ${
      type === TOAST_TYPES.ERROR ? '#f44336' : 
      type === TOAST_TYPES.SUCCESS ? '#4caf50' : 
      type === TOAST_TYPES.WARNING ? '#ff9800' : '#2196f3'
    }; color: white; padding: 2px 6px; border-radius: 4px;`
  );
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

// Button click handlers - Updated for more reliability
function handleLoginClick(e) {
  if (e) e.preventDefault();
  logDebug('Login button clicked', 'auth');
  
  // Add a visual indicator that the button was clicked
  if (loginButton) {
    loginButton.classList.add('bg-blue-800');
    setTimeout(() => loginButton.classList.remove('bg-blue-800'), 300);
  }
  
  // Try to log in with Auth0 client first
  if (window.auth) {
    login();
  } else if (typeof window.directLogin === 'function') {
    // Fallback to direct login if Auth0 client is not available
    logDebug('Using direct login function', 'auth');
    window.directLogin();
  } else {
    // Last resort: direct redirect to Auth0 login page
    logDebug('Using hardcoded redirect to Auth0', 'auth');
    const domain = auth0Config.domain;
    const clientId = auth0Config.clientId;
    const redirectUri = auth0Config.redirectUri;
    
    const authorizeUrl = `https://${domain}/authorize` +
      `?client_id=${encodeURIComponent(clientId)}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&response_type=code` +
      `&scope=${encodeURIComponent('openid profile email')}` +
      `&state=${encodeURIComponent(Math.random().toString(36).substring(2, 15))}`;
    
    window.location.href = authorizeUrl;
  }
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
  
  // Delay Auth0 initialization slightly to ensure DOM is ready
  setTimeout(initAuth, 100);
  
  // Add a failsafe for login button
  if (loginButton) {
    loginButton.onclick = handleLoginClick;
  }
});

// Export functions to the global scope for debugging
window.authDebug = {
  login,
  logout,
  initAuth,
  setupEventListeners,
  handleLoginClick
}; 