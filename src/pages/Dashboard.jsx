// Dashboard.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import StaffDetails from '../components/StaffDetails';
import TodayAttendance from '../components/TodayAttendance';
import AttendanceSheet from '../components/AttendanceSheet';
import './Dashboard.css';

const Dashboard = () => {
  const [section, setSection] = useState('staff');
  const navigate = useNavigate();

  const handleLogout = () => {
    // Clear admin session token
    localStorage.removeItem('adminToken'); // or sessionStorage if you used that

    // Navigate to login page
    navigate('/login');
  };

  return (
    <div className="dashboard-container">
      {/* Sidebar handles section switching */}
      <Sidebar onSelect={setSection} selected={section} />

      <div className="main-section">
        {/* Header displays title + logout */}
        <Header onLogout={handleLogout} />

        <div className="content">
          {section === 'staff' && <StaffDetails />}
          {section === 'today' && <TodayAttendance />}
          {section === 'sheet' && <AttendanceSheet />}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
