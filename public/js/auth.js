// Auth0 Configuration
const auth0Config = {
  domain: 'your-auth0-domain.auth0.com',
  clientId: 'your-auth0-client-id',
  audience: 'https://api.noderadio.com',
  redirectUri: window.location.origin, // Update this to your Render URL in production
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
  try {
    // If returning from Auth0 redirect
    if (
      window.location.search.includes('code=') &&
      window.location.search.includes('state=')
    ) {
      await auth0Client.handleRedirectCallback();
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    // Check if user is authenticated
    isAuthenticated = await auth0Client.isAuthenticated();

    if (isAuthenticated) {
      // Get user info and token
      userProfile = await auth0Client.getUser();
      accessToken = await auth0Client.getTokenSilently();
      
      // Register user on our backend
      await registerUser();
      
      // Update UI to show authenticated state
      updateAuthUI(true);
      
      // Initialize the app
      initApp();
    } else {
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
      throw new Error('Failed to register user');
    }
    
    const userData = await response.json();
    console.log('User registered:', userData);
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
    await auth0Client.loginWithRedirect();
  } catch (error) {
    console.error('Login error:', error);
    showToast('Login error: ' + error.message, 'error');
  }
}

// Logout function
async function logout() {
  try {
    await auth0Client.logout({
      logoutParams: {
        returnTo: window.location.origin
      }
    });
  } catch (error) {
    console.error('Logout error:', error);
    showToast('Logout error: ' + error.message, 'error');
  }
}

// Event listeners
loginButton.addEventListener('click', login);
logoutButton.addEventListener('click', logout);

// Initialize Auth0 when the page loads
document.addEventListener('DOMContentLoaded', initAuth); 