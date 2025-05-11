const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const userController = require('../controllers/userController');

router.get('/profile', auth, userController.getProfile);
router.put('/profile', auth, userController.updateProfile);

router.get('/get-organizations', auth, userController.getOrganizations);
router.get('/get-slots/:id', auth, userController.getSlots);
router.post('/book-slot/:id', auth, userController.bookSlot);
router.post('/exit-slot/:id', auth, userController.exitSlot);

module.exports = router;
