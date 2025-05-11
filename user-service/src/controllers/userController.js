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
exports.bookSlot = async (req, res) => {
  try {
    const { id } = req.params; // slot ID in URL
    const response = await axios.patch(`http://localhost:3001/api/organization/slots/${id}/book`, {
      userId: req.userId, // passed to update bookedBy in org service
    });
    res.status(response.status).json(response.data);
  } catch (err) {
    console.error('Booking Error:', err.message);
    const status = err.response?.status || 500;
    const message = err.response?.data?.message || 'Booking failed';
    res.status(status).json({ message, error: err.message });
  }
};

// Exit a slot (slotId in URL param)
exports.exitSlot = async (req, res) => {
  try {
    const { id } = req.params;
    const response = await axios.patch(`http://localhost:3001/api/organization/slots/${id}/exit`);
    res.status(response.status).json(response.data);
  } catch (err) {
    console.error('Exit Error:', err.message);
    const status = err.response?.status || 500;
    const message = err.response?.data?.message || 'Exit failed';
    res.status(status).json({ message, error: err.message });
  }
};