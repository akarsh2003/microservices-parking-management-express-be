import * as bookingService from '../services/bookingService.js';
import axios from 'axios';

export const getAvailableSlots = async (req, res) => {
  try {
    const response = await axios.get('http://localhost:3001/api/organization/slots/available');
    res.json(response.data);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch available slots', error: err.message });
  }
};


// Book a slot
export const bookSlot = async (req, res) => {
  try {
    const { id } = req.params;
    const response = await axios.patch(`http://localhost:3001/api/organization/slots/${id}/book`, req.body);
    res.status(response.status).json(response.data);
  } catch (err) {
    console.error('Booking Error:', err.message);
    const status = err.response?.status || 500;
    const message = err.response?.data?.message || 'Booking failed';
    res.status(status).json({ message, error: err.message });
  }
};

// Exit from a slot
export const exitSlot = async (req, res) => {
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





