// models/LeaveRequest.js
const mongoose = require('mongoose');

const leaveRequestSchema = new mongoose.Schema({
  id: String,
  name: String,
  phone: String,
  dates: [String],  // multiple leave dates
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  }
});

module.exports = mongoose.model('LeaveRequest', leaveRequestSchema);
