// routes/leaveRequestsRoutes.js
const express = require('express');
const router = express.Router();
const LeaveRequest = require('../models/LeaveRequest');
const { sendLeaveStatusEmail } = require('../utils/mailer'); // Mail utility import

// Create new leave request
router.post('/create', async (req, res) => {
  try {
    const { id, name, email, dates, reportsTo } = req.body; 

    if (!id || !name || !email || !dates || !Array.isArray(dates)) {
      return res.status(400).json({ success: false, message: 'Invalid input' });
    }

    const formattedDates = dates.map(date => ({
      date,
      status: 'pending',
      updatedBy: 'Admin'
    }));

    const leaveReq = new LeaveRequest({
      id,
      name,
      email,
      reportsTo,
      dates: formattedDates,
    });

    await leaveReq.save();
    res.status(201).json({ success: true, data: leaveReq });
  } catch (error) {
    console.error('Error saving leave request:', error);
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

// Update leave status (for Admin and HR) and send notification email asynchronously
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

    // Compose mail based on status
    const empName = leaveReq.name;
    const empEmail = leaveReq.email;
    const formattedDate = date;
    let subject, body;

    if (status === 'approved') {
      subject = `Leave Approved – ${empName}`;
      body = `Dear ${empName},

Your leave request dated for ${formattedDate} has been reviewed and approved.

Please ensure that all pending tasks are handed over appropriately and your responsibilities are managed during your absence.

If there are any changes to your leave plan, kindly inform us in advance.

Regards,
Praxsol Engineering Private Limited`;
    } else if (status === 'rejected') {
      subject = `Leave Request – Not Approved`;
      body = `Dear ${empName},

We have reviewed your leave request for ${formattedDate}.

Unfortunately, we are unable to approve your leave at this time due to [Reason: ongoing project workload / urgent deliverables / insufficient leave balance / staffing constraints].

You may apply again once the situation allows.

If you need further clarification, feel free to reach out.

Regards,
Praxsol Engineering Private Limited`;
    }

    // Respond to client immediately after DB update
    res.json({ success: true, data: leaveReq });

    // Then send mail asynchronously, no await here
    sendLeaveStatusEmail(empEmail, subject, body)
      .then(() => console.log('Leave status email sent'))
      .catch(err => console.error('Failed to send leave status email', err));

  } catch (error) {
    console.error('Error updating leave status:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
