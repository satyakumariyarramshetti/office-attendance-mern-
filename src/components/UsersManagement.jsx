import React, { useState, useEffect, useCallback } from 'react'; 
import "./UsersManagement.css";

const UsersManagement = () => {
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState({ username: '', email: '', password: '' });
  const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:5000";

  // ✅ Fetch all users from backend
  const fetchUsers = useCallback(() => {
    fetch(`${API_BASE}/api/users/all`)
      .then(res => res.json())
      .then(data => setUsers(data))
      .catch(err => console.error("Error fetching users:", err));
  }, [API_BASE]);

  useEffect(() => { 
    fetchUsers(); 
  }, [fetchUsers]); 

  // ✅ Add New User
  const handleAdd = async () => {
    if(!form.username || !form.email || !form.password) { 
        alert("Please fill all fields!"); 
        return; 
    }
    try {
      const res = await fetch(`${API_BASE}/api/users/add`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      if(res.ok) { 
          alert("User added successfully!");
          fetchUsers(); 
          setForm({ username: '', email: '', password: '' }); 
      } else {
          const errData = await res.json();
          alert("Error: " + (errData.message || "Failed to add user"));
      }
    } catch (err) {
      console.error("Add user error:", err);
    }
  };

  // ✅ Force Logout User
  const handleLogoutUser = async (userId) => {
    if(window.confirm("Force logout this user?")) {
      try {
        const response = await fetch(`${API_BASE}/api/users/force-logout`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId })
        });
        
        if(response.ok) {
          alert("Success: User has been logged out!");
          fetchUsers(); 
        } else {
          alert("Error: Failed to logout user.");
        }
      } catch (err) {
        console.error("Logout error:", err);
      }
    }
  };

  // ✅ Delete User
  const handleDeleteUser = async (id) => {
    if(window.confirm("Are you sure you want to delete this user permanently?")) {
      try {
        const res = await fetch(`${API_BASE}/api/users/delete/${id}`, { method: 'DELETE' });
        if(res.ok) {
          alert("User deleted successfully.");
          fetchUsers();
        }
      } catch (err) {
        console.error("Delete error:", err);
      }
    }
  };

  return (
    <div className="users-mgmt-page">
      <div className="users-container">
        <header className="page-header">
          <div className="header-content">
            <h1>App Users Management</h1>
            <p>Control application access and manage login credentials for staff members.</p>
          </div>
        </header>

        {/* --- Create User Form Section --- */}
        <section className="form-section">
          <div className="form-card">
            <h2 className="section-title">Create New User</h2>
            <div className="user-form-grid">
              <div className="input-field">
                <label>Username</label>
                <input 
                  type="text"
                  placeholder="e.g. Satya C" 
                  value={form.username} 
                  onChange={e => setForm({...form, username: e.target.value})} 
                />
              </div>
              <div className="input-field">
                <label>Email Address</label>
                <input 
                  type="email"
                  placeholder="name@praxsol.com" 
                  value={form.email} 
                  onChange={e => setForm({...form, email: e.target.value})} 
                />
              </div>
              <div className="input-field">
                <label>Password</label>
                <input 
                  type="text" 
                  placeholder="Set password" 
                  value={form.password} 
                  onChange={e => setForm({...form, password: e.target.value})} 
                />
              </div>
              <div className="form-actions">
                <button className="add-user-btn" onClick={handleAdd}>
                  <span>+</span> Add User
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* --- Users List Section --- */}
        <section className="list-section">
          <div className="table-card">
            <div className="table-responsive">
              <table className="modern-users-table">
                <thead>
                  <tr>
                    <th style={{ width: '35%' }}>User Details</th>
                    <th style={{ width: '20%' }} className="text-center">Password</th>
                    <th style={{ width: '20%' }} className="text-center">Status</th>
                    <th style={{ width: '25%' }} className="text-center">Manage Access</th>
                  </tr>
                </thead>
                <tbody>
                  {users.length > 0 ? (
                    users.map(u => (
                      <tr key={u._id}>
                        <td>
                          <div className="user-identity">
                            <span className="user-name">{u.username}</span>
                            <span className="user-email">{u.email}</span>
                          </div>
                        </td>
                        <td className="text-center">
                          <code className="password-tag">{u.password}</code>
                        </td>
                        <td className="text-center">
                          {u.isLoggedIn ? (
                            <span className="status-badge live">● Active</span>
                          ) : (
                            <span className="status-badge off">● Offline</span>
                          )}
                        </td>
                        <td>
                          <div className="table-actions">
                            <button className="btn-action btn-delete" onClick={() => handleDeleteUser(u._id)}>
                              Delete
                            </button>
                            <button className="btn-action btn-logout" onClick={() => handleLogoutUser(u._id)}>
                              Logout
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="4" className="no-data">No active users found. Create one above.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default UsersManagement;