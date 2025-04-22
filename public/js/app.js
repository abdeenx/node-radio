// Main App Module

// Initialize the application
function initApp() {
  console.log('Initializing application...');
  
  // Initialize player
  initPlayer();
  
  // Initialize rooms
  initRooms();
  
  // Initialize upload
  initUpload();
  
  console.log('Application initialized');
}

// If user is already authenticated, init will be called from auth.js
// Otherwise, we'll wait for authentication

// Error handling for global errors
window.addEventListener('error', (event) => {
  console.error('Global error:', event.error);
  showToast('Application error: ' + event.error.message, 'error');
}); 