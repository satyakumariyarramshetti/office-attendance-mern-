const mongoose = require('mongoose');

const staffSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  department: { type: String },
  designation: { type: String, required: true },
  gender: {
    type: String,
    required: true,
    enum: ['Male', 'Female', 'Other']
  },
  phone: { type: String } // ✅ Added this line
});

const Staff = mongoose.model('Staff', staffSchema);

console.log("✅ Staff model loaded — phone field active"); // 👈 Add this here

module.exports = Staff;
