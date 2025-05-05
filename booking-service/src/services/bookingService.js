const Booking = require('../models/bookingModel');
const { calculateHours } = require('../utils/timeUtils');
const axios = require('axios');

const HOURLY_RATE = {
  car: 20,
  bike: 10,
};

exports.createBooking = async ({ userId, slotId, vehicleType }) => {
  const booking = await Booking.create({ userId, slotId, vehicleType });
  return booking;
};

exports.completeBooking = async (bookingId) => {
  const booking = await Booking.findById(bookingId);
  if (!booking || booking.status === 'COMPLETED') {
    throw new Error('Booking not found or already completed');
  }

  booking.exitTime = new Date();
  const hours = calculateHours(booking.entryTime, booking.exitTime);
  const rateRes = await axios.get(
    `${process.env.ORG_SERVICE_URL}/api/orgs/${booking.orgId}/rate/${booking.vehicleType}`
  );
  
  if (!rateRes.data?.rate) {
    throw new Error('Rate not found from organization service');
  }
  
  const rate = rateRes.data.rate;

  const totalCharge = hours * rate;

  // Deduct wallet from user-service
  await axios.post(`${process.env.USER_SERVICE_URL}/api/wallet/internal-deduct`, {
    userId: booking.userId,
    amount: totalCharge,
    description: `Booking ID: ${booking._id}`,
    internalKey: process.env.INTERNAL_SECRET_KEY
  });

  booking.totalCharge = totalCharge;
  booking.status = 'COMPLETED';
  await booking.save();

  return { booking, totalCharge };
};

exports.getBookingsByUser = async (userId) => {
  return await Booking.find({ userId }).sort({ entryTime: -1 });
};
