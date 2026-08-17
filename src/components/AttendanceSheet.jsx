import React, { useEffect, useState, useMemo } from 'react';
import './AttendanceSheet.css';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import XLSX from 'xlsx-js-style';

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
  const [showModal, setShowModal] = useState(false);
  const [holidayData, setHolidayData] = useState({ date: '', name: '' });

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

  const handleAddHoliday = async () => {
    if (!holidayData.date || !holidayData.name) {
      alert("Please fill both date and name");
      return;
    }
    try {
      await axios.post(`${API_BASE}/api/attendance/holidays/import`, holidayData);
      alert("Festival Holiday Added!");
      setShowModal(false);
      setHolidayData({ date: '', name: '' });
      // Refresh list
      window.location.reload(); 
    } catch (err) {
      alert(err.response?.data?.error || "Error adding holiday");
    }
  };


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

const exportToExcel = () => {
  // 1. డేటాను సార్ట్ చేయడం (1st to Last Date)
  const sortedRecords = [...filteredRecords].sort((a, b) => new Date(a.date) - new Date(b.date));

  const allRows = sortedRecords.map(record => {
    const lunchHours = calculateTimeDifference(record.lunchOut, record.lunchIn);
    const workingHours = calculateNetWorkingHours(record.inTime, record.outTime, record.lunchOut, record.lunchIn);
    const isHoliday = !!record.holidayName;

    return {
      'ID': record.id,
      'Name': record.name,
      'Date': formatDate(record.date),
      'Day': record.day,
      'In Time': isHoliday ? '—' : (record.inTime || '—'),
      'System In Time': isHoliday ? '—' : (record.systemInTime || 'N/A'),
      'Delay Reason': record.delayReason || '',
      'Lunch Out': isHoliday ? '—' : (record.lunchOut || '—'),
      'Lunch In': isHoliday ? '—' : (record.lunchIn || '—'),
      'Out Time': isHoliday ? '—' : (record.outTime || '—'),
      'Lunch Hours': isHoliday ? '—' : lunchHours,
      'Working Hours': isHoliday ? '—' : workingHours,
      'Gross Hours': isHoliday ? '—' : computeGrossHours(lunchHours, workingHours),
      'Daily Leave Type': record.dailyLeaveType || 'N/A',
      'Site Comments': record.siteComments || '',
      'Permission': record.permissionType || 'N/A',
      'Hours': record.hours || 'N/A',
      'Leave Type': isHoliday ? `Holiday - ${record.holidayName}` : getLeaveOrHoliday(record)
    };
  });

  const wb = XLSX.utils.book_new();
  const uniqueIds = [...new Set(allRows.map(row => row.ID))].sort(); // Tabs Order Wise

  uniqueIds.forEach((empId) => {
    const empData = allRows.filter(row => row.ID === empId);
    const ws = XLSX.utils.json_to_sheet(empData);

    // --- స్టైలింగ్ లాజిక్ (Borders & Alignment) ---
    const range = XLSX.utils.decode_range(ws['!ref']);
    for (let R = range.s.r; R <= range.e.r; ++R) {
      for (let C = range.s.c; C <= range.e.c; ++C) {
        const cell_address = XLSX.utils.encode_cell({ r: R, c: C });
        if (!ws[cell_address]) continue;

        // సెల్ స్టైల్ సెట్ చేయడం
        ws[cell_address].s = {
          alignment: { horizontal: "center", vertical: "center", wrapText: true },
          border: {
            top: { style: "thin", color: { rgb: "000000" } },
            bottom: { style: "thin", color: { rgb: "000000" } },
            left: { style: "thin", color: { rgb: "000000" } },
            right: { style: "thin", color: { rgb: "000000" } }
          },
          font: R === 0 ? { bold: true } : {} // మొదటి రో (Headers) ని బోల్డ్ చేయడం
        };
      }
    }

    // కాలమ్ వెడల్పు ఆటోమేటిక్‌గా అడ్జస్ట్ చేయడం
    const colWidths = Object.keys(empData[0] || {}).map(key => ({ wch: 15 }));
    ws['!cols'] = colWidths;

    XLSX.utils.book_append_sheet(wb, ws, String(empId).slice(0, 31));
  });

  XLSX.writeFile(wb, `Attendance_Report_${selectedMonth}_${selectedYear}.xlsx`);
};

  const allYears = Array.from(new Set(records.map(r => new Date(r.date).getFullYear()))).filter(Boolean).sort((a,b)=>b-a);

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
              <input type="date" className="form-control" 
                value={holidayData.date} 
                onChange={e => setHolidayData({...holidayData, date: e.target.value})} />
            </div>
            <div className="mb-3">
              <label>Holiday Name</label>
              <input type="text" className="form-control" placeholder="e.g. Diwali"
                value={holidayData.name} 
                onChange={e => setHolidayData({...holidayData, name: e.target.value})} />
            </div>
            <div className="d-flex justify-content-end gap-2">
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleAddHoliday}>Save Holiday</button>
            </div>
          </div>
        </div>
      )}


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
                  const isHoliday = !!record.holidayName;

                  return (
                    <tr key={idx} className={record.isLOP ? 'lop-leave-row' : ''}>
                      <td>{record.id}</td>
                      <td>{record.name}</td>
                      <td>{formatDate(record.date)}</td>
                      <td>{record.day}</td>

                      {/* Attendance fields check for holiday */}
                      <td>{isHoliday ? '—' : (record.inTime || '—')}</td>
                      <td>{isHoliday ? '—' : (record.systemInTime || '—')}</td>
                      <td>{record.delayReason || '—'}</td>
                      <td>{isHoliday ? '—' : (record.lunchOut || '—')}</td>
                      <td>{isHoliday ? '—' : (record.lunchIn || '—')}</td>
                      <td>{isHoliday ? '—' : (record.outTime || '—')}</td>
                      <td>{isHoliday ? '—' : lunchH}</td>
                      <td>{isHoliday ? '—' : workH}</td>
                      <td>{isHoliday ? '—' : grossH}</td>


                      <td>{record.dailyLeaveType || '—'}</td>
                      <td className="comment-cell">{record.siteComments || '—'}</td>
                      <td>{record.permissionType || '—'}</td>
                      <td>{record.hours || '—'}</td>


                      <td className={isHoliday ? 'holiday-text' : ''}>
                        {isHoliday ? `Holiday: ${record.holidayName}` : getLeaveOrHoliday(record)}
                      </td>

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