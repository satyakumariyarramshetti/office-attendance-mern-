
const express = require('express');
const router = express.Router();
const axios = require('axios');
const Attendance = require('../models/Attendance');
const Staff = require('../models/Staff');
const LeaveBalance = require('../models/LeaveBalance');
// ---- COMPANY HOLIDAYS ----
const holidays = [
  "-01-26",  // Republic Day
  "-08-15",  // Independence Day
  "-10-02",  // Gandhi Jayanti

  // Festival Holidays
  "-01-14",  // Sankranti/Pongal
  "-06-07",  // Bakrid
  "-12-25",  // Christmas
  "-10-20",  // Dussehra
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

/* ------------------------------------------------------------------
   Leave balance update helper (kept intact)
   NOTE: Called ONLY when a full-day leaveType is submitted.
------------------------------------------------------------------ */
async function updateLeaveBalance(employeeId, leaveType) {
  try {
    const balanceProfile = await LeaveBalance.findOne({ employeeId });
    if (!balanceProfile) {
      return { success: false, message: 'Employee not found in leave balance records.' };
    }

    let isLOP = false;
    let statusMessage = 'Leave submitted successfully.';

    // No deduction for Compensation or C-Off Leave for ANY employee.
if (
  leaveType.startsWith('C-Off Leave') ||
  leaveType === 'Travel Leave' ||
  leaveType === 'Client/Site Visit' ||
  leaveType === 'Over-Time Leave'
)
 {
  return { success: true, name: balanceProfile.name, message: `${leaveType} recorded successfully.`, isLOP: false };
}



    // Half-day leaves
    if (leaveType === 'First Half Leave' || leaveType === 'Second Half Leave') {
      if (balanceProfile.role === 'junior') {
        if (balanceProfile.monthlyLeaveStatus < 0.5) {
          isLOP = true;
          statusMessage = 'Half-day leave recorded as LOP due to insufficient balance.';
        }
        balanceProfile.monthlyLeaveStatus -= 0.5;
      } else if (balanceProfile.role === 'senior') {
        if (balanceProfile.casualLeaves >= 0.5) {
          balanceProfile.casualLeaves -= 0.5;
        } else if (balanceProfile.sickLeaves >= 0.5) {
          balanceProfile.sickLeaves -= 0.5;
        } else if (balanceProfile.privilegeLeaves >= 0.5) {
          balanceProfile.privilegeLeaves -= 0.5;
        } else {
          isLOP = true;
          statusMessage = 'Insufficient balance for a half-day. Recorded as LOP.';
          balanceProfile.casualLeaves -= 0.5; // allow negative to indicate LOP
        }
      }
    }
    // Full-day leaves
    else {
      if (balanceProfile.role === 'junior') {
        if (leaveType === 'Casual Leave' || leaveType === 'Sick Leave') {
          if (balanceProfile.monthlyLeaveStatus < 1) {
            isLOP = true;
            statusMessage = 'Leave recorded as LOP. Your balance is now negative.';
          }
          balanceProfile.monthlyLeaveStatus -= 1;
        } else {
          return { success: false, message: `Juniors cannot take '${leaveType}'.` };
        }
      } else if (balanceProfile.role === 'senior') {
        switch (leaveType) {
         case 'Casual Leave':
  if (balanceProfile.casualLeaves < 1) {
    // Check if privilege leaves are available
    if (balanceProfile.privilegeLeaves >= 1) {
      balanceProfile.privilegeLeaves -= 1;
      statusMessage = 'No casual leaves. Deducted from privilege leaves.';
    } else {
      // Deduct from casual (go negative)
      balanceProfile.casualLeaves -= 1;
      isLOP = true;
      statusMessage = 'No casual or privilege leaves. Goes negative/Loss of Pay.';
    }
  } else {
    balanceProfile.casualLeaves -= 1;
  }
  break;

          case 'Sick Leave':
            if (balanceProfile.sickLeaves < 1) {
              isLOP = true;
              statusMessage = 'No sick leaves available. Recorded as LOP.';
            }
            balanceProfile.sickLeaves -= 1;
            break;
          case 'Privilege Leave':
            if (balanceProfile.privilegeLeaves < 1) {
              isLOP = true;
              statusMessage = 'No privilege leaves available. Recorded as LOP.';
            }
            balanceProfile.privilegeLeaves -= 1;
            break;
          default:
            return { success: false, message: 'Invalid leave type for a senior employee.' };
        }
      }
    }

    await balanceProfile.save();
    return { success: true, name: balanceProfile.name, message: statusMessage, isLOP };

  } catch (error) {
    console.error("Error updating leave balance:", error);
    return { success: false, message: 'Server error while updating leave balance.' };
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
    delayReason // <-- Added this as per latest requirements
  } = req.body;

  if (!id || !date) {
    return res.status(400).json({ error: 'ID and Date are required' });
  }

  // --- LATE MARK VALIDATION BLOCK ---
  if (inTime && inTime > '09:15') {
    if (!delayReason) {
      return res.status(400).json({ error: 'Delay reason must be provided for late in-time.' });
    }
    const allowedReasons = ['Late Mark', 'Permission', 'Project Requirement', 'TOM', 'Late Flexi', 'First 50% Leave', 'Deputation'];
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

      if (shouldAffectBalance && !attendance.leaveType) {
        const balanceUpdateResult = await updateLeaveBalance(id, leaveType);
        if (!balanceUpdateResult.success) {
          return res.status(400).json({ error: balanceUpdateResult.message });
        }
        attendance.isLOP = balanceUpdateResult.isLOP;
        attendance.name = balanceUpdateResult.name || attendance.name;
        attendance.leaveType = leaveType;
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
      } else {
        if (typeof finalDailyLeaveType !== 'undefined') {
          attendance.dailyLeaveType = finalDailyLeaveType;
        }
      }

      // Permission Details card -> permissionType + hours
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

      const message =
        shouldAffectBalance
          ? 'Leave recorded and attendance updated.'
          : isOutTimeCard
            ? 'Out-time recorded. Reason stored as Daily Leave Type.'
            : isPermissionCard
              ? 'Permission recorded successfully.'
              : 'Attendance record updated successfully.';

      return res.json({ message });

    } else {
      // ---- CREATE NEW RECORD ----
      let staffName;
      let message = 'Attendance created successfully';
      let isLOP = false;

      if (shouldAffectBalance) {
        const balanceUpdateResult = await updateLeaveBalance(id, leaveType);
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
      return res.json({ message });
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
        const holidayDate = `${year}${h}`;

        const key = staff.id + "_" + holidayDate;

        if (!recordMap.has(key)) {

          const day = new Date(holidayDate).toLocaleDateString("en-US", { weekday: "long" });

          const newRec = {
            id: staff.id,
            name: staff.name,
            date: holidayDate,
            day,
            leaveType: "Public/Festival Holiday",
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

      if (!r.leaveType && holidays.includes(monthDay)) {
        r.leaveType = "Public/Festival Holiday";
      }

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

    if (holidays.includes(mmdd)) {
      // Today is a public holiday → everyone gets holiday if not submitted
      absents = allStaff
        .filter(staff => !presentIds.has(staff.id))
        .map(st => ({
          id: st.id,
          name: st.name,
          department: st.department,
          designation: st.designation,
          leaveType: "Public/Festival Holiday"
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

    // Loop through all holidays in your settings
    holidays.forEach(holiday => {
      const year = new Date().getFullYear();
      const holidayDate = `${year}${holiday}`; // "-10-02" → "2025-10-02"

      if (!recordedDates.has(holidayDate)) {
        generatedRecords.push({
          id: employeeId,
          name: staff.name,
          date: holidayDate,
          day: new Date(holidayDate).toLocaleDateString('en-US', { weekday: 'long' }),
          leaveType: "Public/Festival Holiday",
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

