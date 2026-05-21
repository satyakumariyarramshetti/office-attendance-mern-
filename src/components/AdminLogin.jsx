import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios'; // axios install chesi unte, lekapothe fetch vadavachu
import './AdminLogin.css';

const AdminLogin = ({ setIsAdmin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError(''); // Clear previous errors

    try {
      // Backend API URL (Mee frontend .env lo unna URL vadutunnam)
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000';
      
      const response = await axios.post(`${apiUrl}/api/admin/login`, {
        username: username.trim(),
        password: password.trim()
      });

      if (response.data.success) {
        localStorage.setItem('adminToken', 'true');
        localStorage.setItem('isAdmin', 'true');
        setIsAdmin(true);
        navigate('/admin');
      }
    } catch (err) {
      // API 401 pampithe ikkadiki vastundi
      setError(err.response?.data?.message || 'Invalid username or password');
    }
  };

  return (
    <div className="login-container">
      <h2>Admin Login</h2>
      <form onSubmit={handleLogin}>
        <input
          type="text"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        {error && <p className="error" style={{color: 'red'}}>{error}</p>}
        <button type="submit">Login</button>
      </form>
    </div>
  );
};

export default AdminLogin;