import jwt from 'jsonwebtoken';
import Admin from '../models/admin.js';
import organization from '../../organization-service/models/organizationModel.js';
import dotenv from 'dotenv';
dotenv.config();
import axios from 'axios';

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
  // Get credentials from .env file
  const adminUsername = process.env.ADMIN_USERNAME;
  const adminPassword = process.env.ADMIN_PASSWORD;
  // Compare the provided username and password with the ones in .env
  if (username !== adminUsername || password !== adminPassword) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }
  try {
    // Generate JWT token
    const token = jwt.sign(
      { username, role: 'admin' }, // Role can be 'admin' as per your use case
      process.env.JWT_SECRET, {
        expiresIn: '1h',
      }
    );
    // Respond with the token
    res.status(200).json({ token });
  } catch (err) {
    res.status(500).json({ message: 'Error logging in admin', error: err });
  }
};



// Get Pending Organizations
export const getPendingOrganizations = async (req, res) => {
  try {
    const response = await axios.get('http://localhost:3001/api/organization/organizations');
    res.status(200).json(response.data);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching organizations', error: err.message });
  }
};


// Approve Organization
export const approveOrganization = async (req, res) => {
  const { id } = req.params;
  try {
    const response = await axios.put(
      `http://localhost:3001/api/organization/organizations/approve/${id}`,
      {
        approvedBy: req.user.id
      }
    );

    res.status(200).json({
      message: 'Organization approved successfully',
      data: response.data
    });
  } catch (err) {
    console.error('Approval error:', err.message);
    res.status(500).json({ message: 'Error approving organization', error: err.message });
  }
};


// Reject Organization
export const rejectOrganization = async (req, res) => {
  const { id } = req.params;
  try {
    const response = await axios.put(`http://localhost:3001/api/organization/organizations/reject/${id}`);
    res.status(200).json({
      message: 'Organization rejected successfully',
      data: response.data
    });
  } catch (err) {
    res.status(500).json({ message: 'Error rejecting organization', error: err.message });
  }
};


// Get Stats (Dummy Example)
export const getStats = async (req, res) => {
  try {
    // Use the Organization model from the Organization Service
    const totalOrganizations = await organization.countDocuments();
    const approvedOrganizations = await organization.countDocuments({ registrationStatus: 'approved' });
    const pendingOrganizations = await organization.countDocuments({ registrationStatus: 'pending' });

    res.status(200).json({
      totalOrganizations,
      approvedOrganizations,
      pendingOrganizations,
    });
  } catch (err) {
    res.status(500).json({ message: 'Error fetching stats', error: err });
  }
};


export const registerOrganizationByAdmin = async (req, res) => {
  try {
    const { name, email, password, location } = req.body;
    const response = await axios.post('http://localhost:3001/api/organization/register/org', {
      name,
      email,
      password,
      location
    });
    res.status(201).json({ message: 'Organization registered by admin', data: response.data });
  } catch (err) {
    console.error('Admin Registration Error:', err.message);
    if (err.response) {
      res.status(err.response.status).json({ message: err.response.data.message });
    } else {
      res.status(500).json({ message: 'Internal server error' });
    }
  }
};