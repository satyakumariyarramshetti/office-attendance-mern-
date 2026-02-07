
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
  { date: "-01-15", name: "Sankranti / Pongal" },
  { date: "-05-27", name: "Bakrid" },
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

  for (const field of order[primaryType]) {
    if (b[field] > 0) {
      b[field] -= 0.5;
      return { isLOP: false };
    }
  }

  const primaryField = fields[primaryType];
  b[primaryField] -= 0.5;
  return { isLOP: true };
}


/* ------------------------------------------------------------------
   Leave balance update helper (kept intact)
   NOTE: Called ONLY when a full-day leaveType is submitted.
------------------------------------------------------------------ */
// ... (existing imports and holidays array)

// ... (getAddressFromCoordinates and deductHalfDayPriority functions - keep as is)

/* ------------------------------------------------------------------
   Leave balance update helper (MODIFIED)
   Returns: { success, message, isLOP, balances, deductedFrom }
------------------------------------------------------------------ */
async function updateLeaveBalance(employeeId, leaveType, options = {}) {
  const { halfDayReason } = options;

  try {
    const b = await LeaveBalance.findOne({ employeeId });
    if (!b) {
      return { success: false, message: 'Employee not found in leave balance records.' };
    }

    let isLOP = false;
    let message = '';
    let deductedFrom = ''; // To track which leave type was actually used
    let leaveToDeduct = 1; // Default for full day

    // Determine deduction amount for half-day leaves
    if (leaveType === "First Half Leave" || leaveType === "Second Half Leave") {
        leaveToDeduct = 0.5;
    }

    // Leave types that SHOULD NOT deduct anything from core balances
    if (
      leaveType.startsWith('C-Off Leave') ||
      leaveType === 'Travel Leave' ||
      leaveType === 'Client/Site Visit' ||
      leaveType === 'Over-Time Leave'
    ) {
      message = `Your ${leaveType} has been recorded. No leave balance deduction.`;
      // No save needed as no balance change
      return {
        success: true,
        message,
        isLOP: false,
        balances: { // Return current balances without change
          casualLeaves: b.casualLeaves,
          sickLeaves: b.sickLeaves,
          privilegeLeaves: b.privilegeLeaves,
          monthlyLeaveStatus: b.monthlyLeaveStatus,
        }
      };
    }

    /* -------------------------------------------------------------
       HALF DAY LEAVES (First / Second Half)
       Reason must be: Sick Leave / Casual Leave / Privilege Leave
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
        if (b.sickLeaves >= leaveToDeduct) {
          b.sickLeaves -= leaveToDeduct;
          deductedFrom = 'Sick Leave';
          message = `Your ${leaveType} (Sick) has been recorded.`;
        } else if (b.casualLeaves >= leaveToDeduct) { // Fallback to Casual
          b.casualLeaves -= leaveToDeduct;
          deductedFrom = 'Casual Leave';
          message = `Your Sick Leave balance is insufficient. ${leaveToDeduct} day has been deducted from your Casual Leave balance.`;
        } else if (b.privilegeLeaves >= leaveToDeduct) { // Fallback to Privilege
          b.privilegeLeaves -= leaveToDeduct;
          deductedFrom = 'Privilege Leave';
          message = `Your Sick Leave balance is insufficient. ${leaveToDeduct} day has been deducted from your Privilege Leave balance.`;
        } else {
          b.sickLeaves -= leaveToDeduct; // Go negative
          isLOP = true;
          deductedFrom = 'Sick Leave (LOP)';
          message = `You have insufficient Sick, Casual, and Privilege Leaves. ${leaveToDeduct} day will be treated as Loss of Pay (LOP).`;
        }
      } else if (halfDayReason === "Casual Leave") {
        if (b.casualLeaves >= leaveToDeduct) {
          b.casualLeaves -= leaveToDeduct;
          deductedFrom = 'Casual Leave';
          message = `Your ${leaveType} (Casual) has been recorded.`;
        } else if (b.privilegeLeaves >= leaveToDeduct) { // Fallback to Privilege
          b.privilegeLeaves -= leaveToDeduct;
          deductedFrom = 'Privilege Leave';
          message = `Your Casual Leave balance is insufficient. ${leaveToDeduct} day has been deducted from your Privilege Leave balance.`;
        } else {
          b.casualLeaves -= leaveToDeduct; // Go negative
          isLOP = true;
          deductedFrom = 'Casual Leave (LOP)';
          message = `You have insufficient Casual and Privilege Leaves. ${leaveToDeduct} day will be treated as Loss of Pay (LOP).`;
        }
      } else if (halfDayReason === "Privilege Leave") {
        if (b.privilegeLeaves >= leaveToDeduct) {
          b.privilegeLeaves -= leaveToDeduct;
          deductedFrom = 'Privilege Leave';
          message = `Your ${leaveType} (Privilege) has been recorded.`;
        } else if (b.casualLeaves >= leaveToDeduct) { // Fallback to Casual
          b.casualLeaves -= leaveToDeduct;
          deductedFrom = 'Casual Leave';
          message = `Your Privilege Leave balance is insufficient. ${leaveToDeduct} day has been deducted from your Casual Leave balance.`;
        } else {
          b.privilegeLeaves -= leaveToDeduct; // Go negative
          isLOP = true;
          deductedFrom = 'Privilege Leave (LOP)';
          message = `You have insufficient Privilege and Casual Leaves. ${leaveToDeduct} day will be treated as Loss of Pay (LOP).`;
        }
      }

      await b.save();
      return {
        success: true,
        message,
        isLOP,
        deductedFrom,
        balances: {
          casualLeaves: b.casualLeaves,
          sickLeaves: b.sickLeaves,
          privilegeLeaves: b.privilegeLeaves,
          monthlyLeaveStatus: b.monthlyLeaveStatus,
        }
      };
    }


    /* -------------------------------------------------------------
       FULL DAY LEAVES BASED ON NEW RULES
    --------------------------------------------------------------*/
    // --------- CASUAL LEAVE LOGIC --------- //
    if (leaveType === "Casual Leave") {
      if (b.casualLeaves >= leaveToDeduct) {
        b.casualLeaves -= leaveToDeduct;
        deductedFrom = 'Casual Leave';
        message = `Your Casual Leave has been recorded.`;
      } else if (b.privilegeLeaves >= leaveToDeduct) {
        b.privilegeLeaves -= leaveToDeduct;
        deductedFrom = 'Privilege Leave';
        message = `Your Casual Leave balance is insufficient. ${leaveToDeduct} day has been deducted from your Privilege Leave balance.`;
      } else {
        b.casualLeaves -= leaveToDeduct; // go negative
        isLOP = true;
        deductedFrom = 'Casual Leave (LOP)';
        message = `You have insufficient Casual and Privilege Leaves. ${leaveToDeduct} day will be treated as Loss of Pay (LOP).`;
      }
    }

    // --------- PRIVILEGE LEAVE LOGIC --------- //
    else if (leaveType === "Privilege Leave") {
      if (b.privilegeLeaves >= leaveToDeduct) {
        b.privilegeLeaves -= leaveToDeduct;
        deductedFrom = 'Privilege Leave';
        message = `Your Privilege Leave has been recorded.`;
      } else if (b.casualLeaves >= leaveToDeduct) {
        b.casualLeaves -= leaveToDeduct;
        deductedFrom = 'Casual Leave';
        message = `Your Privilege Leave balance is insufficient. ${leaveToDeduct} day has been deducted from your Casual Leave balance.`;
      } else {
        b.privilegeLeaves -= leaveToDeduct; // negative
        isLOP = true;
        deductedFrom = 'Privilege Leave (LOP)';
        message = `You have insufficient Privilege and Casual Leaves. ${leaveToDeduct} day will be treated as Loss of Pay (LOP).`;
      }
    }

    // --------- SICK LEAVE LOGIC --------- //
    else if (leaveType === "Sick Leave") {
      if (b.sickLeaves >= leaveToDeduct) {
        b.sickLeaves -= leaveToDeduct;
        deductedFrom = 'Sick Leave';
        message = `Your Sick Leave has been recorded.`;
      } else if (b.casualLeaves >= leaveToDeduct) {
        b.casualLeaves -= leaveToDeduct;
        deductedFrom = 'Casual Leave';
        message = `Your Sick Leave balance is insufficient. ${leaveToDeduct} day has been deducted from your Casual Leave balance.`;
      } else if (b.privilegeLeaves >= leaveToDeduct) {
        b.privilegeLeaves -= leaveToDeduct;
        deductedFrom = 'Privilege Leave';
        message = `Your Sick Leave balance is insufficient. ${leaveToDeduct} day has been deducted from your Privilege Leave balance.`;
      } else {
        b.sickLeaves -= leaveToDeduct; // negative
        isLOP = true;
        deductedFrom = 'Sick Leave (LOP)';
        message = `You have insufficient Sick, Casual, and Privilege Leaves. ${leaveToDeduct} day will be treated as Loss of Pay (LOP).`;
      }
    }

    await b.save();
    return {
      success: true,
      message,
      isLOP,
      deductedFrom,
      balances: {
        casualLeaves: b.casualLeaves,
        sickLeaves: b.sickLeaves,
        privilegeLeaves: b.privilegeLeaves,
        monthlyLeaveStatus: b.monthlyLeaveStatus,
      }
    };

  } catch (error) {
    console.error("Error updating leave balance:", error);
    return { success: false, message: 'Error updating leave balance.' };
  }
}


/* ------------------------------------------------------------------
   SAVE / UPDATE ATTENDANCE (MODIFIED)
------------------------------------------------------------------ */
router.post('/save', async (req, res) => {
  let {
  id, date, inTime, lunchOut, lunchIn, outTime, day,
  permissionType, hours, dailyLeaveType, leaveType, location,
  inTimeMethod,
  systemInTime,
  delayReason,
  halfDayReason
} = req.body;

  if (!id || !date) {
    return res.status(400).json({ error: 'ID and Date are required' });
  }

  // --- LATE MARK VALIDATION BLOCK --- (keep as is)
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
    const isOutTimeCard = !!outTime && !!dailyLeaveType && !leaveType && !hours; // Changed to dailyLeaveType for consistency
    const isPermissionCard = !!permissionType && !!hours && !leaveType;
    const isDailyOnly = !!dailyLeaveType && !leaveType && !permissionType && !outTime; // New logic for only daily status


    let finalDailyLeaveType = isOutTimeCard ? dailyLeaveType : (typeof dailyLeaveType !== 'undefined' ? dailyLeaveType : undefined);


    let attendance = await Attendance.findOne({ id: String(id).trim(), date });

   if (attendance) {
      // ---- UPDATE EXISTING RECORD ----
      let leaveUpdateResult = null; // Will store the detailed result from updateLeaveBalance

      if (isLeaveCard && !attendance.leaveType) { // Only update balance if a leaveType is being submitted AND it wasn't already a leave
          leaveUpdateResult = await updateLeaveBalance(id, leaveType, { halfDayReason });
          if (!leaveUpdateResult.success) {
              return res.status(400).json({ error: leaveUpdateResult.message });
          }
          attendance.isLOP = leaveUpdateResult.isLOP;
          attendance.leaveType = leaveType;
          attendance.halfDayReason = halfDayReason || null; // Update halfDayReason on attendance record
      }
      // Update other fields as before
      if (typeof inTime !== 'undefined') attendance.inTime = inTime;
      if (typeof inTimeMethod !== 'undefined') attendance.inTimeMethod = inTimeMethod;
      if (typeof systemInTime !== 'undefined') attendance.systemInTime = systemInTime;
      if (typeof lunchOut !== 'undefined') attendance.lunchOut = lunchOut;
      if (typeof lunchIn !== 'undefined') attendance.lunchIn = lunchIn;
      if (typeof outTime !== 'undefined') attendance.outTime = outTime;
      if (typeof day !== 'undefined') attendance.day = day;
      if (typeof delayReason !== 'undefined') {
        attendance.delayReason = delayReason || null;
      }
      // Ensure halfDayReason is also updated if present, even if not a new leave submission
      if (typeof halfDayReason !== 'undefined' && isLeaveCard) { // only if it's a leave card submission
          attendance.halfDayReason = halfDayReason || null;
      }


      if (isOutTimeCard) {
          attendance.dailyLeaveType = dailyLeaveType || null;
          attendance.permissionType = null; // Clear if it was an out-time with dailyLeaveType
          attendance.hours = null;
      } else if (isPermissionCard) {
          attendance.permissionType = permissionType || null;
          attendance.hours = hours;
          attendance.dailyLeaveType = null; // Clear if it was a permission card
      } else if (isDailyOnly) {
          attendance.dailyLeaveType = dailyLeaveType || null;
          attendance.permissionType = null;
          attendance.hours = null;
      } else if (typeof finalDailyLeaveType !== 'undefined' && !isLeaveCard) { // For other cases where dailyLeaveType might be sent
          attendance.dailyLeaveType = finalDailyLeaveType;
      }


      await attendance.save();

      // Return the detailed message and balances for leave submissions
      if (isLeaveCard && leaveUpdateResult) {
          return res.json({
              message: leaveUpdateResult.message,
              isLOP: leaveUpdateResult.isLOP,
              balances: leaveUpdateResult.balances,
              deductedFrom: leaveUpdateResult.deductedFrom
          });
      }

      // Fallback for other card types
      const message =
        isOutTimeCard ? 'Out-time recorded. Reason stored as Daily Leave Type.' :
        isPermissionCard ? 'Permission recorded successfully.' :
        isDailyOnly ? 'Daily status recorded successfully.' :
        'Attendance record updated successfully.';

      return res.json({
        message,
        isLOP: attendance.isLOP || false
      });
    } else {
      // ---- CREATE NEW RECORD ----
      let staffName;
      let message = 'Attendance created successfully';
      let isLOP = false;
      let leaveUpdateResult = null; // To store result from updateLeaveBalance
      let currentBalances = null;

      if (isLeaveCard) {
          leaveUpdateResult = await updateLeaveBalance(id, leaveType, { halfDayReason });
          if (!leaveUpdateResult.success) {
              return res.status(400).json({ error: leaveUpdateResult.message });
          }
          staffName = await Staff.findOne({ id: String(id).trim() }).then(s => s ? s.name : 'Unknown Staff'); // Fetch name if not in balance result
          message = leaveUpdateResult.message;
          isLOP = leaveUpdateResult.isLOP;
          currentBalances = leaveUpdateResult.balances; // Get balances for new record response
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
        systemInTime,
        lunchOut,
        lunchIn,
        outTime,
        permissionType: isPermissionCard ? (permissionType || null) : null,
        hours: isPermissionCard ? hours : undefined,
        dailyLeaveType: isOutTimeCard
          ? (dailyLeaveType || null) // Use dailyLeaveType for outTimeCard
          : (isDailyOnly ? (dailyLeaveType || null) : null), // Use dailyLeaveType if only daily status
        leaveType: isLeaveCard ? leaveType : null,
        halfDayReason: isLeaveCard ? (halfDayReason || null) : null,
        location: address,
        delayReason: delayReason || null,
        isLOP
      });

      await newAttendance.save();

      // Return the detailed message and balances for leave submissions
      if (isLeaveCard && leaveUpdateResult) {
          return res.json({
              message: leaveUpdateResult.message,
              isLOP: leaveUpdateResult.isLOP,
              balances: currentBalances, // Use currentBalances here
              deductedFrom: leaveUpdateResult.deductedFrom
          });
      }

      return res.json({ message, isLOP });
    }

  } catch (error) {
    console.error('Error saving attendance:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ... (Rest of attendanceRoutes.js - keep as is)


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




/* ------------------------------------------------------------------
   Privilege Leave Accrual Helpers - FIXED VERSION
------------------------------------------------------------------ */
const WORKING_LEAVE_TYPES = new Set([
  'C-Off Leave',
  'C-Off Leave (Sunday / Holiday)',
  'Travel Leave',
  'Client/Site Visit',
  'Client / Site Visit Leave',
  'Over-Time Leave'
]);
// --- AttendanceRoutes.js లో చివర్లో ఉంటుంది ---
// MODIFIED getWorkingDaysStats to accept a startDate
async function getWorkingDaysStats(employeeId, startDate) { // No longer has a default
  const endDate = new Date().toISOString().split('T')[0];
  
  const records = await Attendance.find({
    id: employeeId,
    // Use the dynamic startDate passed to the function
    date: { $gte: startDate, $lte: endDate }
  }).sort({ date: 1 });

  let totalWorkingDays = 0;
  for (const rec of records) {
    if (rec.holidayName) continue;
    
    if (rec.leaveType && WORKING_LEAVE_TYPES.has(rec.leaveType)) {
      totalWorkingDays += 1;
    } else if (rec.leaveType === 'First Half Leave' || rec.leaveType === 'Second Half Leave') {
      totalWorkingDays += 0.5;
    } else if (rec.dailyLeaveType === 'First Half Leave' || rec.dailyLeaveType === 'Second Half Leave') {
      totalWorkingDays += 0.5;
    } else if (rec.inTime || rec.outTime) {
      totalWorkingDays += 1;
    }
  }

  const earnedPrivilegeLeaves = Math.floor(totalWorkingDays / 20);
  return { totalWorkingDays, earnedPrivilegeLeaves };
}



async function ensurePrivilegeLeaveAccrualForEmployee(employeeId) {
  console.log(`🔄 Processing PL for senior: ${employeeId}`);
  
  // AUTO-CREATE Staff if missing
  let staff = await Staff.findOne({ id: employeeId });
  if (!staff) {
    const lb = await LeaveBalance.findOne({ employeeId });
    if (lb) {
      staff = await Staff.create({
        id: employeeId, name: lb.name, role: lb.role,
        department: "General", designation: "Staff"
      });
      console.log(`✅ Auto-created Staff: ${employeeId}`);
    }
  }
  
  const lb = await LeaveBalance.findOne({ employeeId });
  // Check for role AND the new seniorPromotionDate
  if (!lb || lb.role !== 'senior' || !lb.seniorPromotionDate) {
    console.log(`❌ Not a senior with a promotion date: ${employeeId}`);
    return null;
  }
  
  if (lb.plCreditedFromWorkingDays == null) {
    lb.plCreditedFromWorkingDays = 0;
    await lb.save();
  }
  
  // Use seniorPromotionDate as the start date
  const startDate = lb.seniorPromotionDate.toISOString().split('T')[0];
  const { totalWorkingDays, earnedPrivilegeLeaves } = await getWorkingDaysStats(employeeId, startDate);  
  
  const alreadyCredited = lb.plCreditedFromWorkingDays || 0;
  const toCredit = earnedPrivilegeLeaves - alreadyCredited;
  
  let newlyCredited = 0;
  if (toCredit > 0) {
    lb.privilegeLeaves += toCredit;
    lb.plCreditedFromWorkingDays += toCredit;
    await lb.save();
    newlyCredited = toCredit;
    console.log(`💰 Credited ${toCredit} PL to ${employeeId} starting from ${startDate}`);
  }
  
  return {
    employeeId,
    name: lb.name,
    role: lb.role,
    totalWorkingDays,
    earnedPrivilegeLeaves,
    alreadyCredited: lb.plCreditedFromWorkingDays,
    newlyCredited,
    currentPrivilegeLeaves: lb.privilegeLeaves,
  };
} 

async function recalcPrivilegeLeaveForAllSeniors() {
  const seniors = await LeaveBalance.find({ role: 'senior' });
  console.log(`👥 Found ${seniors.length} seniors in LeaveBalance`);
  
  const result = [];
  for (const s of seniors) {
    const r = await ensurePrivilegeLeaveAccrualForEmployee(s.employeeId);
    if (r) result.push(r);
  }
  return result;
}

/* ------------------------------------------------------------------
   API Routes - UNCHANGED
------------------------------------------------------------------ */
router.get('/privilege-leaves/details', async (req, res) => {
  try {
    const data = await recalcPrivilegeLeaveForAllSeniors();
    res.status(200).json({
      message: 'Privilege Leave accrual recalculated successfully.',
      data,
    });
  } catch (err) {
    console.error('Error in /privilege-leaves/details:', err);
    res.status(500).json({ message: 'Error calculating privilege leaves.', error: err.message });
  }
});

router.post('/privilege-leaves/recalc', async (req, res) => {
  try {
    const data = await recalcPrivilegeLeaveForAllSeniors();
    res.status(200).json({
      message: 'Privilege Leave accrual recalculated for all seniors.',
      data,
    });
  } catch (err) {
    console.error('Error in /privilege-leaves/recalc:', err);
    res.status(500).json({ message: 'Error recalculating privilege leaves.', error: err.message });
  }
});

router.post('/privilege-leaves/recalc/:employeeId', async (req, res) => {
  try {
    const { employeeId } = req.params;
    const info = await ensurePrivilegeLeaveAccrualForEmployee(employeeId);
    if (!info) {
      return res.status(404).json({ message: 'Employee not found or not a senior.' });
    }
    res.status(200).json({
      message: 'Privilege Leave accrual updated for employee.',
      data: info,
    });
  } catch (err) {
    console.error('Error in /privilege-leaves/recalc/:employeeId:', err);
    res.status(500).json({ message: 'Error recalculating privilege leaves.', error: err.message });
  }
});


module.exports = router;

