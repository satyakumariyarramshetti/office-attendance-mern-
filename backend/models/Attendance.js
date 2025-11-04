const mongoose = require('mongoose');

const AttendanceSchema = new mongoose.Schema({
  id: { type: String, required: true },
  name: { type: String, required: true },
  date: { type: String, required: true },
  day: { type: String, required: true },
  inTime: { type: String },
  inTimeMethod: { type: String }, 
  delayReason: { type: String, default: null },
  lunchIn: { type: String },
  lunchOut: { type: String },
  outTime: { type: String },
  permissionType: { type: String }, 
  hours: { type: String, default: '' },  
  dailyLeaveType: { type: String ,default:null}, 
  leaveType: { type: String,default:null },
  location: { type: String },
  // --- NEW FIELD ---
  // This flag will be true if the leave was taken without a positive balance.
  isLOP: { type: Boolean, default: false },
});

AttendanceSchema.index({ id: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('Attendance', AttendanceSchema);
