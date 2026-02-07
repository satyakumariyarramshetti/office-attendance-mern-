const mongoose = require('mongoose');

const leaveRequestSchema = new mongoose.Schema({
  id: String,
  name: String,
  email: String,
  reportsTo: String, 
  leaveReason: String, // <-- Add this

  dates: [
    {
      date: String,
      status: { type: String, default: 'pending' },
      updatedBy: { type: String, default: 'Admin' }
    }
  ]
});

module.exports = mongoose.model('LeaveRequest', leaveRequestSchema);
