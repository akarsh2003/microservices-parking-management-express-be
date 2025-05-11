const express = require('express');
const router = express.Router();
const controller = require('../controllers/organizationController');
const auth = require('../middlewares/authMiddleware');
const rolecheck = require('../middlewares/rolecheckMiddleware');

// Auth
router.post('/register', controller.registerOrganization);
router.post('/login', controller.loginOrganization);
router.post('/register/org', controller.registerOrganizationByAdmin);//admin only

// Parking slot management
router.post('/slots', auth, rolecheck('organization'), controller.createSlot);
router.get('/slots/:id', auth, rolecheck('organization'), controller.getAllSlots);
router.put('/slots/:id', auth, rolecheck('organization'), controller.updateSlot);
router.delete('/slots/:id', auth, rolecheck('organization'), controller.deleteSlot);
router.get('/organizations', controller.getAllOrganizations);//admin only
router.put('/organizations/approve/:id', controller.approveOrganization);//admin only
router.put('/organizations/reject/:id', controller.rejectOrganization);//admin only

router.get('/slots/available', controller.getAvailableSlots);//user
router.patch('/slots/book', controller.markSlotAsBooked);//user
router.patch('/slots/exit',  controller.markSlotAsAvailable);//user

module.exports = router;
