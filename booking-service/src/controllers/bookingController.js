import * as bookingService from '../services/bookingService.js';
import axios from 'axios';
import Booking from '../models/bookingModel.js';
import DailyBooking from '../models/dailyBookingModle.js';

const USER_SERVICE = process.env.USER_SERVICE_URL || 'http://localhost:4001';
const ORG_SERVICE  = process.env.ORG_SERVICE_URL  || 'http://localhost:3001';

export const getAllSlots = async (req, res) => {
  try {
    const { organizationId } = req.params;
    if (!organizationId) {
      return res
        .status(400)
        .json({ message: 'organizationId query parameter is required' });
    }

    // proxy to Organization-Service’s “all slots” endpoint
    const response = await axios.get(
      `http://localhost:3001/api/organization/${organizationId}/slots/all`
    );

    // response.data will be { carSlots: [...], bikeSlots: [...] }
    return res.json(response.data);
  } catch (err) {
    console.error('getAllSlots error:', err);
    return res
      .status(500)
      .json({ message: 'Failed to fetch all slots', error: err.message });
  }
};


// POST /book/:id   (where :id is your userId)
// export const bookSlot = async (req, res) => {
//   try {
//     const userId = req.params.id;
//     const {
//       organizationId,
//       type,
//       levelIdentifier,
//       slotNumber,
//       bookedBy,
//       vehicleNumber
//     } = req.body;

//     // 1) Tell Org-Service to mark the slot as booked
//     await axios.patch(
//       `${ORG_SERVICE}/api/organization/slots/book`,
//       { organizationId, type, levelIdentifier, slotNumber, bookedBy, vehicleNumber }
//     );

//     // 2) Record the booking in our DB
//     const booking = new Booking({
//       userId,
//       orgId: organizationId,
//       slotId: slotNumber,        // replace with real slot _id if Org-Service returns it
//       vehicleType: type
//       // entryTime & bookingDate default per your schema
//     });
//     await booking.save();

//     return res.status(201).json(booking);
//   } catch (err) {
//     console.error(err);
//     return res.status(500).json({ error: 'Failed to book slot.' });
//   }
// };
export const bookSlot = async (req, res) => {
  const userId = req.params.id;
  const {
    organizationId,
    type,
    levelIdentifier,
    slotNumber
  } = req.body;

  try {
    // 1) Reserve user (checks balance, isParked, vehicle number) via POST
    await axios.post(
      `${USER_SERVICE}/api/user/book-slot/${userId}`,
      { type }
    );

    // 2) Mark slot in Org-Service
    await axios.patch(
      `${ORG_SERVICE}/api/organization/slots/book`,
      {
        organizationId,
        type,
        levelIdentifier,
        slotNumber,
        bookedBy:     userId,
        vehicleNumber: null
      }
    );

    // 3) Persist our own Booking record
    const booking = new Booking({
      userId,
      orgId:        organizationId,
      slotId:       slotNumber,
      vehicleType:  type
    });
    await booking.save();

    return res.status(201).json(booking);

  } catch (err) {
    console.error('bookSlot error:', err.message);

    // If Org booking failed after user reserved, roll back user:
    if (err.config?.url.includes('/organization/slots/book')) {
      try {
        await axios.post(
          `${USER_SERVICE}/api/user/exit-slot/${userId}`,
          { price: 0 }
        );
      } catch (rollbackErr) {
        console.error('rollback exit-slot error:', rollbackErr.message);
      }
    }

    const status  = err.response?.status || 500;
    const message = err.response?.data?.message || 'Failed to book slot';
    return res.status(status).json({ message, error: err.message });
  }
};

// POST /exit/:id   (where :id is the bookingId)
// export const exitSlot = async (req, res) => {
//   try {
//     const bookingId = req.params.id;
//     const { organizationId, type, levelIdentifier, slotNumber } = req.body;

//     // 1) Tell Org-Service to free the slot
//     const orgRes = await axios.patch(
//       `${ORG_SERVICE}/api/organization/slots/exit`,
//       { organizationId, type, levelIdentifier, slotNumber }
//     );

//     // 2) Load & update our Booking record
//     const booking = await Booking.findById(bookingId);
//     if (!booking) {
//       return res.status(404).json({ error: 'Booking not found.' });
//     }
//     booking.exitTime = new Date();
//     booking.status   = 'COMPLETED';

//     // 3) Compute totalCharge (use Org-Service value if available)
//     let totalCharge = orgRes.data.totalCharge;
//     if (typeof totalCharge !== 'number') {
//       const durationMs  = booking.exitTime - booking.entryTime;
//       const hours       = Math.ceil(durationMs / (1000 * 60 * 60));
//       const ratePerHour = 10; // adjust as needed or fetch real rate
//       totalCharge       = hours * ratePerHour;
//     }
//     booking.totalCharge = totalCharge;
//     await booking.save();

//     // 4) Normalize to **local** midnight (IST)
//     const dt = booking.bookingDate || booking.entryTime;
//     const localMidnight = new Date(
//       dt.getFullYear(),
//       dt.getMonth(),
//       dt.getDate()
//     );

//     // 5) Upsert DailyBooking summary
//     const daily = await DailyBooking.findOneAndUpdate(
//       { orgId: booking.orgId, date: localMidnight },
//       { $inc: { totalBookings: 1, totalRevenue: totalCharge } },
//       { upsert: true, new: true, setDefaultsOnInsert: true }
//     );

//     console.log(
//       `Upserted DailyBooking for org ${booking.orgId} on ${localMidnight.toDateString()}:`,
//       daily
//     );

//     return res.json(booking);
//   } catch (err) {
//     console.error('exitSlot error:', err);
//     return res.status(500).json({ error: 'Failed to exit slot.' });
//   }
// };

export const exitSlot = async (req, res) => {
  const bookingId = req.params.id;
  const { organizationId, type, levelIdentifier, slotNumber, price } = req.body;

  // 1) Validate input
  if (typeof price !== 'number') {
    return res
      .status(400)
      .json({ message: 'Exit price must be provided as a number in the request body.' });
  }

  try {
    // 2) Tell Org-Service to free the slot
    const orgRes = await axios.patch(
      `${ORG_SERVICE}/api/organization/slots/exit`,
      { organizationId, type, levelIdentifier, slotNumber }
    );

    // 3) If Org-Service succeeded, notify User-Service to deduct and clear isParked
    if (orgRes.status >= 200 && orgRes.status < 300) {
      // Load booking to get the userId
      const booking = await Booking.findById(bookingId);
      if (!booking) {
        return res.status(404).json({ message: 'Booking not found.' });
      }

      // Call User-Service exit-slot endpoint
      await axios.post(
        `${USER_SERVICE}/api/user/exit-slot/${booking.userId}`,
        { price }
      );

      // 4) Update our Booking record
      booking.exitTime    = new Date();
      booking.status      = 'COMPLETED';
      booking.totalCharge = price;
      await booking.save();

      // 5) Upsert DailyBooking summary (local midnight)
      const dt = booking.bookingDate;
      const localMidnight = new Date(dt.getFullYear(), dt.getMonth(), dt.getDate());
      await DailyBooking.findOneAndUpdate(
        { orgId: booking.orgId, date: localMidnight },
        { $inc: { totalBookings: 1, totalRevenue: price } },
        { upsert: true, setDefaultsOnInsert: true }
      );

      return res.json(booking);
    } else {
      return res
        .status(orgRes.status)
        .json({ message: 'Org-Service failed to free the slot.' });
    }
  } catch (err) {
    console.error('exitSlot error:', err.message);
    return res.status(500).json({ error: 'Failed to exit slot.' });
  }
};




// // Book a slot
// export const bookSlot = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const response = await axios.patch(`http://localhost:3001/api/organization/slots/${id}/book`, req.body);
//     res.status(response.status).json(response.data);
//   } catch (err) {
//     console.error('Booking Error:', err.message);
//     const status = err.response?.status || 500;
//     const message = err.response?.data?.message || 'Booking failed';
//     res.status(status).json({ message, error: err.message });
//   }
// };

// // Exit from a slot
// export const exitSlot = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const response = await axios.patch(`http://localhost:3001/api/organization/slots/${id}/exit`);
//     res.status(response.status).json(response.data);
//   } catch (err) {
//     console.error('Exit Error:', err.message);
//     const status = err.response?.status || 500;
//     const message = err.response?.data?.message || 'Exit failed';
//     res.status(status).json({ message, error: err.message });
//   }
// };





