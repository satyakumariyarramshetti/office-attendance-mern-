const express = require('express');
const router = express.Router();
const axios = require('axios'); // 1. Import axios for making API calls
const Attendance = require('../models/Attendance');
const Staff = require('../models/Staff');

// 2. Helper function to get a readable address from coordinates
async function getAddressFromCoordinates(locationString) {
  // If no location data is sent, return null
  if (!locationString) return null;

  try {
    const [lat, lon] = locationString.split(',').map(s => s.trim());
    const apiKey = process.env.OPENCAGE_API_KEY; // Your API key from the .env file

    // Construct the API URL
    const apiUrl = `https://api.opencagedata.com/geocode/v1/json?q=${lat}+${lon}&key=${apiKey}&pretty=1&no_annotations=1`;

    const response = await axios.get(apiUrl);

    // Check for a valid response and return the formatted address
    if (response.data && response.data.results && response.data.results.length > 0) {
      return response.data.results[0].formatted;
    }
    
    // If the API doesn't find an address, fall back to saving the raw coordinates
    return locationString;
  } catch (error) {
    console.error("Reverse geocoding failed:", error.message);
    // If the API call fails, fall back to saving the raw coordinates
    return locationString;
  }
}

// This route now correctly handles creating and updating records with a full address
router.post('/save', async (req, res) => {
  const {
    id, date, inTime, lunchOut, lunchIn, outTime, day, casualType, leaveType, location
  } = req.body;

  if (!id || !date) {
    return res.status(400).json({ error: 'ID and Date are required' });
  }

  // Block future dates
  const submittedDate = new Date(date).setHours(0, 0, 0, 0);
  const today = new Date().setHours(0, 0, 0, 0);
  if (submittedDate > today) {
    return res.status(400).json({ error: 'Attendance submission for future dates is not allowed.' });
  }

  try {
    const staff = await Staff.findOne({ id: String(id).trim() });
    if (!staff) {
      return res.status(400).json({ error: 'Invalid staff ID - staff not found' });
    }
    const staffName = staff.name;

    // 3. Convert coordinates to a readable address BEFORE doing anything else
    const address = await getAddressFromCoordinates(location);

    let attendance = await Attendance.findOne({ id: String(id).trim(), date });

    if (attendance) { // This block handles UPDATING an existing record
      let updated = false;
      let message = '';
      
      // 4. Update the existing record with the address if it doesn't already have one
      if (address && !attendance.location) {
        attendance.location = address;
        updated = true;
        message = 'In Time and Location submitted';
      }

      if (inTime && !attendance.inTime) {
        attendance.inTime = inTime;
        updated = true;
        message = message || 'In Time submitted';
      }
      
      if (lunchOut && !attendance.lunchOut) {
        attendance.lunchOut = lunchOut;
        updated = true;
        message = 'Lunch Out submitted';
      }
      if (lunchIn && attendance.lunchOut && !attendance.lunchIn) {
        attendance.lunchIn = lunchIn;
        updated = true;
        message = 'Lunch In submitted';
      }
      if (outTime && !attendance.outTime) {
        attendance.outTime = outTime;
        updated = true;
        message = 'Out Time submitted';
      }

      attendance.day = day || attendance.day;
      attendance.name = staffName;
      attendance.casualType = casualType || attendance.casualType;
      attendance.leaveType = leaveType || attendance.leaveType;

      if (updated) {
        await attendance.save();
        return res.json({ message });
      } else {
        return res.status(409).json({ error: 'Already submitted or no new data to update.' });
      }

    } else {
      // 5. Create a new record with the address
      const newAttendance = new Attendance({
        id: String(id).trim(), name: staffName, date, day, inTime,
        lunchOut, lunchIn, outTime, casualType, leaveType,
        location: address, // Save the converted address here
      });
      await newAttendance.save();
      return res.json({ message: 'Attendance created successfully' });
    }
  } catch (error) {
    console.error('Error saving attendance:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});


// GET all attendance records for admin view
router.get('/all', async (req, res) => {
  try {
    const records = await Attendance.find().sort({ date: -1 });
    res.json(records);
  } catch (error) {
    console.error('Error fetching attendance records:', error);
    res.status(500).json({ error: 'Failed to fetch attendance records' });
  }
});

// GET today's attendance summary: presents, absents, late comers
router.get('/today', async (req, res) => {
  try {
    const todayDate = new Date().toISOString().split('T')[0];
    const cutoffTime = "09:15";
    const allStaff = await Staff.find();
    const todaysAttendance = await Attendance.find({ date: todayDate });
    const presentIds = new Set(todaysAttendance.map(a => a.id));
    const presents = todaysAttendance.map(att => ({ id: att.id, name: att.name, inTime: att.inTime, day: att.day, lunchIn: att.lunchIn, lunchOut: att.lunchOut, outTime: att.outTime, casualType: att.casualType, leaveType: att.leaveType, }));
    const lateComers = presents.filter(att => att.inTime && att.inTime > cutoffTime);
    const absents = allStaff.filter(staff => !presentIds.has(staff.id)).map(st => ({ id: st.id, name: st.name, department: st.department, designation: st.designation, }));
    res.json({ count: { presents: presents.length, absents: absents.length, lateComers: lateComers.length, }, presents, absents, lateComers, });
  } catch (err) {
    console.error("Error fetching today's attendance:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// This route is called by the frontend to fetch existing data when an ID is entered.
router.post('/getByIdDate', async (req, res) => {
  try {
    const { id, date } = req.body;
    if (!id || !date) {
      return res.status(400).json({ error: 'Staff ID and Date are required.' });
    }
    const attendance = await Attendance.findOne({ id: String(id).trim(), date });
    if (!attendance) {
      return res.status(404).json({ message: 'No attendance record found for this ID and date.' });
    }
    res.status(200).json(attendance);
  } catch (error) {
    console.error("Error in /getByIdDate route:", error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;