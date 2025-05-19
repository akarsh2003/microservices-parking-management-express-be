import mongoose from 'mongoose';

const bookingSchema = new mongoose.Schema({
  userId:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  orgId:       { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
  slotId:      { type: String, required: true }, 
  vehicleType: { type: String, enum: ['car', 'bike'], required: true },
  entryTime:   { type: Date, default: Date.now },
  exitTime:    Date,
  totalCharge: Number,
  status:      { type: String, enum: ['ACTIVE', 'COMPLETED'], default: 'ACTIVE' },

  // this will store the date (at midnight UTC) of the booking’s entryTime
  bookingDate: {
    type: Date,
    required: true,
    default: () => {
      const now = new Date();
      return new Date(now.getFullYear(), now.getMonth(), now.getDate());
    },
    index: true
  }
}, {
  timestamps: true
});

export default mongoose.model('Booking', bookingSchema);
