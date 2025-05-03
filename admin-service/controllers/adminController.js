import jwt from 'jsonwebtoken';
import Admin from '../models/admin.js';
import Organization from '../models/organization.js';
import dotenv from 'dotenv';
dotenv.config();

// Register Admin
export const registerAdmin = async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: 'Username and password are required' });
  }

  try {
    const existingAdmin = await Admin.findOne({ username });
    if (existingAdmin) {
      return res.status(400).json({ message: 'Admin already exists' });
    }

    const newAdmin = new Admin({ username, password });
    await newAdmin.save();
    res.status(201).json({ message: 'Admin registered successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Error registering admin', error: err });
  }
};

// Login Admin
export const loginAdmin = async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: 'Username and password are required' });
  }

  try {
    const admin = await Admin.findOne({ username });
    if (!admin || !(await admin.comparePassword(password))) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: admin._id, role: admin.role }, process.env.JWT_SECRET, {
      expiresIn: '1h',
    });

    res.status(200).json({ token });
  } catch (err) {
    res.status(500).json({ message: 'Error logging in admin', error: err });
  }
};

// Get Pending Organizations
export const getPendingOrganizations = async (req, res) => {
  try {
    const organizations = await Organization.find({ registrationStatus: 'pending' });
    res.status(200).json(organizations);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching organizations', error: err });
  }
};

// Approve Organization
export const approveOrganization = async (req, res) => {
  const { id } = req.params;

  try {
    const organization = await Organization.findById(id);
    if (!organization) {
      return res.status(404).json({ message: 'Organization not found' });
    }

    organization.registrationStatus = 'approved';
    organization.approvedBy = req.user.id;

    await organization.save();
    res.status(200).json({ message: 'Organization approved successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Error approving organization', error: err });
  }
};

// Get Stats (Dummy Example)
export const getStats = async (req, res) => {
  try {
    const totalOrganizations = await Organization.countDocuments();
    const approvedOrganizations = await Organization.countDocuments({ registrationStatus: 'approved' });
    const pendingOrganizations = await Organization.countDocuments({ registrationStatus: 'pending' });

    res.status(200).json({
      totalOrganizations,
      approvedOrganizations,
      pendingOrganizations,
    });
  } catch (err) {
    res.status(500).json({ message: 'Error fetching stats', error: err });
  }
};