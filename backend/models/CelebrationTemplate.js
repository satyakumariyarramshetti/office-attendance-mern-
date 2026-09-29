// backend/models/CelebrationTemplate.js
const mongoose = require('mongoose');

const celebrationTemplateSchema = new mongoose.Schema({
  type: { 
    type: String, 
    required: true, 
    unique: true, 
    enum: ['birthday', 'anniversary'] 
  },
  messageBody: { 
    type: String, 
    required: true 
  },
  defaultMessageBody: { 
    type: String, 
    required: true 
  }
});

module.exports = mongoose.model('CelebrationTemplate', celebrationTemplateSchema);