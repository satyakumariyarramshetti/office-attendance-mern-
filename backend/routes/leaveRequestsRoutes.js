// routes/leaveRequestsRoutes.js
const express = require('express');
const router = express.Router();
const LeaveRequest = require('../models/LeaveRequest');

// Create new leave request
router.post('/create', async (req, res) => {
  try {
    const leaveReq = new LeaveRequest(req.body);
    await leaveReq.save();
    res.status(201).json({ success: true, data: leaveReq });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get leaves by status (pending, approved, rejected)
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
          phone: req.phone,
          date: d.date,
          status: d.status
        }))
    );

    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});


// Approve or reject leave
router.put('/update-status', async (req, res) => {
  try {
    const { id, date, status } = req.body;

    const leaveRequest = await LeaveRequest.findOne({ id });
    if (!leaveRequest) {
      return res.status(404).json({ success: false, message: 'Leave not found' });
    }

    // Find the specific date entry and update its status
    const targetDate = leaveRequest.dates.find(d => d.date === date);
    if (!targetDate) {
      return res.status(404).json({ success: false, message: 'Date not found' });
    }

    targetDate.status = status;
    await leaveRequest.save();

    res.json({ success: true, data: leaveRequest });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});


module.exports = router;
