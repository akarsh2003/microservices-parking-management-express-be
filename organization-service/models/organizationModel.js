const mongoose = require('mongoose');

const OrganizationSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true }, // Hash before storing
  location: {
    country: String,
    state: String,
    city: String,
  },
  approved: { type: Boolean, default: false },
  role: { type: String, default: 'organization' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Organization', OrganizationSchema);
