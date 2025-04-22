require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const mongoose = require('mongoose');
const path = require('path');
const cors = require('cors');
const compression = require('compression');
const helmet = require('helmet');
const cloudinary = require('cloudinary').v2;

// Import routes
const authRoutes = require('./routes/auth');
const tracksRoutes = require('./routes/tracks');
const roomsRoutes = require('./routes/rooms');

// Initialize Express app
const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
    credentials: true
  },
  transports: ['websocket', 'polling']
});

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/node_radio')
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// Middleware
app.use(cors());
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.auth0.com", "https://*.auth0.com"],
      connectSrc: ["'self'", "https://*.auth0.com", "wss://*.auth0.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      mediaSrc: ["'self'", "https://res.cloudinary.com"],
      imgSrc: ["'self'", "https://res.cloudinary.com", "https://*.auth0.com", "data:"]
    }
  }
}));
app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/tracks', tracksRoutes);
app.use('/api/rooms', roomsRoutes);

// Serve the main HTML file for all other routes (SPA approach)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Global error handler - must be after routes
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ 
    error: 'Internal server error', 
    message: process.env.NODE_ENV === 'production' ? 'Something went wrong' : err.message
  });
});

// Socket.io connection handling
const rooms = {};

io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);

  // Join room
  socket.on('joinRoom', (roomId) => {
    console.log(`Socket ${socket.id} joining room ${roomId}`);
    socket.join(roomId);
    
    // Initialize room if it doesn't exist
    if (!rooms[roomId]) {
      rooms[roomId] = {
        currentTrack: null,
        playlist: [],
        isPlaying: false,
        currentTime: 0,
        lastUpdateTime: Date.now()
      };
    }
    
    // Send current room state to the newly connected client
    socket.emit('roomState', rooms[roomId]);
  });

  // Play/pause track
  socket.on('togglePlay', (roomId) => {
    const room = rooms[roomId];
    if (room) {
      room.isPlaying = !room.isPlaying;
      if (room.isPlaying) {
        room.lastUpdateTime = Date.now();
      } else {
        // Update the current time when pausing
        room.currentTime += (Date.now() - room.lastUpdateTime) / 1000;
      }
      io.to(roomId).emit('playbackUpdate', { isPlaying: room.isPlaying, currentTime: room.currentTime });
    }
  });

  // Update current time of track
  socket.on('seek', (data) => {
    const { roomId, time } = data;
    const room = rooms[roomId];
    if (room) {
      room.currentTime = time;
      room.lastUpdateTime = Date.now();
      io.to(roomId).emit('seekUpdate', time);
    }
  });

  // Add track to playlist
  socket.on('addTrack', (data) => {
    const { roomId, track } = data;
    const room = rooms[roomId];
    if (room) {
      room.playlist.push(track);
      if (!room.currentTrack && room.playlist.length === 1) {
        room.currentTrack = room.playlist[0];
        room.currentTime = 0;
        room.lastUpdateTime = Date.now();
      }
      io.to(roomId).emit('playlistUpdate', room.playlist);
      if (room.currentTrack && !room.currentTrack.id) {
        io.to(roomId).emit('nowPlaying', room.currentTrack);
      }
    }
  });

  // Skip to next track
  socket.on('nextTrack', (roomId) => {
    const room = rooms[roomId];
    if (room && room.playlist.length > 0) {
      const currentIndex = room.playlist.findIndex(track => 
        track.id === (room.currentTrack ? room.currentTrack.id : null));
      const nextIndex = (currentIndex + 1) % room.playlist.length;
      room.currentTrack = room.playlist[nextIndex];
      room.currentTime = 0;
      room.lastUpdateTime = Date.now();
      io.to(roomId).emit('nowPlaying', room.currentTrack);
      io.to(roomId).emit('playbackUpdate', { isPlaying: room.isPlaying, currentTime: 0 });
    }
  });

  // Skip to previous track
  socket.on('prevTrack', (roomId) => {
    const room = rooms[roomId];
    if (room && room.playlist.length > 0) {
      const currentIndex = room.playlist.findIndex(track => 
        track.id === (room.currentTrack ? room.currentTrack.id : null));
      const prevIndex = (currentIndex - 1 + room.playlist.length) % room.playlist.length;
      room.currentTrack = room.playlist[prevIndex];
      room.currentTime = 0;
      room.lastUpdateTime = Date.now();
      io.to(roomId).emit('nowPlaying', room.currentTrack);
      io.to(roomId).emit('playbackUpdate', { isPlaying: room.isPlaying, currentTime: 0 });
    }
  });

  // Volume change - this is local to each client, just broadcast for UI sync
  socket.on('volumeChange', (data) => {
    const { roomId, volume } = data;
    socket.to(roomId).emit('volumeUpdate', volume);
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Start the server
// Use PORT provided by environment or default to 3000
// Render will provide a PORT environment variable
// Ensure compatibility with Vercel serverless deployment
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 