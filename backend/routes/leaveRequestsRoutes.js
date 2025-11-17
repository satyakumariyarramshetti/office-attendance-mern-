// routes/leaveRequestsRoutes.js
const express = require('express');
const router = express.Router();
const LeaveRequest = require('../models/LeaveRequest');

// ✅ Create new leave request
// ✅ Create new leave request
router.post('/create', async (req, res) => {
  try {
    const { id, name, email, dates, reportsTo } = req.body; // <-- include reportsTo

    if (!id || !name || !email || !dates || !Array.isArray(dates)) {
      return res.status(400).json({ success: false, message: 'Invalid input' });
    }

    // ✅ Format dates into proper structure
    const formattedDates = dates.map(date => ({
      date,
      status: 'pending',
      updatedBy: 'Admin'
    }));

    const leaveReq = new LeaveRequest({
      id,
      name,
      email,
      reportsTo, // <-- add this here
      dates: formattedDates,
    });

    await leaveReq.save();
    res.status(201).json({ success: true, data: leaveReq });
  } catch (error) {
    console.error('Error saving leave request:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});



// ✅ Get leaves by status (pending, approved, rejected)
router.get('/:status', async (req, res) => {
  try {
    const { status } = req.params;
    const leaveRequests = await LeaveRequest.find();
const rows = leaveRequests.flatMap(req =>
  req.dates
    .filter(d => d.status === status)
    .map(d => ({
      id: req.id,
      name: req.name,
      email: req.email,
      reportsTo: req.reportsTo,
      date: d.date,
      status: d.status
    }))
);


    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ✅ Update leave status (for Admin and HR)
router.put('/update-status', async (req, res) => {
  try {
    const { id, date, status, updatedBy } = req.body;

    if (!id || !date || !status) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    const leaveReq = await LeaveRequest.findOneAndUpdate(
      { id, 'dates.date': date },
      {
        $set: {
          'dates.$.status': status,
          'dates.$.updatedBy': updatedBy || 'Admin'
        }
      },
      { new: true }
    );

    if (!leaveReq) {
      return res.status(404).json({ success: false, message: 'Leave request not found' });
    }

    // ✅ Notification sending removed

    res.json({ success: true, data: leaveReq });
  } catch (error) {
    console.error('Error updating leave status:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
