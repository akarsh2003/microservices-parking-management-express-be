import express from 'express';
import * as controller from '../controllers/bookingController.js';

const router = express.Router();

router.post('/book', controller.createBooking);
router.post('/exit/:id', controller.exitBooking);
router.get('/user/:userId', controller.getUserBookings);

export default router;
