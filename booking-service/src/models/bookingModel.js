import mongoose from 'mongoose';

const bookingSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  orgId: { type: String, required: true },
  slotId: { type: String, required: true },
  vehicleType: { type: String, enum: ['car', 'bike'], required: true },
  entryTime: { type: Date, default: Date.now },
  exitTime: Date,
  totalCharge: Number,
  status: { type: String, enum: ['ACTIVE', 'COMPLETED'], default: 'ACTIVE' }
});

export default mongoose.model('Booking', bookingSchema);
