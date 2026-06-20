import React from 'react';
import { 
  FaUsers, 
  FaCalendarCheck, 
  FaClipboardList, 
  FaUserCircle, 
  
  FaFileAlt, 
  FaChartPie,
  FaCalendarAlt,
  FaUserShield
} from 'react-icons/fa';
import './Sidebar.css';

const Sidebar = ({ onSelect, selected }) => {
  return (
    <div className="sidebar">
      {/* Brand / Logo Section */}
      <div className="sidebar-brand">
        <div className="brand-icon">PS</div>
        <span className="brand-name">Praxsol Admin</span>
      </div>

      {/* User section */}
      <div className="user-profile">
        <div className="profile-img-wrapper">
          <FaUserCircle className="profile-icon" />
          <span className="status-dot"></span>
        </div>
        <div className="profile-info">
          <span className="user-label">Logged in as</span>
          <span className="user-name">Admin</span>
        </div>
      </div>

      {/* Menu Container */}
      <nav className="sidebar-menu">
        <div className="menu-group-label">MAIN MENU</div>
        
        <div 
          className={`menu-item ${selected === 'staff' ? 'active' : ''}`} 
          onClick={() => onSelect('staff')}
        >
          <FaUsers className="menu-icon" /> 
          <span>Staff Details</span>
        </div>

        <div 
          className={`menu-item ${selected === 'users' ? 'active' : ''}`} 
          onClick={() => onSelect('users')}
        >
          <FaUserShield className="menu-icon" /> 
          <span>App Users</span>
        </div>

        <div className="menu-group-label">ATTENDANCE</div>

        <div 
          className={`menu-item ${selected === 'today' ? 'active' : ''}`} 
          onClick={() => onSelect('today')}
        >
          <FaCalendarCheck className="menu-icon" /> 
          <span>Today Attendance</span>
        </div>

        <div 
          className={`menu-item ${selected === 'sheet' ? 'active' : ''}`} 
          onClick={() => onSelect('sheet')}
        >
          <FaClipboardList className="menu-icon" /> 
          <span>Attendance Sheet</span>
        </div>

        <div 
          className={`menu-item ${selected === 'monthly' ? 'active' : ''}`} 
          onClick={() => onSelect('monthly')}
        >
          <FaCalendarAlt className="menu-icon" /> 
          <span>Monthly Details</span>
        </div>

        <div className="menu-group-label">LEAVES INFO</div>

        <div
          className={`menu-item ${selected === 'leaveRecord' ? 'active' : ''}`}
          onClick={() => onSelect('leaveRecord')}
        >
          <FaFileAlt className="menu-icon" /> 
          <span>Leave Record</span>
        </div>

        <div
          className={`menu-item ${selected === 'leaveBalance' ? 'active' : ''}`}
          onClick={() => onSelect('leaveBalance')}
        >
          <FaChartPie className="menu-icon" /> 
          <span>Leave Balance</span>
        </div>

        {/* <div
          className={`menu-item ${selected === 'payslip' ? 'active' : ''}`}
          onClick={() => onSelect('payslip')}
        >
          <FaFileInvoiceDollar className="menu-icon" /> 
          <span>PaySlip</span>
        </div> */}
      </nav>
    </div>
  );
};

export default Sidebar;