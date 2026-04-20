const express = require('express');
const router = express.Router();
const { login, getMe, changePassword } = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const User = require('../models/User');
const bcrypt = require('bcryptjs');

router.post('/login', login);
router.get('/me', protect, getMe);
router.put('/change-password', protect, changePassword);
router.post('/register', async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      phone,
      role,
      vehicleType,
      licenseNumber,
      vehicleNumber
    } = req.body;

    // check existing user
    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ message: "User already exists" });
    }

    // hash password
   

    // save user
    const user = await User.create({
      name,
      email,
      password,
      phone,
      role,
      vehicleType,
      licenseNumber,
      vehicleNumber
    });

    res.status(201).json({
      message: "User registered",
      user
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});


module.exports = router;
