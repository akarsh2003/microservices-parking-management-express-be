const Organization = require('../models/organizationModel');
const Slot = require('../models/slotModel');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { sendSlotEvent } = require('../kafka/producer');

const JWT_SECRET = 'yourSecretKey';

// exports.registerOrganization = async (req, res) => {
//   try {
//     const { name, email, password, location } = req.body;
//     const existing = await Organization.findOne({ email });
//     if (existing) return res.status(400).json({ message: 'Email already exists' });

//     const hashedPassword = await bcrypt.hash(password, 10);
//     const org = new Organization({ name, email, password: hashedPassword, location });
//     await org.save();

//     res.status(201).json({ message: 'Organization registered. Awaiting approval.' , organization: org});
//   } catch (err) {
//     console.error('Register Error:', err);
//     res.status(500).json({ message: 'Internal server error' });
//   }
// };

exports.registerOrganization = async (req, res) => {
  try {
    const { name, email, password, location } = req.body;

    // Check if the organization already exists
    const existing = await Organization.findOne({ email });
    if (existing) return res.status(400).json({ message: 'Email already exists' });

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create a new organization
    const org = new Organization({
      name,
      email,
      password: hashedPassword,
      location, // The location is passed as an object
    });

    // Save the organization
    await org.save();


    // Respond back with success
    res.status(201).json({ message: 'Organization registered and slot model created.', organization: org });
  } catch (err) {
    console.error('Register Error:', err);
    res.status(500).json({ message: 'Internal server error', error: err.message });
  }
};




exports.loginOrganization = async (req, res) => {
  try {
    const { email, password } = req.body;
    const org = await Organization.findOne({ email });
    
    if (!org || !(await bcrypt.compare(password, org.password)))
      return res.status(401).json({ message: 'Invalid credentials' });
      
    if (!org.approved) return res.status(403).json({ message: 'Not approved yet' });
    
    // Generate JWT token with organization ID and role
    const token = jwt.sign(
      {
        orgId: org._id, // Add the orgId here
        role: org.role,
      },
      JWT_SECRET,
      { expiresIn: '1h' }
    );
    
    // Send the token and organization details (including orgId) back to the frontend
    res.json({ token, organization: { _id: org._id, name: org.name } });
  } catch (err) {
    console.error('Login Error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
};


// Get letter from level (1 = A, 2 = B, etc.)
const getLevelLetter = (level) => {
  return String.fromCharCode(64 + level);
};


// exports.createSlot = async (req, res) => {
//   try {
//     const { organizationId, carSlots = 0, bikeSlots = 0, level } = req.body;
//     const levelLetter = getLevelLetter(level); // Convert level number to letter (e.g., 1 -> A)

//     // Find existing slot structure for the organization
//     let slotDoc = await Slot.findOne({ organizationId });

//     // If no structure exists, create one for level 1 with zero slots
//     if (!slotDoc) {
//       slotDoc = new Slot({
//         organizationId,
//         hourlyRates: { car: 0, bike: 0 }, // Default hourly rate for car and bike
//         carLevels: [{
//           levelIdentifier: levelLetter, // Level 1 will be 'A'
//           availableSlots: 0,
//           bookedSlots: 0,
//           slots: []
//         }],
//         bikeLevels: [{
//           levelIdentifier: levelLetter, // Level 1 will be 'A'
//           availableSlots: 0,
//           bookedSlots: 0,
//           slots: []
//         }],
//       });

//       // Save the newly created slot document
//       await slotDoc.save();
//     }

//     // Create car slots if carSlots > 0
//     const newCarSlots = [];
//     if (carSlots > 0) {
//       let carLevelEntry = slotDoc.carLevels.find((l) => l.levelIdentifier === levelLetter);

//       if (!carLevelEntry) {
//         carLevelEntry = {
//           levelIdentifier: levelLetter,
//           availableSlots: 0,
//           bookedSlots: 0,
//           slots: [],
//         };
//         slotDoc.carLevels.push(carLevelEntry);
//       }

//       const existingCarCount = carLevelEntry.slots.length;
//       for (let i = 0; i < carSlots; i++) {
//         const slotNumber = `${levelLetter}-${existingCarCount + i + 1}`;
//         const newSlot = {
//           slotNumber,
//           status: 'available',
//           bookedBy: null,
//           vehicleNumber: null,
//           bookedAt: null,
//         };

//         carLevelEntry.slots.push(newSlot);
//         carLevelEntry.availableSlots += 1;
//         newCarSlots.push(newSlot);
//       }
//     }

//     // Create bike slots if bikeSlots > 0
//     const newBikeSlots = [];
//     if (bikeSlots > 0) {
//       let bikeLevelEntry = slotDoc.bikeLevels.find((l) => l.levelIdentifier === levelLetter);

//       if (!bikeLevelEntry) {
//         bikeLevelEntry = {
//           levelIdentifier: levelLetter,
//           availableSlots: 0,
//           bookedSlots: 0,
//           slots: [],
//         };
//         slotDoc.bikeLevels.push(bikeLevelEntry);
//       }

//       const existingBikeCount = bikeLevelEntry.slots.length;
//       for (let i = 0; i < bikeSlots; i++) {
//         const slotNumber = `${levelLetter}-${existingBikeCount + i + 1}`;
//         const newSlot = {
//           slotNumber,
//           status: 'available',
//           bookedBy: null,
//           vehicleNumber: null,
//           bookedAt: null,
//         };

//         bikeLevelEntry.slots.push(newSlot);
//         bikeLevelEntry.availableSlots += 1;
//         newBikeSlots.push(newSlot);
//       }
//     }

//     // Save the slot document with the new slots
//     await slotDoc.save();

//     // Respond with the newly created slots
//     res.status(201).json({
//       message: `${carSlots} car slot(s) and ${bikeSlots} bike slot(s) created`,
//       carSlots: newCarSlots,
//       bikeSlots: newBikeSlots,
//     });
//   } catch (err) {
//     console.error('Create Slot Error:', err);
//     res.status(500).json({ message: 'Internal server error' });
//   }
// };

exports.createSlot = async (req, res) => {
  try {
    const { organizationId, level, carSlots = 0, bikeSlots = 0 } = req.body;
    const levelLetter = getLevelLetter(level); // e.g. 8 → 'H'

    // 1) find or create the Slot doc
    let slotDoc = await Slot.findOne({ organizationId });
    if (!slotDoc) {
      slotDoc = new Slot({
        organizationId,
        hourlyRates: { car: 0, bike: 0 },
        carLevels: [],
        bikeLevels: []
      });
    }

    // 2) helper to upsert a level
    const upsertLevel = (levelsArray, slotsCount) => {
      // try find existing
      let lvl = levelsArray.find(l => l.levelIdentifier === levelLetter);

      if (!lvl) {
        // 2a) level not found → build a brand-new one
        const newSlots = [];
        for (let i = 0; i < slotsCount; i++) {
          newSlots.push({
            slotNumber: `${levelLetter}-${i + 1}`,
            status: 'available',
            bookedBy: null,
            vehicleNumber: null,
            bookedAt: null
          });
        }
        lvl = {
          levelIdentifier: levelLetter,
          slots: newSlots,
          bookedSlots: 0,
          availableSlots: slotsCount
        };
        levelsArray.push(lvl);
      } else if (slotsCount > 0) {
        // 2b) level already exists → append only additional slots
        const existingCount = lvl.slots.length;
        for (let i = 0; i < slotsCount; i++) {
          lvl.slots.push({
            slotNumber: `${levelLetter}-${existingCount + i + 1}`,
            status: 'available',
            bookedBy: null,
            vehicleNumber: null,
            bookedAt: null
          });
        }
        // sync counts
        lvl.availableSlots = lvl.slots.filter(s => s.status === 'available').length;
        lvl.bookedSlots   = lvl.slots.length - lvl.availableSlots;
      }
      // if slotsCount === 0 **and** level exists, we leave it as-is
    };

    // 3) upsert both carLevels and bikeLevels
    upsertLevel(slotDoc.carLevels,  carSlots);
    upsertLevel(slotDoc.bikeLevels, bikeSlots);

    // 4) save & return
    await slotDoc.save();
    res.status(201).json({
      message: `Level ${levelLetter} now has ${carSlots} new car-slot(s) and ${bikeSlots} new bike-slot(s).`,
      slotDoc
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal server error' });
  }
};



// Get slot rates (for car and bike)
exports.getSlotRates = async (req, res) => {
  try {
    const { id: organizationId } = req.params;

    // Find the slot document for the organization
    let slotDoc = await Slot.findOne({ organizationId });

    // If no slot document is found, return zero rates
    if (!slotDoc) {
      return res.status(200).json({
        hourlyRates: {
          car: 0,
          bike: 0
        }
      });
    }

    // Return the hourly rates for car and bike
    res.status(200).json({
      hourlyRates: slotDoc.hourlyRates,
    });
  } catch (err) {
    console.error('Get Slot Rates Error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
};

exports.setSlotRates = async (req, res) => {
  try {
    const { organizationId, carHourlyRate, bikeHourlyRate } = req.body;

    // Find the slot document for the organization
    let slotDoc = await Slot.findOne({ organizationId });

    if (!slotDoc) {
      return res.status(404).json({ message: 'Organization slot document not found' });
    }

    // If carHourlyRate is provided, update the car rate
    if (carHourlyRate !== undefined) {
      slotDoc.hourlyRates.car = carHourlyRate;
    }

    // If bikeHourlyRate is provided, update the bike rate
    if (bikeHourlyRate !== undefined) {
      slotDoc.hourlyRates.bike = bikeHourlyRate;
    }

    // Save the updated document
    await slotDoc.save();

    // Respond with success message
    res.status(200).json({
      message: `Hourly rates updated successfully`,
      hourlyRates: slotDoc.hourlyRates,
    });
  } catch (err) {
    console.error('Set Slot Rates Error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
};


// exports.getAllSlots = async (req, res) => {
//   try {
//     const { id: organizationId } = req.params;

//     // Find the slot document for the organization
//     let slotDoc = await Slot.findOne({ organizationId });
//     console.log('Slot Document:', slotDoc);
//     // If no slot document exists, create one for level 1 with zero slots
//     if (!slotDoc) {
//       // Create a new slot document with zero rates and zero slots
//       slotDoc = new Slot({
//         organizationId: org._id,
//         hourlyRates: { car: 0, bike: 0 }, // Default hourly rates for car and bike
//         carLevels: [{
//           levelIdentifier: 'A', // Level 1 will be 'A'
//           availableSlots: 0,
//           bookedSlots: 0,
//           slots: [],
//         }],
//         bikeLevels: [{
//           levelIdentifier: 'A', // Level 1 will be 'A'
//           availableSlots: 0,
//           bookedSlots: 0,
//           slots: [],
//         }],
//       });
//       // Save the newly created slot document
//       console.log("==>Slot Document Created:", slotDoc);
//       await slotDoc.save();
//     }

//     // Return the slot document for the organization
//     res.status(200).json(slotDoc);
//   } catch (err) {
//     console.error('Get Slots Error:', err);
//     res.status(500).json({ message: 'Internal server error' });
//   }
// };
exports.getAllSlots = async (req, res) => {
  try {
    const organizationId = req.params.id;

    // 1️⃣ Make sure the organisation exists and is approved
    const org = await Organization.findById(organizationId).lean();
    if (!org)            return res.status(404).json({ message: 'Organisation not found' });
    if (!org.approved)   return res.status(403).json({ message: 'Organisation not approved yet' });

    // 2️⃣ Look for an existing slot-document
    let slotDoc = await Slot.findOne({ organizationId }).lean();

    // 3️⃣ If missing, bootstrap level A with zero rates/slots
    if (!slotDoc) {
      slotDoc = await Slot.create({
        organizationId,
        hourlyRates: { car: 0, bike: 0 },
        carLevels : [{ levelIdentifier: 'A', availableSlots: 0, bookedSlots: 0, slots: [] }],
        bikeLevels: [{ levelIdentifier: 'A', availableSlots: 0, bookedSlots: 0, slots: [] }],
      });
    }

    res.status(200).json(slotDoc);
  } catch (err) {
    console.error('Get Slots Error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
};


// exports.getAllSlots = async (req, res) => {
//   try {
//     const organizationId = req.params.id;

//     const slotStructure = await Slot.findOne({ organizationId }).populate('organizationId');

//     if (!slotStructure) {
//       return res.status(404).json({ message: 'No slot structure found for this organization' });
//     }

//     res.status(200).json(slotStructure);
//   } catch (err) {
//     console.error('Get All Slots Error:', err);
//     res.status(500).json({ message: 'Internal server error' });
//   }
// };

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
    const { organizationId, type, level, decreaseBy } = req.body;

    // 1. Validate inputs
    if (!organizationId || !type || level == null || decreaseBy == null) {
      return res.status(400).json({
        message:
          'Required fields: organizationId, type ("car"|"bike"), level (number), decreaseBy'
      });
    }
    if (!['car', 'bike'].includes(type)) {
      return res
        .status(400)
        .json({ message: 'type must be "car" or "bike"' });
    }
    if (!Number.isInteger(level) || level < 1 || level > 26) {
      return res
        .status(400)
        .json({ message: 'level must be an integer between 1 and 26' });
    }
    if (!Number.isInteger(decreaseBy) || decreaseBy < 1) {
      return res
        .status(400)
        .json({ message: 'decreaseBy must be a positive integer' });
    }

    // 2. Convert numeric level to letter (1→A, 2→B, …)
    const letter = String.fromCharCode('A'.charCodeAt(0) + level - 1);

    // 3. Fetch the Slot document
    const slotDoc = await Slot.findOne({ organizationId });
    if (!slotDoc) {
      return res.status(404).json({ message: 'Slot structure not found' });
    }

    // 4. Choose carLevels or bikeLevels
    const levelsArray =
      type === 'car' ? slotDoc.carLevels : slotDoc.bikeLevels;

    // 5. Find the level entry by its letter
    const levelEntry = levelsArray.find(
      (l) => l.levelIdentifier === letter
    );
    if (!levelEntry) {
      return res.status(404).json({ message: `Level ${letter} not found` });
    }

    // 6. Count how many are available
    const avail = levelEntry.slots.filter((s) => s.status === 'available')
      .length;
    if (avail < decreaseBy) {
      return res.status(400).json({
        message: `Cannot remove ${decreaseBy} slots: only ${avail} available`
      });
    }

    // 7. Remove from the back only available slots
    let removed = 0;
    for (
      let i = levelEntry.slots.length - 1;
      i >= 0 && removed < decreaseBy;
      i--
    ) {
      if (levelEntry.slots[i].status === 'available') {
        levelEntry.slots.splice(i, 1);
        removed++;
      }
    }

    // 8. Recalculate counts
    levelEntry.availableSlots = levelEntry.slots.filter(
      (s) => s.status === 'available'
    ).length;
    levelEntry.bookedSlots =
      levelEntry.slots.length - levelEntry.availableSlots;

    // 9. Save and respond
    await slotDoc.save();
    return res.status(200).json({
      message: `Removed ${removed} slot(s) from level ${letter} (${type})`,
      level: letter,
      removed
    });
  } catch (err) {
    console.error('Delete Slot Error:', err);
    return res.status(500).json({ message: 'Internal server error' });
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
    console.log("Organization Verified");

    // const newSlot = new Slot({
    //   organizationId: id,  // Assign the organization ID directly
    //   hourlyRates: {
    //     car: 10,
    //     bike: 5
    //   },
    //   carLevels: [
    //     {
    //       levelIdentifier: "A1",
    //       availableSlots: 1,
    //       bookedSlots: 0,
    //       slots: [
    //         {
    //           slotNumber: "A-1",
    //           status: "available"
    //         }
    //       ]
    //     }
    //   ],
    //   bikeLevels: [
    //     {
    //       levelIdentifier: "B1",
    //       availableSlots: 1,
    //       bookedSlots: 0,
    //       slots: [
    //         {
    //           slotNumber: "B-1",
    //           status: "available"
    //         }
    //       ]
    //     }
    //   ]
    // });
    
    // // Save the slot to the database
    // newSlot.save()
    //   .then(savedSlot => {
    //     console.log("Slot successfully created with organizationId:", savedSlot);
    //   })
    //   .catch(err => {
    //     console.error("Error creating slot:", err);
    //   });

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

exports.deleteLevel = async (req, res) => {
  try {
    const { orgId, levelType, level } = req.params;

    // 1. Validate levelType
    if (!['car','bike'].includes(levelType)) {
      return res.status(400).json({ message: 'Invalid level type; must be "car" or "bike"' });
    }

    // 2. Load the Slot document by organizationId
    const slotDoc = await Slot.findOne({ organizationId: orgId });
    if (!slotDoc) {
      return res.status(404).json({ message: 'No slots found for that organization' });
    }

    // 3. Pick the right array
    const field = levelType + 'Levels';            // "carLevels" or "bikeLevels"
    const levelsArray = slotDoc[field];
    if (!Array.isArray(levelsArray)) {
      return res.status(500).json({ message: 'Internal data error' });
    }

    // 4. Find the level entry
    const entry = levelsArray.find(l => l.levelIdentifier === level);
    if (!entry) {
      return res.status(404).json({ message: `Level "${level}" not found in ${field}` });
    }

    // 5. Ensure all its slots are still available
    const allAvailable = entry.slots.every(s => s.status === 'available');
    if (!allAvailable) {
      return res.status(400).json({ message: `Cannot delete level "${level}" because some slots are occupied.` });
    }

    // 6. Remove the level entry
    slotDoc[field] = levelsArray.filter(l => l.levelIdentifier !== level);

    // 7. Save & return
    await slotDoc.save();
    return res.status(200).json({
      message: `Deleted level "${level}" from ${field}`,
      slotDoc
    });
  } catch (err) {
    console.error('Error in deleteLevel:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};