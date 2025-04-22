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
      
      loginWithRedirect: async function(params) {
        console.log('Fallback loginWithRedirect called', params);
        
        // Get the redirect URI from params or options
        const redirectUri = params?.authorizationParams?.redirect_uri || 
                           options.authorizationParams?.redirect_uri || 
                           window.location.origin;
        
        // Get response type and scope
        const responseType = "code";
        const scope = params?.authorizationParams?.scope || 
                     options.authorizationParams?.scope || 
                     "openid profile email";
        
        // Build the Auth0 authorize URL
        const authorizeUrl = `https://${options.domain}/authorize` +
          `?client_id=${encodeURIComponent(options.clientId)}` +
          `&redirect_uri=${encodeURIComponent(redirectUri)}` +
          `&response_type=${responseType}` +
          `&scope=${encodeURIComponent(scope)}` +
          `&state=${encodeURIComponent(Math.random().toString(36).substring(2, 15))}` +
          `&nonce=${encodeURIComponent(Math.random().toString(36).substring(2, 15))}`;
        
        console.log('Redirecting to Auth0:', authorizeUrl);
        
        // Redirect to Auth0 login page
        window.location.href = authorizeUrl;
      },
      
      handleRedirectCallback: async function() {
        console.log('Fallback handleRedirectCallback called');
        return { appState: {} };
      },
      
      logout: async function(params) {
        console.log('Fallback logout called', params);
        
        // Get the returnTo URL
        const returnTo = params?.logoutParams?.returnTo || 
                        window.location.origin;
        
        // Build the logout URL
        const logoutUrl = `https://${options.domain}/v2/logout` +
          `?client_id=${encodeURIComponent(options.clientId)}` +
          `&returnTo=${encodeURIComponent(returnTo)}`;
        
        console.log('Redirecting to Auth0 logout:', logoutUrl);
        
        // Redirect to Auth0 logout page
        window.location.href = logoutUrl;
      }
    };
  };
  
  console.log('Auth0 fallback client initialized and ready');
})();
