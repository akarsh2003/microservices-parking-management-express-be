const kafka = require('./kafkaClient');
const producer = kafka.producer();

const startProducer = async () => {
  await producer.connect();
};

const sendSlotEvent = async (type, payload) => {
  await producer.send({
    topic: 'slot.events',
    messages: [
      {
        key: type,
        value: JSON.stringify(payload),
      },
    ],
  });
  console.log(`Kafka Event Sent: ${type}`, payload);
};

module.exports = {
  startProducer,
  sendSlotEvent,
};
