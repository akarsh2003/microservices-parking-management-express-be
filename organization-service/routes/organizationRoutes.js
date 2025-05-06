const express = require('express');
const router = express.Router();
const controller = require('../controllers/organizationController');
const auth = require('../middlewares/authMiddleware');
const rolecheck = require('../middlewares/rolecheckMiddleware');

// Auth
router.post('/register', controller.registerOrganization);
router.post('/login', controller.loginOrganization);

// Parking slot management
router.post('/slots', auth, rolecheck('organization'), controller.createSlot);
router.get('/slots', auth, rolecheck('organization'), controller.getAllSlots);
router.put('/slots/:id', auth, rolecheck('organization'), controller.updateSlot);
router.delete('/slots/:id', auth, rolecheck('organization'), controller.deleteSlot);
router.get('/organizations', controller.getAllOrganizations);//admin only
router.put('/organizations/approve/:id', controller.approveOrganization);//admin only

module.exports = router;
