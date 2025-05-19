const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  password: String,
  carNumber: String,
  bikeNumber: String,
  wallet: {
    balance: { type: Number, default: 0 }
  },
  isParked: { type: Boolean, default: false }   // ← new field
});
module.exports = mongoose.model('User', userSchema);
