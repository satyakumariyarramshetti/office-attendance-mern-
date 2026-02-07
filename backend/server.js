require('dotenv').config();

// Log environment variables
console.log('SMTP_USER:', process.env.SMTP_USER ? 'Set' : 'Not Set');
console.log('SMTP_PASS:', process.env.SMTP_PASS ? 'Set' : 'Not Set');
console.log('ATLAS_URI:', process.env.ATLAS_URI ? 'Set' : 'Not Set');
console.log('BREVO_API_KEY:', process.env.BREVO_API_KEY ? 'Set' : 'Not Set');
console.log("BREVO KEY RAW:", process.env.BREVO_API_KEY);



const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
const { sendLeaveStatusEmail } = require("./utils/mailer");


// Routes
const attendanceRoutes = require('./routes/attendanceRoutes');
const staffRoutes = require('./routes/staffRoutes');
const payslipRoutes = require('./routes/payslipRoutes');
const leaveBalanceRoutes = require('./routes/leaveBalanceRoutes');
const leaveRequestsRoutes = require('./routes/leaveRequestsRoutes');
// ADD THIS LINE

// Express setup
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

// Put this after your API routes (before DB connect)
app.get("/test-mail", async (req, res) => {
  const to = req.query.to || process.env.EMAIL_USER; // default to your verified sender
  const subject = "Test Email from Attendance System";
  const body = `This is a test email sent at ${new Date().toISOString()}`;

  try {
    await sendLeaveStatusEmail(to, subject, body);
    res.status(200).send(`Mail Sent to ${to}`);
  } catch (err) {
    console.error("Test-mail failed:", err);
    res.status(500).send("Failed: " + (err && err.message ? err.message : String(err)));
  }
});


// MongoDB connection
const uri = process.env.ATLAS_URI;

mongoose.connect(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => {
    console.log('✅ MongoDB connected successfully');
    app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
  })
  .catch(err => console.error('❌ MongoDB connection error:', err));
