// Auth0 Configuration
const auth0Config = {
  domain: 'your-auth0-domain.auth0.com',
  clientId: 'your-auth0-client-id',
  audience: 'https://api.noderadio.com',
  redirectUri: window.location.origin, // Update this to your Vercel URL in production
  cacheLocation: 'localstorage'
};

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
    auth0Client = await createAuth0Client({
      domain: auth0Config.domain,
      clientId: auth0Config.clientId,
      authorizationParams: {
        redirect_uri: auth0Config.redirectUri,
        audience: auth0Config.audience
      },
      cacheLocation: auth0Config.cacheLocation
    });

    // Check for authentication state on page load
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
      await registerUser();
      
      // Update UI to show authenticated state
      updateAuthUI(true);
      
      // Initialize the app
      initApp();
    } else {
      console.log('User is not authenticated');
      updateAuthUI(false);
    }
  } catch (error) {
    console.error('Authentication error:', error);
    updateAuthUI(false);
    showToast('Authentication error: ' + error.message, 'error');
  }
}

// Register user with our backend
async function registerUser() {
  try {
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
  } catch (error) {
    console.error('Error registering user:', error);
    showToast('Error registering user: ' + error.message, 'error');
  }
}

// Update UI based on authentication state
function updateAuthUI(authenticated) {
  if (authenticated) {
    loginButton.classList.add('hidden');
    logoutButton.classList.remove('hidden');
    loginMessage.classList.add('hidden');
    appContent.classList.remove('hidden');
    
    // You could add user profile info to the UI here
    // For example: document.getElementById('user-name').textContent = userProfile.name;
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
    if (typeof authApi !== 'undefined') {
      await authApi.logout();
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

// Add a global error handler for auth errors
window.addEventListener('unhandledrejection', function(event) {
  const error = event.reason;
  if (error.error === 'login_required' || error.error === 'invalid_token') {
    console.warn('Authentication token issue detected, redirecting to login');
    login();
  }
});

// Event listeners
loginButton.addEventListener('click', login);
logoutButton.addEventListener('click', logout);

// Initialize Auth0 when the page loads
document.addEventListener('DOMContentLoaded', initAuth); 