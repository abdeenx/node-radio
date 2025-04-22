const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  auth0Id: {
    type: String,
    required: true,
    unique: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  nickname: {
    type: String,
    required: true
  },
  picture: {
    type: String
  },
  uploadHistory: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Track'
  }],
  lastLogin: {
    type: Date,
    default: Date.now
  },
  lastActivity: {
    type: Date,
    default: Date.now
  },
  createdRooms: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Room'
  }],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Add method to return a safe user object (without sensitive data)
userSchema.methods.toSafeObject = function() {
  const userObject = this.toObject();
  delete userObject.__v;
  return userObject;
};

module.exports = mongoose.model('User', userSchema); 