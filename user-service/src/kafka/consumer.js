const { Kafka } = require('kafkajs');
const User = require('../models/user.model');
const Transaction = require('../models/transaction.model');

const kafka = new Kafka({ clientId: 'user-service', brokers: ['kafka:9092'] });
const consumer = kafka.consumer({ groupId: 'wallet-group' });

async function startConsumer() {
  await consumer.connect();
  await consumer.subscribe({ topic: 'booking-confirmed', fromBeginning: true });

  await consumer.run({
    eachMessage: async ({ message }) => {
      const data = JSON.parse(message.value.toString());
      const user = await User.findById(data.userId);
      if (user.wallet.balance >= data.amount) {
        user.wallet.balance -= data.amount;
        await user.save();

        await Transaction.create({
          userId: user._id,
          type: 'DEBIT',
          amount: data.amount,
          description: `Booking ID: ${data.bookingId}`,
        });

        console.log(`Deducted ${data.amount} for user ${data.userId}`);
      }
    },
  });
}

startConsumer();
