const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Function to generate JWT token
const getSignedJwtToken = (userId, userName, userEmail, userRole) => {
  const payload = {
    id: userId,
    name: userName,
    email: userEmail,
    role: userRole,
  };
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: '30d', // expiry in 30 days
  });
};

// Signup route and controller
router.post('/register', async (req, res) => { 
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide name, email, and password' });
    }
    // Checking if user already exist or not
    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ success: false, message: 'User already exists' });
    }

    // creating new user
    // Frontend - make sure roles are in lowercase
    user = await User.create({
      name,
      email,
      password,
      role: role || 'student', // ensuring a role is assigned | By default role is "student" 
    });

    const token = getSignedJwtToken(user._id, user.name, user.email, user.role); // token will be given to the user also so that he/she do not need to login again-n-again

    res.status(201).json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
});

// Login route and controller
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide email and password' });
    }

    const user = await User.findOne({ email }).select('+password'); // with the help of "email" user profile is found and password is fetched and mateched with entered password

    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const isMatch = await user.matchPassword(password);

    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // user is validated
    const token = getSignedJwtToken(user._id, user.name, user.email, user.role);

    res.status(200).json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
});

module.exports = router;