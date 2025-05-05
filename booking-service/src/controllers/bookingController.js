const bookingService = require('../services/bookingService');

exports.createBooking = async (req, res) => {
  try {
    const booking = await bookingService.createBooking(req.body);
    res.status(201).json({ message: 'Slot booked successfully', booking });
  } catch (err) {
    res.status(400).json({ message: 'Booking failed', error: err.message });
  }
};

exports.exitBooking = async (req, res) => {
  try {
    const { booking, totalCharge } = await bookingService.completeBooking(req.params.id);
    res.json({ message: 'Exit successful', totalCharge, booking });
  } catch (err) {
    res.status(500).json({ message: 'Exit failed', error: err.message });
  }
};

exports.getUserBookings = async (req, res) => {
  try {
    const bookings = await bookingService.getBookingsByUser(req.params.userId);
    res.json(bookings);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch bookings', error: err.message });
  }
};
