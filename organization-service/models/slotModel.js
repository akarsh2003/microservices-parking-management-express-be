const mongoose = require('mongoose');

const SlotSchema = new mongoose.Schema({
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
    index: true
  },

  hourlyRates: {
    car: { type: Number, required: true },
    bike: { type: Number, required: true }
  },

  carLevels: [
    {
      levelIdentifier: { type: String, required: true },
      availableSlots: { type: Number, default: 0 },
      bookedSlots: { type: Number, default: 0 },
      slots: [
        {
          slotNumber: { type: String, required: true },
          status: {
            type: String,
            enum: ['available', 'occupied'],
            default: 'available'
          },
          bookedBy: { type: String, default: null },
          vehicleNumber: { type: String, default: null },
          bookedAt: { type: Date, default: null }
        }
      ]
    }
  ],

  bikeLevels: [
    {
      levelIdentifier: { type: String, required: true },
      availableSlots: { type: Number, default: 0 },
      bookedSlots: { type: Number, default: 0 },
      slots: [
        {
          slotNumber: { type: String, required: true },
          status: {
            type: String,
            enum: ['available', 'occupied'],
            default: 'available'
          },
          bookedBy: { type: String, default: null },
          vehicleNumber: { type: String, default: null },
          bookedAt: { type: Date, default: null }
        }
      ]
    }
  ],

  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Slot', SlotSchema);
