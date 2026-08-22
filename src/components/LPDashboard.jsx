import React, { useState, useEffect, useMemo } from 'react';
import './LPDashboard.css';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const admins = [
  "Satya", "Mohan", "Rajesh", "Babu",
  "Ankita", "Pradeep", "Santosh", "Ashmita"
];
const rolePasswords = {
  "Satya": "Approve123", "Mohan": "Piping123", "Rajesh": "Piping987", "Babu": "Product123",
  "Ankita": "HR123", "Pradeep": "Business123", "Santosh": "Subcontract123", "Ashmita": "Project123", "hr": "Ankita123"
};

const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const LPDashboard = () => {
  const [authRole, setAuthRole] = useState('');
  const [pendingRole, setPendingRole] = useState('');
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(true);
  const [enteredPassword, setEnteredPassword] = useState('');
  const [authError, setAuthError] = useState('');

  const [activeTab, setActiveTab] = useState('pending');
  const [leaveRows, setLeaveRows] = useState([]);
  const [loading, setLoading] = useState(true);
  // Add this near your selectedYear/selectedMonth states
  const [searchQuery, setSearchQuery] = useState('');

  // New Filters
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());

  useEffect(() => {
    if (!authRole) return;
    const fetchLeaves = async () => {
      setLoading(true);
      try {
        // "all" అయితే మీ backend లోని "all/list" కి వెళ్తుంది, లేదంటే status కి వెళ్తుంది.
        const endpoint = activeTab === 'all' ? 'all/list' : activeTab;
        const res = await fetch(`${API_BASE}/api/leave-requests/${endpoint}`);
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

  // Logic 1: Filter by Role (Admin gets only their reports, HR gets all)
  const roleFiltered = useMemo(() => {
    return authRole === 'hr' ? leaveRows : leaveRows.filter(row => row.reportsTo === authRole);
  }, [leaveRows, authRole]);
  const displayedRows = useMemo(() => {
    // 1. Filter by Date (Year/Month)
    let filtered = roleFiltered.filter(row => {
      const [, m, y] = row.date.split('-');
      const yearMatch = y === selectedYear;
      const monthMatch = activeTab === 'all' || selectedMonth === null || parseInt(m, 10) === (selectedMonth + 1);
      return yearMatch && monthMatch;
    });

    // 2. ADD THIS: Global Search Filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(row =>
        row.id?.toLowerCase().includes(query) ||
        row.name?.toLowerCase().includes(query) ||
        row.email?.toLowerCase().includes(query) ||
        row.reportsTo?.toLowerCase().includes(query) ||
        row.leaveReason?.toLowerCase().includes(query) ||
        row.date?.toLowerCase().includes(query)
      );
    }

    // 3. Keep your existing Sorting (Latest Date first)
    return filtered.sort((a, b) => {
      const [dayA, monthA, yearA] = a.date.split('-').map(Number);
      const [dayB, monthB, yearB] = b.date.split('-').map(Number);
      return new Date(yearB, monthB - 1, dayB) - new Date(yearA, monthA - 1, dayA);
    });
  }, [roleFiltered, selectedYear, selectedMonth, activeTab, searchQuery]); // Add searchQuery to dependency array

  // Logic 3: Monthly Statistics (Only for PENDING status as requested)
  const monthStats = useMemo(() => {
    const stats = Array(12).fill(0);
    roleFiltered.forEach(row => {
      const [, m, y] = row.date.split('-');
      if (y === selectedYear && row.status === 'pending') {
        stats[parseInt(m, 10) - 1]++;
      }
    });
    return stats;
  }, [roleFiltered, selectedYear]);

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
        alert(`${action} successfully!`);
        // Tab ki thaggattu list ni update cheyali
        setLeaveRows(prev => prev.filter(r => !(r.id === row.id && r.date === row.date)));
      }
    } catch (err) {
      alert('Error updating leave status');
    }
  };

  const handleRoleChange = (val) => {
    setPendingRole(val);
    setEnteredPassword('');
    setShowPasswordPrompt(true);
  };

  const handlePasswordSubmit = () => {
    if (enteredPassword === rolePasswords[pendingRole]) {
      setAuthRole(pendingRole);
      setShowPasswordPrompt(false);
      setAuthError('');
    } else {
      setAuthError('Incorrect password!');
    }
  };

  const currentYearNum = new Date().getFullYear();
  // ఉదాహరణకు: 2024 నుండి వచ్చే ఏడాది వరకు చూపించాలనుకుంటే
  const yearOptions = [];
  for (let y = 2024; y <= currentYearNum + 1; y++) {
    yearOptions.push(y.toString());
  }

  return (
    <div className="lp-dashboard-bg">
      <div className="lp-dashboard-container">


        <div className="lp-top-bar">
          <h2 className="lp-dashboard-heading">Leave Plan Dashboard</h2>
          <div className="lp-search-container" style={{ flex: 1, margin: '0 20px', maxWidth: '400px' }}>
    <input 
      type="text" 
      placeholder="Search ID, Name, Email, Reason..." 
      className="lp-search-input"
      value={searchQuery}
      onChange={(e) => setSearchQuery(e.target.value)}
      style={{
        width: '100%',
        padding: '8px 15px',
        borderRadius: '20px',
        border: '1px solid #dcdfe6',
        outline: 'none'
      }}
    />
  </div>
  
          <div className="lp-controls">
            <div className="lp-control-item">
              <label>Year:</label>
              <select value={selectedYear} onChange={e => setSelectedYear(e.target.value)} className="lp-mini-select">
                {yearOptions.map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>
            <div className="lp-control-item">
              <label>Role:</label>
              <select className="lp-mini-select" value={authRole} onChange={e => handleRoleChange(e.target.value)}>
                <option value="" disabled>Select</option>
                {admins.map(admin => (<option key={admin} value={admin}>{admin}</option>))}
                <option value="hr">HR</option>
              </select>
            </div>
          </div>
        </div>

        {authRole && (
          <>
            {/* Month Cards Section */}
            <div className="lp-month-grid">
              {months.map((m, idx) => (
                <div
                  key={m}
                  className={`lp-month-card ${selectedMonth === idx ? 'active' : ''} ${monthStats[idx] > 0 ? 'urgent' : ''}`}
                  onClick={() => setSelectedMonth(selectedMonth === idx ? null : idx)}
                >
                  <span className="month-name">{m}</span>
                  <span className="month-count">{monthStats[idx]} Pending</span>
                </div>
              ))}
            </div>

            {/* Status Tabs */}
            <div className="lp-dashboard-buttons">
              {['all', 'pending', 'approved', 'rejected'].map(tab => (
                <button
                  key={tab}
                  className={`lp-btn ${tab}${activeTab === tab ? ' active' : ''}`}
                  onClick={() => {
                    setActiveTab(tab);
                    if (tab === 'all') setSelectedMonth(null); // All క్లిక్ చేసినప్పుడు Month ఫిల్టర్ తీసేస్తుంది
                  }}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)} Leaves
                </button>
              ))}
            </div>

            {/* Table Section */}
            <div className="lp-dashboard-table">
              <h3 className="lp-table-heading">
                {selectedMonth !== null ? months[selectedMonth] : ''} {activeTab.toUpperCase()} Requests ({displayedRows.length})
              </h3>

              <div className="table-responsive">
                <table className="lp-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Reports To</th>
                      <th>Reason</th>
                      <th>Date</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr><td colSpan="8" className="lp-info-text">Loading Data...</td></tr>
                    ) : displayedRows.length === 0 ? (
                      <tr><td colSpan="8" className="lp-info-text">No data found for the selection.</td></tr>
                    ) : (
                      displayedRows.map((row) => (
                        <tr key={`${row.id}-${row.date}`}>
                          <td>{row.id}</td>
                          <td className="font-bold">{row.name}</td>
                          <td className="text-small">{row.email}</td>
                          <td>{row.reportsTo}</td>
                          <td className="reason-text">{row.leaveReason}</td>
                          <td>{row.date}</td>
                          <td><span className={`status-pill ${row.status}`}>{row.status}</span></td>
                          <td>
                            {/* ADMIN ACTION: Only for Pending & if it's their report */}
                            {authRole !== 'hr' && row.status === 'pending' && (
                              <div className="action-flex">
                                <button className="lp-action-btn approve" onClick={() => handleAction(row, 'Approved')}>Approve</button>
                                <button className="lp-action-btn reject" onClick={() => handleAction(row, 'Rejected')}>Reject</button>
                              </div>
                            )}

                            {/* HR ACTIONS: Special permissions for reversing */}
                            {authRole === 'hr' && (
                              <div className="action-flex">
                                {row.status === 'approved' && (
                                  <button className="lp-action-btn reject" onClick={() => handleAction(row, 'Rejected')}>Reject Again</button>
                                )}
                                {row.status === 'rejected' && (
                                  <button className="lp-action-btn approve" onClick={() => handleAction(row, 'Approved')}>Approve Again</button>
                                )}
                                {row.status === 'pending' && (
                                  <>
                                    <button className="lp-action-btn approve" onClick={() => handleAction(row, 'Approved')}>Approve</button>
                                    <button className="lp-action-btn reject" onClick={() => handleAction(row, 'Rejected')}>Reject</button>
                                  </>
                                )}
                              </div>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Password Modal remains the same but with cleaner styling */}
      {showPasswordPrompt && (
        <div className="lp-modal-backdrop">
          <div className="lp-modal-content">
            <h4>Select Role & Verify</h4>
            <select className="lp-mini-select full-width" value={pendingRole} onChange={e => setPendingRole(e.target.value)}>
              <option value="">Select Role</option>
              {admins.map(a => <option key={a} value={a}>{a}</option>)}
              <option value="hr">HR</option>
            </select>
            <input type="password" placeholder="Password" value={enteredPassword} onChange={e => setEnteredPassword(e.target.value)} />
            <div className="modal-btns">
              <button onClick={handlePasswordSubmit} className="btn-main">Login</button>
              <button onClick={() => { setPendingRole(''); setEnteredPassword(''); setAuthError(''); }} className="btn-cancel">Back</button>
            </div>
            {authError && <div className="error-msg">{authError}</div>}
          </div>
        </div>
      )}
    </div>
  );
};

export default LPDashboard;