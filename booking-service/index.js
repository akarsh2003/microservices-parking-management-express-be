import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bookingRoutes from './src/routes/bookingRoutes.js';
import cors from "cors";

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());
app.use('/api/bookings', bookingRoutes);

mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('Booking service connected to MongoDB');
    app.listen(process.env.PORT, () =>
      console.log(`Booking service running on port ${process.env.PORT}`)
    );
  })
  .catch((err) => console.error('MongoDB connection error:', err));
