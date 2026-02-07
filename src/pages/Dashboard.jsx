import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import StaffDetails from '../components/StaffDetails';
import TodayAttendance from '../components/TodayAttendance';
import AttendanceSheet from '../components/AttendanceSheet';
import Payslip from '../components/Payslip';
import LeaveRecord from '../components/LeaveRecord';
import LeaveBalance from '../components/LeaveBalance';
// --- NEW: Import the MonthlyDetails component ---
import MonthlyDetails from '../components/MonthlyDetails'; 
import './Dashboard.css';

const Dashboard = () => {
  const [section, setSection] = useState('staff');
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    navigate('/login');
  };

  return (
    <div className="dashboard-container">
      <Sidebar onSelect={setSection} selected={section} />
      <div className="main-section">
        <Header onLogout={handleLogout} />
        <div className="content">
          {section === 'staff' && <StaffDetails />}
          {section === 'today' && <TodayAttendance />}
          {section === 'sheet' && <AttendanceSheet />}
          {section === 'leaveRecord' && <LeaveRecord />}
          {section === 'leaveBalance' && <LeaveBalance />}
          {section === 'payslip' && <Payslip/>}
          {/* --- NEW: Add conditional rendering for the new section --- */}
          {section === 'monthly' && <MonthlyDetails />} 
        </div>
      </div>
    </div>
  );
};

export default Dashboard;