const Organization = require('../models/organizationModel');
const Slot = require('../models/slotModel');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { sendSlotEvent } = require('../kafka/producer');

const JWT_SECRET = 'yourSecretKey';

exports.registerOrganization = async (req, res) => {
  try {
    const { name, email, password, location } = req.body;
    const existing = await Organization.findOne({ email });
    if (existing) return res.status(400).json({ message: 'Email already exists' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const org = new Organization({ name, email, password: hashedPassword, location });
    await org.save();

    res.status(201).json({ message: 'Organization registered. Awaiting approval.' , organization: org});
  } catch (err) {
    console.error('Register Error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
};

exports.loginOrganization = async (req, res) => {
  try {
    const { email, password } = req.body;
    const org = await Organization.findOne({ email });
    if (!org || !(await bcrypt.compare(password, org.password)))
      return res.status(401).json({ message: 'Invalid credentials' });
    if (!org.approved) return res.status(403).json({ message: 'Not approved yet' });
    const token = jwt.sign(
      {
        orgId: org._id,
        role: org.role
      },
      JWT_SECRET,
      { expiresIn: '1h' }
    );
    res.json({ token });
  } catch (err) {
    console.error('Login Error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Get letter from level (1 = A, 2 = B, etc.)
const getLevelLetter = (level) => {
  return String.fromCharCode(64 + level);
};



exports.createSlot = async (req, res) => {
  try {
    const { organizationId, level, type, hourlyRate, count = 1 } = req.body;
    const levelLetter = getLevelLetter(level);
    // Get the next slot number based on existing slots
    const existing = await Slot.find({ organizationId, level });
    let startIndex = existing.length + 1;
    const newSlots = [];
    for (let i = 0; i < count; i++) {
      const slotNumber = `${levelLetter}${startIndex + i}`;
      const slot = new Slot({ organizationId, level, slotNumber, type, hourlyRate });
      await slot.save();
      await sendSlotEvent('slot.created', { slotId: slot._id, organizationId, level, slotNumber, type, hourlyRate });
      newSlots.push(slot);
    }
    // Respond only with the array of created slots
    res.status(201).json(newSlots);
  } catch (err) {
    console.error('Create Slot Error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
};




exports.getAllSlots = async (req, res) => {
  try {
    const { organizationId } = req.query;
    const slots = await Slot.find({ organizationId });
    res.json(slots);
  } catch (err) {
    console.error('Get All Slots Error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
};

exports.updateSlot = async (req, res) => {
  try {
    const { id } = req.params;
    const updated = await Slot.findByIdAndUpdate(id, req.body, { new: true });

    if (updated) {
      await sendSlotEvent('slot.updated', {
        slotId: updated._id,
        organizationId: updated.organizationId,
        type: updated.type,
        location: updated.location,
        hourlyRate: updated.hourlyRate,
        status: updated.status || 'available',
      });
    }

    res.json(updated);
  } catch (err) {
    console.error('Update Slot Error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
};

exports.deleteSlot = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedSlot = await Slot.findByIdAndDelete(id);
    if (deletedSlot) {
      await sendSlotEvent('slot.deleted', {
        slotId: deletedSlot._id,
        organizationId: deletedSlot.organizationId,
      });
    }

    res.json({ message: 'Slot deleted' });
  } catch (err) {
    console.error('Delete Slot Error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
};
//get all organizations
exports.getAllOrganizations = async (req, res) => {
  try {
    const organizations = await Organization.find();
    res.json(organizations);
  } catch (err) {
    console.error('Get All Organizations Error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
};


// organization-service/controllers/organizationController.js

exports.approveOrganization = async (req, res) => {
  try {
    const { id } = req.params;
    const { approvedBy } = req.body;
    const org = await Organization.findById(id);
    if (!org) {
      return res.status(404).json({ message: 'Organization not found' });
    }
    org.approved = true;
    org.approvedBy = approvedBy;
    await org.save();
    res.status(200).json({ message: 'Organization approved', organization: org });
  } catch (err) {
    res.status(500).json({ message: 'Failed to approve organization', error: err });
  }
};

//reject the organization
exports.rejectOrganization = async (req, res) => {
  try {
    const { id } = req.params;
    const org = await Organization.findById(id);
    if (!org) {
      return res.status(404).json({ message: 'Organization not found' });
    }
    org.approved = false;
    await org.deleteOne();
    res.status(200).json({ message: 'Organization rejected', organization: org });
  } catch (err) {
    res.status(500).json({ message: 'Failed to reject organization', error: err });
  }
};


exports.getAvailableSlots = async (req, res) => {
  try {
    const slots = await Slot.find({ isBooked: false });
    res.json(slots);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching available slots', error: err.message });
  }
};


// PATCH /api/slots/:id/book
exports.markSlotAsBooked = async (req, res) => {
  try {
    const slot = await Slot.findByIdAndUpdate(req.params.id, { isBooked: true }, { new: true });
    res.json(slot);
  } catch (err) {
    res.status(500).json({ message: 'Error booking slot', error: err.message });
  }
};



//register organization and set approved to true
exports.registerOrganizationByAdmin = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const existing = await Organization.findOne({ email });
    if (existing) return res.status(400).json({ message: 'Email already exists' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const org = new Organization({ name, email, password: hashedPassword, approved: true });
    await org.save();

    res.status(201).json({ message: 'Organization registered', organization: org});
  } catch (err) {
    console.error('Register Error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
};