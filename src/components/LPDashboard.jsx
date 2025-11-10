import React, { useEffect, useState } from 'react';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const LeavePendingTable = () => {
  const [pendingRows, setPendingRows] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch data from backend
  useEffect(() => {
    const fetchPending = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/leave-requests/pending`);
        const { success, data } = await res.json();
        if (success) {
          // Flatten each request (with multiple dates) into rows per date
          const allRows = [];
          data.forEach(req => {
            req.dates.forEach(date => {
              allRows.push({
                id: req.id,
                name: req.name,
                phone: req.phone,
                date,
              });
            });
          });
          setPendingRows(allRows);
        } else {
          setPendingRows([]);
        }
      } catch (error) {
        setPendingRows([]);
      } finally {
        setLoading(false);
      }
    };
    fetchPending();
  }, []);

  // Approve/Reject handler (example: log, expand with backend call)
  const handleAction = async (row, action) => {
    try {
      // Here, post action to backend to update status for that {id, date}
      // await fetch(`${API_BASE}/api/leave-requests/updateStatus`, { ... })
      alert(`${action} for ${row.name} on ${row.date}`);
      // Remove from pendingRows (visual update)
      setPendingRows(prev =>
        prev.filter(
          r => !(r.id === row.id && r.date === row.date)
        )
      );
    } catch (error) {
      alert('Action failed');
    }
  };

  if (loading) return <div>Loading...</div>;
  if (pendingRows.length === 0) return <div>No pending leave requests.</div>;

  return (
    <div style={{ padding: 20 }}>
      <h2>Pending Leaves</h2>
      <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 18 }}>
        <thead>
          <tr>
            <th>ID</th>
            <th>Name</th>
            <th>Phone</th>
            <th>Date</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {pendingRows.map((row, idx) => (
            <tr key={`${row.id}-${row.date}`}>
              <td>{row.id}</td>
              <td>{row.name}</td>
              <td>{row.phone}</td>
              <td>{row.date}</td>
              <td>
                <button
                  style={{
                    background: '#d4f9d0',
                    color: '#197a00',
                    border: '1px solid #badaaf',
                    borderRadius: 6,
                    marginRight: 10,
                    padding: '6px 12px',
                  }}
                  onClick={() => handleAction(row, 'Approved')}
                >
                  Approve
                </button>
                <button
                  style={{
                    background: '#ffd7d5',
                    color: '#ce1515',
                    border: '1px solid #f2a3a3',
                    borderRadius: 6,
                    padding: '6px 12px',
                  }}
                  onClick={() => handleAction(row, 'Rejected')}
                >
                  Reject
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default LeavePendingTable;
