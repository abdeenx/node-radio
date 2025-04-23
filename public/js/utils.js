/**
 * Node Radio - Utilities
 * Common utility functions for the application
 */

// Debug logging
function debugLog(message, category = 'general') {
  if (window.DEBUG_MODE) {
    console.log(`[${category.toUpperCase()}] ${message}`);
  }
}

// Format time from seconds to MM:SS
function formatTime(seconds) {
  if (isNaN(seconds) || seconds < 0) return '0:00';
  
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

// Show toast notification
function showToast(message, type = 'info') {
  // Create toast container if it doesn't exist
  let toastContainer = document.getElementById('toast-container');
  
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.id = 'toast-container';
    document.body.appendChild(toastContainer);
    
    // Add style for toast container
    const style = document.createElement('style');
    style.textContent = `
      #toast-container {
        position: fixed;
        bottom: 20px;
        right: 20px;
        z-index: 1000;
      }
      
      .toast {
        padding: 12px 16px;
        border-radius: 4px;
        margin-top: 10px;
        color: white;
        display: flex;
        align-items: center;
        justify-content: space-between;
        box-shadow: 0 4px 8px rgba(0,0,0,0.2);
        opacity: 0;
        transform: translateX(100%);
        transition: all 0.3s ease;
      }
      
      .toast.show {
        opacity: 1;
        transform: translateX(0);
      }
      
      .toast-success {
        background-color: #43a047;
      }
      
      .toast-error {
        background-color: #e53935;
      }
      
      .toast-warning {
        background-color: #fb8c00;
      }
      
      .toast-info {
        background-color: #3861fb;
      }
      
      .toast-close {
        background: none;
        border: none;
        color: white;
        font-size: 16px;
        cursor: pointer;
        margin-left: 16px;
      }
    `;
    document.head.appendChild(style);
  }
  
  // Create toast element
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  
  toast.innerHTML = `
    ${message}
    <button class="toast-close">&times;</button>
  `;
  
  // Add to container
  toastContainer.appendChild(toast);
  
  // Show toast (delayed to allow for transition)
  setTimeout(() => {
    toast.classList.add('show');
  }, 10);
  
  // Setup close button
  const closeButton = toast.querySelector('.toast-close');
  if (closeButton) {
    closeButton.addEventListener('click', () => {
      toast.classList.remove('show');
      
      setTimeout(() => {
        toast.remove();
      }, 300);
    });
  }
  
  // Auto remove
  setTimeout(() => {
    toast.classList.remove('show');
    
    setTimeout(() => {
      toast.remove();
    }, 300);
  }, 5000);
}

// Generate a UUID
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Throttle function to limit execution frequency
function throttle(func, delay) {
  let lastCall = 0;
  
  return function(...args) {
    const now = Date.now();
    
    if (now - lastCall < delay) {
      return;
    }
    
    lastCall = now;
    return func(...args);
  };
}

// Debounce function to delay execution until after a pause
function debounce(func, delay) {
  let timeoutId;
  
  return function(...args) {
    clearTimeout(timeoutId);
    
    timeoutId = setTimeout(() => {
      func(...args);
    }, delay);
  };
} 