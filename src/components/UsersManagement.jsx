import React, { useState, useEffect } from 'react';

const UsersManagement = () => {
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState({ username: '', email: '', password: '' });
  const API_BASE = "http://localhost:5000";

  const fetchUsers = () => {
    fetch(`${API_BASE}/api/users/all`).then(res => res.json()).then(data => setUsers(data));
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleAdd = async () => {
    if(!form.username || !form.email || !form.password) { alert("Please fill all fields!"); return; }
    const res = await fetch(`${API_BASE}/api/users/add`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form)
    });
    if(res.ok) { fetchUsers(); setForm({ username: '', email: '', password: '' }); }
  };

 const handleLogoutUser = async (userId) => {
    if(window.confirm("Force logout this user?")) {
      const response = await fetch(`${API_BASE}/api/users/force-logout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      });
      
      // const data = await response.json();
      
      if(response.ok) {
        alert("Success: User has been logged out successfully!"); // ఇక్కడ మెసేజ్ యాడ్ చేశాను
        fetchUsers(); // లిస్ట్ ని రిఫ్రెష్ చేస్తుంది
      } else {
        alert("Error: Failed to logout user.");
      }
    }
  };

  const handleDeleteUser = async (id) => {
    if(window.confirm("Delete this user?")) {
      await fetch(`${API_BASE}/api/users/delete/${id}`, { method: 'DELETE' });
      fetchUsers();
    }
  };

  return (
    <div className="p-4 bg-white shadow rounded">
      <h3 className="mb-4">App Users Management</h3>
      <div className="row mb-4 g-2">
        <div className="col-md-4"><input placeholder="Username" className="form-control" value={form.username} onChange={e => setForm({...form, username: e.target.value})} /></div>
        <div className="col-md-4"><input placeholder="Email" className="form-control" value={form.email} onChange={e => setForm({...form, email: e.target.value})} /></div>
        <div className="col-md-2"><input placeholder="Password" type="text" className="form-control" value={form.password} onChange={e => setForm({...form, password: e.target.value})} /></div>
        <div className="col-md-2"><button className="btn btn-success w-100" onClick={handleAdd}>Add User</button></div>
      </div>
      <table className="table table-hover border text-center">
        <thead className="table-light">
          <tr><th>Username</th><th>Email</th><th>Password</th><th>Status</th><th>Actions</th></tr>
        </thead>
        <tbody>
          {users.map(u => (
            <tr key={u._id}>
              <td>{u.username}</td>
              <td>{u.email}</td>
              <td>{u.password}</td>
              <td>{u.isLoggedIn ? <span className="badge bg-success">Login Activated</span> : <span className="badge bg-secondary">Offline</span>}</td>
              <td>
                <button className="btn btn-warning btn-sm me-2" onClick={() => handleLogoutUser(u._id)}>Logout</button>
                <button className="btn btn-danger btn-sm" onClick={() => handleDeleteUser(u._id)}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
export default UsersManagement;