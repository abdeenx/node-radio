const express = require('express');
const router = express.Router();
const { expressjwt } = require('express-jwt');
const jwksRsa = require('jwks-rsa');
const Room = require('../models/Room');
const User = require('../models/User');
const Track = require('../models/Track');

// Auth0 middleware for validating JWT
const checkJwt = expressjwt({
  secret: jwksRsa.expressJwtSecret({
    cache: true,
    rateLimit: true,
    jwksRequestsPerMinute: 5,
    jwksUri: `https://${process.env.AUTH0_DOMAIN}/.well-known/jwks.json`
  }),
  audience: process.env.AUTH0_AUDIENCE,
  issuer: `https://${process.env.AUTH0_DOMAIN}/`,
  algorithms: ['RS256']
});

// Handle JWT validation errors
router.use((err, req, res, next) => {
  if (err.name === 'UnauthorizedError') {
    return res.status(401).json({ 
      error: 'Authentication error', 
      message: 'Invalid token or missing authentication'
    });
  }
  next(err);
});

// Get all rooms
router.get('/', async (req, res) => {
  try {
    const rooms = await Room.find()
      .populate('createdBy', 'nickname')
      .select('-playlist');
    
    res.status(200).json(rooms);
  } catch (error) {
    console.error('Error fetching rooms:', error);
    res.status(500).json({ error: 'Failed to fetch rooms' });
  }
});

// Get room by ID
router.get('/:id', async (req, res) => {
  try {
    const room = await Room.findById(req.params.id)
      .populate('createdBy', 'nickname')
      .populate({
        path: 'playlist.track',
        select: 'title artist duration cloudinaryUrl'
      })
      .populate('playlist.addedBy', 'nickname');
    
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }
    
    res.status(200).json(room);
  } catch (error) {
    console.error('Error fetching room:', error);
    res.status(500).json({ error: 'Failed to fetch room' });
  }
});

// Create new room
router.post('/', checkJwt, async (req, res) => {
  try {
    const { name, description } = req.body;
    
    // Get user from Auth0 ID
    const user = await User.findOne({ auth0Id: req.auth.sub });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Check if room name already exists
    const existingRoom = await Room.findOne({ name });
    if (existingRoom) {
      return res.status(400).json({ error: 'Room name already exists' });
    }
    
    // Create new room
    const room = new Room({
      name,
      description,
      creator: user._id,
      playlist: []
    });
    
    await room.save();
    
    // Add room to user's created rooms
    if (user.createdRooms) {
      user.createdRooms.push(room._id);
    } else {
      user.createdRooms = [room._id];
    }
    await user.save();
    
    res.status(201).json(room);
  } catch (error) {
    console.error('Error creating room:', error);
    res.status(500).json({ error: 'Failed to create room' });
  }
});

// Add track to room playlist
router.post('/:id/playlist', checkJwt, async (req, res) => {
  try {
    const { trackId } = req.body;
    
    // Get user ID from Auth0 ID
    const user = await User.findOne({ auth0Id: req.auth.sub });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Find room
    const room = await Room.findById(req.params.id);
    
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }
    
    // Find track
    const track = await Track.findById(trackId);
    
    if (!track) {
      return res.status(404).json({ error: 'Track not found' });
    }
    
    // Add track to playlist
    room.playlist.push({
      track: track._id,
      addedBy: user._id
    });
    
    await room.save();
    
    // Return updated room with populated fields
    const updatedRoom = await Room.findById(room._id)
      .populate('createdBy', 'nickname')
      .populate({
        path: 'playlist.track',
        select: 'title artist duration cloudinaryUrl'
      })
      .populate('playlist.addedBy', 'nickname');
    
    res.status(200).json(updatedRoom);
  } catch (error) {
    console.error('Error adding track to playlist:', error);
    res.status(500).json({ error: 'Failed to add track to playlist' });
  }
});

// Remove track from room playlist
router.delete('/:roomId/playlist/:trackIndex', checkJwt, async (req, res) => {
  try {
    const { roomId, trackIndex } = req.params;
    
    // Get user ID from Auth0 ID
    const user = await User.findOne({ auth0Id: req.auth.sub });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Find room
    const room = await Room.findById(roomId);
    
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }
    
    // Check if track exists in playlist
    if (trackIndex >= room.playlist.length) {
      return res.status(404).json({ error: 'Track not found in playlist' });
    }
    
    // Check if user is the one who added the track or the room creator
    const playlistItem = room.playlist[trackIndex];
    if (!playlistItem.addedBy.equals(user._id) && !room.createdBy.equals(user._id)) {
      return res.status(403).json({ error: 'Not authorized to remove this track' });
    }
    
    // Remove track from playlist
    room.playlist.splice(trackIndex, 1);
    
    // Update current track index if needed
    if (room.currentTrackIndex >= room.playlist.length) {
      room.currentTrackIndex = Math.max(0, room.playlist.length - 1);
    }
    
    await room.save();
    
    res.status(200).json({ message: 'Track removed from playlist' });
  } catch (error) {
    console.error('Error removing track from playlist:', error);
    res.status(500).json({ error: 'Failed to remove track from playlist' });
  }
});

// Update room state (for syncing with Socket.io state)
router.put('/:id/state', checkJwt, async (req, res) => {
  try {
    const { currentTrackIndex, isPlaying, currentTime } = req.body;
    
    // Find room
    const room = await Room.findById(req.params.id);
    
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }
    
    // Update room state
    if (currentTrackIndex !== undefined) {
      room.currentTrackIndex = currentTrackIndex;
    }
    
    if (isPlaying !== undefined) {
      room.isPlaying = isPlaying;
    }
    
    if (currentTime !== undefined) {
      room.currentTime = currentTime;
    }
    
    await room.save();
    
    res.status(200).json(room);
  } catch (error) {
    console.error('Error updating room state:', error);
    res.status(500).json({ error: 'Failed to update room state' });
  }
});

module.exports = router; 