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
    const levelLetter = getLevelLetter(level); // e.g., 1 → A, 2 → B

    // Find existing slot structure for the organization
    let slotDoc = await Slot.findOne({ organizationId });

    // If no structure exists, create one
    if (!slotDoc) {
      slotDoc = new Slot({
        organizationId,
        hourlyRates: {
          car: type === 'car' ? hourlyRate : 0,
          bike: type === 'bike' ? hourlyRate : 0
        },
        carLevels: [],
        bikeLevels: []
      });
    }

    // Select the correct levels array and create identifier
    const levelsArray = type === 'car' ? slotDoc.carLevels : slotDoc.bikeLevels;

    // Try to find the level by its identifier
    let levelEntry = levelsArray.find((l) => l.levelIdentifier === levelLetter);

    // If level doesn't exist, create it
    if (!levelEntry) {
      levelEntry = {
        levelIdentifier: levelLetter,
        availableSlots: 0,
        bookedSlots: 0,
        slots: []
      };
      levelsArray.push(levelEntry);
    }

    // Calculate next slot number index
    const existingCount = levelEntry.slots.length;
    const newSlots = [];

    for (let i = 0; i < count; i++) {
      const slotNumber = `${levelLetter}-${existingCount + i + 1}`;

      const newSlot = {
        slotNumber,
        status: 'available',
        bookedBy: null,
        vehicleNumber: null,
        bookedAt: null
      };

      levelEntry.slots.push(newSlot);
      levelEntry.availableSlots += 1;

      // Optionally emit event
      await sendSlotEvent('slot.created', {
        organizationId,
        slotNumber,
        level: levelLetter,
        type,
        hourlyRate
      });

      newSlots.push(newSlot);
    }

    await slotDoc.save();

    res.status(201).json({ message: `${count} ${type} slot(s) created`, slots: newSlots });
  } catch (err) {
    console.error('Create Slot Error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
};



exports.getAllSlots = async (req, res) => {
  try {
    const organizationId = req.params.id;

    const slotStructure = await Slot.findOne({ organizationId }).populate('organizationId');

    if (!slotStructure) {
      return res.status(404).json({ message: 'No slot structure found for this organization' });
    }

    res.status(200).json(slotStructure);
  } catch (err) {
    console.error('Get All Slots Error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
};

exports.updateSlot = async (req, res) => {
  try {
    const { organizationId, type, levelIdentifier, slotNumber, updates } = req.body;

    const slotDoc = await Slot.findOne({ organizationId });
    if (!slotDoc) {
      return res.status(404).json({ message: 'Slot structure not found' });
    }

    const levelsArray = type === 'car' ? slotDoc.carLevels : slotDoc.bikeLevels;
    const level = levelsArray.find(l => l.levelIdentifier === levelIdentifier);
    if (!level) {
      return res.status(404).json({ message: 'Level not found' });
    }

    const slot = level.slots.find(s => s.slotNumber === slotNumber);
    if (!slot) {
      return res.status(404).json({ message: 'Slot not found' });
    }

    // Update fields
    Object.assign(slot, updates);

    // Recalculate slot counts
    level.availableSlots = level.slots.filter(s => s.status === 'available').length;
    level.bookedSlots = level.slots.filter(s => s.status === 'occupied').length;

    await slotDoc.save();

    await sendSlotEvent('slot.updated', {
      slotNumber,
      organizationId,
      type,
      level: levelIdentifier,
      status: slot.status,
      bookedBy: slot.bookedBy,
      vehicleNumber: slot.vehicleNumber,
    });

    res.status(200).json({ message: 'Slot updated', updatedSlot: slot });
  } catch (err) {
    console.error('Update Slot Error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
};

exports.deleteSlot = async (req, res) => {
  try {
    const { organizationId, type, levelIdentifier, slotNumber } = req.body;

    const slotDoc = await Slot.findOne({ organizationId });
    if (!slotDoc) {
      return res.status(404).json({ message: 'Slot structure not found' });
    }

    const levelsArray = type === 'car' ? slotDoc.carLevels : slotDoc.bikeLevels;
    const level = levelsArray.find(l => l.levelIdentifier === levelIdentifier);
    if (!level) {
      return res.status(404).json({ message: 'Level not found' });
    }

    const slotIndex = level.slots.findIndex(s => s.slotNumber === slotNumber);
    if (slotIndex === -1) {
      return res.status(404).json({ message: 'Slot not found' });
    }

    const [removedSlot] = level.slots.splice(slotIndex, 1);

    // Recalculate counts
    level.availableSlots = level.slots.filter(s => s.status === 'available').length;
    level.bookedSlots = level.slots.filter(s => s.status === 'occupied').length;

    await slotDoc.save();

    await sendSlotEvent('slot.deleted', {
      organizationId,
      slotNumber,
      type,
      level: levelIdentifier
    });

    res.json({ message: 'Slot deleted', deletedSlot: removedSlot });
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


// PATCH /api/slots/book

exports.markSlotAsBooked = async (req, res) => {
  try {
    const { organizationId, type, levelIdentifier, slotNumber, bookedBy, vehicleNumber } = req.body;

    const slotDoc = await Slot.findOne({ organizationId });
    if (!slotDoc) {
      return res.status(404).json({ message: 'Slot structure not found' });
    }

    const levelsArray = type === 'car' ? slotDoc.carLevels : slotDoc.bikeLevels;
    const level = levelsArray.find(l => l.levelIdentifier === levelIdentifier);
    if (!level) {
      return res.status(404).json({ message: 'Level not found' });
    }

    let targetSlot;

    if (slotNumber) {
      // Booking a specific slot
      targetSlot = level.slots.find(s => s.slotNumber === slotNumber);
      if (!targetSlot) {
        return res.status(404).json({ message: 'Slot not found' });
      }
      if (targetSlot.status === 'occupied') {
        return res.status(400).json({ message: 'Slot is already occupied' });
      }
    } else {
      // Auto-book the first available slot
      const availableSlots = level.slots
        .filter(s => s.status === 'available')
        .sort((a, b) => {
          // Sort by slot number: e.g., "C1-2" before "C1-10"
          const aNum = parseInt(a.slotNumber.split('-')[1], 10);
          const bNum = parseInt(b.slotNumber.split('-')[1], 10);
          return aNum - bNum;
        });

      if (availableSlots.length === 0) {
        return res.status(400).json({ message: 'No available slots in this level' });
      }

      targetSlot = availableSlots[0];
    }

    // Mark as booked
    targetSlot.status = 'occupied';
    targetSlot.bookedBy = bookedBy || null;
    targetSlot.vehicleNumber = vehicleNumber || null;
    targetSlot.bookedAt = new Date();

    // Update count
    level.availableSlots = level.slots.filter(s => s.status === 'available').length;
    level.bookedSlots = level.slots.filter(s => s.status === 'occupied').length;

    await slotDoc.save();

    res.status(200).json({ message: 'Slot booked successfully', bookedSlot: targetSlot });
  } catch (err) {
    console.error('Error booking slot:', err);
    res.status(500).json({ message: 'Internal server error', error: err.message });
  }
};

//mark slot as available

exports.markSlotAsAvailable = async (req, res) => {
  try {
    const { organizationId, type, levelIdentifier, slotNumber } = req.body;

    const slotDoc = await Slot.findOne({ organizationId });
    if (!slotDoc) {
      return res.status(404).json({ message: 'Slot structure not found' });
    }

    const levelsArray = type === 'car' ? slotDoc.carLevels : slotDoc.bikeLevels;
    const level = levelsArray.find(l => l.levelIdentifier === levelIdentifier);
    if (!level) {
      return res.status(404).json({ message: 'Level not found' });
    }

    const slot = level.slots.find(s => s.slotNumber === slotNumber);
    if (!slot) {
      return res.status(404).json({ message: 'Slot not found' });
    }

    if (slot.status === 'available') {
      return res.status(400).json({ message: 'Slot is already available' });
    }

    // Mark the slot as available
    slot.status = 'available';
    slot.bookedBy = null;
    slot.vehicleNumber = null;
    slot.bookedAt = null;

    // Recalculate counts
    level.availableSlots = level.slots.filter(s => s.status === 'available').length;
    level.bookedSlots = level.slots.filter(s => s.status === 'occupied').length;

    await slotDoc.save();

    res.json({ message: 'Slot marked as available', updatedSlot: slot });
  } catch (err) {
    console.error('Error marking slot as available:', err);
    res.status(500).json({ message: 'Internal server error', error: err.message });
  }
};


//register organization and set approved to true
exports.registerOrganizationByAdmin = async (req, res) => {
  try {
    const { name, email, password, location } = req.body;
    const existing = await Organization.findOne({ email });
    if (existing) return res.status(400).json({ message: 'Email already exists' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const org = new Organization({ name, email, password: hashedPassword, location, approved: true });
    await org.save();

    res.status(201).json({ message: 'Organization registered', organization: org});
  } catch (err) {
    console.error('Register Error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
};


exports.getAllOrganizationsForUser = async (req, res) => {
  try {
    const organizations = await Organization.find({approved : true});
    res.json(organizations);
  } catch (err) {
    console.error('Get All Organizations Error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
};


//get available slots for users
exports.getAvailableSlotsByOrgId = async (req, res) => {
  try {
    const { id } = req.params; // organizationId from the route
    const slots = await Slot.find({ organizationId: id, status: 'available' });
    res.json(slots);
  } catch (err) {
    console.error('Error fetching available slots by organization:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
};