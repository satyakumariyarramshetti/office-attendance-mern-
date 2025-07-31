const express = require('express');
const router = express.Router();
const Attendance = require('../models/Attendance');
const Staff = require('../models/Staff');

router.post('/save', async (req, res) => {
  const {
    id,
    date,
    inTime,
    lunchOut,
    lunchIn,
    outTime,
    day,
    casualType,
    leaveType,
  } = req.body;

  if (!id || !date) {
    return res.status(400).json({ error: 'ID and Date are required' });
  }

  try {
    // Lookup staff by ID to get name
    const staff = await Staff.findOne({ id: String(id).trim() });
    if (!staff) {
      return res.status(400).json({ error: 'Invalid staff ID - staff not found' });
    }
    const staffName = staff.name;

    let attendance = await Attendance.findOne({ id: String(id).trim(), date });

    if (attendance) {
      let updated = false;
      let message = '';

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

      attendance.day = day || attendance.day;
      attendance.name = staffName; // keep staff name in sync
      attendance.casualType = casualType || attendance.casualType;
      attendance.leaveType = leaveType || attendance.leaveType;

      if (inTime && !attendance.inTime) {
        attendance.inTime = inTime;
        updated = true;
        message = 'In Time submitted';
      }

      if (outTime && !attendance.outTime) {
        attendance.outTime = outTime;
        updated = true;
        message = 'Out Time submitted';
      }

      if (updated) {
        await attendance.save();
        return res.json({ message });
      } else {
        return res.status(409).json({ error: 'Already submitted' });
      }
    } else {
      // Create new attendance record
      const newAttendance = new Attendance({
        id: String(id).trim(),
        name: staffName,
        date,
        day,
        inTime,
        lunchOut,
        lunchIn,
        outTime,
        casualType,
        leaveType,
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
    // Get today's date string in format YYYY-MM-DD
    const todayDate = new Date().toISOString().split('T')[0];

    const cutoffTime = "09:15";

    // Fetch all staff members
    const allStaff = await Staff.find();

    // Fetch all attendance records for today
    const todaysAttendance = await Attendance.find({ date: todayDate });

    // Set of present staff IDs
    const presentIds = new Set(todaysAttendance.map(a => a.id));

    // Array of presents with required info
    const presents = todaysAttendance.map(att => ({
      id: att.id,
      name: att.name,
      inTime: att.inTime,
      day: att.day,
      lunchIn: att.lunchIn,
      lunchOut: att.lunchOut,
      outTime: att.outTime,
      casualType: att.casualType,
      leaveType: att.leaveType,
    }));

    // Late comers are those with inTime > cutoffTime
    const lateComers = presents.filter(att => att.inTime && att.inTime > cutoffTime);

    // Staff who are absent (staff with no attendance record today)
    const absents = allStaff.filter(staff => !presentIds.has(staff.id)).map(st => ({
      id: st.id,
      name: st.name,
      department: st.department,
      designation: st.designation,
    }));

    // Respond with counts and detailed arrays
    res.json({
      count: {
        presents: presents.length,
        absents: absents.length,
        lateComers: lateComers.length,
      },
      presents,
      absents,
      lateComers,
    });
  } catch (err) {
    console.error("Error fetching today's attendance:", err);
    res.status(500).json({ error: "Server error" });
  }
});




module.exports = router;
