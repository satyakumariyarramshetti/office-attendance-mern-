const mongoose = require('mongoose');

const staffSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
   identification: { type: String, required: true, unique: true },
  department: { type: String },
  designation: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String },
  reportsTo: { type: String }, 
  dob: { type: Date },            
  onboardingDate: { type: Date },  
  status: { type: String, default: "Active Employee" } 
});


const Staff = mongoose.model('Staff', staffSchema);

console.log("✅ Staff model loaded — phone field active"); // 👈 Add this here

module.exports = Staff;
