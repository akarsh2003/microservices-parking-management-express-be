const User = require('../models/userModel');
const Transaction = require('../models/transactionModel');

exports.getWallet = async (req, res) => {
  const user = await User.findById(req.userId);
  res.json({ balance: user.wallet.balance });
};

exports.addMoney = async (req, res) => {
  const { amount } = req.body;
  const user = await User.findById(req.userId);
  user.wallet.balance += amount;
  await user.save();

  await Transaction.create({ userId: user._id, type: 'CREDIT', amount, description: 'Wallet top-up' });

  res.json({ message: 'Money added', balance: user.wallet.balance });
};

exports.deductMoney = async (req, res) => {
  const { amount, description } = req.body;
  const user = await User.findById(req.userId);
  if (user.wallet.balance < amount) return res.status(400).json({ message: 'Insufficient balance' });

  user.wallet.balance -= amount;
  await user.save();

  await Transaction.create({ userId: user._id, type: 'DEBIT', amount, description });

  res.json({ message: 'Money deducted', balance: user.wallet.balance });
};

exports.getTransactions = async (req, res) => {
  const transactions = await Transaction.find({ userId: req.userId }).sort({ createdAt: -1 });
  res.json(transactions);
};
