const express = require('express');
const router = express.Router();
const { expressjwt: jwt } = require('express-jwt');
const jwksRsa = require('jwks-rsa');
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

// Global error handler for authentication errors
router.use((err, req, res, next) => {
  if (err.name === 'UnauthorizedError') {
    console.error('Auth error:', err.message);
    return res.status(401).json({ 
      error: 'Authentication error', 
      message: 'Invalid token or missing authentication'
    });
  }
  next(err);
});

// Create or update user after successful authentication
router.post('/register', checkJwt, async (req, res) => {
  try {
    const { sub, email, nickname, picture } = req.body;
    
    if (!sub || !email) {
      return res.status(400).json({ error: 'Missing required user data' });
    }
    
    // Check if user already exists
    let user = await User.findOne({ auth0Id: sub });
    
    if (user) {
      // Update existing user
      user.email = email;
      user.nickname = nickname || user.nickname;
      user.picture = picture || user.picture;
      user.lastLogin = new Date();
      await user.save();
      
      console.log(`User updated: ${user.email}`);
    } else {
      // Create new user
      user = new User({
        auth0Id: sub,
        email,
        nickname: nickname || email.split('@')[0],
        picture,
        lastLogin: new Date()
      });
      await user.save();
      
      console.log(`New user registered: ${user.email}`);
    }
    
    // Return user data (omitting sensitive fields)
    const userData = {
      id: user._id,
      email: user.email,
      nickname: user.nickname,
      picture: user.picture,
      createdAt: user.createdAt
    };
    
    res.status(200).json(userData);
  } catch (error) {
    console.error('Error registering user:', error);
    res.status(500).json({ error: 'Failed to register user', message: error.message });
  }
});

// Get user profile
router.get('/profile', checkJwt, async (req, res) => {
  try {
    const user = await User.findOne({ auth0Id: req.auth.sub })
      .select('-__v');
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Return the user profile (without sensitive data)
    const userProfile = {
      id: user._id,
      email: user.email,
      nickname: user.nickname,
      picture: user.picture,
      createdAt: user.createdAt,
      uploadHistory: user.uploadHistory
    };
    
    res.status(200).json(userProfile);
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({ error: 'Failed to fetch profile', message: error.message });
  }
});

// User logout (just for backend cleanup if needed)
router.post('/logout', checkJwt, async (req, res) => {
  try {
    // Update last activity for the user
    await User.findOneAndUpdate(
      { auth0Id: req.auth.sub },
      { $set: { lastActivity: new Date() } }
    );
    
    res.status(200).json({ message: 'Logout successful' });
  } catch (error) {
    console.error('Error logging out:', error);
    // Still return 200 even on error as the frontend has already logged out
    res.status(200).json({ message: 'Logged out' });
  }
});

module.exports = router; 