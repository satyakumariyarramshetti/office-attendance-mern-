// src/components/UserAttendance.jsx

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import styles from './UserAttendance.module.css'; 

const UserAttendance = () => {
  const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:5000";
  const [staffId, setStaffId] = useState('');
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchedId, setSearchedId] = useState('');

  // ✅ 1. Updated to allow Letters and Numbers
  const handleIdChange = (e) => {
    const value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    setStaffId(value.slice(0, 6)); // Increased to 6 to accommodate I0007
  };

  const fetchAttendance = async (e) => {
    e.preventDefault();
    // ✅ 2. Updated length validation (I0007 is 5 chars, some might be 4)
    if (staffId.length < 2) {
      setError('Please enter a valid Staff ID.');
      return;
    }

    setLoading(true);
    setError('');
    setRecords([]);
    const fullId = `PS-${staffId}`;
    setSearchedId(fullId);

    try {
      const response = await fetch(`${API_BASE}/api/attendance/${fullId}`);
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.message || 'Failed to fetch data.');
      }
      const data = await response.json();
      setRecords(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return isNaN(date) ? '' : date.toLocaleDateString();
  };

  return (
    <div className={styles.userAttendancePage}>
      <div className={styles.container}>
        <div className={styles.pageHeader}>
          <h2 className={styles.pageTitle}>Your Attendance Sheet</h2>
          <Link to="/" className={styles.backBtn}>Back to Home</Link>
        </div>

        <form onSubmit={fetchAttendance} className={styles.searchForm}>
          <div className={styles.inputGroup}>
            <span className={styles.inputGroupText}>PS-</span>
            <input
              type="text"
              className={styles.formControl}
              // ✅ 3. Updated Placeholder and Pattern
              placeholder="Enter ID (e.g. 0003)"
              value={staffId}
              onChange={handleIdChange}
              pattern="[A-Z0-9]+" 
              title="Enter your Staff ID (letters and numbers allowed)"
              required
            />
            <button className={styles.getAttendanceBtn} type="submit" disabled={loading}>
              {loading ? 'Loading...' : 'Get Attendance'}
            </button>
          </div>
        </form>

        {error && <div className={styles.alertDanger}>{error}</div>}

        {records.length > 0 && (
          <>
            <h4 className={styles.attendanceForTitle}>Attendance for: {searchedId}</h4>
            <div className={styles.tableResponsive}>
              <table className={styles.attendanceTable}>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Day</th>
                    <th>In Time</th>
                    <th>Delay Reason</th>
                    <th>Lunch Out</th>
                    <th>Lunch In</th>
                    <th>Out Time</th>
                    <th>Hours</th>
                    <th>Leave Type</th>
                    <th>Permission Type</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map(record => (
                    <tr key={record._id}>
                      <td data-label="Date">{formatDate(record.date)}</td>
                      <td data-label="Day">{record.day || 'N/A'}</td>
                      <td data-label="In Time">{record.inTime || 'N/A'}</td>
                      <td data-label="Delay Reason">{record.delayReason || 'N/A'}</td>
                      <td data-label="Lunch Out">{record.lunchOut || 'N/A'}</td>
                      <td data-label="Lunch In">{record.lunchIn || 'N/A'}</td>
                      <td data-label="Out Time">{record.outTime || 'N/A'}</td>
                      <td data-label="Hours">{record.hours || 'N/A'}</td>
                      <td data-label="Leave Type">
  {record.leaveType || record.holidayName || 'N/A'}
</td>
                      <td data-label="Permission Type">{record.permissionType || 'N/A'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default UserAttendance;