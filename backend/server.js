//backend/server.js
require('dotenv').config();

// Log environment variables
console.log('SMTP_USER:', process.env.SMTP_USER ? 'Set' : 'Not Set');
console.log('SMTP_PASS:', process.env.SMTP_PASS ? 'Set' : 'Not Set');
console.log('ATLAS_URI:', process.env.ATLAS_URI ? 'Set' : 'Not Set');



const express = require('express');
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);
const mongoose = require('mongoose');
require("./config/newDatabase");
const cors = require('cors');
const bodyParser = require('body-parser');
const { sendLeaveStatusEmail } = require("./utils/mailer");


// Routes
const attendanceRoutes = require('./routes/attendanceRoutes');
const activityReminderRoutes = require("./routes/activityReminderRoutes");
const staffRoutes = require('./routes/staffRoutes');
// const payslipRoutes = require('./routes/payslipRoutes');
const leaveBalanceRoutes = require('./routes/leaveBalanceRoutes');
const leaveRequestsRoutes = require('./routes/leaveRequestsRoutes');
const userRoutes = require('./routes/userRoutes'); // ఈ లైన్ యాడ్ చేయండి
const celebrationRoutes = require('./routes/celebrationRoutes'); 
const startCelebrationCron = require('./utils/celebrationCron'); 
const { sendCelebrationMail } = require('./utils/celebrationMailer');
const { buildBirthdayEmail, buildAnniversaryEmail } = require('./utils/celebrationEmailTemplate');

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
// app.use('/api/payslip', payslipRoutes);
app.use('/api/leave-balance', leaveBalanceRoutes);
app.use('/api/leave-requests', leaveRequestsRoutes);
app.use('/api/users', userRoutes); // ఈ లైన్ యాడ్ చేయండి
app.use(
 "/api/activity-reminder",
 activityReminderRoutes
);
app.use('/api/celebrations', celebrationRoutes);

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

// Test: /test-celebration-mail?to=you@gmail.com&type=birthday  (or anniversary)
app.get('/test-celebration-mail', async (req, res) => {
  const to = req.query.to || process.env.CELEB_SENDER_EMAIL;
  const type = req.query.type === 'anniversary' ? 'anniversary' : 'birthday';
  try {
    const html = type === 'birthday'
      ? buildBirthdayEmail({ name: 'Test User', message: 'This is a sample birthday message.\n\nSecond paragraph here.' })
      : buildAnniversaryEmail({ name: 'Test User', message: 'This is a sample anniversary message.\n\nSecond paragraph here.', yearsCompleted: 3 });
    await sendCelebrationMail(to, `Test ${type} mail`, html, 'Test celebration mail');
    res.status(200).send(`Celebration ${type} mail sent to ${to}`);
  } catch (err) {
    console.error('Test celebration mail failed:', err);
    res.status(500).send('Failed: ' + err.message);
  }
});



app.post('/api/admin/login', (req, res) => {
    const { username, password } = req.body;

    const envUsername = process.env.ADMIN_USERNAME;
    const envPassword = process.env.ADMIN_PASSWORD;

    if (username === envUsername && password === envPassword) {
        // Success: Oka message or token pampandi
        res.status(200).json({ success: true, message: "Login Successful" });
    } else {
        // Failure
        res.status(401).json({ success: false, message: "Invalid Credentials" });
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
    
    // 👇 ఈ కింది లైన్ యాడ్ చేయండి. అప్పుడే వార్నింగ్ పోతుంది & రోజూ 10 గంటలకి మెయిల్స్ వెళ్తాయి.
    startCelebrationCron(); 
    
    app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
  })
  .catch(err => console.error('❌ MongoDB connection error:', err));
