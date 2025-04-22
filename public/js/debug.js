/**
 * Auth0 SPA JS SDK - Local Fallback Version
 * 
 * This file is loaded directly to ensure Auth0 SDK is available.
 * If the CDN version fails to load, this will be used as a fallback.
 */

(function() {
  console.log('Auth0 local fallback script loaded');
  
  // Check if Auth0 SDK is already available
  if (typeof createAuth0Client === 'function') {
    console.log('Auth0 SDK already available, no need for fallback');
    return;
  }
  
  // Create a simple debug version of Auth0 client for testing
  window.createAuth0Client = async function(options) {
    console.log('Using fallback Auth0 client implementation');
    console.log('Auth0 config:', options);
    
    return {
      // Basic methods needed for testing
      isAuthenticated: async function() {
        console.log('Fallback isAuthenticated called');
        return false;
      },
      
      getUser: async function() {
        console.log('Fallback getUser called');
        return { name: 'Test User', email: 'test@example.com' };
      },
      
      getTokenSilently: async function() {
        console.log('Fallback getTokenSilently called');
        return 'dummy-token-for-testing';
      },
      
      loginWithRedirect: async function(options) {
        console.log('Fallback loginWithRedirect called', options);
        alert('This is a test implementation. In a real app, you would be redirected to Auth0 login page.');
        // For testing, you can uncomment this to simulate a redirect
        // window.location.href = "https://dev-4ehbbvfyj6j25ymb.us.auth0.com/authorize?client_id=" + 
        //   encodeURIComponent(auth0Config.clientId) + 
        //   "&redirect_uri=" + encodeURIComponent(auth0Config.redirectUri) +
        //   "&response_type=code&scope=openid%20profile%20email";
      },
      
      handleRedirectCallback: async function() {
        console.log('Fallback handleRedirectCallback called');
        return { appState: {} };
      },
      
      logout: async function(options) {
        console.log('Fallback logout called', options);
        alert('This is a test implementation. In a real app, you would be logged out and redirected.');
      }
    };
  };
  
  console.log('Auth0 fallback client initialized and ready');
})();
