/**
 * Auth0 Debug Tool
 * 
 * This script helps diagnose issues with Auth0 authentication.
 * Include it in your HTML to output diagnostic information.
 */

(function() {
  const diagPanel = document.createElement('div');
  diagPanel.style.position = 'fixed';
  diagPanel.style.left = '20px';
  diagPanel.style.top = '20px';
  diagPanel.style.zIndex = '10000';
  diagPanel.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
  diagPanel.style.color = '#00ff00';
  diagPanel.style.padding = '10px';
  diagPanel.style.borderRadius = '5px';
  diagPanel.style.maxWidth = '80%';
  diagPanel.style.maxHeight = '80%';
  diagPanel.style.overflow = 'auto';
  diagPanel.style.fontFamily = 'monospace';
  diagPanel.style.fontSize = '12px';
  diagPanel.style.display = 'none';

  // Add close button
  const closeBtn = document.createElement('button');
  closeBtn.textContent = 'Close';
  closeBtn.style.backgroundColor = '#333';
  closeBtn.style.color = 'white';
  closeBtn.style.border = 'none';
  closeBtn.style.padding = '5px 10px';
  closeBtn.style.marginTop = '10px';
  closeBtn.style.cursor = 'pointer';
  closeBtn.onclick = function() {
    diagPanel.style.display = 'none';
  };

  // Create log area
  const logDiv = document.createElement('div');
  diagPanel.appendChild(logDiv);
  diagPanel.appendChild(closeBtn);

  document.body.appendChild(diagPanel);

  // Log function
  function log(message, type = 'info') {
    const entry = document.createElement('div');
    entry.style.borderBottom = '1px solid rgba(255,255,255,0.2)';
    entry.style.padding = '5px 0';
    entry.style.color = type === 'error' ? '#ff4444' : 
                        type === 'warn' ? '#ffaa44' : 
                        type === 'success' ? '#44ff44' : '#ffffff';
    
    const timestamp = new Date().toLocaleTimeString();
    entry.innerHTML = `<span style="color:#888">[${timestamp}]</span> ${message}`;
    
    logDiv.appendChild(entry);
    logDiv.scrollTop = logDiv.scrollHeight;
  }

  // Toggle show/hide with Alt+D
  document.addEventListener('keydown', function(e) {
    if (e.altKey && e.key === 'd') {
      diagPanel.style.display = diagPanel.style.display === 'none' ? 'block' : 'none';
      if (diagPanel.style.display === 'block') {
        runDiagnostics();
      }
    }
  });

  // Run diagnostics
  function runDiagnostics() {
    logDiv.innerHTML = ''; // Clear log
    log('Auth0 Debug Tool', 'info');
    log('Press Alt+D to toggle this panel', 'info');
    log('-----------------------------------', 'info');
    
    // Check URL
    const url = window.location.href;
    log(`Current URL: ${url}`, 'info');
    
    // Check for auth code in URL
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('code')) {
      log('Auth code found in URL ✓', 'success');
      log(`code: ${urlParams.get('code').substring(0, 10)}...`, 'info');
    } else {
      log('No auth code in URL', 'info');
    }
    
    if (urlParams.has('state')) {
      log('State parameter found in URL ✓', 'success');
      log(`state: ${urlParams.get('state')}`, 'info');
      
      // Check state in localStorage
      const storedState = localStorage.getItem('auth_state');
      if (storedState) {
        log('State found in localStorage ✓', 'success');
        if (storedState === urlParams.get('state')) {
          log('State values match ✓', 'success');
        } else {
          log('State values DO NOT match ✗', 'error');
          log(`URL: ${urlParams.get('state')}`, 'info');
          log(`Stored: ${storedState}`, 'info');
        }
      } else {
        log('No state found in localStorage ✗', 'error');
      }
    }
    
    // Check for errors
    if (urlParams.has('error')) {
      log('Error found in URL ✗', 'error');
      log(`Error: ${urlParams.get('error')}`, 'error');
      
      if (urlParams.has('error_description')) {
        log(`Description: ${urlParams.get('error_description')}`, 'error');
      }
    }
    
    // Check Auth0 configuration
    log('-----------------------------------', 'info');
    log('Auth0 Configuration:', 'info');
    
    if (window.auth0Config) {
      log('Auth0Config found in window ✓', 'success');
      log(`Domain: ${window.auth0Config.domain}`, 'info');
      log(`ClientID: ${window.auth0Config.clientId}`, 'info');
      log(`RedirectURI: ${window.auth0Config.redirectUri}`, 'info');
    } else if (window.AUTH0_DOMAIN) {
      log('Auth0 globals found in window ✓', 'success');
      log(`Domain: ${window.AUTH0_DOMAIN}`, 'info');
      log(`ClientID: ${window.AUTH0_CLIENT_ID}`, 'info');
      log(`RedirectURI: ${window.AUTH0_REDIRECT_URI || window.location.origin}`, 'info');
    } else {
      log('No Auth0 configuration found in window ✗', 'error');
    }
    
    // Check Auth0 SDK
    log('-----------------------------------', 'info');
    log('Auth0 SDK Status:', 'info');
    
    if (typeof createAuth0Client === 'function') {
      log('Auth0 SDK loaded ✓', 'success');
    } else {
      log('Auth0 SDK not loaded ✗', 'error');
    }
    
    if (window.auth) {
      log('Auth0 client initialized ✓', 'success');
      
      // Check if user is authenticated
      window.auth.isAuthenticated().then(isAuthenticated => {
        log(`User authenticated: ${isAuthenticated ? 'Yes ✓' : 'No ✗'}`, 
            isAuthenticated ? 'success' : 'warn');
        
        if (isAuthenticated) {
          window.auth.getUser().then(user => {
            log('User information:', 'info');
            log(`Email: ${user.email}`, 'info');
            log(`Name: ${user.name}`, 'info');
          }).catch(err => {
            log(`Error getting user info: ${err.message}`, 'error');
          });
        }
      }).catch(err => {
        log(`Error checking auth status: ${err.message}`, 'error');
      });
    } else {
      log('Auth0 client not initialized ✗', 'warn');
    }
    
    // Check localStorage for tokens
    log('-----------------------------------', 'info');
    log('Storage Inspection:', 'info');
    
    try {
      // Look for Auth0 specific items
      let auth0Found = false;
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key.includes('auth0') || key.includes('@@auth0')) {
          auth0Found = true;
          log(`Found Auth0 storage: ${key}`, 'success');
        }
      }
      
      if (!auth0Found) {
        log('No Auth0 storage items found', 'warn');
      }
      
      // Check for common auth items
      const authItems = ['id_token', 'access_token', 'expires_at', 'auth_state'];
      
      authItems.forEach(item => {
        if (localStorage.getItem(item)) {
          log(`Found ${item} in localStorage ✓`, 'success');
        }
      });
    } catch (e) {
      log(`Error accessing localStorage: ${e.message}`, 'error');
    }
    
    // Check network requests
    log('-----------------------------------', 'info');
    log('Check for network issues:', 'info');
    
    // Check if online
    if (navigator.onLine) {
      log('Browser reports online status ✓', 'success');
    } else {
      log('Browser reports offline status ✗', 'error');
    }
    
    // Ping Auth0 domain
    const img = new Image();
    img.onload = function() {
      log('Connected to Auth0 domain ✓', 'success');
    };
    img.onerror = function() {
      log('Failed to connect to Auth0 domain ✗', 'error');
      log('Network issue or CORS restriction', 'warn');
    };
    
    if (window.auth0Config) {
      img.src = `https://${window.auth0Config.domain}/favicon.ico?${Date.now()}`;
    } else if (window.AUTH0_DOMAIN) {
      img.src = `https://${window.AUTH0_DOMAIN}/favicon.ico?${Date.now()}`;
    }
    
    log('-----------------------------------', 'info');
    log('Debug complete. Additional actions:', 'info');
    log('1. Check browser console for errors', 'info');
    log('2. Inspect Network tab in DevTools during login', 'info');
    log('3. Verify correct Auth0 application settings', 'info');
  }

  // Auto-show if there's an error in the URL
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.has('error')) {
    diagPanel.style.display = 'block';
    runDiagnostics();
  }
  
  // Export for console use
  window.authDebugTool = {
    show: function() { 
      diagPanel.style.display = 'block';
      runDiagnostics();
    },
    hide: function() { 
      diagPanel.style.display = 'none';
    },
    log: log,
    runDiagnostics: runDiagnostics
  };
  
  // Let user know it's available
  if (console) {
    console.log('%c Auth0 Debug Tool loaded. Press Alt+D to show debug panel or run authDebugTool.show() in console.', 
                'background: #222; color: #bada55; padding: 5px;');
  }
})(); 