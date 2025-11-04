import React from 'react';
// --- MODIFIED: Import new icons ---
import { 
  FaUsers, 
  FaCalendarCheck, 
  FaClipboardList, 
  FaUserCircle, 
  FaFileInvoiceDollar, 
  FaFileAlt, 
  FaChartPie,
  FaCalendarAlt // --- NEW: Icon for Monthly Details
} from 'react-icons/fa';
import './Sidebar.css';

const Sidebar = ({ onSelect, selected }) => {
  return (
    <div className="sidebar">
      {/* User section */}
      <div className="user-info">
        <FaUserCircle className="user-icon" />
        <span className="user-name">Admin</span>
      </div>

      {/* Divider */}
      <hr className="sidebar-divider" />

      {/* Menu Items */}
      <div 
        className={`menu-item ${selected === 'staff' ? 'active' : ''}`} 
        onClick={() => onSelect('staff')}
      >
        <FaUsers className="menu-icon" /> Staff Details
      </div>
      <div 
        className={`menu-item ${selected === 'today' ? 'active' : ''}`} 
        onClick={() => onSelect('today')}
      >
        <FaCalendarCheck className="menu-icon" /> Today Attendance
      </div>
      <div 
        className={`menu-item ${selected === 'sheet' ? 'active' : ''}`} 
        onClick={() => onSelect('sheet')}
      >
        <FaClipboardList className="menu-icon" /> Attendance Sheet
      </div>
      
      {/* --- NEW: Monthly Details Menu Item --- */}
      <div
        className={`menu-item ${selected === 'monthly' ? 'active' : ''}`}
        onClick={() => onSelect('monthly')}
      >
        <FaCalendarAlt className="menu-icon" /> Monthly Details
      </div>

      <div
        className={`menu-item ${selected === 'leaveRecord' ? 'active' : ''}`}
        onClick={() => onSelect('leaveRecord')}
      >
        <FaFileAlt className="menu-icon" /> Leave Record
      </div>

      <div
        className={`menu-item ${selected === 'leaveBalance' ? 'active' : ''}`}
        onClick={() => onSelect('leaveBalance')}
      >
        <FaChartPie className="menu-icon" /> Leave Balance
      </div>

      <div
        className={`menu-item ${selected === 'payslip' ? 'active' : ''}`}
        onClick={() => onSelect('payslip')}
      >
        <FaFileInvoiceDollar className="menu-icon" /> PaySlip
      </div>

    </div>
  );
};

export default Sidebar;