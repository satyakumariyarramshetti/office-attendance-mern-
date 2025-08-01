import React, { useState, useEffect } from 'react';
import './TodayAttendance.css';

const TodayAttendance = () => {
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
        const response = await fetch(`${process.env.REACT_APP_API_URL}/attendance/today`);
        if (!response.ok) {
          throw new Error(`Error: ${response.status} ${response.statusText}`);
        }
        const data = await response.json();

        setPresentees(data.presents || []);
        setLateComers(data.lateComers || []);
        setAbsentees(data.absents || []);
      } catch (err) {
        setError('Failed to load today\'s attendance data.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchTodayAttendance();
  }, []);

 const renderTable = (data) => (
  <table className="attendance-table">
    <thead>
      <tr>
        <th>ID</th>
        <th>Name</th>
        {data[0]?.inTime && <th>In Time</th>}
      </tr>
    </thead>
    <tbody>
      {data.length > 0 ? (
        data.map((emp) => (
          <tr key={emp.id}>
            <td data-label="ID">{emp.id}</td>
            <td data-label="Name">{emp.name}</td>
            {emp.inTime && <td data-label="In Time">{emp.inTime}</td>}
          </tr>
        ))
      ) : (
        <tr>
          <td colSpan="3">No records found</td>
        </tr>
      )}
    </tbody>
  </table>
);


  if (loading) return <p>Loading today's attendance...</p>;
  if (error) return <p className="error">{error}</p>;

  return (
    <div className="today-attendance">
      <h2>🗓️ Today's Attendance Summary</h2>
      <div className="card-container">
        <div className="summary-card present-card">
          <h3>Presentees</h3>
          <p>{presentees.length}</p>
          <button onClick={() => setViewType(viewType === 'present' ? null : 'present')}>
            {viewType === 'present' ? 'Hide' : 'View'}
          </button>
        </div>
        <div className="summary-card late-card">
          <h3>Late Comers</h3>
          <p>{lateComers.length}</p>
          <button onClick={() => setViewType(viewType === 'late' ? null : 'late')}>
            {viewType === 'late' ? 'Hide' : 'View'}
          </button>
        </div>
        <div className="summary-card absent-card">
          <h3>Absentees</h3>
          <p>{absentees.length}</p>
          <button onClick={() => setViewType(viewType === 'absent' ? null : 'absent')}>
            {viewType === 'absent' ? 'Hide' : 'View'}
          </button>
        </div>
      </div>

     {viewType === 'present' && (
  <>
    <h3>✅ Present Staff</h3>
    <div className="attendance-table-container">
      {renderTable(presentees)}
    </div>
  </>
)}
{viewType === 'late' && (
  <>
    <h3>🕒 Late Comers</h3>
    <div className="attendance-table-container">
      {renderTable(lateComers)}
    </div>
  </>
)}
{viewType === 'absent' && (
  <>
    <h3>❌ Absentees</h3>
    <div className="attendance-table-container">
      {renderTable(absentees)}
    </div>
  </>
)}

    </div>
  );
};

export default TodayAttendance;
