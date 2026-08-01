const mongoose = require('mongoose');

const HolidaySchema = new mongoose.Schema({
  date: { type: String, required: true, unique: true }, // Format: YYYY-MM-DD
  name: { type: String, required: true },
  type: { type: String, default: 'Festival' } // 'Fixed' or 'Festival'
});

module.exports = mongoose.model('Holiday', HolidaySchema);
