import express from 'express';
import * as controller from '../controllers/bookingController.js';

const router = express.Router();

router.get('/available/:organizationId', controller.getAllSlots);
router.post('/book/:id', controller.bookSlot);
router.post('/exit/:id', controller.exitSlot);

export default router;
