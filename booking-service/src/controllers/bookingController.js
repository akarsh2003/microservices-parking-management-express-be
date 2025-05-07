import * as bookingService from '../services/bookingService.js';
import axios from 'axios';

export const getAvailableSlots = async (req, res) => {
  try {
    const response = await axios.get('http://localhost:5002/api/organization/slots/available');
    res.json(response.data);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch available slots', error: err.message });
  }
};


//create booking
export const createBooking = async (req, res) => {
  try {
    const booking = await axios.patch(`http://localhost:5002/api/slots/${slotId}/book`, { isBooked: true });
    res.status(201).json(booking);
  } catch (err) {
    res.status(500).json({ message: 'Failed to create booking', error: err.message });
  }
};


export const exitBooking = async (req, res) => {
  try {
    const { booking, totalCharge } = await bookingService.completeBooking(req.params.id);
    res.json({ message: 'Exit successful', totalCharge, booking });
  } catch (err) {
    res.status(500).json({ message: 'Exit failed', error: err.message });
  }
};

export const getUserBookings = async (req, res) => {
  try {
    const bookings = await bookingService.getBookingsByUser(req.params.userId);
    res.json(bookings);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch bookings', error: err.message });
  }
};



// PATCH /api/slots/:id/free
export const freeSlot = async (req, res) => {
  try {
    const slot = await Slot.findByIdAndUpdate(req.params.id, { isBooked: false }, { new: true });
    res.json(slot);
  } catch (err) {
    res.status(500).json({ message: 'Error freeing slot', error: err.message });
  }
};
