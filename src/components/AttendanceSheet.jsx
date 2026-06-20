import React, { useEffect, useState, useMemo } from 'react';
import './AttendanceSheet.css';
import { useNavigate } from 'react-router-dom';
import * as XLSX from "xlsx";

const AttendanceSheet = () => {
  const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:5000";
  const navigate = useNavigate();

  // --- States ---
  const [records, setRecords] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDate, setSelectedDate] = useState(''); // Specific Date Selection
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Default to Current Month and Year
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());

  // --- Auth Check ---
  useEffect(() => {
    const isAuthenticated = localStorage.getItem('adminToken');
    if (!isAuthenticated) navigate('/admin-login');
  }, [navigate]);

  // --- Initial Fetch ---
  useEffect(() => {
    setLoading(true);
    fetch(`${API_BASE}/api/attendance/all`)
      .then(res => res.json())
      .then(data => {
        setRecords(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Fetch error:', err);
        setError('Failed to load attendance data');
        setLoading(false);
      });
  }, [API_BASE]);

  // --- Logic Helpers ---
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return isNaN(date) ? '' : date.toLocaleDateString('en-GB'); // DD/MM/YYYY
  };

  const getLeaveOrHoliday = (record) => {
    if (record.holidayName) return `Holiday - ${record.holidayName}`;
    if (record.leaveType) {
      if (record.halfDayReason && (record.leaveType === 'First Half Leave' || record.leaveType === 'Second Half Leave')) {
        return `${record.leaveType} (${record.halfDayReason})`;
      }
      return record.leaveType;
    }
    return 'N/A';
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

  const calculateTimeDifference = (startTime, endTime) => {
    if (!startTime || !endTime || startTime === 'N/A' || endTime === 'N/A') return '00:00';
    const startMins = timeToMinutes(startTime);
    const endMins = timeToMinutes(endTime);
    return minutesToHoursMinutes(endMins - startMins);
  };

  const calculateNetWorkingHours = (inTime, outTime, lunchOut, lunchIn) => {
    if (!inTime || !outTime || inTime === 'N/A' || outTime === 'N/A') return '00:00';
    const inMins = timeToMinutes(inTime);
    const outMins = timeToMinutes(outTime);
    let lunchMins = 0;
    if (lunchOut && lunchIn && lunchOut !== 'N/A' && lunchIn !== 'N/A') {
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

  // --- Filtering Logic (Search + Month + Year + DatePicker) ---
  const filteredRecords = useMemo(() => {
    return records.filter(record => {
      const dateObj = new Date(record.date);
      const recMonth = dateObj.getMonth() + 1;
      const recYear = dateObj.getFullYear();
      
      // 1. Month/Year Filter
      const monthMatch = !selectedMonth || recMonth === Number(selectedMonth);
      const yearMatch = !selectedYear || recYear === Number(selectedYear);
      
      // 2. Specific Date Picker Filter
      let datePickerMatch = true;
      if (selectedDate) {
        const selDateStr = new Date(selectedDate).toDateString();
        const recDateStr = dateObj.toDateString();
        datePickerMatch = selDateStr === recDateStr;
      }

      // 3. Search Term (ID or Name)
      const term = searchTerm.toLowerCase().trim();
      const idMatch = record.id?.toLowerCase().includes(term);
      const nameMatch = record.name?.toLowerCase().includes(term);

      return monthMatch && yearMatch && datePickerMatch && (idMatch || nameMatch);
    });
  }, [records, selectedMonth, selectedYear, selectedDate, searchTerm]);

  // --- Export Logic ---
  const getExportRows = () => filteredRecords.map(record => {
    const lunchHours = calculateTimeDifference(record.lunchOut, record.lunchIn);
    const workingHours = calculateNetWorkingHours(record.inTime, record.outTime, record.lunchOut, record.lunchIn);
    return {
      'ID': record.id,
      'Name': record.name,
      'Date': formatDate(record.date),
      'Day': record.day,
      'In Time': record.inTime,
      'System In Time': record.systemInTime || 'N/A',
      'Delay Reason': record.delayReason || '',
      'Lunch Out': record.lunchOut,
      'Lunch In': record.lunchIn,
      'Out Time': record.outTime,
      'Lunch Hours': lunchHours,
      'Working Hours': workingHours,
      'Gross Hours': computeGrossHours(lunchHours, workingHours),
      'Daily Leave Type': record.dailyLeaveType || 'N/A',
      'Site Comments': record.siteComments || '',
      'Permission': record.permissionType || 'N/A',
      'Hours': record.hours || 'N/A',
      'Leave Type': getLeaveOrHoliday(record),
      'Location': record.location || 'N/A'
    };
  });

  const exportToExcel = () => {
    const ws = XLSX.utils.json_to_sheet(getExportRows());
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Attendance");
    XLSX.writeFile(wb, `Attendance_Sheet_${selectedMonth}_${selectedYear}.xlsx`);
  };

  const allYears = Array.from(new Set(records.map(r => new Date(r.date).getFullYear()))).filter(Boolean).sort((a,b)=>b-a);

  return (
    <div className="container admin-container mt-4">
      <h2 className="admin-title">Attendance Sheet</h2>

      {/* --- Filter Toolbar --- */}
      <div className="attendance-toolbar">
        <div className="filter-group">
          <div className="select-box">
            <label>Month</label>
            <select value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)}>
              <option value="">All Months</option>
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i+1} value={i+1}>{new Date(0, i).toLocaleString('default', { month: 'long' })}</option>
              ))}
            </select>
          </div>

          <div className="select-box">
            <label>Year</label>
            <select value={selectedYear} onChange={e => setSelectedYear(e.target.value)}>
              <option value="">All Years</option>
              {allYears.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>

          <div className="select-box">
            <label>Specific Date</label>
            <div className="date-input-wrapper">
                <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} />
                {selectedDate && <button className="clear-btn" onClick={() => setSelectedDate('')}>✕</button>}
            </div>
          </div>
        </div>

        <div className="search-box-wrapper">
          <label>Search Staff</label>
          <input
            type="text"
            placeholder="Search by ID or Name..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
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
                {filteredRecords.length > 0 ? filteredRecords.map((record, idx) => {
                  const lunchH = calculateTimeDifference(record.lunchOut, record.lunchIn);
                  const workH = calculateNetWorkingHours(record.inTime, record.outTime, record.lunchOut, record.lunchIn);
                  const grossH = computeGrossHours(lunchH, workH);

                  return (
                    <tr key={idx} className={record.isLOP ? 'lop-leave-row' : ''}>
                      <td>{record.id}</td>
                      <td>{record.name}</td>
                      <td>{formatDate(record.date)}</td>
                      <td>{record.day}</td>
                      <td>{record.inTime || '—'}</td>
                      <td>{record.systemInTime || '—'}</td>
                      <td>{record.delayReason || '—'}</td>
                      <td>{record.lunchOut || '—'}</td>
                      <td>{record.lunchIn || '—'}</td>
                      <td>{record.outTime || '—'}</td>
                      <td>{lunchH}</td>
                      <td>{workH}</td>
                      <td>{grossH}</td>
                      <td>{record.dailyLeaveType || '—'}</td>
                      <td className="comment-cell">{record.siteComments || '—'}</td>
                      <td>{record.permissionType || '—'}</td>
                      <td>{record.hours || '—'}</td>
                      <td>{getLeaveOrHoliday(record)}</td>
                      <td>{record.location || 'N/A'}</td>
                    </tr>
                  );
                }) : (
                  <tr><td colSpan="19" className="text-center">No matching records found.</td></tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="export-actions">
            <button className="btn-excel" onClick={exportToExcel}>📥 Download Excel Report</button>
          </div>
        </>
      )}
    </div>
  );
};

export default AttendanceSheet;