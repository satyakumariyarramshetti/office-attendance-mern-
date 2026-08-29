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


router.get('/seed', async (req, res) => {
  const dummyStaff = [
    { id: "101", identification: "pass123", name: "Arjun", department: "Piping", designation: "Engineer", email: "arjun@example.com" },
    { id: "102", identification: "pass456", name: "Priya", department: "Common", designation: "HR", email: "priya@example.com" },
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


router.post('/', async (req, res) => {
  try {
const newStaff = new Staff({
  ...req.body,

  designationHistory: [
    {
      designation: req.body.designation,
      from: new Date(req.body.designationFrom + "-01")
    }
  ]
});
  await newStaff.save();
    res.json({ message: "✅ Staff added successfully!" });
  } catch (error) {
    console.error("❌ Error adding staff:", error);
    if (error.code === 11000) {
      // ఇక్కడ Staff ID లేదా Identification రెండింటిలో ఏది డూప్లికేట్ అయినా ఈ ఎర్రర్ వస్తుంది
      const field = Object.keys(error.keyPattern)[0];
      return res.status(400).json({ error: `${field} already exists. Please use a unique value.` });
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
// POST: fetch staff name and email by exact full staff ID
// POST: fetch staff name and email by exact full staff ID
router.post('/getById', async (req, res) => {
  const id = String(req.body.id || '').trim();
  if (!id) {
    return res.status(400).json({ error: 'ID is required' });
  }
  try {
    const staff = await Staff.findOne({ id });
    if (staff) {
      // 🔴 ఈ కొత్త చెక్ యాడ్ చేయండి
      if (staff.status === "Inactive employee") {
        return res.status(403).json({ error: 'Access Denied: Your account is Inactive. Attendance not allowed.' });
      }

      res.json({
        id: staff.id,
        name: staff.name,
        email: staff.email,
        reportsTo: staff.reportsTo
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
    // 🔴 కేవలం Active లో ఉన్న వారిని మాత్రమే వెతకాలి
    const staffList = await Staff.find({ status: { $ne: "Inactive employee" } });

    const foundStaff = staffList.find(staff => {
      const digitsOnly = staff.id.replace(/\D/g, ''); 
      return digitsOnly.endsWith(partialId);
    });

    if (!foundStaff) {
      return res.status(404).json({ error: 'Active Staff not found' });
    }

    res.json({ id: foundStaff.id, name: foundStaff.name });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});


router.put("/:id", async (req, res) => {
  try {
    const { 
      identification, 
      designation, 
      designationFrom, 
      designationHistory,
      name,
      department,
      email,
      phone,
      reportsTo,
      status,
      activityRequired,
      inactivationDate,
      dob,
      onboardingDate 
    } = req.body;

    // 1. Identification Unique చెక్ (ID వేరే వాళ్లకి ఉందో లేదో చూడటానికి)
    if (identification) {
      const existingStaff = await Staff.findOne({
        identification,
        _id: { $ne: req.params.id }
      }).select("_id");

      if (existingStaff) {
        return res.status(400).json({
          error: "Identification already exists for another staff member."
        });
      }
    }

    // 2. Staff మెంబర్ ని డేటాబేస్ నుండి వెతకడం
    const staff = await Staff.findById(req.params.id);
    if (!staff) return res.status(404).json({ error: "Staff not found" });

    // 3. DESIGNATION HISTORY UPDATE (ముఖ్యమైన భాగం)
    // Frontend నుండి అప్డేట్ అయిన హిస్టరీ (Deleted/Edited) వస్తే దాన్ని ముందుగా సేవ్ చేస్తాం
    if (designationHistory) {
      staff.designationHistory = designationHistory;
    }

    // 4. ఒకవేళ మెయిన్ Designation ఫీల్డ్ లో పేరు మారిస్తే..
    // ఆ కొత్త పేరు హిస్టరీలో యాడ్ అవ్వాలి (కానీ డూప్లికేట్ కాకుండా చెక్ చేస్తాం)
    if (designation && designation.trim() !== staff.designation) {
      
      // ఒకవేళ ఈ మార్పు ఆల్రెడీ హిస్టరీలో మనం మాన్యువల్ గా చేసిన మార్పు కాకపోతేనే కొత్తది పుష్ చేస్తాం
      const isAlreadyInHistory = staff.designationHistory.some(h => 
        h.designation === designation && 
        designationFrom && new Date(h.from).toISOString().startsWith(designationFrom)
      );

      if (!isAlreadyInHistory) {
        staff.designationHistory.push({
          designation: designation.trim(),
          from: designationFrom ? new Date(`${designationFrom}-01`) : new Date()
        });
      }
      
      staff.designation = designation.trim();
    }

    // 5. మిగతా సాధారణ ఫీల్డ్స్ అప్డేట్
    staff.name = name;
    staff.department = department;
    staff.email = email;
    staff.phone = phone;
    staff.identification = identification;
    staff.reportsTo = reportsTo;
    staff.status = status;
    staff.activityRequired = activityRequired;
    staff.inactivationDate = inactivationDate;
    
    if (dob) staff.dob = dob;
    if (onboardingDate) staff.onboardingDate = onboardingDate;

    // 6. సేవ్ చేయడం
    await staff.save();

    res.json({
      message: "✅ Staff updated successfully!",
      updatedStaff: staff
    });

  } catch (error) {
    console.error("Update Error:", error);
    if (error.code === 11000) {
      return res.status(400).json({ error: "Duplicate error: ID or Identification already exists." });
    }
    res.status(500).json({ error: "Error updating staff" });
  }
});



module.exports = router;
