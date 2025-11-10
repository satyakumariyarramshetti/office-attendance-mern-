import React, { useState, useEffect } from 'react';
import './LPDashboard.css';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const LPDashboard = () => {
  const [activeTab, setActiveTab] = useState('pending');
  const [pendingRows, setPendingRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (activeTab === 'pending') {
      setLoading(true);
      fetch(`${API_BASE}/api/leave-requests/${activeTab}`)

        .then(res => res.json())
        .then(result => setPendingRows(result.success ? result.data : []))
        .catch(() => setPendingRows([]))
        .finally(() => setLoading(false));
    }
    // Add logic for approved/rejected data here if needed
  }, [activeTab]);

const handleAction = async (row, action) => {
  try {
    const status = action === 'Approved' ? 'approved' : 'rejected';
    const res = await fetch(`${API_BASE}/api/leave-requests/update-status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: row.id, date: row.date, status })
    });

    const result = await res.json();
    if (result.success) {
      alert(`${action} successfully for ${row.name} on ${row.date}`);
      setPendingRows(prev => prev.filter(r => !(r.id === row.id && r.date === row.date)));
    } else {
      alert('Failed to update leave status');
    }
  } catch (err) {
    console.error(err);
    alert('Error updating leave status');
  }
};



  return (
    <div className="lp-dashboard-bg">
      <div className="lp-dashboard-container">
        <h2 className="lp-dashboard-heading">Leave Plan Dashboard</h2>
        <div className="lp-dashboard-buttons">
          <button 
            className={`lp-btn pending${activeTab === 'pending' ? ' active' : ''}`} 
            onClick={() => setActiveTab('pending')}
          >
            Pending Leaves
          </button>
          <button 
            className={`lp-btn approved${activeTab === 'approved' ? ' active' : ''}`} 
            onClick={() => setActiveTab('approved')}
          >
            Approved Leaves
          </button>
          <button 
            className={`lp-btn rejected${activeTab === 'rejected' ? ' active' : ''}`} 
            onClick={() => setActiveTab('rejected')}
          >
            Rejected Leaves
          </button>
        </div>
        <div className="lp-dashboard-table">
          {activeTab === 'pending' && (
            <>
              <h3 className="lp-table-heading">Pending Leaves</h3>
              {loading ? (
                <div className="lp-loading">Loading...</div>
              ) : pendingRows.length === 0 ? (
                <div className="lp-info-text">No pending leave requests.</div>
              ) : (
                <table className="lp-table">
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
                            className="lp-action-btn approve"
                            onClick={() => handleAction(row, 'Approved')}
                          >
                            Approve
                          </button>
                          <button
                            className="lp-action-btn reject"
                            onClick={() => handleAction(row, 'Rejected')}
                          >
                            Reject
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </>
          )}
          {activeTab !== 'pending' && (
            <div className="lp-info-text">
              {activeTab === 'approved' ? 'Approved leave list coming soon...' : 'Rejected leave list coming soon...'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LPDashboard;
