// routes/leaveRequestsRoutes.js
const express = require('express');
const router = express.Router();
const LeaveRequest = require('../models/LeaveRequest'); // Ensure you've defined a schema/model

router.post('/create', async (req, res) => {
  try {
    const leaveReq = new LeaveRequest(req.body);
    await leaveReq.save();
    res.status(201).json({ success: true, data: leaveReq });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});


router.get('/pending', async (req, res) => {
  try {
    const leaveRequests = await LeaveRequest.find(); // Optionally filter only pending ones
    // Flatten requests: for each date in a request, make a separate object/row
    const rows = leaveRequests.flatMap(req =>
      req.dates.map(date => ({
        id: req.id,
        name: req.name,
        phone: req.phone,
        date,
        status: req.status || 'pending' // If you use a status field
      }))
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
