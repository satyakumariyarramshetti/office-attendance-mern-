import React, { useState, useCallback, useEffect } from 'react';
import './interface.css';
import { Link } from 'react-router-dom';
import { FaClock, FaUtensils, FaDoorOpen, FaFileAlt, FaBed } from 'react-icons/fa';

// Prefix for Staff ID
const PS_PREFIX = 'PS-';

// --- Reusable StaffIdInput Component (No changes) ---
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
  const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:5000";
  const [formData, setFormData] = useState({
    id: '', name: '', date: '', day: '',
    inTime: '', lunchIn: '', lunchOut: '', outTime: '',
    permissionType: '', hours: '', dailyLeaveType: '', leaveType: '', location: '',
  });

  const [idInputs, setIdInputs] = useState({
    inTime: '', lunch: '', outTime: '', permission: '', leave: '',
  });

  // --- NEW: State to track how "In Time" was set ---
  const [inTimeMethod, setInTimeMethod] = useState(''); // Will be 'live' or 'manual'

  const [activeSideCard, setActiveSideCard] = useState(null);
  const [lunchSubmitEnabled, setLunchSubmitEnabled] = useState(false);
  const [message, setMessage] = useState('');
  const [staffNotFound, setStaffNotFound] = useState(false);
  const [lunchMessage, setLunchMessage] = useState({ text: '', type: '' });
  const [outTimeMessage, setOutTimeMessage] = useState({ text: '', type: '' });

  // --- HELPER FUNCTIONS ---
  const getCurrentDate = () => new Date().toISOString().split('T')[0];
  const getCurrentTime = () => new Date().toTimeString().slice(0, 5);
  const getCurrentDay = (dateString = null) =>
    new Date(dateString || new Date()).toLocaleString('en-US', { weekday: 'long' });
  
  const isFutureDate = (date) => {
    if (!date) return false;
    const selected = new Date(date).setHours(0, 0, 0, 0);
    const today = new Date().setHours(0, 0, 0, 0);
    return selected > today;
  };
  
  const timeToMinutes = (timeStr) => {
    if (!timeStr || !/^\d{2}:\d{2}$/.test(timeStr)) return 0;
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  };

  const minutesToHoursMinutes = (totalMinutes) => {
    if (isNaN(totalMinutes) || totalMinutes < 0) return '00:00';
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  };

  // --- CORE DATA FETCHING LOGIC ---
  const fetchStaffAndAttendance = useCallback(async (numericId, date, context) => {
    if (!numericId || numericId.length < 4 || !date) return;

    const fullId = PS_PREFIX + numericId;
    setStaffNotFound(false);
    setMessage('');
    let staffName = '';

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
        setStaffNotFound(true); setMessage('⚠️ Staff ID not found.'); setFormData(prev => ({ ...prev, name: '', id: '' })); return;
      }
    } catch (error) {
      console.error('Error fetching staff:', error); setStaffNotFound(true); return;
    }

    try {
      const res = await fetch(`${API_BASE}/api/attendance/getByIdDate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: fullId, date }),
      });

      let attendanceData = {};
      if (res.ok) {
        attendanceData = await res.json();
        if (!attendanceData.lunchOut || !attendanceData.lunchIn) setLunchSubmitEnabled(true);
        else { setLunchSubmitEnabled(false); setMessage('🥗 Lunch In & Out already submitted.'); }
      } else {
        setLunchSubmitEnabled(true);
      }
      
      let newLunchOut = attendanceData.lunchOut || '';
      let newLunchIn = attendanceData.lunchIn || '';
      if (context === 'lunch') {
          if (attendanceData.lunchOut && !attendanceData.lunchIn) newLunchIn = getCurrentTime();
          else if (!attendanceData.lunchOut) newLunchOut = getCurrentTime();
      }

      // --- MODIFIED: Set inTimeMethod to 'live' if time is auto-fetched ---
      let newInTime = attendanceData.inTime || '';
      if (context === 'inTime' && !attendanceData.inTime) {
          newInTime = getCurrentTime();
          setInTimeMethod('live'); // Mark as live time
      }

      setFormData(prev => ({
        ...prev, id: fullId, name: staffName, date: date, day: getCurrentDay(date),
        inTime: newInTime,
        outTime: attendanceData.outTime || (context === 'outTime' ? getCurrentTime() : ''),
        lunchOut: newLunchOut, lunchIn: newLunchIn,
        permissionType: attendanceData.permissionType || '', hours: attendanceData.hours || '',
        dailyLeaveType: attendanceData.dailyLeaveType || '', leaveType: attendanceData.leaveType || '',
      }));
    } catch (err) {
      console.error('Error fetching attendance:', err);
      setFormData(prev => ({...prev, id: fullId, name: staffName}));
    }
  }, []);

  // --- useEffects (no changes needed here) ---
  useEffect(() => {
    if (idInputs.inTime.length < 4 || !formData.date) return;
    const timer = setTimeout(() => fetchStaffAndAttendance(idInputs.inTime, formData.date, 'inTime'), 500);
    return () => clearTimeout(timer);
  }, [idInputs.inTime, formData.date, fetchStaffAndAttendance]);

  useEffect(() => {
    if (idInputs.lunch.length < 4 || !formData.date) return;
    const timer = setTimeout(() => fetchStaffAndAttendance(idInputs.lunch, formData.date, 'lunch'), 500);
    return () => clearTimeout(timer);
  }, [idInputs.lunch, formData.date, fetchStaffAndAttendance]);

  useEffect(() => {
    if (idInputs.outTime.length < 4 || !formData.date) return;
    const timer = setTimeout(() => fetchStaffAndAttendance(idInputs.outTime, formData.date, 'outTime'), 500);
    return () => clearTimeout(timer);
  }, [idInputs.outTime, formData.date, fetchStaffAndAttendance]);
  
  useEffect(() => {
    if (idInputs.permission.length < 4 || !formData.date) return;
    const timer = setTimeout(() => fetchStaffAndAttendance(idInputs.permission, formData.date, 'permission'), 500);
    return () => clearTimeout(timer);
  }, [idInputs.permission, formData.date, fetchStaffAndAttendance]);
  
  useEffect(() => {
    if (idInputs.leave.length < 4 || !formData.date) return;
    const timer = setTimeout(() => fetchStaffAndAttendance(idInputs.leave, formData.date, 'leave'), 500);
    return () => clearTimeout(timer);
  }, [idInputs.leave, formData.date, fetchStaffAndAttendance]);

  useEffect(() => {
    if (formData.lunchOut && formData.lunchIn) {
        const duration = timeToMinutes(formData.lunchIn) - timeToMinutes(formData.lunchOut);
        if (duration > 30) setLunchMessage({ text: `You had taken ${duration} minutes instead of 30 minutes.`, type: 'warning' });
        else if (duration >= 0) setLunchMessage({ text: `Great! You've taken only ${duration} minutes for lunch. Well done!`, type: 'success' });
        else setLunchMessage({ text: '', type: '' });
    } else {
         setLunchMessage({ text: '', type: '' });
    }
  }, [formData.lunchOut, formData.lunchIn]);

  useEffect(() => {
    if (formData.inTime && formData.outTime) {
        let lunchMins = 0;
        if (formData.lunchOut && formData.lunchIn) {
            const lunchDuration = timeToMinutes(formData.lunchIn) - timeToMinutes(formData.lunchOut);
            if(lunchDuration > 0) lunchMins = lunchDuration;
        }
        const totalWorkMins = (timeToMinutes(formData.outTime) - timeToMinutes(formData.inTime)) - lunchMins;
        if (totalWorkMins > 0) {
             const workHoursFormatted = minutesToHoursMinutes(totalWorkMins);
            if (totalWorkMins >= 510) setOutTimeMessage({ text: `Excellent work! You've dedicated ${workHoursFormatted} hours today. Your commitment is appreciated.`, type: 'success' });
            else setOutTimeMessage({ text: `Attention: Your total working time is ${workHoursFormatted}, which is less than the expected 8 hours and 30 minutes.`, type: 'warning' });
        } else {
            setOutTimeMessage({ text: '', type: '' });
        }
    } else {
        setOutTimeMessage({ text: '', type: '' });
    }
  }, [formData.inTime, formData.outTime, formData.lunchOut, formData.lunchIn]);

  // --- EVENT HANDLERS ---
  const handleIdChange = (e, cardType) => {
    const sanitizedValue = e.target.value.replace(/\D/g, '');
    setIdInputs(prev => ({ ...prev, [cardType]: sanitizedValue }));
    if (!formData.date) {
        const today = getCurrentDate();
        setFormData(prev => ({ ...prev, date: today, day: getCurrentDay(today) }));
    }
  };
  
  const handleDateChange = (e) => {
    const selectedDate = e.target.value;
    setFormData((prev) => ({ ...prev, date: selectedDate, day: getCurrentDay(selectedDate) }));
  };

   const handleChange = (e) => {
    const { id, value } = e.target;
    
    // --- MODIFIED: Set inTimeMethod to 'manual' on direct change ---
    if (id === 'inTime') {
      setInTimeMethod('manual'); // Mark as manual entry
    }

    if (id === 'outTime') {
      if (value > '18:00') setFormData(prev => ({...prev, outTime: value, dailyLeaveType: 'Casual Type'}));
      else setFormData(prev => ({...prev, outTime: value, dailyLeaveType: '' }));
    } else {
      setFormData((prev) => ({ ...prev, [id]: value }));
    }
  };

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
        setIdInputs({ inTime: '', lunch: '', outTime: '', permission: '', leave: '' });
        setFormData({ id: '', name: '', date: '', day: '', inTime: '', lunchIn: '', lunchOut: '', outTime: '', permissionType: '', hours: '', dailyLeaveType: '', leaveType: '', location: '' });
        setInTimeMethod(''); // Reset the method tracker
        setStaffNotFound(false); setMessage(''); setLunchSubmitEnabled(false); setActiveSideCard(null);
      }
    } catch (err) {
      console.error('Submission error:', err);
      alert('Failed to submit.');
    }
  };

  const handleSubmit = async (e, formType) => {
    e.preventDefault();
    if (staffNotFound || !formData.id) {
      alert('Please enter a valid Staff ID before submitting.'); return;
    }
    if (isFutureDate(formData.date)) {
      alert('Attendance for future dates is not allowed.'); return;
    }
    
    const payload = { id: formData.id, name: formData.name, date: formData.date, day: formData.day };
    
    if (formType === 'inTime') {
      payload.inTime = formData.inTime;
      // --- MODIFIED: Add the inTimeMethod to the payload ---
      payload.inTimeMethod = inTimeMethod; 

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
        alert('Geolocation is not supported. Submitting without location.');
        submitData(payload);
      }
      return;
    }
    
    if (formType === 'outTime') {
      if (formData.outTime <= '18:00' && !formData.dailyLeaveType) {
        alert('Please select a permission type for out-time before 18:00.'); return;
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
      alert('Please enter a valid Staff ID before submitting.'); return;
    }
    const payload = { id: formData.id, name: formData.name, date: formData.date, day: formData.day, lunchOut: formData.lunchOut || '', lunchIn: formData.lunchIn || '' };
    submitData(payload);
  };

  const handleLeaveSubmit = async (e) => {
    e.preventDefault();
    if (staffNotFound || !formData.id) {
      alert('Please enter a valid Staff ID before submitting.'); return;
    }
    const payload = { id: formData.id, name: formData.name, date: formData.date, day: formData.day, leaveType: formData.leaveType };
    submitData(payload);
  };

  return (
    <div className="main-wrapper">
      <header className="attendance-header">
         <img src="https://tse4.mm.bing.net/th/id/OIP.kBa9Zzw_lXJ4D67y_kWZ5QHaG7?rs=1&pid=ImgDetMain&o=7&rm=3" alt="Company Logo" className="company-logo" />
        <div className="header-title">Attendance System</div>
        <div className="admin-login"><Link to="/admin-login">Admin login</Link></div>
      </header>
     <div className="container-fluid px-4 py-5">
        <div className="row">
          
          {/* In Time Card */}
          <div className="col-lg-3 col-md-6 mb-4">
            <div className="card custom-card h-100">
              <h5 className="card-title">Intime Details <div><FaClock className="text-primary fs-4 mt-1" /></div></h5>
              <form id="inTimeForm" className="d-flex flex-column h-100" onSubmit={(e) => handleSubmit(e, 'inTime')}>
                <StaffIdInput inputId="idInTime" value={idInputs.inTime} onChange={(e) => handleIdChange(e, 'inTime')} staffNotFound={staffNotFound} />
                <div className="form-group mb-2"><label>Name</label><input type="text" className="form-control" value={formData.name} readOnly /></div>
                <div className="form-group mb-2"><label>Date</label><input type="date" className="form-control" value={formData.date} onChange={handleDateChange} max={getCurrentDate()} /></div>
                <div className="form-group mb-2"><label>Day</label><input type="text" className="form-control" value={formData.day} readOnly /></div>
                {/* --- MODIFIED: Added a label to show the time method --- */}
                <div className="form-group mb-2">
                  <label>
                    In Time
                    {inTimeMethod && <span className="time-method-badge">{inTimeMethod}</span>}
                  </label>
                  <input type="time" id="inTime" className="form-control" value={formData.inTime} onChange={handleChange} />
                </div>
                <div className="mt-auto"><button className="btn btn-primary btn-block" type="submit" disabled={staffNotFound || !formData.id}>Submit</button></div>
              </form>
            </div>
          </div>

          {/* Other cards remain unchanged in their JSX structure */}
          {/* Lunch Card */}
          <div className="col-lg-3 col-md-6 mb-4">
            <div className="card custom-card h-100">
              <h5 className="card-title">Lunch Details <div><FaUtensils className="text-warning fs-4 mt-1" /></div></h5>
              <form className="d-flex flex-column h-100" onSubmit={handleLunchSubmit}>
                <StaffIdInput inputId="idLunch" value={idInputs.lunch} onChange={(e) => handleIdChange(e, 'lunch')} staffNotFound={staffNotFound}/>
                <div className="form-group mb-2"><label>Date</label><input type="date" className="form-control" value={formData.date} readOnly /></div>
                <div className="form-group mb-2"><label>Lunch Start Time</label><input type="time" id="lunchOut" className="form-control" value={formData.lunchOut} readOnly /></div>
                <div className="form-group mb-2"><label>Lunch End Time</label><input type="time" id="lunchIn" className="form-control" value={formData.lunchIn} readOnly /></div>
                {lunchMessage.text && (<div className={`time-message mb-2 ${lunchMessage.type === 'success' ? 'text-success' : 'text-danger'}`}>{lunchMessage.text}</div>)}
                <div className="mt-auto"><button className="btn btn-primary btn-block" disabled={!lunchSubmitEnabled || staffNotFound || !formData.id} type="submit">Submit</button></div>
              </form>
              {message && <div className="alert alert-info mt-2">{message}</div>}
            </div>
          </div>
           {/* Out Time Card */}
          <div className="col-lg-3 col-md-6 mb-4">
            <div className="card custom-card h-100">
              <h5 className="card-title">Out Time Details <div><FaDoorOpen className="text-danger fs-4 mt-1" /></div></h5>
              <form className="d-flex flex-column h-100" onSubmit={(e) => handleSubmit(e, 'outTime')}>
                <StaffIdInput inputId="idOutTime" value={idInputs.outTime} onChange={(e) => handleIdChange(e, 'outTime')} staffNotFound={staffNotFound} />
                <div className="form-group mb-2"><label>Date</label><input type="date" className="form-control" value={formData.date} readOnly /></div>
                <div className="form-group mb-2"><label>Out Time</label><input type="time" id="outTime" className="form-control" value={formData.outTime} onChange={handleChange} /></div>
                <div className="form-group mb-3"><label htmlFor="dailyLeaveType">Permission Type</label>
                  <select id="dailyLeaveType" className="form-control" value={formData.dailyLeaveType} onChange={handleChange}>
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
                {outTimeMessage.text && (<div className={`time-message mb-3 ${outTimeMessage.type === 'success' ? 'text-success' : 'text-danger'}`}>{outTimeMessage.text}</div>)}
                <div className="mt-auto"><button className="btn btn-primary btn-block" type="submit" disabled={staffNotFound || !formData.id}>Submit</button></div>
              </form>
            </div>
          </div>
          {/* Permission/Leave Column */}
          <div className="col-lg-3 col-md-6 mb-4">
             <div className="h-100">
              {activeSideCard === 'permission' ? (
                <div className="card custom-card h-100" style={{ position: 'relative' }}>
                  <button className="close-btn" onClick={() => setActiveSideCard(null)} style={{ position: 'absolute', right: '15px', top: '15px', background: 'transparent', border: 'none', fontSize: '1.6rem' }} aria-label="Close Permission Card" type="button" >&times;</button>
                  <h5 className="card-title">Permission Details <FaFileAlt className="text-info fs-4 mt-1" /></h5>
                  <form className="d-flex flex-column h-100" onSubmit={(e) => handleSubmit(e, 'permission')}>
                    <StaffIdInput inputId="idPermission" value={idInputs.permission} onChange={(e) => handleIdChange(e, 'permission')} staffNotFound={staffNotFound}/>
                    <div className="form-group mb-2"><label>Name</label><input type="text" className="form-control" value={formData.name} readOnly /></div>
                    <div className="form-group mb-2"><label>Date</label><input type="date" className="form-control" value={formData.date} onChange={handleDateChange} max={getCurrentDate()} /></div>
                    <div className="form-group mb-2"><label>Day</label><input type="text" className="form-control" value={formData.day} readOnly /></div>
                    <div className="form-group mb-2"><label htmlFor="permissionType">Type of Permission</label><input type="text" id="permissionType" className="form-control" value={formData.permissionType} onChange={handleChange} placeholder="e.g., Personal, Health" /></div>
                    <div className="form-group mb-2"><label htmlFor="hours">Hours</label><input type="text" id="hours" className="form-control" value={formData.hours} onChange={handleChange} placeholder="e.g., 2 hours" /></div>
                    <div className="mt-auto"><button className="btn btn-primary btn-block" type="submit" disabled={staffNotFound || !formData.id}>Submit Permission</button></div>
                  </form>
                </div>
              ) : activeSideCard === 'leave' ? (
                <div className="card custom-card h-100" style={{ position: 'relative' }}>
                   <button className="close-btn" onClick={() => setActiveSideCard(null)} style={{ position: 'absolute', right: '15px', top: '15px', background: 'transparent', border: 'none', fontSize: '1.6rem' }} aria-label="Close Leave Card" type="button" >&times;</button>
                  <h5 className="card-title">Leave Details <FaBed className="text-success fs-4 mt-1" /></h5>
                  <form className="d-flex flex-column h-100" onSubmit={handleLeaveSubmit}>
                    <StaffIdInput inputId="idLeave" value={idInputs.leave} onChange={(e) => handleIdChange(e, 'leave')} staffNotFound={staffNotFound} />
                    <div className="form-group mb-2"><label>Name</label><input type="text" className="form-control" value={formData.name} readOnly /></div>
                    <div className="form-group mb-2"><label>Date</label><input type="date" className="form-control" value={formData.date} onChange={handleDateChange} max={getCurrentDate()} /></div>
                    <div className="form-group mb-2"><label>Day</label><input type="text" className="form-control" value={formData.day} readOnly /></div>
                    <div className="form-group mb-3"><label htmlFor="leaveType">Leave Type</label>
                      <select id="leaveType" className="form-control" value={formData.leaveType} onChange={handleChange} required>
                         <option disabled value="">Select Leave Type</option>
                         <option value="Sick Leave">Sick Leave</option>
                        <option value="Casual Leave">Casual Leave</option>
                        <option value="Privilege Leave">Privilege Leave</option>
                       <option value="Festival Leave">Festival Leave</option>
                       <option value="C-Off Leave">C-Off Leave</option>
                       <option value="Compensation Leave">Compensation Leave</option>
                        <option value="First Half Leave">First Half Leave</option>
                       <option value="Second Half Leave">Second Half Leave</option>
                      </select>
                    </div>
                    <div className="mt-auto"><button className="btn btn-primary btn-block" type="submit" disabled={staffNotFound || !formData.id}>Submit Leave</button></div>
                  </form>
                </div>
              ) : (
                <div className="stubs-wrapper h-100">
                  <div className="card-stub" onClick={() => setActiveSideCard('permission')}><FaFileAlt className="stub-icon" /><span className="stub-title">Permission</span></div>
                  <div className="card-stub" onClick={() => setActiveSideCard('leave')}><FaBed className="stub-icon" /><span className="stub-title">Leave</span></div>
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