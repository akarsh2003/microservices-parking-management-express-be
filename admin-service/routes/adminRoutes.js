import express from 'express';
import {
  registerAdmin,
  loginAdmin,
  getPendingOrganizations,
  approveOrganization,
  getStats,
} from '../controllers/adminController.js';
import { verifyToken } from '../middlewares/auth.js';
import { checkRole } from '../middlewares/role.js';

const router = express.Router();

// Public
router.post('/register', registerAdmin);
router.post('/login', loginAdmin);

// Protected (Admin only)
router.get('/organizations', verifyToken, checkRole('admin'), getPendingOrganizations);
router.put('/organizations/:id', verifyToken, checkRole('admin'), approveOrganization);
router.get('/stats', verifyToken, checkRole('admin'), getStats);

export default router;