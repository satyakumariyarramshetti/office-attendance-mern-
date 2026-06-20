import React, { useState, useEffect } from 'react';
import { FaUserCheck, FaUserClock, FaUserTimes, FaEye, FaEyeSlash, FaCalendarDay } from 'react-icons/fa';
import './TodayAttendance.css';

const TodayAttendance = () => {
  const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:5000";
  const [viewType, setViewType] = useState(null);
  const [presentees, setPresentees] = useState([]);
  const [lateComers, setLateComers] = useState([]);
  const [absentees, setAbsentees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchTodayAttendance = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`${API_BASE}/api/attendance/today`);
        if (!response.ok) throw new Error(`Fetch failed: ${response.status}`);
        const data = await response.json();

        setPresentees(data.presents || []);
        setLateComers(data.lateComers || []);
        setAbsentees(data.absents || []);
      } catch (err) {
        setError("Failed to load attendance data. Please try again.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchTodayAttendance();
  }, [API_BASE]);

  const renderTable = (data, title, type) => (
    <div className="detail-view-container animate-slide-up">
      <div className="detail-header">
        <h3 className={`text-${type}`}>{title}</h3>
        <span className="badge-count">{data.length} Staff Members</span>
      </div>
      
      {/* Scrollable Table Wrapper */}
      <div className="attendance-scroll-area">
        <table className="compact-modern-table">
          <thead>
            <tr>
              <th style={{ width: '120px' }}>Employee ID</th>
              <th>Staff Name</th>
              {data[0]?.inTime && <th style={{ width: '150px' }}>In Time</th>}
            </tr>
          </thead>
          <tbody>
            {data.length > 0 ? (
              data.map((emp) => (
                <tr key={emp.id}>
                  <td className="font-bold text-muted">{emp.id}</td>
                  <td className="font-medium">{emp.name}</td>
                  {emp.inTime && (
                    <td className="time-cell">
                      <span>{emp.inTime}</span>
                    </td>
                  )}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="3" className="empty-msg">No records found for today.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  if (loading) return (
    <div className="attendance-loader">
      <div className="pulse-spinner"></div>
      <p>Updating attendance records...</p>
    </div>
  );

  if (error) return <div className="attendance-error-msg">{error}</div>;

  return (
    <div className="today-attendance-page">
      <header className="attendance-top-bar">
        <div className="title-area">
          <h1>Today's Overview</h1>
          <div className="date-pill">
            <FaCalendarDay />
            <span>{new Date().toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</span>
          </div>
        </div>
      </header>

      {/* Summary Stat Cards */}
      <div className="stats-compact-grid">
        <div className={`compact-card present ${viewType === 'present' ? 'selected' : ''}`}>
          <div className="card-top">
            <div className="icon-box"><FaUserCheck /></div>
            <button className="toggle-btn" onClick={() => setViewType(viewType === 'present' ? null : 'present')}>
              {viewType === 'present' ? <FaEyeSlash /> : <FaEye />}
            </button>
          </div>
          <div className="card-content">
            <label>Presentees</label>
            <div className="value">{presentees.length}</div>
          </div>
        </div>

        <div className={`compact-card late ${viewType === 'late' ? 'selected' : ''}`}>
          <div className="card-top">
            <div className="icon-box"><FaUserClock /></div>
            <button className="toggle-btn" onClick={() => setViewType(viewType === 'late' ? null : 'late')}>
              {viewType === 'late' ? <FaEyeSlash /> : <FaEye />}
            </button>
          </div>
          <div className="card-content">
            <label>Late Comers</label>
            <div className="value">{lateComers.length}</div>
          </div>
        </div>

        <div className={`compact-card absent ${viewType === 'absent' ? 'selected' : ''}`}>
          <div className="card-top">
            <div className="icon-box"><FaUserTimes /></div>
            <button className="toggle-btn" onClick={() => setViewType(viewType === 'absent' ? null : 'absent')}>
              {viewType === 'absent' ? <FaEyeSlash /> : <FaEye />}
            </button>
          </div>
          <div className="card-content">
            <label>Absentees</label>
            <div className="value">{absentees.length}</div>
          </div>
        </div>
      </div>

      {/* Display Selected List */}
      <div className="attendance-display-content">
        {viewType === 'present' && renderTable(presentees, "Present Staff", "present")}
        {viewType === 'late' && renderTable(lateComers, "Late Arrivals", "late")}
        {viewType === 'absent' && renderTable(absentees, "Absent Staff", "absent")}
        {!viewType && (
          <div className="empty-selection-placeholder">
            <p>Click on "View" in any category above to see the staff list.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default TodayAttendance;