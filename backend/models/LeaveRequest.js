// models/LeaveRequest.js
const mongoose = require('mongoose');

const leaveRequestSchema = new mongoose.Schema({
  id: String,
  name: String,
  phone: String,
  dates: [String]  // or [Date] depending on your needs
});

module.exports = mongoose.model('LeaveRequest', leaveRequestSchema);
