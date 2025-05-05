const router = require('express').Router();
const controller = require('../controllers/bookingController');

router.post('/', controller.createBooking);
router.post('/exit/:id', controller.exitBooking);
router.get('/user/:userId', controller.getUserBookings);

module.exports = router;
