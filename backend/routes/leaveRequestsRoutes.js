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
    const leaveRequests = await LeaveRequest.find({ status });

    // Flatten multiple dates for easy table display
    const rows = leaveRequests.flatMap(req =>
      req.dates.map(date => ({
        id: req.id,
        name: req.name,
        phone: req.phone,
        date,
        status: req.status
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
    const { id, status } = req.body;
    const updated = await LeaveRequest.findOneAndUpdate(
      { id },
      { status },
      { new: true }
    );
    if (!updated) return res.status(404).json({ success: false, message: 'Leave not found' });
    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
