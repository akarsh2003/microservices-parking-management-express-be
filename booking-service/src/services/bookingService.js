import axios from 'axios';
import Booking from '../models/bookingModel.js';
import { calculateHours } from '../utils/timeUtils.js';

export const createBooking = async ({ userId, orgId, slotId, vehicleType }) => {
  return await Booking.create({ userId, orgId, slotId, vehicleType });
};

export const completeBooking = async (bookingId) => {
  const booking = await Booking.findById(bookingId);
  if (!booking || booking.status === 'COMPLETED') {
    throw new Error('Booking not found or already exited');
  }

  // 1. Calculate duration
  const exitTime = new Date();
  const hours = calculateHours(booking.entryTime, exitTime);

  // 2. Fetch hourly rate from org-service
  const slotRes = await axios.get(`${process.env.ORG_SERVICE_URL}/api/slot/${booking.slotId}`);
  const rate = slotRes.data?.hourlyRate;

  if (!rate) throw new Error('Hourly rate not found for slot');

  const totalCharge = hours * rate;

  // 3. Deduct from wallet
  await axios.post(`${process.env.USER_SERVICE_URL}/api/wallet/internal-deduct`, {
    userId: booking.userId,
    amount: totalCharge,
    description: `Slot booking (${hours}h @ ${rate}/h)`,
    internalKey: process.env.INTERNAL_SECRET_KEY
  });

  // 4. Update booking
  booking.exitTime = exitTime;
  booking.totalCharge = totalCharge;
  booking.status = 'COMPLETED';
  await booking.save();

  return { booking, totalCharge };
};

export const getBookingsByUser = async (userId) => {
  return await Booking.find({ userId }).sort({ entryTime: -1 });
};
