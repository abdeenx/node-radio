const express = require('express');
const router = express.Router();
const jwt = require('express-jwt');
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

// Create or update user after successful authentication
router.post('/register', checkJwt, async (req, res) => {
  try {
    const { sub, email, nickname, picture } = req.body;
    
    // Check if user already exists
    let user = await User.findOne({ auth0Id: sub });
    
    if (user) {
      // Update existing user
      user.email = email;
      user.nickname = nickname;
      user.picture = picture;
      await user.save();
    } else {
      // Create new user
      user = new User({
        auth0Id: sub,
        email,
        nickname,
        picture
      });
      await user.save();
    }
    
    res.status(200).json(user);
  } catch (error) {
    console.error('Error registering user:', error);
    res.status(500).json({ error: 'Failed to register user' });
  }
});

// Get user profile
router.get('/profile', checkJwt, async (req, res) => {
  try {
    const user = await User.findOne({ auth0Id: req.user.sub });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.status(200).json(user);
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

module.exports = router; 