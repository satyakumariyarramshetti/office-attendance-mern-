import React from 'react';
import { FaUsers, FaCalendarCheck, FaClipboardList, FaUserCircle } from 'react-icons/fa';
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
    </div>
  );
};

export default Sidebar;
