const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');
const routes = require('./routes/organizationRoutes');
const { startProducer } = require('./kafka/producer');

dotenv.config();
const app = express();

app.use(cors());
app.use(express.json());
app.use('/api/organization', routes);

// Connect to MongoDB and Start Kafka Producer
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(async () => {
    console.log('MongoDB connected');

    await startProducer()
      .then(() => console.log('Kafka producer connected'))
      .catch(err => console.error('Kafka producer error:', err));
  })
  .catch(err => console.error('MongoDB connection error:', err));

// Start Express Server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Organization Service running on port ${PORT}`);
});
