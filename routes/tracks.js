const express = require('express');
const router = express.Router();
const { expressjwt: jwt } = require('express-jwt');
const jwksRsa = require('jwks-rsa');
const cloudinary = require('cloudinary').v2;
const Track = require('../models/Track');
const User = require('../models/User');

// Auth0 middleware for validating JWT
const checkJwt = jwt({
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

// Get all tracks
router.get('/', async (req, res) => {
  try {
    const tracks = await Track.find().populate('uploader', 'nickname');
    res.status(200).json(tracks);
  } catch (error) {
    console.error('Error fetching tracks:', error);
    res.status(500).json({ error: 'Failed to fetch tracks' });
  }
});

// Get track by ID
router.get('/:id', async (req, res) => {
  try {
    const track = await Track.findById(req.params.id).populate('uploader', 'nickname');
    
    if (!track) {
      return res.status(404).json({ error: 'Track not found' });
    }
    
    res.status(200).json(track);
  } catch (error) {
    console.error('Error fetching track:', error);
    res.status(500).json({ error: 'Failed to fetch track' });
  }
});

// Get Cloudinary signature for direct upload
router.get('/upload/signature', checkJwt, async (req, res) => {
  try {
    const timestamp = Math.round(new Date().getTime() / 1000);
    const signature = cloudinary.utils.api_sign_request({
      timestamp,
      folder: 'node_radio',
      resource_type: 'auto'
    }, process.env.CLOUDINARY_API_SECRET);
    
    res.status(200).json({
      signature,
      timestamp,
      cloudName: process.env.CLOUDINARY_CLOUD_NAME,
      apiKey: process.env.CLOUDINARY_API_KEY,
      folder: 'node_radio'
    });
  } catch (error) {
    console.error('Error generating signature:', error);
    res.status(500).json({ error: 'Failed to generate upload signature' });
  }
});

// Save track metadata after Cloudinary upload
router.post('/', checkJwt, async (req, res) => {
  try {
    const { title, artist, duration, cloudinaryUrl, cloudinaryPublicId } = req.body;
    
    // Get user ID from Auth0 ID
    const user = await User.findOne({ auth0Id: req.auth.sub });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Create new track
    const track = new Track({
      title,
      artist,
      duration,
      cloudinaryUrl,
      cloudinaryPublicId,
      uploader: user._id
    });
    
    await track.save();
    
    // Add track to user's upload history
    user.uploadHistory.push(track._id);
    await user.save();
    
    res.status(201).json(track);
  } catch (error) {
    console.error('Error saving track:', error);
    res.status(500).json({ error: 'Failed to save track' });
  }
});

// Delete track
router.delete('/:id', checkJwt, async (req, res) => {
  try {
    // Find track
    const track = await Track.findById(req.params.id);
    
    if (!track) {
      return res.status(404).json({ error: 'Track not found' });
    }
    
    // Check if user is the uploader
    const user = await User.findOne({ auth0Id: req.auth.sub });
    
    if (!user || !track.uploader.equals(user._id)) {
      return res.status(403).json({ error: 'Not authorized to delete this track' });
    }
    
    // Delete from Cloudinary
    await cloudinary.uploader.destroy(track.cloudinaryPublicId, { resource_type: 'video' });
    
    // Delete from database
    await Track.findByIdAndDelete(req.params.id);
    
    // Remove from user's upload history
    user.uploadHistory = user.uploadHistory.filter(id => !id.equals(track._id));
    await user.save();
    
    res.status(200).json({ message: 'Track deleted successfully' });
  } catch (error) {
    console.error('Error deleting track:', error);
    res.status(500).json({ error: 'Failed to delete track' });
  }
});

// Increment play count
router.post('/:id/play', async (req, res) => {
  try {
    const track = await Track.findById(req.params.id);
    
    if (!track) {
      return res.status(404).json({ error: 'Track not found' });
    }
    
    track.playCount += 1;
    track.lastPlayed = new Date();
    await track.save();
    
    res.status(200).json({ playCount: track.playCount });
  } catch (error) {
    console.error('Error updating play count:', error);
    res.status(500).json({ error: 'Failed to update play count' });
  }
});

module.exports = router; 