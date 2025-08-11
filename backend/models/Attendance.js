const mongoose = require('mongoose');

const AttendanceSchema = new mongoose.Schema({
  id: { type: String, required: true },
  name: { type: String, required: true },
  date: { type: String, required: true },
  day: { type: String, required: true },
  inTime: { type: String },
  lunchIn: { type: String },
  lunchOut: { type: String },
  outTime: { type: String },
  permissionType: { type: String }, // For permission reason
  hours: { type: String },           // For permission hours
  leaveType: { type: String },
  location: { type: String },
});

AttendanceSchema.index({ id: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('Attendance', AttendanceSchema);