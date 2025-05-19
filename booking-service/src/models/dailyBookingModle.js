import mongoose from 'mongoose';

const dailyBookingSchema = new mongoose.Schema({
  orgId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
  date:  { type: Date, required: true, index: true },
  totalBookings: { type: Number, default: 0 },
  totalRevenue:  { type: Number, default: 0 }
});

// ensure one per org+date
dailyBookingSchema.index({ orgId: 1, date: 1 }, { unique: true });

export default mongoose.model('DailyBooking', dailyBookingSchema);
