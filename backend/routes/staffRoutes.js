const express = require('express');
const router = express.Router();
const Staff = require('../models/Staff');
 

// 🔹 GET: All staff entries
router.get('/', async (req, res) => {
  try {
    const staffList = await Staff.find();
    res.json(staffList); // frontend expects JSON
  } catch (error) {
    console.error("❌ Error fetching staff:", error);
    res.status(500).json({ error: "Error retrieving staff" });
  }
});


// 🔹 GET: Seed dummy staff entries (insert only missing entries)
router.get('/seed', async (req, res) => {
  const dummyStaff = [
  { id: "101", name: "Arjun", department: "Piping", designation: "Engineer", email: "arjun@example.com" },
  { id: "102", name: "Priya", department: "Common", designation: "HR", email: "priya@example.com" },
  
];


  try {
    const existingStaff = await Staff.find({ id: { $in: dummyStaff.map(s => s.id) } }).select('id');
    const existingIdSet = new Set(existingStaff.map(s => s.id));
    const staffToInsert = dummyStaff.filter(s => !existingIdSet.has(s.id));

    if (staffToInsert.length > 0) {
      const inserted = await Staff.insertMany(staffToInsert);
      console.log("✅ Seeded staff:", inserted);
      res.json({ message: "✅ Staff seeded successfully for missing entries" });
    } else {
      res.json({ message: "⚠️ Seed skipped — all dummy staff already exist" });
    }
  } catch (error) {
    console.error("❌ Error inserting staff:", error);
    res.status(500).json({ error: "Error seeding staff" });
  }
});


// 🔹 POST: Add new staff entry
router.post('/', async (req, res) => {
  try {
    console.log("📥 Received data from frontend:", req.body);

    const newStaff = new Staff(req.body);
    await newStaff.save();
    res.json({ message: "✅ Staff added successfully!" });
  } catch (error) {
    console.error("❌ Error adding staff:", error);
    if (error.name === "ValidationError") {
      return res.status(400).json({ error: error.message });
    }
    if (error.code === 11000) {
      return res.status(400).json({ error: "Staff ID already exists" });
    }
    res.status(500).json({ error: "Error adding staff" });
  }
});


// 🗑️ DELETE: Remove a staff entry by MongoDB _id
router.delete('/:id', async (req, res) => {
  try {
    const removed = await Staff.findByIdAndDelete(req.params.id);
    if (!removed) return res.status(404).json({ error: "Staff member not found" });
    res.json({ message: "🗑️ Staff member removed successfully" });
  } catch (error) {
    console.error("❌ Error removing staff:", error);
    res.status(500).json({ error: "Error removing staff" });
  }
});


// POST: fetch staff name and email by exact full staff ID
router.post('/getById', async (req, res) => {
  const id = String(req.body.id || '').trim();
  if (!id) {
    return res.status(400).json({ error: 'ID is required' });
  }
  try {
    const staff = await Staff.findOne({ id });
    if (staff) {
      // ✅ Send both name and email
      res.json({
        id: staff.id,
        name: staff.name,
        email: staff.email
      });
    } else {
      res.status(404).json({ error: 'Staff not found' });
    }
  } catch (error) {
    console.error('Error fetching staff:', error);
    res.status(500).json({ error: 'Server error' });
  }
});



// 🔍 GET: Search staff by last 3 digits of employee ID
router.get('/search/:partialId', async (req, res) => {
  const partialId = req.params.partialId;
  if (!partialId || partialId.length !== 3) {
    return res.status(400).json({ error: 'Partial ID must be exactly 3 characters' });
  }
  try {
    const staffList = await Staff.find();

    // Find staff where numeric substring matching last 3 digits equals partialId
    const foundStaff = staffList.find(staff => {
      // Extract digits only, ignore non-digits
      const digitsOnly = staff.id.replace(/\D/g, ''); // e.g. 'PS-0003' -> '0003'
      return digitsOnly.endsWith(partialId);
    });

    if (!foundStaff) {
      return res.status(404).json({ error: 'Staff not found' });
    }

    res.json({ id: foundStaff.id, name: foundStaff.name });
  } catch (err) {
    console.error('Error searching by partial ID:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// 🔹 PUT: Update staff details
router.put('/:id', async (req, res) => {
  try {
    const updatedStaff = await Staff.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!updatedStaff) return res.status(404).json({ error: "Staff not found" });
    res.json({ message: "✅ Staff updated successfully!", updatedStaff });
  } catch (error) {
    console.error("❌ Error updating staff:", error);
    res.status(500).json({ error: "Error updating staff" });
  }
});






module.exports = router;
