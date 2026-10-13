import React, { useEffect, useState, useMemo } from "react";
import "./AttendanceSheet.css";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import XLSX from "xlsx-js-style";

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
  const [holidayData, setHolidayData] = useState({ date: "", name: "" });
  const [grossHoursLimit, setGrossHoursLimit] = useState("6");
  const [isGrossHoursFilterActive, setIsGrossHoursFilterActive] =
    useState(false);
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

  // Calculate the selected month's calendar and working days.
  const workingDaysSummary = useMemo(() => {
    const month = Number(selectedMonth);
    const year = Number(selectedYear);

    if (!month || !year) {
      return {
        totalDays: 0,
        holidays: 0,
        workingDays: 0,
        holidayDates: [],
      };
    }

    const totalDays = new Date(year, month, 0).getDate();
    const holidayMap = new Map();

    // Use the holiday information already returned by the API.
    records.forEach((record) => {
      const date = new Date(record.date);
      if (
        date.getFullYear() !== year ||
        date.getMonth() + 1 !== month ||
        !record.holidayName
      ) {
        return;
      }

      const key = `${year}-${String(month).padStart(2, "0")}-${String(
        date.getDate(),
      ).padStart(2, "0")}`;

      holidayMap.set(key, record.holidayName);
    });

    // Add festival holidays returned by the dedicated holiday endpoint.
    festivalHolidays.forEach((holiday) => {
      if (!holiday.date || !holiday.name) return;

      // Holiday dates are stored as YYYY-MM-DD.
      const [holidayYear, holidayMonth, holidayDay] = holiday.date
        .split("-")
        .map(Number);

      if (holidayYear !== year || holidayMonth !== month || !holidayDay) {
        return;
      }

      const key = holiday.date;

      // Preserve an existing holiday name if one is already recorded.
      holidayMap.set(key, holidayMap.get(key) || holiday.name);
    });

    // Add weekly offs. Sunday and second Saturday are excluded.
    for (let day = 1; day <= totalDays; day++) {
      const date = new Date(year, month - 1, day);
      const key = `${year}-${String(month).padStart(2, "0")}-${String(
        day,
      ).padStart(2, "0")}`;

      if (date.getDay() === 0) {
        holidayMap.set(key, holidayMap.get(key) || "SUNDAY");
      } else if (date.getDay() === 6 && Math.ceil(day / 7) === 2) {
        holidayMap.set(key, holidayMap.get(key) || "2nd SATURDAY");
      }
    }

    // Ensure October 2026 public and festival holidays are counted.

    const holidays = holidayMap.size;

    return {
      totalDays,
      holidays,
      workingDays: totalDays - holidays,
      holidayDates: [...holidayMap.entries()],
    };
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
          (record) =>
            record.holidayName || record.leaveType || record.dailyLeaveType,
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
    const sourceRecords =
      punchFilter === "missing-day" ? missingAttendanceRecords : records;

    return sourceRecords.filter((record) => {
      const dateObj = new Date(record.date);
      const recMonth = dateObj.getMonth() + 1;
      const recYear = dateObj.getFullYear();

      // 1. Month/Year Filter
      const monthMatch = !selectedMonth || recMonth === Number(selectedMonth);

      const yearMatch = !selectedYear || recYear === Number(selectedYear);

      // 2. Specific Date Filter
      let datePickerMatch = true;

      if (selectedDate) {
        const selDateStr = new Date(selectedDate).toDateString();
        const recDateStr = dateObj.toDateString();

        datePickerMatch = selDateStr === recDateStr;
      }

      // 3. Search by Employee ID or Name
      const term = searchTerm.toLowerCase().trim();

      const idMatch = record.id?.toLowerCase().includes(term);
      const nameMatch = record.name?.toLowerCase().includes(term);

      // Apply Gross Hours filtering only when explicitly activated
      // and only for the All Records view.
      let grossHoursMatch = true;

      if (isGrossHoursFilterActive && punchFilter === "all") {
        const hasInTime = !isMissingTime(record.inTime);
        const hasOutTime = !isMissingTime(record.outTime);

        // Ignore records without both In Time and Out Time.
        if (!hasInTime || !hasOutTime) {
          grossHoursMatch = false;
        } else if (grossHoursLimit.trim() !== "") {
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

      // 4. Missing In/Out Time Filter
      let punchMatch = true;

      if (punchFilter !== "all") {
        // Exclude holidays and leave records from missing-punch results

        const isHoliday = !!record.holidayName;
        const isLeave = !!record.leaveType || !!record.dailyLeaveType;

        // Compare dates using local calendar dates
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const recordDate = new Date(record.date);
        recordDate.setHours(0, 0, 0, 0);

        const isToday = recordDate.getTime() === today.getTime();

        // Exclude holidays and leave records.
        // Do not flag today's missing Out Time or Both.
        if (isHoliday || isLeave) {
          punchMatch = false;
        } else {
          const missingIn = isMissingTime(record.inTime);
          const missingOut = isMissingTime(record.outTime);

          switch (punchFilter) {
            case "in":
              // In-Time is missing, regardless of Out-Time.
              punchMatch = missingIn;
              break;

            case "out":
              // Out-Time is missing, regardless of In-Time.
              punchMatch = (includeToday || !isToday) && missingOut;
              break;

            case "both":
              // Either In-Time OR Out-Time is missing.
              // Includes records where both are missing, even if lunch
              // timings are present.
              punchMatch =
                (includeToday || !isToday) && (missingIn || missingOut);
              break;

            default:
              punchMatch = true;
          }
        }
      }

      return (
        monthMatch &&
        yearMatch &&
        datePickerMatch &&
        (idMatch || nameMatch) &&
        punchMatch &&
        grossHoursMatch
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

  const allYears = Array.from(
    new Set(records.map((r) => new Date(r.date).getFullYear())),
  )
    .filter(Boolean)
    .sort((a, b) => b - a);

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
          <div className="select-box">
            <label>Month</label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
            >
              <option value="">All Months</option>
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i + 1} value={i + 1}>
                  {new Date(0, i).toLocaleString("default", { month: "long" })}
                </option>
              ))}
            </select>
          </div>
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
          <div className="select-box">
            <label>Missing Attendance</label>

            <select
              value={punchFilter}
              onChange={(e) => setPunchFilter(e.target.value)}
            >
              <option value="all">All Records</option>
              <option value="in">Missed In Time</option>
              <option value="out">Missed Out Time</option>
              <option value="both">Missed Both</option>
              <option value="missing-day">Employee Missed Attendance</option>
            </select>
          </div>

          <div className="include-today-filter">
            <input
              id="includeToday"
              type="checkbox"
              checked={includeToday}
              onChange={(e) => setIncludeToday(e.target.checked)}
            />
            <label htmlFor="includeToday">Include Today</label>
          </div>

       
<div className="select-box">
  <label>Gross Hours (Max)</label>

  <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
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
      style={{ flex: 1 }}
    />

    <button
      type="button"
      className={`btn btn-sm ${
        isGrossHoursFilterActive ? "btn-primary" : "btn-outline-secondary"
      }`}
      onClick={() =>
        setIsGrossHoursFilterActive((previous) => !previous)
      }
    >
      {isGrossHoursFilterActive ? "On" : "Off"}
    </button>
  </div>
</div>


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
                  className="clear-btn"
                  onClick={() => setSelectedDate("")}
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="search-box-wrapper">
          <label>Search Staff</label>
          <input
            type="text"
            placeholder="Search by ID or Name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
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

                    return (
                      <tr
                        key={idx}
                        className={record.isLOP ? "lop-leave-row" : ""}
                      >
                        <td>{record.id}</td>
                        <td>{record.name}</td>
                        <td>{formatDate(record.date)}</td>
                        <td>{record.day}</td>

                        {/* Attendance fields check for holiday */}
                        <td>{isHoliday ? "—" : record.inTime || "—"}</td>
                        <td>{isHoliday ? "—" : record.systemInTime || "—"}</td>
                        <td>{record.delayReason || "—"}</td>
                        <td>{isHoliday ? "—" : record.lunchOut || "—"}</td>
                        <td>{isHoliday ? "—" : record.lunchIn || "—"}</td>
                        <td>{isHoliday ? "—" : record.outTime || "—"}</td>
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
                              : getLeaveOrHoliday(record)}
                        </td>

                        <td>{record.location || "N/A"}</td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="19" className="text-center">
                      No matching records found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="export-actions">
            <button className="btn-excel" onClick={exportToExcel}>
              📥 Download Excel Report
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default AttendanceSheet;
