const mongoose = require('mongoose');

const leaveRequestSchema = new mongoose.Schema({
  id: String,
  name: String,
  phone: String,
  dates: [
  {
    date: String,
    status: { type: String, default: 'pending' },
    updatedBy: { type: String, default: 'Admin' } // 👈 add this line
  }
]

});

module.exports = mongoose.model('LeaveRequest', leaveRequestSchema);
