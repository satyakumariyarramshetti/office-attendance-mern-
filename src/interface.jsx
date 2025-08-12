import React, { useState, useCallback, useEffect } from 'react';
import './interface.css';
import { Link } from 'react-router-dom';
import { FaClock, FaUtensils, FaDoorOpen, FaFileAlt, FaBed } from 'react-icons/fa';

// Prefix for Staff ID
const PS_PREFIX = 'PS-';

// --- Reusable StaffIdInput Component (No changes needed) ---
const StaffIdInput = ({ inputId, value, onChange, staffNotFound }) => (
  <div className="form-group mb-2">
    <label htmlFor={inputId}>Enter your ID</label>
    <div className="input-group">
      <div className="input-group-prepend">
        <span className="input-group-text">{PS_PREFIX}</span>
      </div>
      <input
        type="text"
        id={inputId}
        className="form-control"
        value={value}
        onChange={onChange}
        maxLength={4}
        pattern="[0-9]*"
        inputMode="numeric"
        autoComplete="off"
        placeholder="0000"
        onFocus={(e) => e.target.select()}
        style={{ imeMode: 'disabled' }}
      />
    </div>
    {staffNotFound && <small className="text-danger">Staff ID not found. Please check your ID.</small>}
  </div>
);

const Interface = () => {
  // --- STATE MANAGEMENT ---
  // Central data store for the form fields
  const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:5000";

  const [formData, setFormData] = useState({
    id: '',
    name: '',
    date: new Date().toISOString().split('T')[0],
    day: new Date().toLocaleDateString('en-US', { weekday: 'long' }),
    inTime: '',
    lunchIn: '',
    lunchOut: '',
    outTime: '',
    permissionType: '',
    hours: '',
    dailyLeaveType: '',
    leaveType: '',
    location: '',
  });

  // Separate state for each card's ID input to ensure they are independent
  const [idInputs, setIdInputs] = useState({
    inTime: '',
    lunch: '',
    outTime: '',
    permission: '',
    leave: '',
  });

  // Other component states
  const [activeSideCard, setActiveSideCard] = useState(null);
  const [lunchSubmitEnabled, setLunchSubmitEnabled] = useState(false);
  const [message, setMessage] = useState('');
  const [staffNotFound, setStaffNotFound] = useState(false);

  // --- HELPER FUNCTIONS ---
  const getCurrentDate = () => new Date().toISOString().split('T')[0];
  const getCurrentTime = () => new Date().toTimeString().slice(0, 5);
  const getCurrentDay = (dateString = null) =>
    new Date(dateString || new Date()).toLocaleDateString('en-US', { weekday: 'long' });

  const isFutureDate = (date) => {
    if (!date) return false;
    const selected = new Date(date).setHours(0, 0, 0, 0);
    const today = new Date().setHours(0, 0, 0, 0);
    return selected > today;
  };

  // --- CORE DATA FETCHING LOGIC ---
  const fetchStaffAndAttendance = useCallback(async (numericId, date, context) => {
    if (!numericId || numericId.length < 4 || !date) return;

    const fullId = PS_PREFIX + numericId;
    setStaffNotFound(false);
    setMessage('');
    let staffName = '';

    // 1. Fetch Staff Name
    try {
      const staffRes = await fetch(`${API_BASE}/api/staffs/getById`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: fullId }),
      });

      if (staffRes.ok) {
        const staffData = await staffRes.json();
        staffName = staffData.name || '';
      } else if (staffRes.status === 404) {
        setStaffNotFound(true);
        setMessage('⚠️ Staff ID not found.');
        setFormData(prev => ({ ...prev, name: '', id: '' }));
        return;
      }
    } catch (error) {
      console.error('Error fetching staff:', error);
      setStaffNotFound(true);
      return;
    }

    // 2. Fetch Existing Attendance Data for that day
    try {
      const res = await fetch(`${API_BASE}/api/attendance/getByIdDate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: fullId, date }),
      });

      let attendanceData = {};
      if (res.ok) {
        attendanceData = await res.json();
        if (!attendanceData.lunchOut || !attendanceData.lunchIn) {
          setLunchSubmitEnabled(true);
        } else {
          setLunchSubmitEnabled(false);
          setMessage('🥗 Lunch In & Out already submitted.');
        }
      } else {
        setLunchSubmitEnabled(true); // Enable if no record exists yet
      }

      // 3. Update formData, using existing data first, then setting defaults based on context
      setFormData(prev => ({
        ...prev,
        id: fullId,
        name: staffName,
        date: date,
        day: getCurrentDay(date),
        inTime: attendanceData.inTime || (context === 'inTime' ? getCurrentTime() : ''),
        outTime: attendanceData.outTime || (context === 'outTime' ? getCurrentTime() : ''),
        lunchOut: attendanceData.lunchOut || '',
        lunchIn: attendanceData.lunchIn || '',
        permissionType: attendanceData.permissionType || '',
        hours: attendanceData.hours || '',
         dailyLeaveType: attendanceData.dailyLeaveType || '',
        leaveType: attendanceData.leaveType || '',
      }));

    } catch (err) {
      console.error('Error fetching attendance:', err);
      // In case of error, still populate basic info
      setFormData(prev => ({...prev, id: fullId, name: staffName}));
    }
  }, []);

  // --- useEffect hooks to trigger fetch for each independent card ---
  useEffect(() => {
    if (idInputs.inTime.length < 4) return;
    const timer = setTimeout(() => fetchStaffAndAttendance(idInputs.inTime, formData.date, 'inTime'), 500);
    return () => clearTimeout(timer);
  }, [idInputs.inTime, formData.date, fetchStaffAndAttendance]);

  useEffect(() => {
    if (idInputs.lunch.length < 4) return;
    const timer = setTimeout(() => fetchStaffAndAttendance(idInputs.lunch, formData.date, 'lunch'), 500);
    return () => clearTimeout(timer);
  }, [idInputs.lunch, formData.date, fetchStaffAndAttendance]);

  useEffect(() => {
    if (idInputs.outTime.length < 4) return;
    const timer = setTimeout(() => fetchStaffAndAttendance(idInputs.outTime, formData.date, 'outTime'), 500);
    return () => clearTimeout(timer);
  }, [idInputs.outTime, formData.date, fetchStaffAndAttendance]);
  
  useEffect(() => {
    if (idInputs.permission.length < 4) return;
    const timer = setTimeout(() => fetchStaffAndAttendance(idInputs.permission, formData.date, 'permission'), 500);
    return () => clearTimeout(timer);
  }, [idInputs.permission, formData.date, fetchStaffAndAttendance]);
  
  useEffect(() => {
    if (idInputs.leave.length < 4) return;
    const timer = setTimeout(() => fetchStaffAndAttendance(idInputs.leave, formData.date, 'leave'), 500);
    return () => clearTimeout(timer);
  }, [idInputs.leave, formData.date, fetchStaffAndAttendance]);


  // --- EVENT HANDLERS ---
  const handleIdChange = (e, cardType) => {
    const sanitizedValue = e.target.value.replace(/\D/g, '');
    setIdInputs(prev => ({ ...prev, [cardType]: sanitizedValue }));
  };
  
  const handleDateChange = (e) => {
    const selectedDate = e.target.value;
    setFormData((prev) => ({ 
      ...prev, 
      date: selectedDate, 
      day: getCurrentDay(selectedDate) 
    }));
  };

  const handleChange = (e) => {
  const { id, value } = e.target;
  const [hours, minutes] = value.split(':').map(Number);
    const totalMinutes = hours * 60 + minutes;
    const sixPMMinutes = 18 * 60; // 1080 minutes
  // Special logic just for the outTime input
  if (id === 'outTime') {
    if (totalMinutes>= sixPMMinutes) {
      // After or at 6 PM → auto set Casual Type
      setFormData(prev => ({
        ...prev,
        outTime: value,
        dailyLeaveType: 'Casual Type'
      }));
    } else {
      // Before 6 PM → clear permission type to force user selection
      setFormData(prev => ({
        ...prev,
        outTime: value,
        dailyLeaveType: ''
      }));
    }
  } 
  // For all other inputs, just update normally
  else {
    setFormData(prev => ({
      ...prev,
      [id]: value
    }));
  }
};


useEffect(() => {
  if (formData.outTime) {
    const [hours, minutes] = formData.outTime.split(':').map(Number);
    if (hours * 60 + minutes >= 1080 && formData.dailyLeaveType !== 'Casual Type') {
      setFormData(prev => ({ ...prev, dailyLeaveType: 'Casual Type' }));
    }
  }
}, [formData.outTime]);


  const setCurrentTimeForLunchOut = () => {
    if(formData.id) setFormData((prev) => ({ ...prev, lunchOut: getCurrentTime() }));
  }
  const setCurrentTimeForLunchIn = () => {
     if(formData.id) setFormData((prev) => ({ ...prev, lunchIn: getCurrentTime() }));
  }


  // --- SUBMISSION LOGIC ---
  const submitData = async (payload) => {
    try {
      const response = await fetch(`${API_BASE}/api/attendance/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      alert(response.ok ? result.message || 'Submitted successfully!' : result.error || 'Submission failed!');

      if (response.ok) {
        // Clear all inputs for next entry
        setIdInputs({ inTime: '', lunch: '', outTime: '', permission: '', leave: '' });
        setFormData({
          id: '', name: '', date: getCurrentDate(), day: getCurrentDay(), inTime: '', lunchIn: '',
          lunchOut: '', outTime: '', permissionType: '', hours: '', dailyLeaveType: '',
          leaveType: '', location: '',
        });
        setStaffNotFound(false);
        setMessage('');
        setLunchSubmitEnabled(false);
        setActiveSideCard(null);
      }
    } catch (err) {
      console.error('Submission error:', err);
      alert('Failed to submit.');
    }
  };

  const handleSubmit = async (e, formType) => {
    e.preventDefault();
    if (staffNotFound || !formData.id) {
      alert('Please enter a valid Staff ID before submitting.');
      return;
    }
    if (isFutureDate(formData.date)) {
      alert('Attendance for future dates is not allowed.');
      return;
    }
    
    const payload = {
      id: formData.id,
      name: formData.name,
      date: formData.date,
      day: formData.day,
    };
    
    if (formType === 'inTime') {
      payload.inTime = formData.inTime;
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            payload.location = `${position.coords.latitude}, ${position.coords.longitude}`;
            submitData(payload);
          },
          (error) => {
            console.error('Error getting location: ', error);
            alert('Could not get user location. Submitting without it.');
            submitData(payload);
          }
        );
      } else {
        alert('Geolocation is not supported by your browser. Submitting without location.');
        submitData(payload);
      }
      return; // Exit here because geolocation is async
    }
    
    if (formType === 'outTime') {
      if (formData.outTime <= '18:00' && !formData.dailyLeaveType) {
        alert('Please select a permission type for out-time before 18:00.');
        return;
      }
      payload.outTime = formData.outTime;
      payload.dailyLeaveType = formData.dailyLeaveType;
    }

    if (formType === 'permission') {
      payload.permissionType = formData.permissionType;
      payload.hours = formData.hours;
    }
    
    submitData(payload);
  };

  const handleLunchSubmit = async (e) => {
    e.preventDefault();
    if (staffNotFound || !formData.id) {
      alert('Please enter a valid Staff ID before submitting.');
      return;
    }
    const payload = {
      id: formData.id,
      name: formData.name,
      date: formData.date,
      day: formData.day,
      lunchOut: formData.lunchOut || '',
      lunchIn: formData.lunchIn || '',
    };
    submitData(payload);
  };

  const handleLeaveSubmit = async (e) => {
    e.preventDefault();
    if (staffNotFound || !formData.id) {
      alert('Please enter a valid Staff ID before submitting.');
      return;
    }
    const payload = {
      id: formData.id,
      name: formData.name,
      date: formData.date,
      day: formData.day,
      leaveType: formData.leaveType,
    };
    submitData(payload);
  };


  return (
    <div className="main-wrapper">
      <header className="attendance-header">
        <img
          src="https://tse4.mm.bing.net/th/id/OIP.kBa9Zzw_lXJ4D67y_kWZ5QHaG7?rs=1&pid=ImgDetMain&o=7&rm=3"
          alt="Company Logo"
          className="company-logo"
        />
        <div className="header-title">Attendance System</div>
        <div className="admin-login">
          <Link to="/admin-login">Admin login</Link>
        </div>
      </header>
     <div className="container-fluid px-4 py-5">
        <div className="row">
          
          {/* In Time Card */}
          <div className="col-lg-3 col-md-6 mb-4">
            <div className="card custom-card h-100">
              <h5 className="card-title">
                Intime Details <div><FaClock className="text-primary fs-4 mt-1" /></div>
              </h5>
              <form id="inTimeForm" className="d-flex flex-column h-100" onSubmit={(e) => handleSubmit(e, 'inTime')}>
                <StaffIdInput
                  inputId="idInTime"
                  value={idInputs.inTime}
                  onChange={(e) => handleIdChange(e, 'inTime')}
                  staffNotFound={staffNotFound}
                />
                <div className="form-group mb-2">
                  <label>Name</label>
                  <input type="text" className="form-control" value={formData.name} readOnly />
                </div>
                <div className="form-group mb-2">
                  <label>Date</label>
                  <input
                    type="date"
                    className="form-control"
                    value={formData.date}
                    onChange={handleDateChange}
                    max={getCurrentDate()}
                  />
                </div>
                <div className="form-group mb-2">
                  <label>Day</label>
                  <input type="text" className="form-control" value={formData.day} readOnly />
                </div>
                <div className="form-group mb-2">
                  <label>In Time</label>
                  <input
                    type="time"
                    id="inTime"
                    className="form-control"
                    value={formData.inTime}
                    onChange={handleChange}
                  />
                </div>
                <div className="mt-auto">
                  <button className="btn btn-primary btn-block" type="submit" disabled={staffNotFound || !formData.id}>
                    Submit
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Lunch Card */}
          <div className="col-lg-3 col-md-6 mb-4">
            <div className="card custom-card h-100">
              <h5 className="card-title">
                Lunch Details <div><FaUtensils className="text-warning fs-4 mt-1" /></div>
              </h5>
              <form className="d-flex flex-column h-100" onSubmit={handleLunchSubmit}>
                <StaffIdInput
                  inputId="idLunch"
                  value={idInputs.lunch}
                  onChange={(e) => handleIdChange(e, 'lunch')}
                  staffNotFound={staffNotFound}
                />
                <div className="form-group mb-2">
                  <label>Date</label>
                  <input type="date" className="form-control" value={formData.date} readOnly />
                </div>
                <div className="form-group mb-2">
                  <label>Lunch Start Time</label>
                  <input
                    type="time"
                    id="lunchOut"
                    className="form-control"
                    value={formData.lunchOut}
                    onClick={setCurrentTimeForLunchOut}
                    readOnly
                  />
                </div>
                <div className="form-group mb-2">
                  <label>Lunch End Time</label>
                  <input
                    type="time"
                    id="lunchIn"
                    className="form-control"
                    value={formData.lunchIn}
                    onClick={setCurrentTimeForLunchIn}
                    readOnly
                  />
                </div>
                <div className="mt-auto">
                  <button
                    className="btn btn-primary btn-block"
                    disabled={!lunchSubmitEnabled || staffNotFound || !formData.id}
                    type="submit"
                  >
                    Submit
                  </button>
                </div>
              </form>
              {message && <div className="alert alert-info mt-2">{message}</div>}
            </div>
          </div>

           {/* Out Time Card */}
          <div className="col-lg-3 col-md-6 mb-4">
            <div className="card custom-card h-100">
              <h5 className="card-title">
                Out Time Details <div><FaDoorOpen className="text-danger fs-4 mt-1" /></div>
              </h5>
              <form className="d-flex flex-column h-100" onSubmit={(e) => handleSubmit(e, 'outTime')}>
                <StaffIdInput
                  inputId="idOutTime"
                  value={idInputs.outTime}
                  onChange={(e) => handleIdChange(e, 'outTime')}
                  staffNotFound={staffNotFound}
                />
                <div className="form-group mb-2">
                  <label>Date</label>
                  <input type="date" className="form-control" value={formData.date} readOnly />
                </div>
                <div className="form-group mb-2">
                  <label>Out Time</label>
                  <input
                    type="time"
                    id="outTime"
                    className="form-control"
                    value={formData.outTime}
                    onChange={handleChange}
                  />
                </div>
                <div className="form-group mb-3">
                    <label htmlFor="dailyLeaveType">Permission Type</label>
                  <select id="dailyLeaveType" className="form-control" value={formData.dailyLeaveType} onChange={handleChange}    >
                    <option value="">Select Permission</option>
                    <option value="Personal Permission">Personal Permission</option>
                    <option value="Health Issue">Health Issue</option>
                    <option value="Emergency Permission">Emergency Permission</option>
                    <option value="Office Work">Office Work</option>
                    <option value="TOM">TOM</option>
                    <option value="FLEXI">FLEXI</option>
                    <option value="Call">Call</option>
                    <option value="Casual Type">Casual Type</option>
                  </select>
                </div>
                <div className="mt-auto">
                  <button className="btn btn-primary btn-block" type="submit" disabled={staffNotFound || !formData.id}>
                    Submit
                  </button>
                </div>
              </form>
            </div>
          </div>
          
          {/* Permission/Leave Column */}
          <div className="col-lg-3 col-md-6 mb-4">
            <div className="h-100">
              {activeSideCard === 'permission' ? (
                <div className="card custom-card h-100" style={{ position: 'relative' }}>
                  <button
                    className="close-btn"
                    onClick={() => setActiveSideCard(null)}
                    style={{ position: 'absolute', right: '15px', top: '15px', background: 'transparent', border: 'none', fontSize: '1.6rem' }}
                    aria-label="Close Permission Card"
                    type="button"
                  >
                    &times;
                  </button>
                  <h5 className="card-title">
                    Permission Details <FaFileAlt className="text-info fs-4 mt-1" />
                  </h5>
                  <form className="d-flex flex-column h-100" onSubmit={(e) => handleSubmit(e, 'permission')}>
                    <StaffIdInput
                      inputId="idPermission"
                      value={idInputs.permission}
                      onChange={(e) => handleIdChange(e, 'permission')}
                      staffNotFound={staffNotFound}
                    />
                    <div className="form-group mb-2"><label>Name</label><input type="text" className="form-control" value={formData.name} readOnly /></div>
                    <div className="form-group mb-2"><label>Date</label><input type="date" className="form-control" value={formData.date} onChange={handleDateChange} max={getCurrentDate()} /></div>
                    <div className="form-group mb-2"><label>Day</label><input type="text" className="form-control" value={formData.day} readOnly /></div>
                    <div className="form-group mb-2">
                      <label htmlFor="permissionType">Type of Permission</label>
                      <input type="text" id="permissionType" className="form-control" value={formData.permissionType} onChange={handleChange} placeholder="e.g., Personal, Health" />
                    </div>
                    <div className="form-group mb-2">
                      <label htmlFor="hours">Hours</label>
                      <input type="text" id="hours" className="form-control" value={formData.hours} onChange={handleChange} placeholder="e.g., 2 hours" />
                    </div>
                    <div className="mt-auto">
                      <button className="btn btn-primary btn-block" type="submit" disabled={staffNotFound || !formData.id}>
                        Submit Permission
                      </button>
                    </div>
                  </form>
                </div>
              ) : activeSideCard === 'leave' ? (
                <div className="card custom-card h-100" style={{ position: 'relative' }}>
                   <button
                    className="close-btn"
                    onClick={() => setActiveSideCard(null)}
                    style={{ position: 'absolute', right: '15px', top: '15px', background: 'transparent', border: 'none', fontSize: '1.6rem' }}
                    aria-label="Close Leave Card"
                    type="button"
                  >
                    &times;
                  </button>
                  <h5 className="card-title">
                    Leave Details <FaBed className="text-success fs-4 mt-1" />
                  </h5>
                  <form className="d-flex flex-column h-100" onSubmit={handleLeaveSubmit}>
                    <StaffIdInput
                      inputId="idLeave"
                      value={idInputs.leave}
                      onChange={(e) => handleIdChange(e, 'leave')}
                      staffNotFound={staffNotFound}
                    />
                    <div className="form-group mb-2"><label>Name</label><input type="text" className="form-control" value={formData.name} readOnly /></div>
                    <div className="form-group mb-2"><label>Date</label><input type="date" className="form-control" value={formData.date} onChange={handleDateChange} max={getCurrentDate()} /></div>
                    <div className="form-group mb-2"><label>Day</label><input type="text" className="form-control" value={formData.day} readOnly /></div>
                    <div className="form-group mb-3">
                      <label htmlFor="leaveType">Leave Type</label>
                      <select id="leaveType" className="form-control" value={formData.leaveType} onChange={handleChange} required>
                        <option disabled value="">Select Leave Type</option>
                        <option value="Sick Leave">Sick Leave</option>
                        <option value="Casual Leave">Casual Leave</option>
                        <option value="Privilege Leave">Privilege Leave</option>
                        <option value="Festival Leave">Festival Leave</option>
                      </select>
                    </div>
                    <div className="mt-auto">
                      <button className="btn btn-primary btn-block" type="submit" disabled={staffNotFound || !formData.id}>
                        Submit Leave
                      </button>
                    </div>
                  </form>
                </div>
              ) : (
                <div className="stubs-wrapper h-100">
                  <div className="card-stub" onClick={() => setActiveSideCard('permission')}>
                    <FaFileAlt className="stub-icon" />
                    <span className="stub-title">Permission</span>
                  </div>
                  <div className="card-stub" onClick={() => setActiveSideCard('leave')}>
                    <FaBed className="stub-icon" />
                    <span className="stub-title">Leave</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Interface;