const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const walletController = require('../controllers/walletController');

router.get('/', auth, walletController.getWallet);
router.post('/add', auth, walletController.addMoney);
router.post('/deduct', auth, walletController.deductMoney);
router.get('/transactions', auth, walletController.getTransactions);

module.exports = router;
