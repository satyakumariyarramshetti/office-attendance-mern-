import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import styles from './UserAttendance.module.css';

const UserAttendance = () => {
  const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:5000";
  
  const [idCode, setIdCode] = useState('');
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [staffInfo, setStaffInfo] = useState({ name: '', id: '' });

  // --- Logic for Current and Previous Month ---
  const now = new Date();
  const currentMonthVal = (now.getMonth() + 1).toString().padStart(2, '0');
  const currentYearVal = now.getFullYear().toString();

  const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevMonthVal = (prevMonthDate.getMonth() + 1).toString().padStart(2, '0');
  const prevYearVal = prevMonthDate.getFullYear().toString();

  // 🔥 Default ga 'current' month chupinchadaniki ikkada 'current' ani pettaamu
  const [viewMode, setViewMode] = useState('current'); 

  const timeToMins = (t) => {
    if (!t || t === 'N/A' || !t.includes(':')) return null;
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
  };

  const formatMinsToHHMM = (totalMins) => {
    if (totalMins === null || totalMins < 0) return '—';
    const h = Math.floor(totalMins / 60);
    const m = totalMins % 60;
    return `${h}h ${m}m`;
  };

  const fetchAttendance = async (e) => {
    e.preventDefault();
    if (!idCode.trim()) {
      setError('Please enter your Identification code.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`${API_BASE}/api/attendance/my-attendance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identification: idCode })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to fetch');
      setRecords(data.records);
      setStaffInfo({ name: data.staffName, id: data.staffId });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredRecords = useMemo(() => {
    return records.filter(rec => {
      if (!rec.date) return false;
      const [y, m] = rec.date.split('-'); 
      
      const isCurrent = (y === currentYearVal && m === currentMonthVal);
      const isPrevious = (y === prevYearVal && m === prevMonthVal);

      if (viewMode === 'current') return isCurrent;
      if (viewMode === 'previous') return isPrevious;
      if (viewMode === 'both') return isCurrent || isPrevious;
      return true;
    });
  }, [records, viewMode, currentYearVal, currentMonthVal, prevYearVal, prevMonthVal]);

  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  return (
    <div className={styles.userAttendancePage}>
      <div className={styles.container}>
        <div className={styles.pageHeader}>
          <h2 className={styles.pageTitle}>Your Attendance Sheet</h2>
          <Link to="/" className={styles.backBtn}>Back to Home</Link>
        </div>

        <form onSubmit={fetchAttendance} className={styles.searchForm}>
          <div className={styles.inputGroup}>
            <input
              type="password"
              className={styles.formControl}
              placeholder="Enter Identification Code"
              value={idCode}
              onChange={(e) => setIdCode(e.target.value)}
              required
            />
            <button className={styles.getAttendanceBtn} type="submit" disabled={loading}>
              {loading ? 'Loading...' : 'View Attendance'}
            </button>
          </div>
        </form>

        {error && <div className={styles.alertDanger}>{error}</div>}

        {records.length > 0 && (
          <>
            <div className={styles.headerFlex}>
              <div className={styles.staffInfoCard}>
                <h4>Welcome, {staffInfo.name}</h4>
                <span>ID: {staffInfo.id}</span>
              </div>
              
              <div className={styles.filterControls}>
                <div className={styles.selectWrapper}>
                  <label>Select Period</label>
                  <select value={viewMode} onChange={(e) => setViewMode(e.target.value)}>
                    <option value="current">Current Month ({monthNames[now.getMonth()]})</option>
                    <option value="previous">Previous Month ({monthNames[prevMonthDate.getMonth()]})</option>
                    <option value="both">Last 2 Months</option>
                  </select>
                </div>
              </div>
            </div>

            <div className={styles.tableResponsive}>
              <table className={styles.attendanceTable}>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>In Time</th>
                    <th>Delay Reason</th>
                    <th>Lunch Out</th>
                    <th>Lunch In</th>
                    <th>Out Time</th>
                    <th>Gross Hrs</th>
                    <th>Net Hrs</th>
                    <th>Status / Leave</th>
                    <th>Permission</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRecords.map((record, index) => {
                    const inM = timeToMins(record.inTime);
                    const outM = timeToMins(record.outTime);
                    const lOutM = timeToMins(record.lunchOut);
                    const lInM = timeToMins(record.lunchIn);

                    let gross = (inM && outM) ? outM - inM : null;
                    let lunch = (lOutM && lInM) ? lInM - lOutM : 0;
                    let net = (gross !== null) ? gross - lunch : null;

                    const isLate = record.inTime && record.inTime > "09:15";

                    return (
                      <tr key={index} className={isLate ? styles.lateRow : ''}>
                        <td data-label="Date">{record.date} <br/> <small>{record.day}</small></td>
                        <td data-label="In Time" className={isLate ? styles.lateText : ''}>
                           {record.inTime || '—'}
                        </td>
                        <td data-label="Delay Reason">{record.delayReason || '—'}</td>
                        <td data-label="Lunch Out">{record.lunchOut || '—'}</td>
                        <td data-label="Lunch In">{record.lunchIn || '—'}</td>
                        <td data-label="Out Time">{record.outTime || '—'}</td>
                        <td data-label="Gross Hrs" className={styles.boldCol}>{formatMinsToHHMM(gross)}</td>
                        <td data-label="Net Hrs" className={styles.boldCol}>{formatMinsToHHMM(net)}</td>
                        <td data-label="Status">
                          <span className={styles.statusBadge}>
                            {record.leaveType || record.holidayName || (record.inTime ? 'Present' : 'Absent')}
                          </span>
                        </td>
                        <td data-label="Permission">{record.permissionType ? `${record.permissionType} (${record.hours}h)` : '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {filteredRecords.length === 0 && (
                <div className={styles.noData}>No records found for the selected period.</div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default UserAttendance;