const express = require('express');
const router = express.Router();
const axios = require('axios');
const Attendance = require('../models/Attendance');
const Staff = require('../models/Staff');

// getAddressFromCoordinates function remains unchanged...
async function getAddressFromCoordinates(locationString) {
  if (!locationString) return null;
  try {
    const [lat, lon] = locationString.split(',').map(s => s.trim());
    const apiKey = process.env.OPENCAGE_API_KEY;
    const apiUrl = `https://api.opencagedata.com/geocode/v1/json?q=${lat}+${lon}&key=${apiKey}&pretty=1&no_annotations=1`;
    const response = await axios.get(apiUrl);
    if (response.data && response.data.results && response.data.results.length > 0) {
      return response.data.results[0].formatted;
    }
    return locationString;
  } catch (error) {
    console.error("Reverse geocoding failed:", error.message);
    return locationString;
  }
}


// MODIFIED: /save route
router.post('/save', async (req, res) => {
  // --- MODIFIED: Destructure the new field ---
  const {
    id, date, inTime, lunchOut, lunchIn, outTime, day,
    permissionType, hours, dailyLeaveType, leaveType, location,
    inTimeMethod // <-- New field from frontend
  } = req.body;

  if (!id || !date) {
    return res.status(400).json({ error: 'ID and Date are required' });
  }

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
    const address = await getAddressFromCoordinates(location);

    let attendance = await Attendance.findOne({ id: String(id).trim(), date });

    if (attendance) {
      // --- RECORD EXISTS, SO WE ARE UPDATING IT ---
      let updated = false;
      let message = '';

      if (outTime && !attendance.outTime) {
        attendance.outTime = outTime;
        if (dailyLeaveType) attendance.dailyLeaveType = dailyLeaveType;
        updated = true;
        message = 'Out Time Details Submitted Successfully';
      } else if (leaveType && !attendance.leaveType) {
        attendance.leaveType = leaveType;
        updated = true;
        message = 'Leave Submitted Successfully';
      } else if (permissionType && !attendance.permissionType) {
        attendance.permissionType = permissionType;
        if (hours) attendance.hours = hours;
        updated = true;
        message = 'Permission Submitted Successfully';
      } else if (lunchIn && attendance.lunchOut && !attendance.lunchIn) {
        attendance.lunchIn = lunchIn;
        updated = true;
        message = 'Lunch Ending Time Attendance Submitted';
      } else if (lunchOut && !attendance.lunchOut) {
        attendance.lunchOut = lunchOut;
        updated = true;
        message = 'Lunch Starting Time Attendance Submitted';
      } else if (inTime && !attendance.inTime) {
        attendance.inTime = inTime;
        // --- MODIFIED: Save the method along with the time ---
        if (inTimeMethod) attendance.inTimeMethod = inTimeMethod;
        if (address) attendance.location = address;
        updated = true;
        message = 'In Time submitted';
      }

      if (updated) {
        attendance.name = staffName;
        attendance.day = day || attendance.day;
        await attendance.save();
        return res.json({ message });
      } else {
        return res.status(409).json({ error: 'Already submitted or no new data to update.' });
      }

    } else {
      // --- NO RECORD, SO WE ARE CREATING A NEW ONE ---
      const newAttendance = new Attendance({
        id: String(id).trim(), name: staffName, date, day, inTime,
        // --- MODIFIED: Add new field on creation ---
        inTimeMethod,
        lunchOut, lunchIn, outTime, permissionType, hours, dailyLeaveType, leaveType,
        location: address,
      });
      await newAttendance.save();

      let message = 'Attendance created successfully';
      if (leaveType) message = 'Leave Submitted Successfully';
      else if (permissionType) message = 'Permission Submitted Successfully';

      return res.json({ message });
    }
  } catch (error) {
    console.error('Error saving attendance:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// All other routes (/all, /today, /getByIdDate) remain unchanged.
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

// GET today's attendance summary
router.get('/today', async (req, res) => {
    try {
        const todayDate = new Date().toISOString().split('T')[0];
        const cutoffTime = "09:15";
        const allStaff = await Staff.find();
        const todaysAttendance = await Attendance.find({ date: todayDate });
        const presentIds = new Set(todaysAttendance.map(a => a.id));
        const presents = todaysAttendance.map(att => ({
            id: att.id,
            name: att.name,
            inTime: att.inTime,
            day: att.day,
            lunchIn: att.lunchIn,
            lunchOut: att.lunchOut,
            outTime: att.outTime,
            permissionType: att.permissionType,
            hours: att.hours,
            leaveType: att.leaveType,
        }));
        const lateComers = presents.filter(att => att.inTime && att.inTime > cutoffTime);
        const absents = allStaff.filter(staff => !presentIds.has(staff.id)).map(st => ({
            id: st.id,
            name: st.name,
            department: st.department,
            designation: st.designation,
        }));
        res.json({
            count: { presents: presents.length, absents: absents.length, lateComers: lateComers.length, },
            presents, absents, lateComers,
        });
    } catch (err) {
        console.error("Error fetching today's attendance:", err);
        res.status(500).json({ error: "Server error" });
    }
});

// GET attendance by ID and Date
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