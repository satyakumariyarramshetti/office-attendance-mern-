import React, { useEffect, useState } from 'react';
import './AttendanceSheet.css';
import { useNavigate } from 'react-router-dom';
import * as XLSX from "xlsx";

const AttendanceSheet = () => {
  const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:5000";
  const [records, setRecords] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  const navigate = useNavigate();
const getLeaveOrHoliday = (record) => {
  if (record.holidayName) {
    return `Holiday - ${record.holidayName}`;
  }
  if (record.leaveType) {
    return record.leaveType;
  }
  return 'N/A';
};



  useEffect(() => {
    const isAuthenticated = localStorage.getItem('adminToken');
    if (!isAuthenticated) {
      navigate('/admin-login');
    }
  }, [navigate]);
useEffect(() => {
  setLoading(true);
  setError(null);

  fetch(`${API_BASE}/api/attendance/all`)
    .then(res => res.json())
    .then(data => {
      setRecords(data);
      setLoading(false);
    })
    .catch(err => {
      console.error('Failed to fetch', err);
      setError('Failed to load attendance data');
      setLoading(false);
    });

  // ✅ Disable ESLint warning — API_BASE never changes
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, []);


  const formatDate = (dateString) => {
    const date = new Date(dateString);
    if (isNaN(date)) return '';
    return date.toLocaleDateString();
  };

  const calculateTimeDifference = (startTime, endTime) => {
    if (!startTime || !endTime) return 'N/A';
    const start = new Date(`1970-01-01T${startTime}`);
    const end = new Date(`1970-01-01T${endTime}`);
    if (isNaN(start) || isNaN(end)) return 'Invalid Time';
    let diff = end - start;
    if (diff < 0) return 'N/A';
    const hours = Math.floor(diff / 1000 / 60 / 60);
    diff -= hours * 1000 * 60 * 60;
    const minutes = Math.floor(diff / 1000 / 60);
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  };

  const timeToMinutes = (timeStr) => {
    if (!timeStr || !/^\d{2}:\d{2}$/.test(timeStr)) return 0;
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  };

  const minutesToHoursMinutes = (totalMinutes) => {
    if (isNaN(totalMinutes) || totalMinutes < 0) return '00:00';
    const hours = Math.floor(totalMinutes / 60);
    const minutes = Math.round(totalMinutes % 60);
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  };

  const calculateNetWorkingHours = (inTime, outTime, lunchOut, lunchIn) => {
    if (!inTime || !outTime) return 'N/A';

    const inTimeMins = timeToMinutes(inTime);
    const outTimeMins = timeToMinutes(outTime);

    if (outTimeMins < inTimeMins) return 'N/A';

    let lunchMins = 0;
    if (lunchOut && lunchIn) {
      const lunchOutMins = timeToMinutes(lunchOut);
      const lunchInMins = timeToMinutes(lunchIn);
      if (lunchInMins > lunchOutMins) {
        lunchMins = lunchInMins - lunchOutMins;
      }
    }

    const netWorkMins = (outTimeMins - inTimeMins) - lunchMins;

    return minutesToHoursMinutes(netWorkMins);
  };

  function computeGrossHours(lunchHours, workingHours) {
    // If lunchHours included, add both; else, gross = workingHours
    if (!lunchHours || lunchHours === 'N/A' || lunchHours === '00:00') {
      return workingHours;
    }
    if (!workingHours || workingHours === 'N/A' || workingHours === '00:00') {
      return lunchHours;
    }
    const [h1, m1] = lunchHours.split(':').map(Number);
    const [h2, m2] = workingHours.split(':').map(Number);
    let totalMinutes = (h1 * 60 + m1) + (h2 * 60 + m2);
    return minutesToHoursMinutes(totalMinutes);
  }

  // --- Group, filter, and search ---
  const groupedRecords = records.reduce((acc, record) => {
    if (!acc[record.id]) acc[record.id] = [];
    acc[record.id].push(record);
    return acc;
  }, {});

  const normalizedSearch = searchTerm.trim().toLowerCase();

  function normalizedDateString(dateVal) {
    if (!dateVal) return '';
    const d = new Date(dateVal);
    if (isNaN(d)) return '';
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  }

  function searchTermLooksLikeDate(str) {
    return /^\d{1,2}\/\d{1,2}\/\d{4}$/.test(str.trim());
  }

  const filteredGroupedRecords = Object.entries(groupedRecords).filter(
    ([id, entries]) => {
      const lowerId = id.toLowerCase();

      if (lowerId.includes(normalizedSearch)) return true;
      if (
        normalizedSearch.length === 3 &&
        lowerId.slice(-3) === normalizedSearch
      ) return true;

      return entries.some(entry => {
        const nameMatch =
          entry.name && entry.name.toLowerCase().includes(normalizedSearch);
        const dbDateNorm = normalizedDateString(entry.date);
        const rawDateStr = entry.date ? entry.date.toString().toLowerCase() : '';
        const searchLower = normalizedSearch;
        const normalizedSearchIsDate = searchTermLooksLikeDate(searchTerm);

        let dateMatch = false;
        if (normalizedSearchIsDate) {
          const searchNormDate = normalizedDateString(searchTerm);
          dateMatch =
            dbDateNorm.includes(searchNormDate) || searchNormDate.includes(dbDateNorm);
        } else {
          dateMatch = dbDateNorm.includes(searchLower) || rawDateStr.includes(searchLower);
        }
        return nameMatch || dateMatch;
      });
    }
  );

  // Flat array for display/export
  const displayedRows = [];
  filteredGroupedRecords.forEach(([id, records]) => {
    records.forEach(record => {
      const nameMatch = record.name && record.name.toLowerCase().includes(normalizedSearch);
      const dbDateNorm = normalizedDateString(record.date);
      const rawDateStr = record.date ? record.date.toString().toLowerCase() : '';
      const searchLower = normalizedSearch;
      const normalizedSearchIsDate = searchTermLooksLikeDate(searchTerm);

      let dateMatch = false;
      if (normalizedSearchIsDate) {
        const searchNormDate = normalizedDateString(searchTerm);
        dateMatch = dbDateNorm.includes(searchNormDate) || searchNormDate.includes(dbDateNorm);
      } else {
        dateMatch = dbDateNorm.includes(searchLower) || rawDateStr.includes(searchLower);
      }
      if (nameMatch || dateMatch || id.toLowerCase().includes(normalizedSearch)) {
        displayedRows.push(record);
      }
    });
  });

  // ====== MONTH & YEAR FILTERING SECTION ======
  // Generate available years from your data
  const allYears = Array.from(new Set(records.map(r => {
    const d = new Date(r.date);
    return !isNaN(d) ? d.getFullYear() : null;
  }))).filter(Boolean).sort((a, b) => b - a);

  // Filter flat rows array using selectors
  const monthFilteredRows = displayedRows.filter(record => {
    if (!selectedMonth && !selectedYear) return true;
    const dateObj = new Date(record.date);
    const recMonth = dateObj.getMonth() + 1;
    const recYear = dateObj.getFullYear();
    const matchesMonth = !selectedMonth || recMonth === Number(selectedMonth);
    const matchesYear = !selectedYear || recYear === Number(selectedYear);
    return matchesMonth && matchesYear;
  });

  // Export functions using monthFilteredRows!
  function exportToCSV() {
    if (!monthFilteredRows.length) return;
   const headers = [
  "ID", "Name", "Date", "Day", "In Time",  "Delay Reason", "Lunch Out", "Lunch In", "Out Time",
  "Lunch Hours", "Working Hours", "Gross Hours",
  "Daily Leave Type", "Permission Type", 
         
  "Hours", "Leave Type", "Location"
];

    const csvRows = [headers.join(",")];
    for (const record of monthFilteredRows) {
      const lunchHours = calculateTimeDifference(record.lunchOut, record.lunchIn);
      const workingHours = calculateNetWorkingHours(record.inTime, record.outTime, record.lunchOut, record.lunchIn);
      const grossHours = computeGrossHours(lunchHours, workingHours);

     const row = [
  record.id ?? '', record.name ?? '', formatDate(record.date), record.day ?? '',
  record.inTime ?? '', record.delayReason ?? '', record.lunchOut ?? '', record.lunchIn ?? '', record.outTime ?? '',
  lunchHours, workingHours, grossHours,
  record.dailyLeaveType ?? '', record.permissionType ?? '',
  
  
record.hours ?? '', getLeaveOrHoliday(record), record.location ?? ''
].map(field => `"${String(field)}"`).join(',');

      csvRows.push(row);
    }
    const csvString = csvRows.join("\n");
    const blob = new Blob([csvString], { type: "text/csv" });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = "attendance.csv";
    a.click();
  }

  function exportToExcel() {
    if (!monthFilteredRows.length) return;
    const exportArray = monthFilteredRows.map(record => {
      const lunchHours = calculateTimeDifference(record.lunchOut, record.lunchIn);
      const workingHours = calculateNetWorkingHours(record.inTime, record.outTime, record.lunchOut, record.lunchIn);
      const grossHours = computeGrossHours(lunchHours, workingHours);
      return {
  'ID': record.id,
  'Name': record.name,
  'Date': formatDate(record.date),
  'Day': record.day,
  'In Time': record.inTime,
  'Delay Reason': record.delayReason || '',
  'Lunch Out': record.lunchOut,
  'Lunch In': record.lunchIn,
  'Out Time': record.outTime,
  'Lunch Hours': lunchHours,
  'Working Hours': workingHours,
  'Gross Hours': grossHours,
  'Daily Leave Type': record.dailyLeaveType,
  'Permission Type': record.permissionType,
  
  
  'Hours': record.hours,
  'Leave Type': getLeaveOrHoliday(record),
  'Location': record.location
      };
});


    const ws = XLSX.utils.json_to_sheet(exportArray);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Attendance");
    XLSX.writeFile(wb, "attendance.xlsx");
  }

  return (
    <div className="container admin-container mt-4">
      <h2 className="admin-title">Attendance Sheet</h2>

      {/* MONTH & YEAR FILTER SECTION */}
      <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 16 }}>
        <select value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)}>
          <option value="">All Months</option>
          {[...Array(12)].map((_, idx) => (
            <option key={idx + 1} value={idx + 1}>{new Date(0, idx).toLocaleString('default', { month: 'long' })}</option>
          ))}
        </select>
        <select value={selectedYear} onChange={e => setSelectedYear(e.target.value)}>
          <option value="">All Years</option>
          {allYears.map(year =>
            <option key={year} value={year}>{year}</option>
          )}
        </select>
      </div>

      <input
        type="text"
        className="form-control mb-3"
        placeholder="Search by ID, Name, or Date (e.g. 30/07/2025)"
        aria-label="Search attendance by employee ID, name, or date"
        value={searchTerm}
        onChange={e => setSearchTerm(e.target.value)}
      />

      {loading && <p>Loading attendance data...</p>}
      {error && <p className="text-danger">{error}</p>}

      {!loading && !error && (
        <>
          <div className="table-responsive scrollable-table">
            <table className="table table-bordered admin-table">
              <thead>
  <tr>
    <th>ID</th>
    <th>Name</th>
    <th>Date</th>
    <th>Day</th>
    <th>In Time</th>
    <th>Delay Reason</th> {/* <-- Add this line */}
    <th>Lunch Out</th>
    <th>Lunch In</th>
    <th>Out Time</th>
    <th>Lunch Hours</th>
    <th>Working Hours</th>
    <th>Gross Hours</th>
    <th>Daily Leave Type</th>
    <th>Permission Type</th>
    <th>Hours</th>
    <th>Leave Type</th>
    <th>Location</th>
  </tr>
</thead>

              <tbody>
                {monthFilteredRows.map((record, idx) => {
                  const lunchHours = calculateTimeDifference(record.lunchOut, record.lunchIn);
                  const workingHours = calculateNetWorkingHours(record.inTime, record.outTime, record.lunchOut, record.lunchIn);
                  const grossHours = computeGrossHours(lunchHours, workingHours);
               

                  return (
                    <tr key={`${record.id}-${record.date}-${idx}`} className={record.isLOP ? 'lop-leave-row' : ''}>
                      <td data-label="ID">{record.id}</td>
                      <td data-label="Name">{record.name}</td>
                      <td data-label="Date">{formatDate(record.date)}</td>
                      <td data-label="Day">{record.day}</td>
                      <td data-label="In Time">{record.inTime}</td>
                      <td data-label="Delay Reason">{record.delayReason || ''}</td>

                      <td data-label="Lunch Out">{record.lunchOut}</td>
                      <td data-label="Lunch In">{record.lunchIn}</td>
                      <td data-label="Out Time">{record.outTime}</td>
                      <td data-label="Lunch Hours">{lunchHours}</td>
                      <td data-label="Working Hours">{workingHours}</td>
                      <td data-label="Gross Hours">{grossHours}</td>
                     <td data-label="Daily Leave Type">{record.dailyLeaveType || 'N/A'}</td>
                     <td data-label="Permission Type">{record.permissionType || 'N/A'}</td>
                     <td data-label="Hours">{record.hours || 'N/A'}</td>
                     <td data-label="Leave Type">{getLeaveOrHoliday(record)}</td>
                    <td data-label="Location">{record.location ? record.location : 'N/A'}</td>

                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="export-btn-group" style={{ marginTop: 22, marginBottom: 30, textAlign: 'right' }}>
            <button className="btn btn-outline-success me-2" onClick={exportToCSV}>
              Export to CSV
            </button>
            <button className="btn btn-outline-primary" onClick={exportToExcel}>
              Export to Excel
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default AttendanceSheet;
