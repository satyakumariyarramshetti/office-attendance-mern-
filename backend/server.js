require('dotenv').config();

// Log environment variables
console.log('SMTP_USER:', process.env.SMTP_USER ? 'Set' : 'Not Set');
console.log('SMTP_PASS:', process.env.SMTP_PASS ? 'Set' : 'Not Set');
console.log('ATLAS_URI:', process.env.ATLAS_URI ? 'Set' : 'Not Set');

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
