import express from 'express';
import * as controller from '../controllers/bookingController.js';

const router = express.Router();

router.get('/available', controller.getAvailableSlots);
router.post('/book/:id', controller.bookSlot);
router.post('/exit/:id', controller.exitSlot);

export default router;
