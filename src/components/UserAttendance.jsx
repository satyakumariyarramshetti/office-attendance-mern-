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

  const handleIdChange = (e) => {
    // Allow only numbers and limit length
    const value = e.target.value.replace(/\D/g, '');
    setStaffId(value.slice(0, 4));
  };

  const fetchAttendance = async (e) => {
    e.preventDefault();
    if (staffId.length < 4) {
      setError('Please enter a valid 4-digit ID.');
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
          {/* This entire block is corrected to use CSS module classes */}
          <div className={styles.inputGroup}>
            <span className={styles.inputGroupText}>PS-</span>
            <input
              type="text"
              className={styles.formControl}
              placeholder="Enter your 4-digit ID"
              value={staffId}
              onChange={handleIdChange}
              pattern="\d{4}"
              title="Enter the 4 digits of your ID"
              required
            />
            <button className={styles.getAttendanceBtn} type="submit" disabled={loading}>
              {loading ? 'Loading...' : 'Get Attendance'}
            </button>
          </div>
        </form>

        {/* Corrected to only use the CSS module class */}
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
                    <th>Lunch Out</th>
                    <th>Lunch In</th>
                    <th>Out Time</th>
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
                      <td data-label="Lunch Out">{record.lunchOut || 'N/A'}</td>
                      <td data-label="Lunch In">{record.lunchIn || 'N/A'}</td>
                      <td data-label="Out Time">{record.outTime || 'N/A'}</td>
                      <td data-label="Leave Type">{record.leaveType || 'N/A'}</td>
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