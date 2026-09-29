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
  const [celebrations, setCelebrations] = useState([]);

useEffect(() => {
    const fetchTodayAttendance = async () => {
      setLoading(true);
      setError(null);
      try {
        
        // 1. Attendance డేటా తెచ్చుకుందాం
        const attendanceRes = await fetch(`${API_BASE}/api/attendance/today`);
        if (!attendanceRes.ok) throw new Error(`Attendance fetch failed`);
        const attendanceData = await attendanceRes.json();
        
        setPresentees(attendanceData.presents || []);
        setLateComers(attendanceData.lateComers || []);

        const filteredAbsentees = (attendanceData.absents || []).filter(
          (emp) => emp.status && emp.status.toLowerCase() !== "inactive employee"
        );
        setAbsentees(filteredAbsentees);

        // 👇 2. ఇక్కడే మనం 'staff' బదులు 'staffs' అని మార్చాము!
        const STAFF_API_URL = `${API_BASE}/api/staffs`; 
        
        const staffRes = await fetch(STAFF_API_URL);
        
        let todaysCelebrations = [];

        if (staffRes.ok) {
          const staffData = await staffRes.json();
          const today = new Date();
          const todayMonth = today.getMonth();
          const todayDate = today.getDate();
          const currentYear = today.getFullYear();

          staffData.forEach((emp) => {
            // Inactive వాళ్ళని పక్కన పెట్టడానికి
            const isInactive = emp.status && emp.status.toLowerCase() === "inactive employee";
            
            if (!isInactive) {
              // బర్త్ డే చెక్
              if (emp.dob) {
                const dob = new Date(emp.dob);
                if (dob.getMonth() === todayMonth && dob.getDate() === todayDate) {
                  todaysCelebrations.push({ type: 'birthday', name: emp.name });
                }
              }
              // యానివర్సరీ చెక్ 
              if (emp.onboardingDate) {
                const obDate = new Date(emp.onboardingDate);
                if (obDate.getMonth() === todayMonth && obDate.getDate() === todayDate) {
                  const years = currentYear - obDate.getFullYear();
                  if (years > 0) {
                    todaysCelebrations.push({ type: 'anniversary', name: emp.name, years });
                  }
                }
              }
            }
          });
        } else {
          console.error("⚠️ Staff API Failed. URL:", STAFF_API_URL);
        }

        setCelebrations(todaysCelebrations);

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
      
     <div className="attendance-scroll-area">
      <table className="compact-modern-table">
        <thead>
          <tr>
            <th style={{ width: '120px' }}>Employee ID</th>
            <th>Staff Name</th>
            {data[0]?.inTime && <th style={{ width: '200px' }}>In Time</th>}
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
                    <span>
                      {emp.inTime} 
                      {/* 09:15 దాటినప్పుడు మరియు Delay Reason ఉన్నప్పుడు మాత్రమే బ్రాకెట్‌లో చూపిస్తుంది */}
                      {emp.inTime > "09:15" && emp.delayReason && (
                        <span style={{ fontSize: '0.85em', color: '#666', marginLeft: '5px' }}>
                          ({emp.delayReason})
                        </span>
                      )}
                    </span>
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
       {celebrations.length > 0 && (
        <div className="celebration-banner">
          {celebrations.map((cel, index) => (
            <div key={index} className="celebration-item">
              {cel.type === 'birthday' 
                ? <span>🎂 Happy Birthday, <strong>{cel.name}</strong>! 🎈</span>
                : <span>🎉 Happy <strong>{cel.years} Year</strong> Work Anniversary, <strong>{cel.name}</strong>! 🎊</span>
              }
            </div>
          ))}
        </div>
      )}
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
            <label>Delayed Arrivals</label>
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