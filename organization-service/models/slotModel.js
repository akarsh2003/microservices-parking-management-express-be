const mongoose = require('mongoose');

const SlotSchema = new mongoose.Schema({
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
  },
  level: {
    type: Number, // e.g., 1, 2, 3
    required: true,
  },
  slotNumber: {
    type: String, // e.g., A1, B2
    required: true,
    unique: true, // prevent duplicates
  },
  type: {
    type: String,
    enum: ['car', 'bike'],
    required: true,
  },
  location: {
    country: String,
    state: String,
    city: String,
  },
  hourlyRate: {
    type: Number,
    required: true,
  },
  status: {
    type: String,
    enum: ['available', 'occupied'],
    default: 'available',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  bookedAt: {
    type: Date,
    default: null,
  },
  bookedBy: {
    type: String, // store userId as string (UUID or ObjectId from user-service)
    default: null,
  },
});

module.exports = mongoose.model('Slot', SlotSchema);
// {
//   orgId:"",
//   parking:{
//     bike:{
//       hourlyRate:"",
//       numberOfSlots:12,
//       slots:[[
//         {
//           slotsId:"",
//           status:"",
//           vehicleNumer:""
//         }
//       ],[]],
//       //........
//       //.....
//       //............

//     }
//   }
// }