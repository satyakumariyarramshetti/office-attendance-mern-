const mongoose = require('mongoose');

const AttendanceSchema = new mongoose.Schema({
  id: { type: String, required: true },
  name: { type: String, required: true },
  date: { type: String, required: true },
  day: { type: String, required: true },
  inTime: { type: String },
  inTimeMethod: { type: String }, 
  systemInTime: { type: String }, 
  delayReason: { type: String, default: null },
  lunchIn: { type: String },
  lunchOut: { type: String },
  outTime: { type: String },
  permissionType: { type: String }, 
  hours: { type: String, default: '' },  
  dailyLeaveType: { type: String ,default:null}, 
  leaveType: { type: String,default:null },
  halfDayReason: { type: String,default:null },
  location: { type: String },
  // --- NEW FIELD ---
  // This flag will be true if the leave was taken without a positive balance.
  isLOP: { type: Boolean, default: false },
});


// 1. పాత ఇండెక్స్ (ఇది డూప్లికేట్స్ రాకుండా చూస్తుంది)
AttendanceSchema.index({ id: 1, date: 1 }, { unique: true });

// 2. కొత్త ఇండెక్స్ (లీవ్ సమ్మరీ ఫాస్ట్ అవ్వడానికి)
// ఇది కేవలం 'leaveType' ఖాళీగా లేని రికార్డ్స్ ని మాత్రమే ఇండెక్స్ చేస్తుంది (Partial Index)
// దీనివల్ల డేటాబేస్ సైజ్ పెరగదు కానీ సెర్చ్ సూపర్ ఫాస్ట్ అవుతుంది.
AttendanceSchema.index(
  { id: 1, leaveType: 1, date: -1 }, 
  { 
    partialFilterExpression: { leaveType: { $gt: null } } 
  }
);
module.exports = mongoose.model('Attendance', AttendanceSchema);
