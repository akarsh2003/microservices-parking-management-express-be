import express from 'express';
import {
  registerAdmin,
  loginAdmin,
  getPendingOrganizations,
  approveOrganization,
  rejectOrganization,
  getStats,
  registerOrganizationByAdmin
} from '../controllers/adminController.js';
import { verifyToken } from '../middlewares/auth.js';
import { checkRole } from '../middlewares/role.js';

const router = express.Router();

// Public
router.post('/register', registerAdmin);
router.post('/login', loginAdmin);

// Protected (Admin only)
router.get('/organizations', verifyToken, checkRole('admin'), getPendingOrganizations);
router.put('/approve/:id', verifyToken, checkRole('admin'), approveOrganization);
router.put('/reject/:id', verifyToken, checkRole('admin'), rejectOrganization);
router.get('/stats', verifyToken, checkRole('admin'), getStats);
router.post('/register-organization', verifyToken, checkRole('admin'), registerOrganizationByAdmin);

export default router;