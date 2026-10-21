const express = require("express");
const router = express.Router();

const Attendance = require("../models/Attendance");
const EmployeeDailyActivity = require("../models/EmployeeDailyActivity");
const Staff = require("../models/Staff");

// Helper to format Date object into YYYY-MM-DD safely
const toDateString = (dateObj) => {
  const d = new Date(dateObj);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

// ------------------------------------------------------------------
// 1. Month-Year Dropdown Options (Starts with Sep 2026 + "All Months")
// ------------------------------------------------------------------
router.get("/activity-month-options", (req, res) => {
  try {
    const startYear = 2026;
    const startMonth = 9; // September 2026

    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1;

    const monthNames = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];

    // Option to view all accumulated records
    const options = [
      {
        label: "All (Since Sep 2026)",
        month: "ALL",
        year: "ALL",
        value: "ALL",
      },
    ];

    for (let y = currentYear; y >= startYear; y--) {
      const endM = y === currentYear ? currentMonth : 12;
      const beginM = y === startYear ? startMonth : 1;

      for (let m = endM; m >= beginM; m--) {
        options.push({
          label: `${monthNames[m - 1]} ${y}`,
          month: m,
          year: y,
          value: `${y}-${String(m).padStart(2, "0")}`,
        });
      }
    }

    return res.json({ success: true, options });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

// ------------------------------------------------------------------
// 2. Reconciliation with TODAY's IN-TIME EXCEPTION
// ------------------------------------------------------------------
router.get("/monthly-activity-reconciliation", async (req, res) => {
  try {
    const { employeeId, year, month } = req.query;

    if (!employeeId) {
      return res.status(400).json({ message: "Employee ID is required" });
    }

    const staff = await Staff.findOne({ id: employeeId }).lean();
    if (!staff) {
      return res.status(404).json({ message: "Employee not found" });
    }

    if (staff.activityRequired === false) {
      return res.json({
        activityRequired: false,
        accumulatedSummary: {
          totalActivityMissed: 0,
          totalAttendanceMissed: 0,
        },
        summary: {
          totalActivityMissed: 0,
          totalAttendanceMissed: 0,
          totalCompleted: 0,
        },
        records: [],
      });
    }

    // Fixed accumulation starting point: September 1, 2026
    const ACCUMULATION_START_STR = "2026-09-01";
    const ACCUMULATION_START_DATE = new Date("2026-09-01T00:00:00.000Z");

    const now = new Date();
    const todayStr = toDateString(now);

    // 1. Fetch Attendance from Sep 1, 2026 to Today
    const allAttendanceRecords = await Attendance.find({
      id: employeeId,
      date: {
        $gte: ACCUMULATION_START_STR,
        $lte: todayStr,
      },
    }).lean();

    // 2. Fetch Activity Sheet from Sep 1, 2026 to Today
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    const allActivityRecords = await EmployeeDailyActivity.find({
      employeeId: employeeId.toUpperCase(),
      date: {
        $gte: ACCUMULATION_START_DATE,
        $lte: endOfToday,
      },
    }).lean();

    // Map Attendance by "YYYY-MM-DD"
    const attendanceMap = new Map();
    allAttendanceRecords.forEach((att) => {
      attendanceMap.set(att.date, att);
    });

    // Map Activities by "YYYY-MM-DD" (summing hours)
    const activityMap = new Map();
    allActivityRecords.forEach((act) => {
      const dateKey = toDateString(act.date);
      const prev = activityMap.get(dateKey) || { totalHours: 0 };
      prev.totalHours += Number(act.hoursSpent || 0);
      activityMap.set(dateKey, prev);
    });

    // Combine all dates from Sep 1, 2026 to Today
    const allDates = new Set([...attendanceMap.keys(), ...activityMap.keys()]);
    const sortedDates = Array.from(allDates).sort((a, b) => b.localeCompare(a)); // Newest first

    let totalAccActivityMissed = 0;
    let totalAccAttendanceMissed = 0;
    let totalAccCompleted = 0;

    const allReconciledRecords = [];

    sortedDates.forEach((dateStr) => {
      if (dateStr > todayStr || dateStr < ACCUMULATION_START_STR) return;

      const att = attendanceMap.get(dateStr);
      const act = activityMap.get(dateStr);

      const hasInTime = att && att.inTime && att.inTime.trim() !== "";
      const hasOutTime = att && att.outTime && att.outTime.trim() !== "";
      const hasActivity = act && act.totalHours > 0;
      const isToday = dateStr === todayStr;

      const attendanceHours = att
        ? att.hours || (hasInTime ? "Punched" : "-")
        : "Not Marked";
      const activityHours = act ? `${act.totalHours} hrs` : "0 hrs";

      let status = "COMPLETED";
      let remarks = "Both Attendance and Activity updated";

      // ========================================================
      // 🌟 NEW LOGIC: Attendance present, but Activity is not filled
      // ========================================================
      if (hasInTime && !hasActivity) {
        if (isToday && !hasOutTime) {
          // TODAY & ONLY IN-TIME: Shift in progress -> DO NOT flag as missed!
          status = "IN_PROGRESS";
          remarks = "Shift in progress (In-time marked, awaiting out-time)";
        } else {
          // Either a past date OR today after out-time punch
          status = "ACTIVITY_MISSED";
          remarks = isToday
            ? "Out-time punched, but activity sheet is missing"
            : "Attendance present, activity sheet missing";
          totalAccActivityMissed++;
        }
      } else if (!hasInTime && hasActivity) {
        status = "ATTENDANCE_MISSED";
        remarks = "Activity filled, attendance not punched";
        totalAccAttendanceMissed++;
      } else if (!hasInTime && !hasActivity) {
        return; // Skip empty days
      } else {
        totalAccCompleted++;
      }

      if (status !== "COMPLETED") {
        allReconciledRecords.push({
          date: dateStr,
          attendanceInTime: att ? att.inTime : null,
          attendanceOutTime: att ? att.outTime : null,
          workingHours: attendanceHours,
          activityHours: activityHours,
          status,
          remarks,
        });
      }
    });

    // 3. Filter records for the selected month/year view in the modal
    let displayRecords = allReconciledRecords;
    let monthActivityMissed = totalAccActivityMissed;
    let monthAttendanceMissed = totalAccAttendanceMissed;
    let monthCompleted = totalAccCompleted;

    if (month && month !== "ALL" && year && year !== "ALL") {
      const monthPrefix = `${year}-${String(month).padStart(2, "0")}`;
      displayRecords = allReconciledRecords.filter((r) =>
        r.date.startsWith(monthPrefix),
      );

      monthActivityMissed = displayRecords.filter(
        (r) => r.status === "ACTIVITY_MISSED",
      ).length;
      monthAttendanceMissed = displayRecords.filter(
        (r) => r.status === "ATTENDANCE_MISSED",
      ).length;
      monthCompleted = displayRecords.filter(
        (r) => r.status === "COMPLETED",
      ).length;
    }

    return res.json({
      success: true,
      employeeId,
      accumulatedSummary: {
        totalActivityMissed: totalAccActivityMissed,
        totalAttendanceMissed: totalAccAttendanceMissed,
        totalCompleted: totalAccCompleted,
        totalDiscrepancies: totalAccActivityMissed + totalAccAttendanceMissed,
        since: "Sep 2026",
      },
      summary: {
        totalActivityMissed: monthActivityMissed,
        totalAttendanceMissed: monthAttendanceMissed,
        totalCompleted: monthCompleted,
        totalDiscrepancies: monthActivityMissed + monthAttendanceMissed,
      },
      records: displayRecords,
    });
  } catch (error) {
    console.error("Reconciliation error:", error);
    res.status(500).json({ message: error.message });
  }
});

router.get("/missing-activities", async (req, res) => {
  try {
    const { employeeId } = req.query;

    const staff = await Staff.findOne({
      id: employeeId,
    }).lean();

    if (!staff) {
      return res.status(404).json({
        message: "Employee not found",
      });
    }

    // Activity not required

    if (staff.activityRequired === false) {
      return res.json({
        employeeId,

        activityRequired: false,

        totalMissingDays: 0,

        recentMissingDays: [],

        data: [],
      });
    }

    // =================================
    // 1. Find Last Activity Date
    // =================================

    const lastActivity = await EmployeeDailyActivity.findOne({
      employeeId: employeeId.toUpperCase(),

      date: {
        $lt: new Date(),
      },
    })
      .sort({
        date: -1,
      })

      .select("date")

      .lean();

    let fromDate;

    if (lastActivity) {
      fromDate = new Date(lastActivity.date);
    } else if (staff.projectStartDate) {
      fromDate = new Date(staff.projectStartDate);
    } else if (staff.dateOfJoining) {
      fromDate = new Date(staff.dateOfJoining);
    } else {
      return res.json({
        employeeId,

        totalMissingDays: 0,

        data: [],
      });
    }

    fromDate.setHours(0, 0, 0, 0);

    // =================================
    // Exclude Current Date
    // =================================

    const today = new Date();

    today.setHours(0, 0, 0, 0);

    // =================================
    // 2. Attendance after last activity
    // =================================

    const attendanceStart = `${fromDate.getFullYear()}-${String(fromDate.getMonth() + 1).padStart(2, "0")}-${String(fromDate.getDate()).padStart(2, "0")}`;

    const attendanceRecords = await Attendance.find({
      id: employeeId,

      inTime: {
        $exists: true,
        $ne: "",
      },

      date: {
        $gte: attendanceStart,
        $lt: `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`,
      },
    })

      .select("id name date")

      .lean();

    if (attendanceRecords.length === 0) {
      return res.json({
        employeeId,

        totalMissingDays: 0,

        data: [],
      });
    }

    // =================================
    // 3. Get all activities once
    // =================================

    const activities = await EmployeeDailyActivity.find({
      employeeId: employeeId.toUpperCase(),

      date: {
        $gte: fromDate,
        $lt: today,
      },
    })

      .select("date")

      .lean();

    // Convert activity dates

    const activitySet = new Set();

    activities.forEach((item) => {
      const date = item.date.toISOString().split("T")[0];

      activitySet.add(date);
    });

    // =================================
    // 4. Compare Attendance vs Activity
    // =================================

    const missingActivities = [];

    attendanceRecords.forEach((att) => {
      if (!activitySet.has(att.date)) {
        missingActivities.push({
          employeeId: att.id,

          name: att.name,

          missingActivityDate: att.date,

          message: "You were present but activity sheet was not filled",
        });
      }
    });

    // latest first

    missingActivities.sort(
      (a, b) =>
        new Date(b.missingActivityDate) - new Date(a.missingActivityDate),
    );

    res.json({
      employeeId,

      lastActivityDate: lastActivity ? lastActivity.date : null,

      totalMissingDays: missingActivities.length,

      recentMissingDays: missingActivities.slice(0, 3),

      data: missingActivities,
    });
  } catch (error) {
    console.log(error);

    res.status(500).json({
      message: error.message,
    });
  }
});

module.exports = router;
