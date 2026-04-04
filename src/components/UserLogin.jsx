import React, { useState } from 'react';

const UserLogin = () => {
  const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:5000";

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE}/api/users/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
     // ... handleLogin లోపల ...
if (data.success) {
  localStorage.setItem('userAuth', 'true');
  localStorage.setItem('userId', data.userId);
  window.location.href = "/";
} else {
        alert("Invalid login details!");
      }
    } catch (err) {
      alert("Server error. Please try again.");
    }
  };

  return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f4f7f6' }}>
      <form onSubmit={handleLogin} className="card p-4 shadow-lg" style={{ width: '380px' }}>
        <h3 className="text-center mb-4">Staff Portal Login</h3>
        <input type="email" placeholder="Email" className="form-control mb-3" onChange={e => setEmail(e.target.value)} required />
        <input type="password" placeholder="Password" className="form-control mb-3" onChange={e => setPassword(e.target.value)} required />
        <button className="btn btn-primary w-100">Login</button>
      </form>
    </div>
  );
};

export default UserLogin; 