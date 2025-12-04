
const express = require('express');
const router = express.Router();
const axios = require('axios');
const Attendance = require('../models/Attendance');
const Staff = require('../models/Staff');
const LeaveBalance = require('../models/LeaveBalance');
// ---- COMPANY HOLIDAYS  month+day----
const holidays = [
  { date: "-01-26", name: "Republic Day" },
  { date: "-08-15", name: "Independence Day" },
  { date: "-10-02", name: "Gandhi Jayanti" },

  // Festival Holidays
  { date: "-01-14", name: "Sankranti / Pongal" },
  { date: "-06-07", name: "Bakrid" },
  { date: "-12-25", name: "Christmas" },
  { date: "-10-20", name: "Dussehra" }
];



/* ------------------------------------------------------------------
   Reverse geocoding helper (unchanged)
------------------------------------------------------------------ */
async function getAddressFromCoordinates(locationString) {
  if (!locationString) return null;
  try {
    const [lat, lon] = locationString.split(',').map(s => s.trim());
    const apiKey = process.env.OPENCAGE_API_KEY;
    const apiUrl = `https://api.opencagedata.com/geocode/v1/json?q=${lat}+${lon}&key=${apiKey}&pretty=1&no_annotations=1`;
    const response = await axios.get(apiUrl);
    if (response.data && response.data.results && response.data.results.length > 0) {
      return response.data.results[0].formatted;
    }
    return locationString;
  } catch (error) {
    console.error("Reverse geocoding failed:", error.message);
    return locationString;
  }
}

// Half‑day deduction helper for Sick / Casual / Privilege
function deductHalfDayPriority(b, primaryType) {
  // b = LeaveBalance document
  // primaryType is one of: 'Sick', 'Casual', 'Privilege'

  const fields = {
    Sick: 'sickLeaves',
    Casual: 'casualLeaves',
    Privilege: 'privilegeLeaves',
  };

  const order = {
    Sick:      ['sickLeaves', 'casualLeaves', 'privilegeLeaves'],
    Casual:    ['casualLeaves', 'privilegeLeaves'],
    Privilege: ['privilegeLeaves', 'casualLeaves'],
  };

  let isLOP = false;

  for (const field of order[primaryType]) {
    if (b[field] > 0) {
      b[field] -= 0.5;
      return { isLOP: false };
    }
  }

  // No balance anywhere → make primary field negative
  const primaryField = fields[primaryType];
  b[primaryField] -= 0.5;
  isLOP = true;

  return { isLOP };
}


/* ------------------------------------------------------------------
   Leave balance update helper (kept intact)
   NOTE: Called ONLY when a full-day leaveType is submitted.
------------------------------------------------------------------ */
async function updateLeaveBalance(employeeId, leaveType, options = {}) {
  const { halfDayReason } = options;  
  
  try {
    const b = await LeaveBalance.findOne({ employeeId });
    if (!b) {
      return { success: false, message: 'Employee not found in leave balance records.' };
    }

    let isLOP = false;
    let message = `${leaveType} recorded successfully.`;

    // Leave types that SHOULD NOT deduct anything
    if (
      leaveType.startsWith('C-Off Leave') ||
      leaveType === 'Travel Leave' ||
      leaveType === 'Client/Site Visit' ||
      leaveType === 'Over-Time Leave'
    ) {
      return {
        success: true,
        name: b.name,
        message,
        isLOP: false
      };
    }

  /* -------------------------------------------------------------
   HALF DAY LEAVES (First / Second Half)
   Reason must be: Sick Leave / Casual Leave / Privilege Leave
   Priority:
   - Sick:      Sick → Casual → Privilege → Sick negative
   - Casual:    Casual → Privilege → Casual negative
   - Privilege: Privilege → Casual → Privilege negative
--------------------------------------------------------------*/
if (leaveType === "First Half Leave" || leaveType === "Second Half Leave") {
  if (
    !halfDayReason ||
    !["Sick Leave", "Casual Leave", "Privilege Leave"].includes(halfDayReason)
  ) {
    return {
      success: false,
      message: "Half-day reason must be Sick Leave, Casual Leave or Privilege Leave."
    };
  }

  let result;

  if (halfDayReason === "Sick Leave") {
    result = deductHalfDayPriority(b, "Sick");
    message = "Half-day Sick Leave recorded.";
  } else if (halfDayReason === "Casual Leave") {
    result = deductHalfDayPriority(b, "Casual");
    message = "Half-day Casual Leave recorded.";
  } else if (halfDayReason === "Privilege Leave") {
    result = deductHalfDayPriority(b, "Privilege");
    message = "Half-day Privilege Leave recorded.";
  }

  isLOP = result.isLOP;

  if (isLOP) {
    message += " Insufficient balance, taken as negative (will be treated as LOP).";
  }

  await b.save();
  return { success: true, name: b.name, message, isLOP };
}


    /* -------------------------------------------------------------
       FULL DAY LEAVES BASED ON NEW RULES
    --------------------------------------------------------------*/

    // --------- CASUAL LEAVE LOGIC --------- //
    if (leaveType === "Casual Leave") {
      if (b.casualLeaves > 0) {
        b.casualLeaves -= 1;
      } else if (b.privilegeLeaves > 0) {
        b.privilegeLeaves -= 1;
      } else {
        b.casualLeaves -= 1; // go negative
        isLOP = true;
        message = "Casual Leave applied but insufficient leaves. Deducted as negative.";
      }
    }

    // --------- PRIVILEGE LEAVE LOGIC --------- //
    else if (leaveType === "Privilege Leave") {
      if (b.privilegeLeaves > 0) {
        b.privilegeLeaves -= 1;
      } else if (b.casualLeaves > 0) {
        b.casualLeaves -= 1;
      } else {
        b.privilegeLeaves -= 1; // negative
        isLOP = true;
        message = "Privilege Leave applied but insufficient leaves. Deducted as negative.";
      }
    }

    // --------- SICK LEAVE LOGIC --------- //
    else if (leaveType === "Sick Leave") {
      if (b.sickLeaves > 0) {
        b.sickLeaves -= 1;
      } else if (b.casualLeaves > 0) {
        b.casualLeaves -= 1;
      } else if (b.privilegeLeaves > 0) {
        b.privilegeLeaves -= 1;
      } else {
        b.sickLeaves -= 1; // negative
        isLOP = true;
        message = "Sick Leave applied but insufficient leaves. Deducted as negative.";
      }
    }

    await b.save();
    return { success: true, name: b.name, message, isLOP };

  } catch (error) {
    console.error("Error updating leave balance:", error);
    return { success: false, message: 'Error updating leave balance.' };
  }
}


/* ------------------------------------------------------------------
   SAVE / UPDATE ATTENDANCE
   Rules:
   - Leave Details card: leaveType present -> update balances + set leaveType
   - Out Time card: outTime present + permissionType present -> store that
     permissionType into *dailyLeaveType* (leaving early reason); no balance change
   - Permission Details card: permissionType present + hours present -> store into
     permissionType & hours; no balance change
   - If dailyLeaveType is sent directly, store it as-is (no balance change)
------------------------------------------------------------------ */
router.post('/save', async (req, res) => {
  let {
  id, date, inTime, lunchOut, lunchIn, outTime, day,
  permissionType, hours, dailyLeaveType, leaveType, location,
  inTimeMethod,
  delayReason,
  halfDayReason          // <-- NEW: reason for First/Second Half Leave
} = req.body;

  if (!id || !date) {
    return res.status(400).json({ error: 'ID and Date are required' });
  }

  // --- LATE MARK VALIDATION BLOCK ---
  if (inTime && inTime > '09:15') {
    if (!delayReason) {
      return res.status(400).json({ error: 'Delay reason must be provided for late in-time.' });
    }
    const allowedReasons = ['Late Mark', 'Permission', 'Project Requirement', 'TOM', 'Late Flexi', 'First 50% Leave', 'Deputation','OT Reason','Office Work'];
    if (!allowedReasons.includes(delayReason)) {
      return res.status(400).json({ error: 'Invalid delay reason for late mark.' });
    }
  }

  const submittedDate = new Date(date).setHours(0, 0, 0, 0);
  const today = new Date().setHours(0, 0, 0, 0);
  if (submittedDate > today) {
    return res.status(400).json({ error: 'Attendance for future dates is not allowed.' });
  }

  try {
    const isLeaveCard = !!leaveType;
    const isOutTimeCard = !!outTime && !!permissionType && !leaveType && !hours;
    const isPermissionCard = !!permissionType && !!hours && !leaveType;
    const isDailyOnly = !!dailyLeaveType && !leaveType && !permissionType;

    let finalDailyLeaveType =
      isOutTimeCard ? (permissionType || null)
                    : (typeof dailyLeaveType !== 'undefined' ? (dailyLeaveType || null) : undefined);

    const shouldAffectBalance = isLeaveCard;

    let attendance = await Attendance.findOne({ id: String(id).trim(), date });

   if (attendance) {
      // ---- UPDATE EXISTING RECORD ----
      let lopInfo = null;

      if (shouldAffectBalance && !attendance.leaveType) {
  const balanceUpdateResult = await updateLeaveBalance(id, leaveType, { halfDayReason });
        if (!balanceUpdateResult.success) {
          return res.status(400).json({ error: balanceUpdateResult.message });
        }
        attendance.isLOP = balanceUpdateResult.isLOP;
        attendance.name = balanceUpdateResult.name || attendance.name;
        attendance.leaveType = leaveType;
        lopInfo = balanceUpdateResult;
      }

      if (typeof inTime !== 'undefined') attendance.inTime = inTime;
      if (typeof inTimeMethod !== 'undefined') attendance.inTimeMethod = inTimeMethod;
      if (typeof lunchOut !== 'undefined') attendance.lunchOut = lunchOut;
      if (typeof lunchIn !== 'undefined') attendance.lunchIn = lunchIn;
      if (typeof outTime !== 'undefined') attendance.outTime = outTime;
      if (typeof day !== 'undefined') attendance.day = day;
      if (typeof delayReason !== 'undefined') {
        attendance.delayReason = delayReason || null;
      }

      if (isOutTimeCard) {
        attendance.dailyLeaveType = permissionType || null;
      } else if (typeof finalDailyLeaveType !== 'undefined') {
        attendance.dailyLeaveType = finalDailyLeaveType;
      }

      if (isPermissionCard) {
        attendance.permissionType = permissionType || null;
        if (typeof hours !== 'undefined') attendance.hours = hours;
      } else {
        if (typeof permissionType !== 'undefined' && !isOutTimeCard) {
          attendance.permissionType = permissionType || null;
        }
        if (typeof hours !== 'undefined' && !isOutTimeCard) {
          attendance.hours = hours;
        }
      }

      await attendance.save();

      const message = shouldAffectBalance
        ? (lopInfo ? lopInfo.message : 'Leave submitted successfully.')
        : isOutTimeCard
          ? 'Out-time recorded. Reason stored as Daily Leave Type.'
          : isPermissionCard
            ? 'Permission recorded successfully.'
            : 'Attendance record updated successfully.';

      return res.json({
        message,
        isLOP: lopInfo ? lopInfo.isLOP : attendance.isLOP || false
      });
    } else {
      // ---- CREATE NEW RECORD ----
      let staffName;
      let message = 'Attendance created successfully';
      let isLOP = false;

      if (shouldAffectBalance) {
  const balanceUpdateResult = await updateLeaveBalance(id, leaveType, { halfDayReason });
        if (!balanceUpdateResult.success) {
          return res.status(400).json({ error: balanceUpdateResult.message });
        }
        staffName = balanceUpdateResult.name;
        message = balanceUpdateResult.message;
        isLOP = balanceUpdateResult.isLOP;
      } else {
        const staff = await Staff.findOne({ id: String(id).trim() });
        if (!staff) return res.status(400).json({ error: 'Invalid staff ID' });
        staffName = staff.name;
        if (isOutTimeCard) {
          message = 'Out-time recorded. Reason stored as Daily Leave Type.';
        } else if (isPermissionCard) {
          message = 'Permission recorded successfully.';
        } else if (isDailyOnly) {
          message = 'Daily status recorded successfully.';
        } else {
          message = 'Attendance created successfully';
        }
      }


      const address = await getAddressFromCoordinates(location);

      const newAttendance = new Attendance({
        id: String(id).trim(),
        name: staffName,
        date,
        day,
        inTime,
        inTimeMethod,
        lunchOut,
        lunchIn,
        outTime,
        permissionType: isPermissionCard ? (permissionType || null) : null,
        hours: isPermissionCard ? hours : undefined,
        dailyLeaveType: isOutTimeCard
          ? (permissionType || null)
          : (typeof finalDailyLeaveType !== 'undefined' ? finalDailyLeaveType : null),
        leaveType: shouldAffectBalance ? leaveType : null,
        location: address,
        delayReason: delayReason || null, 
        isLOP
      });

      await newAttendance.save();
  // ⬇️ REPLACE your old `return res.json({ message });` with this:
  return res.json({ message, isLOP });
}

  } catch (error) {
    console.error('Error saving attendance:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});


/* ------------------------------------------------------------------
   Admin: get all attendance (unchanged)
------------------------------------------------------------------ */
router.get('/all', async (req, res) => {
  try {
    const allStaff = await Staff.find();

    let records = await Attendance.find().sort({ date: -1 });

    let recordMap = new Map();
    records.forEach(r => {
      recordMap.set(r.id + "_" + r.date, r);
    });

    let finalList = [];

    for (let staff of allStaff) {
     for (let h of holidays) {
  const year = new Date().getFullYear();
  const holidayDate = `${year}${h.date}`;


        const key = staff.id + "_" + holidayDate;

        if (!recordMap.has(key)) {

          const day = new Date(holidayDate).toLocaleDateString("en-US", { weekday: "long" });

          const newRec = {
            id: staff.id,
  name: staff.name,
  date: holidayDate,
  day,
  holidayName: h.name,  // new field for holiday name
  leaveType: null,
            inTime: null,
            outTime: null,
            lunchIn: null,
            lunchOut: null,
            dailyLeaveType: null,
            permissionType: null,
            hours: null,
            isLOP: false
          };

          finalList.push(newRec);
        }
      }
    }

    records.forEach(r => {
      const dateObj = new Date(r.date);
      const mm = String(dateObj.getMonth() + 1).padStart(2, "0");
      const dd = String(dateObj.getDate()).padStart(2, "0");

      const monthDay = `-${mm}-${dd}`;

    


      finalList.push(r);
    });

    finalList.sort((a, b) => new Date(b.date) - new Date(a.date));

    res.json(finalList);

  } catch (error) {
    console.error('Error fetching attendance records:', error);
    res.status(500).json({ error: 'Failed to fetch attendance records' });
  }
});


/* ------------------------------------------------------------------
   Today's summary (unchanged except formatting)
------------------------------------------------------------------ */
router.get('/today', async (req, res) => {
  try {
    const todayDate = new Date().toISOString().split('T')[0]; // yyyy-mm-dd
    const mmdd = todayDate.substring(4); // "-MM-DD"
    const cutoffTime = "09:15";

    const allStaff = await Staff.find();
    const todaysAttendance = await Attendance.find({ date: todayDate });

    const presentIds = new Set(todaysAttendance.map(a => a.id));

    let presents = todaysAttendance.map(att => ({
      id: att.id,
      name: att.name,
      inTime: att.inTime,
      day: att.day,
      lunchIn: att.lunchIn,
      lunchOut: att.lunchOut,
      outTime: att.outTime,
      permissionType: att.permissionType,
      hours: att.hours,
      leaveType: att.leaveType,
    }));

    // ---- AUTO HOLIDAY LOGIC FOR TODAY ----
    let absents = [];

const match = holidays.find(h => h.date === mmdd);
if (match) {
      // Today is a public holiday → everyone gets holiday if not submitted
      absents = allStaff
        .filter(staff => !presentIds.has(staff.id))
        .map(st => ({
          id: st.id,
          name: st.name,
          department: st.department,
          designation: st.designation,
          leaveType:match.name
        }));
    } else {
      // Today is a normal working day → normal absents
      absents = allStaff
        .filter(staff => !presentIds.has(staff.id))
        .map(st => ({
          id: st.id,
          name: st.name,
          department: st.department,
          designation: st.designation,
        }));
    }

    const lateComers = presents.filter(att => att.inTime && att.inTime > cutoffTime);

    res.json({
      count: {
        presents: presents.length,
        absents: absents.length,
        lateComers: lateComers.length,
      },
      presents, absents, lateComers,
    });

  } catch (err) {
    console.error("Error fetching today's attendance:", err);
    res.status(500).json({ error: "Server error" });
  }
});


/* ------------------------------------------------------------------
   Get attendance by ID + Date (unchanged)
------------------------------------------------------------------ */
router.post('/getByIdDate', async (req, res) => {
  try {
    const { id, date } = req.body;
    if (!id || !date) {
      return res.status(400).json({ error: 'Staff ID and Date are required.' });
    }
    const attendance = await Attendance.findOne({ id: String(id).trim(), date });
    if (!attendance) {
      return res.status(404).json({ message: 'No attendance record found for this ID and date.' });
    }
    res.status(200).json(attendance);
  } catch (error)  {
    console.error("Error in /getByIdDate route:", error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/* ------------------------------------------------------------------
   Get all attendance for a specific ID (unchanged)
------------------------------------------------------------------ */
router.get('/:id', async (req, res) => {
  const employeeId = req.params.id;

  try {
    const staff = await Staff.findOne({ id: employeeId });
    if (!staff) {
      return res.status(404).json({ message: 'Employee ID not found.' });
    }

    const attendance = await Attendance.find({ id: employeeId }).sort({ date: 1 });

    // ---- AUTO INSERT HOLIDAYS INTO RESPONSE (NOT DATABASE) ----
    const generatedRecords = [];
    const recordedDates = new Set(attendance.map(a => a.date));
const today = new Date().setHours(0,0,0,0);
holidays.forEach(h => {
  const year = new Date().getFullYear();
  const holidayDate = `${year}${h.date}`;
  const holidayTime = new Date(holidayDate).setHours(0,0,0,0);

  if (holidayTime > today) return;  // Don't include future holidays

  if (!recordedDates.has(holidayDate)) {
    generatedRecords.push({
      id: employeeId,
      name: staff.name,
      date: holidayDate,
      day: new Date(holidayDate).toLocaleDateString('en-US', { weekday: 'long' }),
      holidayName: h.name,   // use holidayName here
      leaveType: null,
          inTime: null,
          outTime: null,
          lunchIn: null,
          lunchOut: null,
          hours: null,
          permissionType: null,
          dailyLeaveType: null,
          isLOP: false
        });
      }
    });

   const finalRecords = [...attendance, ...generatedRecords]
  .sort((a, b) => new Date(b.date) - new Date(a.date)); // ← DESCENDING


    res.json(finalRecords);

  } catch (err) {
    console.error("Error fetching attendance by ID:", err);
    res.status(500).json({ message: 'Server error' });
  }
});







module.exports = router;

