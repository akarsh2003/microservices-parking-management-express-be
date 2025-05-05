require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const app = express();

app.use(express.json());
app.use('/api/bookings', require('./routes/bookingRoutes'));

const PORT = process.env.PORT || 4002;

mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('Booking service connected to MongoDB');
    app.listen(PORT, () => console.log(`Booking service running on port ${PORT}`));
  })
  .catch(err => console.error('MongoDB connection error:', err));
