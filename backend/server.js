require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
const attendanceRoutes = require('./routes/attendanceRoutes');

// 🔹 NEW: Import staff routes
const staffRoutes = require('./routes/staffRoutes');

const app = express();
const PORT = 5000;

app.use(cors());
app.use(bodyParser.json());
app.use('/api/attendance', attendanceRoutes);

// 🔹 NEW: Hook up staff API
app.use('/api/staffs', staffRoutes);

const uri = process.env.ATLAS_URI;

mongoose.connect(uri)
.then(() => {
  console.log('MongoDB connected successfully');
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
})
.catch(err => console.error('MongoDB connection error:', err));
