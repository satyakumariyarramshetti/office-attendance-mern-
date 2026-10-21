const express = require("express");
const router = express.Router();

const Attendance = require("../models/Attendance");
const EmployeeDailyActivity = require("../models/EmployeeDailyActivity");
const Staff = require("../models/Staff");

// ============================================================================
// HELPERS
// ============================================================================

// Format Date -> YYYY-MM-DD using server local date
const toDateString = (dateObj) => {
  const d = new Date(dateObj);

  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

// Create YYYY-MM-DD
const formatDateParts = (year, month, day) => {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(
    2,
    "0"
  )}`;
};

// Get first day of month as YYYY-MM-DD
const getMonthStart = (year, month) => {
  return `${year}-${String(month).padStart(2, "0")}-01`;
};

// Get last day of month as YYYY-MM-DD
const getMonthEnd = (year, month) => {
  const lastDay = new Date(year, month, 0).getDate();

  return formatDateParts(year, month, lastDay);
};

// Get Date object for start of local day
const getLocalStartOfDay = (dateString) => {
  const [year, month, day] = dateString.split("-").map(Number);

  return new Date(year, month - 1, day, 0, 0, 0, 0);
};

// Get Date object for end of local day
const getLocalEndOfDay = (dateString) => {
  const [year, month, day] = dateString.split("-").map(Number);

  return new Date(year, month - 1, day, 23, 59, 59, 999);
};

// Get tomorrow date string
const getTomorrowDateString = (dateString) => {
  const [year, month, day] = dateString.split("-").map(Number);

  const d = new Date(year, month - 1, day);
  d.setDate(d.getDate() + 1);

  return toDateString(d);
};

// ============================================================================
// 1. MONTH-YEAR DROPDOWN OPTIONS
// ============================================================================

router.get("/activity-month-options", (req, res) => {
  try {
    const startYear = 2026;
    const startMonth = 9;

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

    return res.json({
      success: true,
      options,
    });
  } catch (error) {
    console.error("Activity month options error:", error);

    return res.status(500).json({
      message: error.message,
    });
  }
});

// ============================================================================
// 2. MONTHLY ACTIVITY RECONCILIATION
// ============================================================================

router.get("/monthly-activity-reconciliation", async (req, res) => {
  try {
    const { employeeId, year, month } = req.query;

    // ------------------------------------------------------------------------
    // VALIDATION
    // ------------------------------------------------------------------------

    if (!employeeId) {
      return res.status(400).json({
        message: "Employee ID is required",
      });
    }

    const normalizedEmployeeId = employeeId.toUpperCase();

    // ------------------------------------------------------------------------
    // STAFF CHECK
    // ------------------------------------------------------------------------

    const staff = await Staff.findOne({
      id: employeeId,
    })
      .select("id activityRequired")
      .lean();

    if (!staff) {
      return res.status(404).json({
        message: "Employee not found",
      });
    }

    // ------------------------------------------------------------------------
    // ACTIVITY NOT REQUIRED
    // ------------------------------------------------------------------------

    if (staff.activityRequired === false) {
      return res.json({
        success: true,
        activityRequired: false,

        accumulatedSummary: {
          totalActivityMissed: 0,
          totalAttendanceMissed: 0,
          totalCompleted: 0,
          totalDiscrepancies: 0,
          since: "Sep 2026",
        },

        summary: {
          totalActivityMissed: 0,
          totalAttendanceMissed: 0,
          totalCompleted: 0,
          totalDiscrepancies: 0,
        },

        records: [],
      });
    }

    // ------------------------------------------------------------------------
    // DATE RANGE
    // ------------------------------------------------------------------------

    const ACCUMULATION_START_STR = "2026-09-01";

    const now = new Date();
    const todayStr = toDateString(now);

    /*
     * For selected month:
     *
     * Example:
     * year=2026
     * month=10
     *
     * monthStart = 2026-10-01
     * monthEnd   = 2026-10-31
     */

    let selectedMonthStart = ACCUMULATION_START_STR;
    let selectedMonthEnd = todayStr;

    const isAllMonths =
      !year ||
      !month ||
      year === "ALL" ||
      month === "ALL";

    if (!isAllMonths) {
      const numericYear = Number(year);
      const numericMonth = Number(month);

      if (
        !Number.isInteger(numericYear) ||
        !Number.isInteger(numericMonth) ||
        numericMonth < 1 ||
        numericMonth > 12
      ) {
        return res.status(400).json({
          message: "Invalid year or month",
        });
      }

      selectedMonthStart = getMonthStart(
        numericYear,
        numericMonth
      );

      selectedMonthEnd = getMonthEnd(
        numericYear,
        numericMonth
      );

      // Never show future dates
      if (selectedMonthEnd > todayStr) {
        selectedMonthEnd = todayStr;
      }
    }

    // ------------------------------------------------------------------------
    // ACTIVITY DATE RANGE
    // ------------------------------------------------------------------------

    const accumulationActivityStart =
      getLocalStartOfDay(ACCUMULATION_START_STR);

    const accumulationActivityEnd =
      getLocalEndOfDay(todayStr);

    // ------------------------------------------------------------------------
    // IMPORTANT OPTIMIZATION
    //
    // Instead of fetching every EmployeeDailyActivity document and then
    // summing hours in Node.js, MongoDB groups activity by employee + date.
    //
    // This is much cheaper when an employee has multiple activity entries
    // for the same day.
    // ------------------------------------------------------------------------

    const activityPromise = EmployeeDailyActivity.aggregate([
      {
        $match: {
          employeeId: normalizedEmployeeId,

          date: {
            $gte: accumulationActivityStart,
            $lte: accumulationActivityEnd,
          },
        },
      },

      {
        $group: {
          _id: {
            $dateToString: {
              format: "%Y-%m-%d",
              date: "$date",
            },
          },

          totalHours: {
            $sum: {
              $convert: {
                input: "$hoursSpent",
                to: "double",
                onError: 0,
                onNull: 0,
              },
            },
          },
        },
      },

      {
        $project: {
          _id: 0,
          date: "$_id",
          totalHours: 1,
        },
      },

      {
        $sort: {
          date: -1,
        },
      },
    ]).allowDiskUse(true);

    // ------------------------------------------------------------------------
    // ATTENDANCE QUERY
    //
    // Attendance date is stored as YYYY-MM-DD string.
    //
    // Only required fields are selected.
    // ------------------------------------------------------------------------

    const attendancePromise = Attendance.find({
      id: employeeId,

      date: {
        $gte: ACCUMULATION_START_STR,
        $lte: todayStr,
      },
    })
      .select("id date inTime outTime hours")
      .lean();

    // ------------------------------------------------------------------------
    // RUN BOTH QUERIES AT THE SAME TIME
    //
    // Previously these were executed one after another.
    // Promise.all allows MongoDB to process both operations concurrently.
    // ------------------------------------------------------------------------

    const [allActivityRecords, allAttendanceRecords] =
      await Promise.all([
        activityPromise,
        attendancePromise,
      ]);

    // ------------------------------------------------------------------------
    // BUILD ATTENDANCE MAP
    // ------------------------------------------------------------------------

    const attendanceMap = new Map();

    for (const att of allAttendanceRecords) {
      attendanceMap.set(att.date, att);
    }

    // ------------------------------------------------------------------------
    // BUILD ACTIVITY MAP
    //
    // MongoDB has already grouped the activity records.
    // ------------------------------------------------------------------------

    const activityMap = new Map();

    for (const act of allActivityRecords) {
      activityMap.set(act.date, {
        totalHours: Number(act.totalHours || 0),
      });
    }

    // ------------------------------------------------------------------------
    // COMBINE DATES
    // ------------------------------------------------------------------------

    const allDates = new Set([
      ...attendanceMap.keys(),
      ...activityMap.keys(),
    ]);

    // Since the activity aggregation and attendance records are already
    // limited to the required date range, sorting this list is inexpensive.
    const sortedDates = Array.from(allDates).sort(
      (a, b) => b.localeCompare(a)
    );

    // ------------------------------------------------------------------------
    // ACCUMULATED COUNTS
    // ------------------------------------------------------------------------

    let totalAccActivityMissed = 0;
    let totalAccAttendanceMissed = 0;

    // ------------------------------------------------------------------------
    // ONLY NON-COMPLETED RECORDS ARE STORED
    //
    // Completed days are not displayed anymore.
    // ------------------------------------------------------------------------

    const allReconciledRecords = [];

    // ------------------------------------------------------------------------
    // RECONCILIATION
    // ------------------------------------------------------------------------

    for (const dateStr of sortedDates) {
      // Safety check
      if (
        dateStr > todayStr ||
        dateStr < ACCUMULATION_START_STR
      ) {
        continue;
      }

      const att = attendanceMap.get(dateStr);
      const act = activityMap.get(dateStr);

      // --------------------------------------------------------------
      // Attendance conditions
      // --------------------------------------------------------------

      const hasInTime =
        !!(
          att &&
          typeof att.inTime === "string" &&
          att.inTime.trim() !== ""
        );

      const hasOutTime =
        !!(
          att &&
          typeof att.outTime === "string" &&
          att.outTime.trim() !== ""
        );

      // --------------------------------------------------------------
      // Activity condition
      // --------------------------------------------------------------

      const hasActivity =
        !!(
          act &&
          Number(act.totalHours || 0) > 0
        );

      const isToday =
        dateStr === todayStr;

      // --------------------------------------------------------------
      // Display values
      // --------------------------------------------------------------

      const attendanceHours = att
        ? att.hours || (hasInTime ? "Punched" : "-")
        : "Not Marked";

      const activityHours = act
        ? `${Number(act.totalHours || 0)} hrs`
        : "0 hrs";

      // --------------------------------------------------------------
      // Default = completed
      //
      // We don't actually need to store completed records.
      // --------------------------------------------------------------

      let status = "COMPLETED";
      let remarks = "Both Attendance and Activity updated";

      // ==============================================================
      // CASE 1
      // Attendance exists
      // Activity missing
      // ==============================================================

      if (hasInTime && !hasActivity) {
        // ------------------------------------------------------------
        // TODAY + IN TIME + NO OUT TIME
        //
        // Employee is still working.
        // Don't mark as missed.
        // ------------------------------------------------------------

        if (isToday && !hasOutTime) {
          status = "IN_PROGRESS";

          remarks =
            "Shift in progress (In-time marked, awaiting out-time)";
        } else {
          // ----------------------------------------------------------
          // Past day OR today after out-time
          // ----------------------------------------------------------

          status = "ACTIVITY_MISSED";

          remarks = isToday
            ? "Out-time punched, but activity sheet is missing"
            : "Attendance present, activity sheet missing";

          totalAccActivityMissed++;
        }
      }

      // ==============================================================
      // CASE 2
      // Activity exists
      // Attendance missing
      // ==============================================================

      else if (!hasInTime && hasActivity) {
        status = "ATTENDANCE_MISSED";

        remarks =
          "Activity filled, attendance not punched";

        totalAccAttendanceMissed++;
      }

      // ==============================================================
      // CASE 3
      // Nothing exists
      //
      // Skip completely.
      // ==============================================================

      else if (!hasInTime && !hasActivity) {
        continue;
      }

      // ==============================================================
      // CASE 4
      // Both exist
      //
      // Completed.
      // Don't push into records.
      // ==============================================================

      else {
        continue;
      }

      // --------------------------------------------------------------
      // Only send issues / in-progress records to frontend.
      // COMPLETED is never pushed.
      // --------------------------------------------------------------

      allReconciledRecords.push({
        date: dateStr,

        attendanceInTime:
          att?.inTime || null,

        attendanceOutTime:
          att?.outTime || null,

        workingHours:
          attendanceHours,

        activityHours:
          activityHours,

        status,

        remarks,
      });
    }

    // ------------------------------------------------------------------------
    // FILTER SELECTED MONTH
    // ------------------------------------------------------------------------

    let displayRecords;

    if (isAllMonths) {
      displayRecords = allReconciledRecords;
    } else {
      displayRecords = allReconciledRecords.filter(
        (record) =>
          record.date >= selectedMonthStart &&
          record.date <= selectedMonthEnd
      );
    }

    // ------------------------------------------------------------------------
    // SELECTED MONTH COUNTS
    //
    // We only count displayed issue records.
    // No COMPLETED calculation is necessary.
    // ------------------------------------------------------------------------

    let monthActivityMissed = 0;
    let monthAttendanceMissed = 0;

    for (const record of displayRecords) {
      if (record.status === "ACTIVITY_MISSED") {
        monthActivityMissed++;
      } else if (record.status === "ATTENDANCE_MISSED") {
        monthAttendanceMissed++;
      }
    }

    // ------------------------------------------------------------------------
    // RESPONSE
    // ------------------------------------------------------------------------

    return res.json({
      success: true,

      activityRequired: true,

      employeeId,

      accumulatedSummary: {
        totalActivityMissed:
          totalAccActivityMissed,

        totalAttendanceMissed:
          totalAccAttendanceMissed,

        /*
         * Kept for frontend compatibility.
         * Completed records are no longer calculated/displayed.
         */
        totalCompleted: 0,

        totalDiscrepancies:
          totalAccActivityMissed +
          totalAccAttendanceMissed,

        since: "Sep 2026",
      },

      summary: {
        totalActivityMissed:
          monthActivityMissed,

        totalAttendanceMissed:
          monthAttendanceMissed,

        /*
         * Kept for frontend compatibility.
         */
        totalCompleted: 0,

        totalDiscrepancies:
          monthActivityMissed +
          monthAttendanceMissed,
      },

      records: displayRecords,
    });
  } catch (error) {
    console.error(
      "Reconciliation error:",
      error
    );

    return res.status(500).json({
      message: error.message,
    });
  }
});

// ============================================================================
// 3. MISSING ACTIVITIES
// ============================================================================

router.get("/missing-activities", async (req, res) => {
  try {
    const { employeeId } = req.query;

    // ------------------------------------------------------------------------
    // VALIDATION
    // ------------------------------------------------------------------------

    if (!employeeId) {
      return res.status(400).json({
        message: "Employee ID is required",
      });
    }

    const normalizedEmployeeId =
      employeeId.toUpperCase();

    // ------------------------------------------------------------------------
    // STAFF
    // ------------------------------------------------------------------------

    const staff = await Staff.findOne({
      id: employeeId,
    })
      .select(
        "id activityRequired projectStartDate dateOfJoining"
      )
      .lean();

    if (!staff) {
      return res.status(404).json({
        message: "Employee not found",
      });
    }

    // ------------------------------------------------------------------------
    // ACTIVITY NOT REQUIRED
    // ------------------------------------------------------------------------

    if (staff.activityRequired === false) {
      return res.json({
        employeeId,

        activityRequired: false,

        totalMissingDays: 0,

        recentMissingDays: [],

        data: [],
      });
    }

    // ------------------------------------------------------------------------
    // FIND LAST ACTIVITY DATE
    // ------------------------------------------------------------------------

    const lastActivity =
      await EmployeeDailyActivity.findOne({
        employeeId: normalizedEmployeeId,

        date: {
          $lt: new Date(),
        },
      })
        .sort({
          date: -1,
        })
        .select("date")
        .lean();

    // ------------------------------------------------------------------------
    // DETERMINE START DATE
    // ------------------------------------------------------------------------

    let fromDate;

    if (lastActivity) {
      fromDate = new Date(
        lastActivity.date
      );
    } else if (staff.projectStartDate) {
      fromDate = new Date(
        staff.projectStartDate
      );
    } else if (staff.dateOfJoining) {
      fromDate = new Date(
        staff.dateOfJoining
      );
    } else {
      return res.json({
        employeeId,

        totalMissingDays: 0,

        recentMissingDays: [],

        data: [],
      });
    }

    fromDate.setHours(
      0,
      0,
      0,
      0
    );

    // ------------------------------------------------------------------------
    // TODAY
    // ------------------------------------------------------------------------

    const today = new Date();

    today.setHours(
      0,
      0,
      0,
      0
    );

    // ------------------------------------------------------------------------
    // ATTENDANCE START DATE
    // ------------------------------------------------------------------------

    const attendanceStart =
      toDateString(fromDate);

    const todayString =
      toDateString(today);

    // ------------------------------------------------------------------------
    // RUN ATTENDANCE + ACTIVITY TOGETHER
    //
    // We already know fromDate, so these two queries can run concurrently.
    // ------------------------------------------------------------------------

    const attendancePromise =
      Attendance.find({
        id: employeeId,

        inTime: {
          $exists: true,
          $ne: "",
        },

        date: {
          $gte: attendanceStart,

          /*
           * Preserve existing behavior:
           * today itself is excluded.
           */
          $lt: todayString,
        },
      })
        .select(
          "id name date"
        )
        .lean();

    // ------------------------------------------------------------------------
    // Activity aggregation
    //
    // We only need the dates, not every activity document.
    // ------------------------------------------------------------------------

    const activityPromise =
      EmployeeDailyActivity.aggregate([
        {
          $match: {
            employeeId:
              normalizedEmployeeId,

            date: {
              $gte: fromDate,
              $lt: today,
            },
          },
        },

        {
          $group: {
            _id: {
              $dateToString: {
                format: "%Y-%m-%d",
                date: "$date",
              },
            },
          },
        },

        {
          $project: {
            _id: 0,
            date: "$_id",
          },
        },
      ]).allowDiskUse(true);

    const [
      attendanceRecords,
      activityRecords,
    ] = await Promise.all([
      attendancePromise,
      activityPromise,
    ]);

    // ------------------------------------------------------------------------
    // NO ATTENDANCE
    // ------------------------------------------------------------------------

    if (attendanceRecords.length === 0) {
      return res.json({
        employeeId,

        totalMissingDays: 0,

        recentMissingDays: [],

        data: [],
      });
    }

    // ------------------------------------------------------------------------
    // ACTIVITY DATE SET
    // ------------------------------------------------------------------------

    const activitySet =
      new Set(
        activityRecords.map(
          (item) => item.date
        )
      );

    // ------------------------------------------------------------------------
    // FIND MISSING ACTIVITIES
    // ------------------------------------------------------------------------

    const missingActivities = [];

    for (const att of attendanceRecords) {
      if (!activitySet.has(att.date)) {
        missingActivities.push({
          employeeId: att.id,

          name: att.name,

          missingActivityDate:
            att.date,

          message:
            "You were present but activity sheet was not filled",
        });
      }
    }

    // ------------------------------------------------------------------------
    // SORT NEWEST FIRST
    // ------------------------------------------------------------------------

    missingActivities.sort(
      (a, b) =>
        new Date(
          b.missingActivityDate
        ) -
        new Date(
          a.missingActivityDate
        )
    );

    // ------------------------------------------------------------------------
    // RESPONSE
    // ------------------------------------------------------------------------

    return res.json({
      employeeId,

      lastActivityDate:
        lastActivity
          ? lastActivity.date
          : null,

      totalMissingDays:
        missingActivities.length,

      recentMissingDays:
        missingActivities.slice(0, 3),

      data: missingActivities,
    });
  } catch (error) {
    console.error(
      "Missing activities error:",
      error
    );

    return res.status(500).json({
      message: error.message,
    });
  }
});

// ============================================================================
// EXPORT
// ============================================================================

module.exports = router;