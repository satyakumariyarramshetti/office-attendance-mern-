import React, { useEffect, useState, useMemo } from "react";
import "./AttendanceSheet.css";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import XLSX from "xlsx-js-style";
import { FaEdit, FaSave, FaTimes } from "react-icons/fa";
import { calculateWorkingDays } from "../utils/workingDays";

const calculateTimeDifference = (startTime, endTime) => {
  if (!startTime || !endTime || startTime === "N/A" || endTime === "N/A")
    return "00:00";
  const startMins = timeToMinutes(startTime);
  const endMins = timeToMinutes(endTime);
  return minutesToHoursMinutes(endMins - startMins);
};

const calculateNetWorkingHours = (inTime, outTime, lunchOut, lunchIn) => {
  if (!inTime || !outTime || inTime === "N/A" || outTime === "N/A")
    return "00:00";
  const inMins = timeToMinutes(inTime);
  const outMins = timeToMinutes(outTime);
  let lunchMins = 0;
  if (lunchOut && lunchIn && lunchOut !== "N/A" && lunchIn !== "N/A") {
    const lOut = timeToMinutes(lunchOut);
    const lIn = timeToMinutes(lunchIn);
    if (lIn > lOut) lunchMins = lIn - lOut;
  }
  return minutesToHoursMinutes(outMins - inMins - lunchMins);
};
const computeGrossHours = (lunchHours, workingHours) => {
  const lMins = timeToMinutes(lunchHours);
  const wMins = timeToMinutes(workingHours);
  return minutesToHoursMinutes(lMins + wMins);
};
const timeToMinutes = (timeStr) => {
  if (!timeStr || !/^\d{2}:\d{2}$/.test(timeStr)) return 0;
  const [hours, minutes] = timeStr.split(":").map(Number);
  return hours * 60 + minutes;
};

const minutesToHoursMinutes = (totalMinutes) => {
  if (isNaN(totalMinutes) || totalMinutes < 0) return "00:00";
  const hours = Math.floor(totalMinutes / 60);
  const minutes = Math.round(totalMinutes % 60);
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
};

const AttendanceSheet = () => {
  const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:5000";
  const navigate = useNavigate();

  // --- States ---
  const [records, setRecords] = useState([]);
  const [festivalHolidays, setFestivalHolidays] = useState([]);
  const [staffRecords, setStaffRecords] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDate, setSelectedDate] = useState(""); // Specific Date Selection
  const [punchFilter, setPunchFilter] = useState("all");
  const [includeToday, setIncludeToday] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Default to Current Month and Year
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [showModal, setShowModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [holidayData, setHolidayData] = useState({ date: "", name: "" });
  const [grossHoursLimit, setGrossHoursLimit] = useState("6");
  const [isGrossHoursFilterActive, setIsGrossHoursFilterActive] =
    useState(false);
  const [editingRecordKey, setEditingRecordKey] = useState(null);
  const [editingTimes, setEditingTimes] = useState({});
  const [savingRecordKey, setSavingRecordKey] = useState(null);
  // --- Auth Check ---
  useEffect(() => {
    const isAuthenticated = localStorage.getItem("adminToken");
    if (!isAuthenticated) navigate("/admin-login");
  }, [navigate]);

  // --- Initial Fetch ---
  useEffect(() => {
    setLoading(true);

    const fetchStaff = fetch(`${API_BASE}/api/staffs`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch staff");
        return res.json();
      })
      .then((data) => {
        setStaffRecords(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        console.error("Staff fetch error:", err);
        setStaffRecords([]);
      });

    const fetchAttendance = fetch(`${API_BASE}/api/attendance/all`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch attendance");
        return res.json();
      })
      .then((data) => {
        setRecords(Array.isArray(data) ? data : []);
      });

    const fetchHolidays = fetch(`${API_BASE}/api/attendance/holidays/all`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch festival holidays");
        return res.json();
      })
      .then((data) => {
        setFestivalHolidays(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        // Attendance can still load if the holiday request fails.
        console.error("Festival holiday fetch error:", err);
        setFestivalHolidays([]);
      });

    Promise.all([fetchAttendance, fetchHolidays, fetchStaff])
      .catch((err) => {
        console.error("Fetch error:", err);
        setError("Failed to load attendance data");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [API_BASE]);

  const handleAddHoliday = async () => {
    if (!holidayData.date || !holidayData.name) {
      alert("Please fill both date and name");
      return;
    }
    try {
      await axios.post(
        `${API_BASE}/api/attendance/holidays/import`,
        holidayData,
      );
      alert("Festival Holiday Added!");
      setShowModal(false);
      setHolidayData({ date: "", name: "" });
      // Refresh list
      window.location.reload();
    } catch (err) {
      alert(err.response?.data?.error || "Error adding holiday");
    }
  };

  // --- Logic Helpers ---
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return isNaN(date) ? "" : date.toLocaleDateString("en-GB"); // DD/MM/YYYY
  };

  const getLeaveOrHoliday = (record) => {
    if (record.holidayName) return `Holiday - ${record.holidayName}`;
    if (record.leaveType) {
      if (
        record.halfDayReason &&
        (record.leaveType === "First Half Leave" ||
          record.leaveType === "Second Half Leave")
      ) {
        return `${record.leaveType} (${record.halfDayReason})`;
      }
      return record.leaveType;
    }
    return "N/A";
  };

  const isMissingTime = (value) => {
    if (value === null || value === undefined) return true;

    const normalizedValue = String(value).trim().toUpperCase();

    return (
      normalizedValue === "" ||
      normalizedValue === "N/A" ||
      normalizedValue === "—" ||
      normalizedValue === "-"
    );
  };

  const getRecordKey = (record) => `${record.id}_${record.date}`;

  const handleEditTimes = (record) => {
    setEditingRecordKey(getRecordKey(record));
    setEditingTimes({
      inTime: isMissingTime(record.inTime) ? "" : record.inTime,
      lunchOut: isMissingTime(record.lunchOut) ? "" : record.lunchOut,
      lunchIn: isMissingTime(record.lunchIn) ? "" : record.lunchIn,
      outTime: isMissingTime(record.outTime) ? "" : record.outTime,
    });
  };

  const handleSaveTimes = async (record) => {
    const recordKey = getRecordKey(record);
    setSavingRecordKey(recordKey);

    try {
      const response = await axios.patch(`${API_BASE}/api/attendance/time`, {
        id: record.id,
        date: record.date,
        name: record.name,
        day: record.day,
        ...editingTimes,
      });

      setRecords((previousRecords) => {
        const hasRecord = previousRecords.some(
          (item) => getRecordKey(item) === recordKey,
        );

        return hasRecord
          ? previousRecords.map((item) =>
              getRecordKey(item) === recordKey
                ? { ...item, ...response.data }
                : item,
            )
          : [...previousRecords, response.data];
      });
      setEditingRecordKey(null);
      setEditingTimes({});
    } catch (err) {
      alert(err.response?.data?.error || "Error updating attendance times");
    } finally {
      setSavingRecordKey(null);
    }
  };
  const getAttendanceMissingLabel = (record) => {
    const missingIn = isMissingTime(record.inTime);
    const missingOut = isMissingTime(record.outTime);

    if (missingIn && missingOut) {
      return "Both In Time & Out Time Missing";
    }

    if (missingIn) {
      return "In Time Missing";
    }

    if (missingOut) {
      return "Out Time Missing";
    }

    return "";
  };

  const isNoCategory = (record) => {
    const leaveType = String(record.leaveType ?? "")
      .trim()
      .toUpperCase();

    const emptyValues = ["", "N/A", "NA", "-", "—", "NONE", "NULL"];

    return emptyValues.includes(leaveType);
  };

  // Calculate the selected month's calendar and working days.
  const workingDaysSummary = useMemo(() => {
    return calculateWorkingDays(
      records,
      festivalHolidays,
      selectedMonth,
      selectedYear,
    );
  }, [records, festivalHolidays, selectedMonth, selectedYear]);
  // Generate missing attendance only from each employee's joining date.
  const missingAttendanceRecords = useMemo(() => {
    const attendanceMap = new Map();
    const holidayMap = new Set();
    const employeeMap = new Map();

    const toDateKey = (value) => {
      if (!value) return "";

      if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value)) {
        return value.slice(0, 10);
      }

      const date = new Date(value);
      if (Number.isNaN(date.getTime())) return "";

      return [
        date.getFullYear(),
        String(date.getMonth() + 1).padStart(2, "0"),
        String(date.getDate()).padStart(2, "0"),
      ].join("-");
    };

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayKey = toDateKey(today);

    // 1. Build employees from the Staff collection.
    staffRecords.forEach((staff) => {
      if (!staff.id || !staff.onboardingDate) return;

      const joiningDate = toDateKey(staff.onboardingDate);
      if (!joiningDate) return;

      employeeMap.set(String(staff.id).trim(), {
        id: String(staff.id).trim(),
        name: staff.name || "",
        onboardingDate: joiningDate,
        status: staff.status || "Active Employee",
        inactivationDate: staff.inactivationDate || null,
      });
    });

    // 2. Index existing attendance by employee ID and date.
    records.forEach((record) => {
      const id = String(record.id || "").trim();
      const dateKey = toDateKey(record.date);

      if (!id || !dateKey) return;

      const key = `${id}_${dateKey}`;

      if (!attendanceMap.has(key)) {
        attendanceMap.set(key, []);
      }

      attendanceMap.get(key).push(record);

      if (record.holidayName) {
        holidayMap.add(dateKey);
      }
    });

    // 3. Add festival holidays.
    festivalHolidays.forEach((holiday) => {
      const dateKey = toDateKey(holiday.date);
      if (dateKey && holiday.name) {
        holidayMap.add(dateKey);
      }
    });

    // 4. Determine the date range to inspect.
    let datesToCheck = [];

    if (selectedDate) {
      datesToCheck = [selectedDate];
    } else if (selectedMonth && selectedYear) {
      const year = Number(selectedYear);
      const month = Number(selectedMonth);

      const daysInMonth = new Date(year, month, 0).getDate();

      for (let day = 1; day <= daysInMonth; day++) {
        datesToCheck.push(
          `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
        );
      }
    } else {
      // All Months / All Years: inspect dates from the earliest
      // employee joining date through today.
      const joiningDates = [...employeeMap.values()]
        .map((employee) => employee.onboardingDate)
        .sort();

      if (!joiningDates.length) return [];

      const firstDate = joiningDates[0];
      const start = new Date(`${firstDate}T00:00:00`);

      for (
        let date = new Date(start);
        toDateKey(date) <= todayKey;
        date.setDate(date.getDate() + 1)
      ) {
        datesToCheck.push(toDateKey(date));
      }
    }

    // 5. Generate missing attendance for working days.
    const missing = [];

    datesToCheck.forEach((dateKey) => {
      // Do not check future dates or today unless requested.
      if (dateKey > todayKey) return;
      if (dateKey === todayKey && !includeToday) return;

      // Exclude public/festival holidays.
      if (holidayMap.has(dateKey)) return;

      const date = new Date(`${dateKey}T00:00:00`);
      const day = date.getDate();

      // Exclude Sundays and second Saturdays.
      if (
        date.getDay() === 0 ||
        (date.getDay() === 6 && Math.ceil(day / 7) === 2)
      ) {
        return;
      }

      employeeMap.forEach((employee) => {
        // IMPORTANT: Never check attendance before joining.
        if (dateKey < employee.onboardingDate) return;

        // Exclude dates on/after the employee's inactivation date.
        if (
          employee.status.trim().toLowerCase() === "inactive employee" &&
          employee.inactivationDate
        ) {
          const inactiveDate = toDateKey(employee.inactivationDate);

          if (inactiveDate && dateKey >= inactiveDate) return;
        }

        const key = `${employee.id}_${dateKey}`;
        const employeeRecords = attendanceMap.get(key) || [];

        // Exclude leave and employee-specific holiday records.
        const hasLeaveOrHoliday = employeeRecords.some(
          (record) => record.holidayName || record.leaveType,
        );

        if (hasLeaveOrHoliday) return;

        // If any attendance punch exists, do not flag the day.
        const hasAnyPunch = employeeRecords.some(
          (record) =>
            !isMissingTime(record.inTime) || !isMissingTime(record.outTime),
        );

        if (hasAnyPunch) return;

        missing.push({
          ...(employeeRecords[0] || {}),
          id: employee.id,
          name: employee.name,
          date: dateKey,
          day: date.toLocaleDateString("en-US", {
            weekday: "long",
          }),
          inTime: null,
          outTime: null,
          missingAttendance: true,
        });
      });
    });

    return missing;
  }, [
    records,
    festivalHolidays,
    staffRecords,
    selectedMonth,
    selectedYear,
    selectedDate,
    includeToday,
  ]);

  // --- Filtering Logic (Search + Month + Year + DatePicker + Punch Filter) ---
  const filteredRecords = useMemo(() => {
    // Always use actual attendance records as the main source.
    // Add generated full-day missing attendance when requested.
    const sourceRecords =
      punchFilter === "missing-day"
        ? [...records, ...missingAttendanceRecords]
        : records;

    return sourceRecords.filter((record) => {
      const dateObj = new Date(record.date);
      const recMonth = dateObj.getMonth() + 1;
      const recYear = dateObj.getFullYear();

      // Keep existing Month / Year filters
      const monthMatch = !selectedMonth || recMonth === Number(selectedMonth);

      const yearMatch = !selectedYear || recYear === Number(selectedYear);

      // Keep Specific Date filter
      let datePickerMatch = true;

      if (selectedDate) {
        const selectedDateObj = new Date(`${selectedDate}T00:00:00`);

        datePickerMatch =
          selectedDateObj.toDateString() === dateObj.toDateString();
      }

      // Keep Employee Search
      const term = searchTerm.toLowerCase().trim();

      const idMatch = String(record.id || "")
        .toLowerCase()
        .includes(term);

      const nameMatch = String(record.name || "")
        .toLowerCase()
        .includes(term);

      // Category: include leaveType and dailyLeaveType
      // Category filter = ONLY leaveType
      const leaveTypeValue = String(record.leaveType ?? "").trim();

      const categoryMatch =
        selectedCategory === "all"
          ? true
          : selectedCategory === "N/A"
            ? isNoCategory(record)
            : selectedCategory === "C-off Leave"
              ? leaveTypeValue.toLowerCase().startsWith("c-off leave")
              : leaveTypeValue === selectedCategory;

      // Gross Hours
      let grossHoursMatch = true;

      if (isGrossHoursFilterActive && grossHoursLimit.trim() !== "") {
        const hasInTime = !isMissingTime(record.inTime);
        const hasOutTime = !isMissingTime(record.outTime);

        if (!hasInTime || !hasOutTime) {
          grossHoursMatch = false;
        } else {
          const lunchHours = calculateTimeDifference(
            record.lunchOut,
            record.lunchIn,
          );

          const workingHours = calculateNetWorkingHours(
            record.inTime,
            record.outTime,
            record.lunchOut,
            record.lunchIn,
          );

          const grossHours = computeGrossHours(lunchHours, workingHours);

          const [hours, minutes] = grossHours.split(":").map(Number);
          const grossTotalMinutes = hours * 60 + minutes;
          const grossLimitMinutes = Number(grossHoursLimit) * 60;

          grossHoursMatch =
            Number.isFinite(grossLimitMinutes) &&
            grossLimitMinutes >= 0 &&
            grossTotalMinutes <= grossLimitMinutes;
        }
      }

      // Missing In / Out / Full-day attendance
      let punchMatch = true;

      if (punchFilter !== "all") {
        const isHoliday = !!record.holidayName;

        const isLeave = !!record.leaveType;

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const recordDate = new Date(record.date);
        recordDate.setHours(0, 0, 0, 0);

        const isToday = recordDate.getTime() === today.getTime();

        if (punchFilter === "missing-day") {
          const todayAllowed = includeToday || !isToday;

          punchMatch =
            todayAllowed &&
            (!!record.missingAttendance ||
              (!isHoliday &&
                !isLeave &&
                (isMissingTime(record.inTime) ||
                  isMissingTime(record.outTime))));
        } else if (isHoliday || isLeave) {
          punchMatch = false;
        } else {
          const missingIn = isMissingTime(record.inTime);
          const missingOut = isMissingTime(record.outTime);

          switch (punchFilter) {
            case "in":
              punchMatch = missingIn;
              break;

            case "out":
              punchMatch = (includeToday || !isToday) && missingOut;
              break;

            case "both":
              punchMatch =
                (includeToday || !isToday) && (missingIn || missingOut);
              break;

            default:
              punchMatch = true;
          }
        }
      }

      // Group 1: Attendance exceptions
      const attendanceGroupActive = punchFilter !== "all";
      const attendanceGroupMatch = attendanceGroupActive && punchMatch;

      // Group 2: Gross Hours + Category.
      // When both are selected, BOTH conditions must match.
      // -------------------------------
      // FILTER GROUPS
      // -------------------------------

      const grossFilterActive =
        isGrossHoursFilterActive && grossHoursLimit.trim() !== "";

      const categoryFilterActive = selectedCategory !== "all";

      // Attendance filter

      // Gross + Category are AND conditions
      let grossCategoryMatch = true;

      if (grossFilterActive) {
        grossCategoryMatch = grossCategoryMatch && grossHoursMatch;
      }

      if (categoryFilterActive) {
        grossCategoryMatch = grossCategoryMatch && categoryMatch;
      }

      // Final filter
      let combinedFilterMatch = true;

      // If Attendance filter is selected AND Gross/Category filters
      // are selected, preserve OR between the two groups.
      if (
        attendanceGroupActive &&
        (grossFilterActive || categoryFilterActive)
      ) {
        combinedFilterMatch = attendanceGroupMatch || grossCategoryMatch;
      } else if (attendanceGroupActive) {
        combinedFilterMatch = attendanceGroupMatch;
      } else if (grossFilterActive || categoryFilterActive) {
        combinedFilterMatch = grossCategoryMatch;
      }

      return (
        monthMatch &&
        yearMatch &&
        datePickerMatch &&
        (idMatch || nameMatch) &&
        combinedFilterMatch
      );
    });
  }, [
    records,
    missingAttendanceRecords,
    selectedMonth,
    selectedYear,
    selectedDate,
    searchTerm,
    punchFilter,
    includeToday,
    grossHoursLimit,
    isGrossHoursFilterActive,
    selectedCategory,
  ]);

  const exportToExcel = () => {
    // 1. డేటాను సార్ట్ చేయడం (1st to Last Date)
    const sortedRecords = [...filteredRecords].sort(
      (a, b) => new Date(a.date) - new Date(b.date),
    );

    const allRows = sortedRecords.map((record) => {
      const lunchHours = calculateTimeDifference(
        record.lunchOut,
        record.lunchIn,
      );
      const workingHours = calculateNetWorkingHours(
        record.inTime,
        record.outTime,
        record.lunchOut,
        record.lunchIn,
      );
      const isHoliday = !!record.holidayName;

      return {
        ID: record.id,
        Name: record.name,
        Date: formatDate(record.date),
        Day: record.day,
        "In Time": isHoliday ? "—" : record.inTime || "—",
        "System In Time": isHoliday ? "—" : record.systemInTime || "N/A",
        "Delay Reason": record.delayReason || "",
        "Lunch Out": isHoliday ? "—" : record.lunchOut || "—",
        "Lunch In": isHoliday ? "—" : record.lunchIn || "—",
        "Out Time": isHoliday ? "—" : record.outTime || "—",
        "System Out Time": isHoliday ? "—" : record.systemOutTime || "—",
        "Lunch Hours": isHoliday ? "—" : lunchHours,
        "Working Hours": isHoliday ? "—" : workingHours,
        "Gross Hours": isHoliday
          ? "—"
          : computeGrossHours(lunchHours, workingHours),
        "Daily Leave Type": record.dailyLeaveType || "N/A",
        "Site Comments": record.siteComments || "",
        Permission: record.permissionType || "N/A",
        Hours: record.hours || "N/A",
        "Leave Type": isHoliday
          ? `Holiday - ${record.holidayName}`
          : record.missingAttendance
            ? "Employee Missed Attendance"
            : getLeaveOrHoliday(record),
      };
    });

    const wb = XLSX.utils.book_new();
    const uniqueIds = [...new Set(allRows.map((row) => row.ID))].sort(); // Tabs Order Wise

    uniqueIds.forEach((empId) => {
      const empData = allRows.filter((row) => row.ID === empId);
      const ws = XLSX.utils.json_to_sheet(empData);

      // --- స్టైలింగ్ లాజిక్ (Borders & Alignment) ---
      const range = XLSX.utils.decode_range(ws["!ref"]);
      for (let R = range.s.r; R <= range.e.r; ++R) {
        for (let C = range.s.c; C <= range.e.c; ++C) {
          const cell_address = XLSX.utils.encode_cell({ r: R, c: C });
          if (!ws[cell_address]) continue;

          // సెల్ స్టైల్ సెట్ చేయడం
          ws[cell_address].s = {
            alignment: {
              horizontal: "center",
              vertical: "center",
              wrapText: true,
            },
            border: {
              top: { style: "thin", color: { rgb: "000000" } },
              bottom: { style: "thin", color: { rgb: "000000" } },
              left: { style: "thin", color: { rgb: "000000" } },
              right: { style: "thin", color: { rgb: "000000" } },
            },
            font: R === 0 ? { bold: true } : {}, // మొదటి రో (Headers) ని బోల్డ్ చేయడం
          };
        }
      }

      // కాలమ్ వెడల్పు ఆటోమేటిక్‌గా అడ్జస్ట్ చేయడం
      const colWidths = Object.keys(empData[0] || {}).map((key) => ({
        wch: 15,
      }));
      ws["!cols"] = colWidths;

      XLSX.utils.book_append_sheet(wb, ws, String(empId).slice(0, 31));
    });

    XLSX.writeFile(
      wb,
      `Attendance_Report_${selectedMonth}_${selectedYear}.xlsx`,
    );
  };

  const exportPendingUpdatesToExcel = () => {
    // Use exactly the records currently displayed in the UI.
    // Do not apply any additional filters or generate new records here.
    const sortedRecords = [...filteredRecords].sort((a, b) => {
      const employeeA = String(a.id || "").trim();
      const employeeB = String(b.id || "").trim();

      const employeeCompare = employeeA.localeCompare(employeeB, undefined, {
        numeric: true,
        sensitivity: "base",
      });

      if (employeeCompare !== 0) {
        return employeeCompare;
      }

      return new Date(a.date) - new Date(b.date);
    });

    if (sortedRecords.length === 0) {
      alert("No records match the currently applied filters.");
      return;
    }

    const headers = [
      "Employee ID",
      "Employee Name",
      "Date",
      "Day",
      "Pending Update",
      "In Time",
      "System In Time",
      "Delay Reason",
      "Lunch Out",
      "Lunch In",
      "Out Time",
      "System Out Time",
      "Lunch Hours",
      "Working Hours",
      "Gross Hours",
      "Leave Type",
      "Daily Leave Type",
      "Site Comments",
      "Permission",
      "Hours",
      "Category",
      "Location",
    ];

    const getPendingUpdate = (record) => {
      const pendingUpdates = [];

      // 1. Missing In / Out / Both / Full-day attendance
      if (punchFilter !== "all") {
        const isHoliday = !!record.holidayName;
        const isLeave = !!record.leaveType;

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const recordDate = new Date(record.date);
        recordDate.setHours(0, 0, 0, 0);

        const isToday = recordDate.getTime() === today.getTime();

        if (!isHoliday && !isLeave) {
          const missingIn = isMissingTime(record.inTime);
          const missingOut = isMissingTime(record.outTime);

          if (punchFilter === "in" && missingIn) {
            pendingUpdates.push("In Time Missing");
          }

          if (
            punchFilter === "out" &&
            (includeToday || !isToday) &&
            missingOut
          ) {
            pendingUpdates.push("Out Time Missing");
          }

          if (
            punchFilter === "both" &&
            (includeToday || !isToday) &&
            (missingIn || missingOut)
          ) {
            if (missingIn && missingOut) {
              pendingUpdates.push("Both In Time & Out Time Missing");
            } else if (missingIn) {
              pendingUpdates.push("In Time Missing");
            } else if (missingOut) {
              pendingUpdates.push("Out Time Missing");
            }
          }
        }

        if (
          punchFilter === "missing-day" &&
          (includeToday || !isToday) &&
          (record.missingAttendance ||
            (!isHoliday &&
              !isLeave &&
              (isMissingTime(record.inTime) || isMissingTime(record.outTime))))
        ) {
          pendingUpdates.push("Employee Missed Attendance");
        }
      }

      // 2. Gross Hours
      if (isGrossHoursFilterActive && grossHoursLimit.trim() !== "") {
        const hasInTime = !isMissingTime(record.inTime);
        const hasOutTime = !isMissingTime(record.outTime);

        if (hasInTime && hasOutTime) {
          const lunchHours = calculateTimeDifference(
            record.lunchOut,
            record.lunchIn,
          );

          const workingHours = calculateNetWorkingHours(
            record.inTime,
            record.outTime,
            record.lunchOut,
            record.lunchIn,
          );

          const grossHours = computeGrossHours(lunchHours, workingHours);

          const [hours, minutes] = grossHours.split(":").map(Number);
          const grossTotalMinutes = hours * 60 + minutes;
          const grossLimitMinutes = Number(grossHoursLimit) * 60;

          const grossHoursPassed =
            Number.isFinite(grossLimitMinutes) &&
            grossLimitMinutes >= 0 &&
            grossTotalMinutes <= grossLimitMinutes;

          if (grossHoursPassed) {
            pendingUpdates.push(`Gross Hours (Max: ${grossHoursLimit})`);
          }
        }
      }

      // 3. Category
      if (selectedCategory !== "all") {
        const leaveTypeValue = String(record.leaveType ?? "").trim();
        const categoryPassed =
          selectedCategory === "N/A"
            ? !leaveTypeValue && !record.holidayName
            : leaveTypeValue === selectedCategory;

        if (categoryPassed) {
          pendingUpdates.push(`Category: ${selectedCategory}`);
        }
      }

      return pendingUpdates.length ? pendingUpdates.join(", ") : "—";
    };

    // Export the same fields and values displayed by the UI.
    const rows = sortedRecords.map((record) => {
      const isHoliday = !!record.holidayName;

      const lunchHours = calculateTimeDifference(
        record.lunchOut,
        record.lunchIn,
      );

      const workingHours = calculateNetWorkingHours(
        record.inTime,
        record.outTime,
        record.lunchOut,
        record.lunchIn,
      );

      const grossHours = computeGrossHours(lunchHours, workingHours);

      return {
        "Employee ID": record.id || "",
        "Employee Name": record.name || "",
        Date: formatDate(record.date),
        Day:
          record.day ||
          new Date(record.date).toLocaleDateString("en-US", {
            weekday: "long",
          }),
        "Pending Update": getPendingUpdate(record),

        "In Time": isHoliday ? "—" : record.inTime || "—",
        "System In Time": isHoliday ? "—" : record.systemInTime || "—",
        "Delay Reason": record.delayReason || "—",
        "Lunch Out": isHoliday ? "—" : record.lunchOut || "—",
        "Lunch In": isHoliday ? "—" : record.lunchIn || "—",
        "Out Time": isHoliday ? "—" : record.outTime || "—",
        "System Out Time": isHoliday ? "—" : record.systemOutTime || "—",
        "Lunch Hours": isHoliday ? "—" : lunchHours,
        "Working Hours": isHoliday ? "—" : workingHours,
        "Gross Hours": isHoliday ? "—" : grossHours,
        "Leave Type": isHoliday
          ? `Holiday: ${record.holidayName}`
          : record.missingAttendance
            ? "Employee Missed Attendance"
            : punchFilter !== "all" && !record.leaveType
              ? getAttendanceMissingLabel(record)
              : getLeaveOrHoliday(record),

        "Daily Leave Type": record.dailyLeaveType || "—",
        "Site Comments": record.siteComments || "—",
        Permission: record.permissionType || "—",
        Hours: record.hours ?? "—",

        Category: record.leaveType || "N/A",

        Location: record.location || "N/A",
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(rows, {
      header: headers,
    });

    // Column widths
    worksheet["!cols"] = [
      { wch: 15 },
      { wch: 23 },
      { wch: 14 },
      { wch: 14 },
      { wch: 35 },
      { wch: 13 },
      { wch: 16 },
      { wch: 22 },
      { wch: 13 },
      { wch: 13 },
      { wch: 13 },
      { wch: 14 },
      { wch: 16 },
      { wch: 14 },
      { wch: 30 },
      { wch: 22 },
      { wch: 30 },
      { wch: 15 },
      { wch: 12 },
      { wch: 22 },
      { wch: 18 },
    ];

    // Apply styling
    const range = XLSX.utils.decode_range(worksheet["!ref"]);

    for (let row = range.s.r; row <= range.e.r; row++) {
      for (let col = range.s.c; col <= range.e.c; col++) {
        const address = XLSX.utils.encode_cell({
          r: row,
          c: col,
        });

        if (!worksheet[address]) continue;

        worksheet[address].s = {
          font: {
            name: "Aptos",
            sz: 10,
            bold: row === 0,
            color: {
              rgb: row === 0 ? "FFFFFF" : "243247",
            },
          },
          fill: {
            fgColor: {
              rgb: row === 0 ? "1F4E78" : row % 2 === 0 ? "F3F7FC" : "FFFFFF",
            },
          },
          alignment: {
            horizontal: "center",
            vertical: "center",
            wrapText: true,
          },
          border: {
            top: {
              style: "thin",
              color: { rgb: "D6DEE8" },
            },
            bottom: {
              style: "thin",
              color: { rgb: "D6DEE8" },
            },
            left: {
              style: "thin",
              color: { rgb: "D6DEE8" },
            },
            right: {
              style: "thin",
              color: { rgb: "D6DEE8" },
            },
          },
        };
      }
    }

    worksheet["!rows"] = [{ hpt: 30 }];

    if (worksheet["!ref"]) {
      worksheet["!autofilter"] = {
        ref: worksheet["!ref"],
      };
    }

    worksheet["!freeze"] = {
      xSplit: 0,
      ySplit: 1,
    };

    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(workbook, worksheet, "Pending Updates");

    XLSX.writeFile(
      workbook,
      `Pending_Updates_${selectedMonth || "AllMonths"}_${
        selectedYear || "AllYears"
      }.xlsx`,
    );
  };

  const allYears = Array.from(
    new Set(records.map((r) => new Date(r.date).getFullYear())),
  )
    .filter(Boolean)
    .sort((a, b) => b - a);

  const categoryOptions = useMemo(() => {
    const categories = new Set();

    records.forEach((record) => {
      const category = String(record.leaveType || "").trim();

      if (!category) return;

      // Keep all C-off Leave variations out of dynamic options.
      if (category.toLowerCase().startsWith("c-off leave")) return;

      categories.add(category);
    });

    // Add exactly one standard C-off Leave option.
    categories.add("C-off Leave");

    return [...categories].sort((a, b) => a.localeCompare(b));
  }, [records]);

  const handleResetFilters = () => {
    const now = new Date();

    setSelectedMonth(now.getMonth() + 1);
    setSelectedYear(now.getFullYear());
    setPunchFilter("all");
    setIncludeToday(false);
    setGrossHoursLimit("6");
    setIsGrossHoursFilterActive(false);
    setSelectedCategory("all");
    setSelectedDate("");
    setSearchTerm("");
  };

  return (
    <div className="container admin-container mt-4">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h2 className="admin-title">Attendance Sheet</h2>
        {/* --- ADD HOLIDAY BUTTON --- */}
        <button className="btn btn-danger" onClick={() => setShowModal(true)}>
          + Add Festival Holiday
        </button>
      </div>

      {/* --- HOLIDAY MODAL --- */}
      {showModal && (
        <div className="modal-overlay">
          <div className="holiday-modal">
            <h4>Add Festival Holiday</h4>
            <div className="mb-3">
              <label>Holiday Date</label>
              <input
                type="date"
                className="form-control"
                value={holidayData.date}
                onChange={(e) =>
                  setHolidayData({ ...holidayData, date: e.target.value })
                }
              />
            </div>
            <div className="mb-3">
              <label>Holiday Name</label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. Diwali"
                value={holidayData.name}
                onChange={(e) =>
                  setHolidayData({ ...holidayData, name: e.target.value })
                }
              />
            </div>
            <div className="d-flex justify-content-end gap-2">
              <button
                className="btn btn-secondary"
                onClick={() => setShowModal(false)}
              >
                Cancel
              </button>
              <button className="btn btn-primary" onClick={handleAddHoliday}>
                Save Holiday
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- Filter Toolbar --- */}
      <div className="attendance-toolbar">
        <div className="filter-group">
          {/* Month */}
          <div className="select-box">
            <label>Month</label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
            >
              <option value="">All Months</option>

              {Array.from({ length: 12 }, (_, i) => (
                <option key={i + 1} value={i + 1}>
                  {new Date(0, i).toLocaleString("default", {
                    month: "long",
                  })}
                </option>
              ))}
            </select>
          </div>

          {/* Year */}
          <div className="select-box">
            <label>Year</label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
            >
              <option value="">All Years</option>

              {allYears.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>

          {/* Missing Attendance */}
          <div className="select-box">
            <label>Missing Attendance</label>

            <select
              value={punchFilter}
              onChange={(e) => setPunchFilter(e.target.value)}
            >
              <option value="all">All Records</option>
              <option value="in">In Time Missing</option>
              <option value="out">Out Time Missing</option>
              <option value="both">Both In Time & Out Time Missing</option>
              <option value="missing-day">Employee Missed Attendance</option>
            </select>
          </div>

          {/* Include Today */}
          <div className="include-today-filter">
            <input
              id="includeToday"
              type="checkbox"
              checked={includeToday}
              onChange={(e) => setIncludeToday(e.target.checked)}
            />

            <label htmlFor="includeToday">Include Today</label>
          </div>

          {/* Gross Hours */}
          <div className="select-box">
            <label>Gross Hours (Max)</label>

            <div className="gross-hours-control">
              <input
                type="number"
                min="0"
                max="24"
                step="0.5"
                value={grossHoursLimit}
                readOnly={!isGrossHoursFilterActive}
                onClick={() => {
                  if (!isGrossHoursFilterActive) {
                    setIsGrossHoursFilterActive(true);
                  }
                }}
                onChange={(e) => setGrossHoursLimit(e.target.value)}
                placeholder="Enter hours"
              />

              <button
                type="button"
                className={`gross-toggle ${
                  isGrossHoursFilterActive ? "active" : ""
                }`}
                onClick={() =>
                  setIsGrossHoursFilterActive((previous) => !previous)
                }
              >
                {isGrossHoursFilterActive ? "On" : "Off"}
              </button>
            </div>
          </div>

          {/* Category */}
          <div className="select-box">
            <label>Category</label>

            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              <option value="all">All Categories</option>
              <option value="N/A">N/A (No Category)</option>

              {categoryOptions.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>

          {/* Specific Date */}
          <div className="select-box">
            <label>Specific Date</label>

            <div className="date-input-wrapper">
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
              />

              {selectedDate && (
                <button
                  type="button"
                  className="clear-btn"
                  onClick={() => setSelectedDate("")}
                >
                  ×
                </button>
              )}
            </div>
          </div>

          {/* Search */}
          <div className="search-box-wrapper">
            <label>Search Staff</label>

            <input
              type="text"
              placeholder="Search by ID or Name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Reset */}
          <button
            type="button"
            className="reset-filters-btn"
            onClick={handleResetFilters}
          >
            ↻ Reset Filters
          </button>
        </div>
      </div>

      <div className="filter-result-count">
        <strong>{filteredRecords.length}</strong> records found
      </div>
      <div className="working-days-summary">
        <div className="summary-card">
          <span>Calendar Days</span>
          <strong>{workingDaysSummary.totalDays}</strong>
        </div>

        <div className="summary-card">
          <span>Holidays & Weekly Offs</span>
          <strong>{workingDaysSummary.holidays}</strong>
        </div>

        <div className="summary-card">
          <span>Working Days</span>
          <strong>{workingDaysSummary.workingDays}</strong>
        </div>
      </div>

      {loading && <p className="status-msg">Loading records...</p>}
      {error && <p className="status-msg error">{error}</p>}

      {!loading && !error && (
        <>
          <div className="table-responsive scrollable-table-container">
            <table className="table table-bordered admin-table">
              <thead>
                <tr>
                  <th>Actions</th>
                  <th>ID</th>
                  <th>Name</th>
                  <th>Date</th>
                  <th>Day</th>
                  <th>In Time</th>
                  <th>System In</th>
                  <th>Delay Reason</th>
                  <th>Lunch Out</th>
                  <th>Lunch In</th>
                  <th>Out Time</th>
                  <th>System Out</th>
                  <th>Lunch Hrs</th>
                  <th>Work Hrs</th>
                  <th>Gross Hrs</th>
                  <th>Leave Type</th>
                  <th>Site Comments</th>
                  <th>Permission</th>
                  <th>Hrs</th>
                  <th>Category</th>
                  <th>Location</th>
                </tr>
              </thead>
              <tbody>
                {filteredRecords.length > 0 ? (
                  filteredRecords.map((record, idx) => {
                    const lunchH = calculateTimeDifference(
                      record.lunchOut,
                      record.lunchIn,
                    );
                    const workH = calculateNetWorkingHours(
                      record.inTime,
                      record.outTime,
                      record.lunchOut,
                      record.lunchIn,
                    );
                    const grossH = computeGrossHours(lunchH, workH);
                    const isHoliday = !!record.holidayName;
                    const recordKey = getRecordKey(record);
                    const isEditing = editingRecordKey === recordKey;
                    const isSaving = savingRecordKey === recordKey;

                    return (
                      <tr
                        key={recordKey || idx}
                        className={record.isLOP ? "lop-leave-row" : ""}
                      >
                        <td className="attendance-row-actions">
                          {isEditing ? (
                            <>
                              <button
                                type="button"
                                className="attendance-row-action save"
                                aria-label={`Save times for ${record.name} on ${formatDate(record.date)}`}
                                title="Save times"
                                disabled={isSaving}
                                onClick={() => handleSaveTimes(record)}
                              >
                                <FaSave />
                              </button>
                              <button
                                type="button"
                                className="attendance-row-action cancel"
                                aria-label="Cancel time editing"
                                title="Cancel"
                                disabled={isSaving}
                                onClick={() => {
                                  setEditingRecordKey(null);
                                  setEditingTimes({});
                                }}
                              >
                                <FaTimes />
                              </button>
                            </>
                          ) : (
                            <button
                              type="button"
                              className="attendance-row-action edit"
                              aria-label={`Edit times for ${record.name} on ${formatDate(record.date)}`}
                              title={
                                isHoliday
                                  ? "Holiday times cannot be edited"
                                  : "Edit times"
                              }
                              disabled={isHoliday || editingRecordKey !== null}
                              onClick={() => handleEditTimes(record)}
                            >
                              <FaEdit />
                            </button>
                          )}
                        </td>
                        <td>{record.id}</td>
                        <td>{record.name}</td>
                        <td>{formatDate(record.date)}</td>
                        <td>{record.day}</td>

                        {/* Attendance fields check for holiday */}
                        <td>
                          {isEditing ? (
                            <input
                              type="time"
                              aria-label={`In Time for ${record.name} on ${formatDate(record.date)}`}
                              value={editingTimes.inTime}
                              onChange={(e) =>
                                setEditingTimes((previous) => ({
                                  ...previous,
                                  inTime: e.target.value,
                                }))
                              }
                            />
                          ) : isHoliday ? (
                            "—"
                          ) : (
                            record.inTime || "—"
                          )}
                        </td>
                        <td>{isHoliday ? "—" : record.systemInTime || "—"}</td>
                        <td>{record.delayReason || "—"}</td>
                        <td>
                          {isEditing ? (
                            <input
                              type="time"
                              aria-label={`Lunch Out for ${record.name} on ${formatDate(record.date)}`}
                              value={editingTimes.lunchOut}
                              onChange={(e) =>
                                setEditingTimes((previous) => ({
                                  ...previous,
                                  lunchOut: e.target.value,
                                }))
                              }
                            />
                          ) : isHoliday ? (
                            "—"
                          ) : (
                            record.lunchOut || "—"
                          )}
                        </td>
                        <td>
                          {isEditing ? (
                            <input
                              type="time"
                              aria-label={`Lunch In for ${record.name} on ${formatDate(record.date)}`}
                              value={editingTimes.lunchIn}
                              onChange={(e) =>
                                setEditingTimes((previous) => ({
                                  ...previous,
                                  lunchIn: e.target.value,
                                }))
                              }
                            />
                          ) : isHoliday ? (
                            "—"
                          ) : (
                            record.lunchIn || "—"
                          )}
                        </td>
                        <td>
                          {isEditing ? (
                            <input
                              type="time"
                              aria-label={`Out Time for ${record.name} on ${formatDate(record.date)}`}
                              value={editingTimes.outTime}
                              onChange={(e) =>
                                setEditingTimes((previous) => ({
                                  ...previous,
                                  outTime: e.target.value,
                                }))
                              }
                            />
                          ) : isHoliday ? (
                            "—"
                          ) : (
                            record.outTime || "—"
                          )}
                        </td>
                        <td>{isHoliday ? "—" : record.systemOutTime || "—"}</td>
                        <td>{isHoliday ? "—" : lunchH}</td>
                        <td>{isHoliday ? "—" : workH}</td>
                        <td>{isHoliday ? "—" : grossH}</td>

                        <td>{record.dailyLeaveType || "—"}</td>
                        <td className="comment-cell">
                          {record.siteComments || "—"}
                        </td>
                        <td>{record.permissionType || "—"}</td>
                        <td>{record.hours || "—"}</td>

                        <td className={isHoliday ? "holiday-text" : ""}>
                          {isHoliday
                            ? `Holiday: ${record.holidayName}`
                            : record.missingAttendance
                              ? "Employee Missed Attendance"
                              : punchFilter !== "all" && !record.leaveType
                                ? getAttendanceMissingLabel(record)
                                : getLeaveOrHoliday(record)}
                        </td>

                        <td>{record.location || "N/A"}</td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="20" className="text-center">
                      No matching records found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div
            className="export-actions"
            style={{
              display: "flex",
              justifyContent: "center",
              gap: "14px",
              flexWrap: "wrap",
              margin: "22px 0",
            }}
          >
            <button className="btn-excel" onClick={exportToExcel}>
              📥 Download Excel Report
            </button>

            <button
              type="button"
              onClick={exportPendingUpdatesToExcel}
              style={{
                background: "linear-gradient(135deg, #155eef, #0b3d91)",
                color: "#fff",
                border: "none",
                borderRadius: "8px",
                padding: "12px 22px",
                fontWeight: 600,
                boxShadow: "0 4px 10px rgba(21, 94, 239, 0.22)",
                cursor: "pointer",
              }}
            >
              📊 Download Pending Updates
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default AttendanceSheet;
