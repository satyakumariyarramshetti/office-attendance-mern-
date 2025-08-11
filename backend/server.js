// require('dotenv').config();
// const express = require('express');
// const mongoose = require('mongoose');
// const cors = require('cors');
// const bodyParser = require('body-parser');

// const attendanceRoutes = require('./routes/attendanceRoutes');
// const staffRoutes = require('./routes/staffRoutes');

// const app = express();
// const PORT = 5000;

// app.use(cors()); // Only for testing!

// // ✅ Proper CORS for Vercel
// // app.use(cors({
// //   origin: ['https://office-attendance-six.vercel.app'],
// //   methods: ['GET', 'POST', 'PUT', 'DELETE'],
// //   credentials: true,
// // }));

// app.use(bodyParser.json());
// app.use('/api/attendance', attendanceRoutes);
// app.use('/api/staffs', staffRoutes);

// // ✅ Root route for health check
// app.get('/', (req, res) => {
//   res.send('Server is up and running');
// });

// const uri = process.env.ATLAS_URI;
// app.get('/', (req, res) => {
//   res.send('API is running...');
// });

// mongoose.connect(uri)
// .then(() => {
//   console.log('MongoDB connected successfully');
//   app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
// })
// .catch(err => console.error('MongoDB connection error:', err));

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


app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

app.use(cors());
app.use(bodyParser.json());
app.use('/api/attendance', attendanceRoutes);

// 🔹 NEW: Hook up staff API
app.use('/api/staffs', staffRoutes);

const uri = process.env.ATLAS_URI;

// At the top with your other routes:


mongoose.connect(uri)
.then(() => {
  console.log('MongoDB connected successfully');
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
})
.catch(err => console.error('MongoDB connection error:', err));