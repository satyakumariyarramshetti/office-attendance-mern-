const mongoose = require('mongoose');

const leaveRequestSchema = new mongoose.Schema({
  id: String,
  name: String,
  phone: String,
  dates: [
    {
      date: String,
      status: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending'
      }
    }
  ]
});

module.exports = mongoose.model('LeaveRequest', leaveRequestSchema);
