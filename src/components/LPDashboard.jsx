import React, { useState, useEffect } from 'react';
import './LPDashboard.css';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const LPDashboard = () => {
  const [activeTab, setActiveTab] = useState('pending');
  const [leaveRows, setLeaveRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState('admin'); // Toggle between 'admin' and 'hr'

  // ✅ Fetch data whenever tab or role changes
  useEffect(() => {
    const fetchLeaves = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE}/api/leave-requests/${activeTab}`);
        const result = await res.json();

        if (result.success) {
          setLeaveRows(result.data);
        } else {
          setLeaveRows([]);
        }
      } catch (err) {
        console.error('Error fetching leaves:', err);
        setLeaveRows([]);
      } finally {
        setLoading(false);
      }
    };

    fetchLeaves();
  }, [activeTab]);

  // ✅ Approve or Reject (Admin or HR)
  const handleAction = async (row, action) => {
    try {
      const status = action === 'Approved' ? 'approved' : 'rejected';
      const res = await fetch(`${API_BASE}/api/leave-requests/update-status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: row.id,
          date: row.date,
          status,
          updatedBy: userRole,
        }),
      });

      const result = await res.json();
      if (result.success) {
        alert(`${action} successfully by ${userRole.toUpperCase()} for ${row.name} on ${row.date}`);
        // Remove the row from current tab
        setLeaveRows(prev => prev.filter(r => !(r.id === row.id && r.date === row.date)));
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

        {/* ✅ Role Switch (Admin / HR) */}
        <div className="lp-role-switch">
          <span className="lp-role-label">Current Role:</span>
          <button
            className={`lp-role-btn ${userRole === 'admin' ? 'active' : ''}`}
            onClick={() => setUserRole('admin')}
          >
            Admin
          </button>
          <button
            className={`lp-role-btn ${userRole === 'hr' ? 'active' : ''}`}
            onClick={() => setUserRole('hr')}
          >
            HR
          </button>
        </div>

        {/* ✅ Tab Buttons */}
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

        {/* ✅ Table Section */}
        <div className="lp-dashboard-table">
          <h3 className="lp-table-heading">
            {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Leaves
          </h3>

          {loading ? (
            <div className="lp-loading">Loading...</div>
          ) : leaveRows.length === 0 ? (
            <div className="lp-info-text">No {activeTab} leave requests.</div>
          ) : (
            <table className="lp-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Name</th>
                  <th>Phone</th>
                  <th>Date</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {leaveRows.map((row, idx) => (
                  <tr key={`${row.id}-${row.date}`}>
                    <td>{row.id}</td>
                    <td>{row.name}</td>
                    <td>{row.phone}</td>
                    <td>{row.date}</td>
                    <td>{row.status}</td>
                    <td>
                      {/* Admin: can only approve/reject pending */}
                      {userRole === 'admin' && activeTab === 'pending' && (
                        <>
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
                        </>
                      )}

                      {/* HR: can re-approve or re-reject */}
                      {userRole === 'hr' && (
                        <>
                          {activeTab === 'approved' && (
                            <button
                              className="lp-action-btn reject"
                              onClick={() => handleAction(row, 'Rejected')}
                            >
                              Reject Again
                            </button>
                          )}
                          {activeTab === 'rejected' && (
                            <button
                              className="lp-action-btn approve"
                              onClick={() => handleAction(row, 'Approved')}
                            >
                              Approve Again
                            </button>
                          )}
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default LPDashboard;
