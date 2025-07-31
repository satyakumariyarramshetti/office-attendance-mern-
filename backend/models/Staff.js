const mongoose = require('mongoose');

const staffSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  department: { type: String },  // no 'required'
  designation: { type: String, required: true },
  gender: { 
    type: String, 
    required: true,
    enum: ['Male', 'Female', 'Other']
  }
});

module.exports = mongoose.model('Staff', staffSchema);
