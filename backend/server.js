require('dotenv').config();

// Log environment variables
console.log('SMTP_USER:', process.env.SMTP_USER ? 'Set' : 'Not Set');
console.log('SMTP_PASS:', process.env.SMTP_PASS ? 'Set' : 'Not Set');
console.log('ATLAS_URI:', process.env.ATLAS_URI ? 'Set' : 'Not Set');
console.log('ULTRA_INSTANCE_ID:', process.env.ULTRA_INSTANCE_ID ? 'Set' : 'Not Set');
console.log('ULTRA_TOKEN:', process.env.ULTRA_TOKEN ? 'Set' : 'Not Set');

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');

// Routes
const attendanceRoutes = require('./routes/attendanceRoutes');
const staffRoutes = require('./routes/staffRoutes');
const payslipRoutes = require('./routes/payslipRoutes'); 
const leaveBalanceRoutes = require('./routes/leaveBalanceRoutes');
const leaveRequestsRoutes = require('./routes/leaveRequestsRoutes');

// WhatsApp client (Green API)
const whatsAppClient = require("@green-api/whatsapp-api-client");

// Initialize REST API client safely
let restAPI;
try {
  if (!process.env.ULTRA_INSTANCE_ID || !process.env.ULTRA_TOKEN) {
    console.warn("⚠️ WhatsApp API credentials missing. /test-whatsapp will not work until ULTRA_INSTANCE_ID and ULTRA_TOKEN are set in .env");
  } else {
    restAPI = whatsAppClient.restAPI({
      idInstance: process.env.ULTRA_INSTANCE_ID,
      apiTokenInstance: process.env.ULTRA_TOKEN,
    });
  }
} catch (err) {
  console.error("Error initializing WhatsApp client:", err);
}

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Health check
app.get('/health', (req, res) => res.status(200).send('OK'));

// API routes
app.use('/api/attendance', attendanceRoutes);
app.use('/api/staffs', staffRoutes);
app.use('/api/payslip', payslipRoutes);
app.use('/api/leave-balance', leaveBalanceRoutes);
app.use('/api/leave-requests', leaveRequestsRoutes);

// WhatsApp test route
app.get("/test-whatsapp", async (req, res) => {
  if (!restAPI) {
    return res.status(500).json({ success: false, error: "WhatsApp client not initialized" });
  }

  try {
    const chatId = "919347914208@c.us"; // Replace with your number
    const message = "✅ Test message from your attendance system backend!";

    // Send message
    const response = await restAPI.message.sendMessage(chatId, null, message);
    return res.json({ success: true, response });
  } catch (error) {
    console.error("Error sending WhatsApp message:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// MongoDB connection
const uri = process.env.ATLAS_URI;

mongoose.connect(uri, { 
  useNewUrlParser: true, 
  useUnifiedTopology: true 
})
.then(() => {
  console.log('✅ MongoDB connected successfully');
  app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
})
.catch(err => console.error('❌ MongoDB connection error:', err));
