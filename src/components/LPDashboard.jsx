import React, { useState, useEffect } from 'react';
import './LPDashboard.css';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const admins = [
  "Satya", "Mohan", "Rajesh", "Babu",
  "Ankita", "Pradeep", "Santosh", "Ashmita"
];
const rolePasswords = {
  "Satya": "satya123",
  "Mohan": "mohan123",
  "Rajesh": "rajesh123",
  "Babu": "babu123",
  "Ankita": "ankita123",
  "Pradeep": "pradeep123",
  "Santosh": "santosh123",
  "Ashmita": "ashmita123",
  "hr": "hr123"
};

const LPDashboard = () => {
  // Authenticated role shown on dashboard
  const [authRole, setAuthRole] = useState('');
  const [pendingRole, setPendingRole] = useState('');
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(true); // Modal on initial load
  const [enteredPassword, setEnteredPassword] = useState('');
  const [authError, setAuthError] = useState('');
  // Leave plan states
  const [activeTab, setActiveTab] = useState('pending');
  const [leaveRows, setLeaveRows] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch the data when tab changes and when authenticated role changes
  useEffect(() => {
    if (!authRole) return; // don't fetch until logged in
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
  }, [activeTab, authRole]);

  // Role-based rows
  const displayedRows = authRole === 'hr'
    ? leaveRows
    : leaveRows.filter(row => row.reportsTo === authRole);

  // Approve/Reject logic
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
          updatedBy: authRole,
        }),
      });
      const result = await res.json();
      if (result.success) {
        alert(`${action} successfully by ${authRole.toUpperCase()} for ${row.name} on ${row.date}`);
        setLeaveRows(prev => prev.filter(r => !(r.id === row.id && r.date === row.date)));
      } else {
        alert('Failed to update leave status');
      }
    } catch (err) {
      console.error(err);
      alert('Error updating leave status');
    }
  };

  // Handle role switch: prompt for password
  const handleRoleChange = (val) => {
    setPendingRole(val);
    setEnteredPassword('');
    setAuthError('');
    setShowPasswordPrompt(true);
  };

  // Password modal logic
  const handlePasswordSubmit = () => {
    if (enteredPassword === rolePasswords[pendingRole]) {
      setAuthRole(pendingRole);
      setShowPasswordPrompt(false);
      setAuthError('');
    } else {
      setAuthError('Incorrect password!');
    }
  };

  return (
    <div className="lp-dashboard-bg">
      <div className="lp-dashboard-container">
        <h2 className="lp-dashboard-heading">Leave Plan Dashboard</h2>
        {/* Role Switcher */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ marginRight: 8 }}>Current Role:</label>
          <select
            className="lp-role-dropdown"
            value={authRole}
            onChange={e => handleRoleChange(e.target.value)}
            disabled={showPasswordPrompt}
          >
            <option value="" disabled>Select role</option>
            {admins.map(admin => (
              <option key={admin} value={admin}>{admin}</option>
            ))}
            <option value="hr">HR</option>
          </select>
        </div>
        {!authRole ? (
          <div className="lp-info-text">Please log in as an admin or HR to view dashboard.</div>
        ) : (
          <>
            {/* Tab Buttons */}
            <div className="lp-dashboard-buttons">
              <button
                className={`lp-btn pending${activeTab === 'pending' ? ' active' : ''}`}
                onClick={() => setActiveTab('pending')}
              >Pending Leaves</button>
              <button
                className={`lp-btn approved${activeTab === 'approved' ? ' active' : ''}`}
                onClick={() => setActiveTab('approved')}
              >Approved Leaves</button>
              <button
                className={`lp-btn rejected${activeTab === 'rejected' ? ' active' : ''}`}
                onClick={() => setActiveTab('rejected')}
              >Rejected Leaves</button>
            </div>
            {/* Table View */}
            <div className="lp-dashboard-table">
              <h3 className="lp-table-heading">
                {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Leaves
              </h3>
              {loading ? (
                <div className="lp-loading">Loading...</div>
              ) : displayedRows.length === 0 ? (
                <div className="lp-info-text">No {activeTab} leave requests.</div>
              ) : (
                <table className="lp-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Reports To</th>
                      <th>Date</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayedRows.map((row, idx) => (
                      <tr key={`${row.id}-${row.date}`}>
                        <td>{row.id}</td>
                        <td>{row.name}</td>
                        <td>{row.email}</td>
                        <td>{row.reportsTo}</td>
                        <td>{row.date}</td>
                        <td>{row.status}</td>
                        <td>
                          {/* Admin action */}
                          {authRole !== 'hr' && activeTab === 'pending' && (
                            <>
                              <button
                                className="lp-action-btn approve"
                                onClick={() => handleAction(row, 'Approved')}
                              >Approve</button>
                              <button
                                className="lp-action-btn reject"
                                onClick={() => handleAction(row, 'Rejected')}
                              >Reject</button>
                            </>
                          )}
                          {/* HR actions */}
                          {authRole === 'hr' && (
                            <>
                              {activeTab === 'approved' && (
                                <button
                                  className="lp-action-btn reject"
                                  onClick={() => handleAction(row, 'Rejected')}
                                >Reject Again</button>
                              )}
                              {activeTab === 'rejected' && (
                                <button
                                  className="lp-action-btn approve"
                                  onClick={() => handleAction(row, 'Approved')}
                                >Approve Again</button>
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
          </>
        )}
      </div>
      {/* Password Modal */}
      {showPasswordPrompt && (
        <div className="lp-modal-backdrop">
          <div className="lp-modal-content">
            {!pendingRole ? (
              <>
                <h4>Select your role:</h4>
                <select
                  className="lp-role-dropdown"
                  value=""
                  onChange={e => setPendingRole(e.target.value)}
                >
                  <option value="" disabled>Select role</option>
                  {admins.map(admin => (
                    <option key={admin} value={admin}>{admin}</option>
                  ))}
                  <option value="hr">HR</option>
                </select>
              </>
            ) : (
              <>
                <h4>Enter password for {pendingRole}:</h4>
                <input
                  type="password"
                  value={enteredPassword}
                  onChange={e => setEnteredPassword(e.target.value)}
                  placeholder="Password"
                  style={{padding: "8px", fontSize: "1rem", marginBottom: "10px"}}
                />
                <div>
                  <button
                    onClick={handlePasswordSubmit}
                    style={{marginRight: "10px"}}
                  >Submit</button>
                  <button onClick={() => {
                    setPendingRole('');
                    setEnteredPassword('');
                    setAuthError('');
                  }}>Back</button>
                </div>
                {authError && <div style={{color: "red", marginTop: "5px"}}>{authError}</div>}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default LPDashboard;
