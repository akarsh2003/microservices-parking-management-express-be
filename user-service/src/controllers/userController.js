const User = require('../models/userModel');
const axios = require('axios');

exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching user', error: err.message });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const { name, carNumber, bikeNumber } = req.body;
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (name) user.name = name;
    if (carNumber) user.carNumber = carNumber;
    if (bikeNumber) user.bikeNumber = bikeNumber;

    await user.save();
    res.json({ message: 'Profile updated successfully', user });
  } catch (err) {
    res.status(500).json({ message: 'Error updating profile', error: err.message });
  }
};


// Get all approved organizations
exports.getOrganizations = async (req, res) => {
  try {
    const response = await axios.get('http://localhost:3001/api/organization/org');
    res.json(response.data);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch organizations', error: err.message });
  }
};

exports.getSlots = async (req, res) => {
  try {
    const { id } = req.params; // organization ID from URL
    const response = await axios.get(`http://localhost:3001/api/organization/slots/${id}`);
    res.json(response.data);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch available slots', error: err.message });
  }
};


// Book a slot (slotId in URL param)
// src/controllers/userController.js

exports.bookSlot = async (req, res) => {
  try {
    const { userId } = req.params;               // from URL: /book/:userId
    const { type }   = req.body;                 // expect { type: 'car' } or { type: 'bike' }
    
    // 1) validate type
    if (!['car', 'bike'].includes(type)) {
      return res
        .status(400)
        .json({ message: 'Invalid vehicle type; must be "car" or "bike".' });
    }

    // 2) fetch & validate user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    // 3) check if vehicle number is on file
    const vehicleNumber = type === 'car' ? user.carNumber : user.bikeNumber;
    if (!vehicleNumber) {
      return res
        .status(400)
        .json({ message: `No ${type} number on file for this user.` });
    }

    // 4) ensure no active parking
    if (user.isParked) {
      return res
        .status(400)
        .json({ message: 'A vehicle is already parked.' });
    }

    // 5) require at least ₹50 in wallet
    if (user.wallet.balance < 50) {
      return res
        .status(400)
        .json({ message: 'Insufficient balance; minimum ₹50 required.' });
    }

    // 6) mark as parked
    user.isParked = true;
    await user.save();

    return res
      .status(200)
      .json({ message: `${type.charAt(0).toUpperCase() + type.slice(1)} parked successfully!` });
  } catch (err) {
    console.error('Booking Error:', err);
    return res
      .status(500)
      .json({ message: 'Booking failed', error: err.message });
  }
};

// Exit a slot (slotId in URL param)
exports.exitSlot = async (req, res) => {
  try {
    const {userId} = req.params;
    const { price } = req.body;
    if (typeof price !== 'number') {
      return res
        .status(400)
        .json({ message: 'Exit price must be provided as a number' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    if (!user.isParked) {
      return res
        .status(400)
        .json({ message: 'No vehicle currently parked' });
    }

    if (user.wallet.balance < price) {
      return res
        .status(400)
        .json({ message: 'Insufficient balance for exit charge' });
    }

    user.wallet.balance -= price;
    user.isParked = false;
    await user.save();

    return res
      .status(200)
      .json({
        message: 'Exit successful',
        balance: user.wallet.balance
      });
  } catch (err) {
    console.error('Exit Error:', err);
    return res
      .status(500)
      .json({ message: 'Exit failed', error: err.message });
  }
};