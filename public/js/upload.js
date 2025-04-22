// Upload Module

// DOM elements
const uploadForm = document.getElementById('upload-form');
const trackTitleInput = document.getElementById('track-title');
const trackArtistInput = document.getElementById('track-artist');
const trackFileInput = document.getElementById('track-file');
const uploadProgress = document.getElementById('upload-progress');
const uploadProgressBar = document.getElementById('upload-progress-bar');
const uploadStatus = document.getElementById('upload-status');
const trackLibrary = document.getElementById('track-library');

// Initialize upload
function initUpload() {
  // Add event listeners
  uploadForm.addEventListener('submit', handleUpload);
  
  // Load track library
  loadTrackLibrary();
}

// Load track library from API
async function loadTrackLibrary() {
  try {
    const tracks = await trackApi.getAllTracks();
    renderTrackLibrary(tracks);
  } catch (error) {
    console.error('Error loading track library:', error);
    showToast('Error loading tracks', 'error');
  }
}

// Render track library in the UI
function renderTrackLibrary(tracks) {
  if (!tracks || tracks.length === 0) {
    trackLibrary.innerHTML = '<p class="text-gray-400 text-center">No tracks available</p>';
    return;
  }
  
  // Clear track library
  trackLibrary.innerHTML = '';
  
  // Add tracks to library
  tracks.forEach(track => {
    const trackItem = document.createElement('div');
    trackItem.className = 'track-item bg-gray-700 p-3 rounded-md flex justify-between items-center';
    trackItem.dataset.trackId = track._id;
    
    trackItem.innerHTML = `
      <div>
        <h3 class="font-medium">${track.title}</h3>
        <p class="text-sm text-gray-400">${track.artist}</p>
      </div>
      <div class="flex items-center space-x-3">
        <span class="text-sm text-gray-400">${formatTime(track.duration)}</span>
        <button class="add-track-btn bg-blue-600 hover:bg-blue-700 p-1 rounded">
          <i class="fas fa-plus"></i>
        </button>
      </div>
    `;
    
    trackLibrary.appendChild(trackItem);
    
    // Add event listener to add button
    const addButton = trackItem.querySelector('.add-track-btn');
    addButton.addEventListener('click', () => {
      addTrackToPlaylist(track._id);
    });
  });
}

// Handle upload form submission
async function handleUpload(event) {
  event.preventDefault();
  
  const title = trackTitleInput.value.trim();
  const artist = trackArtistInput.value.trim();
  const file = trackFileInput.files[0];
  
  if (!title || !artist || !file) {
    showToast('Please fill in all fields and select a file', 'error');
    return;
  }
  
  // Validate file type
  const validAudioTypes = ['audio/mp3', 'audio/mpeg', 'audio/wav', 'audio/ogg'];
  if (!validAudioTypes.includes(file.type)) {
    showToast('Please select a valid audio file (MP3, WAV, OGG)', 'error');
    return;
  }
  
  try {
    // Show upload progress
    uploadProgress.classList.remove('hidden');
    uploadProgressBar.style.width = '0%';
    uploadStatus.textContent = 'Preparing upload...';
    
    // Get upload signature from server
    const signatureData = await trackApi.getUploadSignature();
    
    // Create form data for Cloudinary upload
    const formData = new FormData();
    formData.append('file', file);
    formData.append('api_key', signatureData.apiKey);
    formData.append('timestamp', signatureData.timestamp);
    formData.append('signature', signatureData.signature);
    formData.append('folder', signatureData.folder);
    formData.append('resource_type', 'auto');
    
    // Upload to Cloudinary
    const xhr = new XMLHttpRequest();
    
    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable) {
        const percentComplete = Math.round((event.loaded / event.total) * 100);
        uploadProgressBar.style.width = `${percentComplete}%`;
        uploadStatus.textContent = `Uploading: ${percentComplete}%`;
      }
    });
    
    xhr.addEventListener('load', async () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        const response = JSON.parse(xhr.responseText);
        
        // Extract duration from response or compute it
        let duration = response.duration || 0;
        
        // If duration is not available in response, we need to compute it
        if (!duration) {
          duration = await getAudioDuration(file);
        }
        
        // Save track metadata to our server
        const trackData = {
          title,
          artist,
          duration,
          cloudinaryUrl: response.secure_url,
          cloudinaryPublicId: response.public_id
        };
        
        await trackApi.saveTrack(trackData);
        
        // Reset form and hide progress
        uploadForm.reset();
        uploadProgress.classList.add('hidden');
        
        showToast('Track uploaded successfully', 'success');
        
        // Refresh track library
        loadTrackLibrary();
      } else {
        throw new Error('Upload failed');
      }
    });
    
    xhr.addEventListener('error', () => {
      uploadProgress.classList.add('hidden');
      showToast('Upload failed', 'error');
    });
    
    xhr.open('POST', 'https://api.cloudinary.com/v1_1/' + signatureData.cloudName + '/auto/upload');
    xhr.send(formData);
    
  } catch (error) {
    console.error('Error uploading track:', error);
    uploadProgress.classList.add('hidden');
    showToast('Error uploading track: ' + error.message, 'error');
  }
}

// Get audio duration using Web Audio API
function getAudioDuration(file) {
  return new Promise((resolve, reject) => {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const reader = new FileReader();
    
    reader.onload = function(event) {
      audioContext.decodeAudioData(event.target.result, function(buffer) {
        resolve(buffer.duration);
      }, function(error) {
        console.error('Error decoding audio data:', error);
        resolve(0); // Default to 0 on error
      });
    };
    
    reader.onerror = function(error) {
      console.error('Error reading file:', error);
      resolve(0); // Default to 0 on error
    };
    
    reader.readAsArrayBuffer(file);
  });
}