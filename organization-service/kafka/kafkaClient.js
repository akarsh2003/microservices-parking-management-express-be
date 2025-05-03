const { Kafka } = require('kafkajs');

const kafka = new Kafka({
  clientId: 'organization-service',
  brokers: [process.env.KAFKA_BROKER || 'localhost:9092'], // Read from .env
});

module.exports = kafka;
