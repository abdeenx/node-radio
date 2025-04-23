/**
 * Enhanced Toast Notification System
 * Provides a unified interface for displaying toast notifications with various types,
 * durations, and visual indicators for network status.
 */

// Constants
const TOAST_TYPES = {
  INFO: 'info',
  SUCCESS: 'success',
  WARNING: 'warning',
  ERROR: 'error',
  NETWORK: 'network'
};

// Icons for each toast type (using Font Awesome)
const TOAST_ICONS = {
  [TOAST_TYPES.INFO]: 'fas fa-info-circle',
  [TOAST_TYPES.SUCCESS]: 'fas fa-check-circle',
  [TOAST_TYPES.WARNING]: 'fas fa-exclamation-triangle',
  [TOAST_TYPES.ERROR]: 'fas fa-exclamation-circle',
  [TOAST_TYPES.NETWORK]: 'fas fa-wifi'
};

/**
 * Display a toast notification
 * @param {string} message - The message to display
 * @param {string} type - The type of toast (info, success, warning, error, network)
 * @param {number} duration - How long to display the toast in milliseconds
 * @param {Object} options - Additional options for the toast
 * @returns {HTMLElement} - The toast element
 */
function showToast(message, type = TOAST_TYPES.INFO, duration = 3000, options = {}) {
  // Create toast container if it doesn't exist
  let toastContainer = document.getElementById('toast-container');
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.id = 'toast-container';
    toastContainer.className = 'toast-container';
    document.body.appendChild(toastContainer);
  }
  
  // Check if we should add an action button
  let actionHtml = '';
  if (options.action) {
    actionHtml = `<button class="toast-action">${options.action.text}</button>`;
  }
  
  // Create toast element
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <div class="toast-content">
      <i class="toast-icon ${TOAST_ICONS[type]}"></i>
      <div class="toast-message">${message}</div>
      ${actionHtml}
    </div>
    <div class="toast-progress"></div>
  `;
  
  // Add action event listener if specified
  if (options.action && typeof options.action.onClick === 'function') {
    const actionBtn = toast.querySelector('.toast-action');
    if (actionBtn) {
      actionBtn.addEventListener('click', (e) => {
        e.preventDefault();
        options.action.onClick(e);
      });
    }
  }
  
  // Add toast to container
  toastContainer.appendChild(toast);
  
  // Animate progress bar
  const progressBar = toast.querySelector('.toast-progress');
  progressBar.style.transition = `width ${duration}ms linear`;
  
  // Trigger reflow to enable animation
  toast.offsetHeight;
  
  // Start progress bar animation
  setTimeout(() => {
    progressBar.style.width = '0%';
  }, 10);
  
  // Remove toast after duration
  let timeoutId = setTimeout(() => {
    toast.classList.add('toast-hide');
    setTimeout(() => {
      if (toast.parentNode === toastContainer) {
        toastContainer.removeChild(toast);
      }
    }, 300); // Match transition duration
  }, duration);
  
  // Add dismiss functionality
  toast.addEventListener('click', () => {
    clearTimeout(timeoutId);
    toast.classList.add('toast-hide');
    setTimeout(() => {
      if (toast.parentNode === toastContainer) {
        toastContainer.removeChild(toast);
      }
    }, 300);
  });
  
  // Return the toast element for potential further customization
  return toast;
}

/**
 * Show a network status toast notification
 * @param {boolean} online - Whether the network is online
 * @param {number} duration - How long to display the toast
 * @returns {HTMLElement} - The toast element
 */
function showNetworkToast(online, duration = 3000) {
  const message = online 
    ? 'Network connection restored' 
    : 'Network connection lost';
  
  const type = online ? TOAST_TYPES.SUCCESS : TOAST_TYPES.NETWORK;
  
  let options = {};
  
  // For offline status, add a retry action
  if (!online) {
    options.action = {
      text: 'Retry',
      onClick: () => {
        // Attempt to reload the page or reconnect
        window.location.reload();
      }
    };
    // Make offline notifications stay longer
    duration = 10000;
  }
  
  return showToast(message, type, duration, options);
}

/**
 * Monitor network status and show notifications when it changes
 */
function monitorNetworkStatus() {
  // Last known network status
  let wasOnline = navigator.onLine;
  
  // Show initial status if offline
  if (!wasOnline) {
    showNetworkToast(false);
  }
  
  // Listen for online/offline events
  window.addEventListener('online', () => {
    if (!wasOnline) {
      showNetworkToast(true);
      wasOnline = true;
    }
  });
  
  window.addEventListener('offline', () => {
    if (wasOnline) {
      showNetworkToast(false);
      wasOnline = false;
    }
  });
}

// Initialize network monitoring when the script loads
document.addEventListener('DOMContentLoaded', monitorNetworkStatus);

// Export functions globally
window.showToast = showToast;
window.showNetworkToast = showNetworkToast;
window.TOAST_TYPES = TOAST_TYPES; 