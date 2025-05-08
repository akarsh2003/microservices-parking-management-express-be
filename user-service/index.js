require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/auth', require('./src/routes/authRoutes'));
app.use('/api/wallet', require('./src/routes/walletRoutes'));
app.use('/api/user', require('./src/routes/userRoutes'));


const PORT = process.env.PORT || 4001;

mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('Connected to MongoDB');
    app.listen(PORT, () => console.log(`User Service running on port ${PORT}`));
    console.log("Running on Node.js version:", process.version);

  })
  .catch(err => console.error('MongoDB connection failed:', err));
