import React, { useState, useEffect, useCallback } from 'react';
import './interface.css';
import { Link } from 'react-router-dom';
import { FaClock, FaUtensils, FaDoorOpen } from 'react-icons/fa';
import { debounce } from 'lodash';

// Prefix for Staff ID
const PS_PREFIX = 'PS-';

const Interface = () => {
  const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:5000";
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    date: '',
    day: '',
    inTime: '',
    lunchIn: '',
    lunchOut: '',
    outTime: '',
    casualType: '',
    leaveType: '',
  });

  const [lunchSubmitEnabled, setLunchSubmitEnabled] = useState(false);
  const [timeDifferenceWarning, setTimeDifferenceWarning] = useState('');
  const [message, setMessage] = useState('');
  const [staffNotFound, setStaffNotFound] = useState(false);

  // Helpers
  const getCurrentDate = () => new Date().toISOString().split('T')[0];
  const getCurrentTime = () => new Date().toTimeString().slice(0, 5);
  const getCurrentDay = () =>
    new Date().toLocaleDateString('en-US', { weekday: 'long' });

  // Debounced fetch function
  const fetchStaffAndAttendance = useCallback(
    debounce(async (fullId) => {
      if (!fullId) return;

      const formattedDate = getCurrentDate();
      const currentDay = getCurrentDay();
      let name = '';

      try {
        const staffRes = await fetch(`${API_BASE}/api/staffs/getById`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: fullId }),
        });

        if (staffRes.ok) {
          const staffData = await staffRes.json();
          name = staffData.name || '';
          setStaffNotFound(false);
          setMessage('');
        } else if (staffRes.status === 404) {
          name = '';
          setStaffNotFound(true);
          setMessage('⚠️ Staff ID not found.');
          // Clear form fields except id
          setFormData((prev) => ({
            ...prev,
            name: '',
            date: '',
            day: '',
            inTime: '',
            lunchIn: '',
            lunchOut: '',
            outTime: '',
            casualType: '',
            leaveType: '',
          }));
          setLunchSubmitEnabled(false);
          return;
        } else {
          name = '';
          setStaffNotFound(false);
          setMessage('');
        }
      } catch (error) {
        console.error('Error fetching staff:', error);
        name = '';
        setStaffNotFound(false);
        setMessage('');
      }

      // Fetch attendance for this ID and date
      let newFormData = {
        id: fullId,
        name,
        date: formattedDate,
        day: currentDay,
        inTime: formData.inTime || getCurrentTime(),
        lunchOut: '',
        lunchIn: '',
        outTime: '',
        casualType: '',
        leaveType: '',
      };

      try {
        const res = await fetch(`${API_BASE}/api/attendance/getByIdDate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: fullId, date: formattedDate }),
        });

        if (res.ok) {
          const data = await res.json();
          newFormData = {
            ...newFormData,
            name: data.name || newFormData.name,
            inTime: data.inTime || newFormData.inTime,
            lunchOut: data.lunchOut || '',
            lunchIn: data.lunchIn || '',
            outTime: data.outTime || '',
            casualType: data.casualType || '',
            leaveType: data.leaveType || '',
          };
          if (!data.lunchOut || !data.lunchIn) {
            setLunchSubmitEnabled(true);
            setMessage('');
          } else {
            setLunchSubmitEnabled(false);
            setMessage('🥗 Lunch In & Out already submitted.');
          }
        } else {
          setLunchSubmitEnabled(true);
          setMessage('');
        }
      } catch (err) {
        console.error('Error fetching attendance:', err);
        setMessage('');
        setLunchSubmitEnabled(true);
      }

      setFormData(newFormData);
    }, 400),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [formData.inTime]
  );

  // Handler for numeric part of Staff ID input (all ID inputs)
  const handleNumericIdChange = (e) => {
    let value = e.target.value.replace(/\D/g, '').slice(0, 4);

    setFormData((prev) => ({
      ...prev,
      id: value ? PS_PREFIX + value : '',
    }));

    if (value.length < 4) {
      setFormData((prev) => ({
        ...prev,
        name: '',
        date: '',
        day: '',
        inTime: '',
        lunchIn: '',
        lunchOut: '',
        outTime: '',
        casualType: '',
        leaveType: '',
      }));
      setLunchSubmitEnabled(false);
      setMessage('');
      setTimeDifferenceWarning('');
      setStaffNotFound(false);
      fetchStaffAndAttendance.cancel();
      return;
    }

    if (value.length === 4) {
      fetchStaffAndAttendance(PS_PREFIX + value);
    }
  };

  // Generic controlled inputs handler
  const handleChange = (e) => {
    const { id, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [id]: value,
    }));
  };

  // Update casualType and leaveType based on outTime hour
  useEffect(() => {
    if (formData.outTime) {
      const [hour] = formData.outTime.split(':').map(Number);
      if (hour >= 18) {
        setFormData((prev) => ({
          ...prev,
          casualType: 'Casual Type',
          leaveType: 'Casual',
        }));
      } else {
        setFormData((prev) => ({
          ...prev,
          casualType: '',
          leaveType: '',
        }));
      }
    }
  }, [formData.outTime]);

  // Warn if time diff between In and Out greater than 30 mins
  useEffect(() => {
    if (formData.inTime && formData.outTime) {
      const [inHour, inMin] = formData.inTime.split(':').map(Number);
      const [outHour, outMin] = formData.outTime.split(':').map(Number);
      const diff = (outHour * 60 + outMin) - (inHour * 60 + inMin);
      setTimeDifferenceWarning(
        diff > 30 ? '⚠️ Time difference between In and Out is more than 30 minutes.' : ''
      );
    } else {
      setTimeDifferenceWarning('');
    }
  }, [formData.inTime, formData.outTime]);

  // Submit handler for In Time and Out Time
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (staffNotFound) {
      alert('Please enter a valid Staff ID before submitting.');
      return;
    }
    try {
      const response = await fetch(`${API_BASE}/api/attendance/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const result = await response.json();
      alert(
        response.ok
          ? result.message || 'Submitted successfully!'
          : result.error || 'Submission failed!'
      );
    } catch (err) {
      console.error(err);
      alert('Failed to submit.');
    }
  };

  // Submit handler for Lunch Form
  const handleLunchSubmit = async (e) => {
    e.preventDefault();
    if (!formData.id || !formData.date) {
      alert('Please enter ID and Date before submitting.');
      return;
    }
    if (staffNotFound) {
      alert('Please enter a valid Staff ID before submitting.');
      return;
    }
    try {
      const response = await fetch(`${API_BASE}/api/attendance/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: formData.id,
          name: formData.name,
          date: formData.date,
          day: formData.day,
          lunchOut: formData.lunchOut || '',
          lunchIn: formData.lunchIn || '',
        }),
      });
      const result = await response.json();
      alert(response.ok ? result.message || 'Lunch submitted!' : result.error || 'Submission failed.');
      if (response.ok) {
        setFormData((prev) => ({
          ...prev,
          lunchOut: '',
          lunchIn: '',
        }));
        setLunchSubmitEnabled(false);
        setMessage(result.message || '');
      }
    } catch (err) {
      console.error('Submission error:', err);
      alert('Lunch submission failed.');
    }
  };

  // Reusable Staff ID input component for all three sections
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
          value={value.replace(/^PS-/, '')}
          onChange={onChange}
          maxLength={4}
          pattern="[0-9]*"
          inputMode="numeric"
          autoComplete="off"
          placeholder="0003"
          autoFocus={inputId === "idInTime"}
        />
      </div>
      {staffNotFound && (
        <small className="text-danger">Staff ID not found. Please check your ID.</small>
      )}
    </div>
  );

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
          <Link to="/login">Admin login</Link>
        </div>
      </header>
      <div className="container py-5">
        <div className="row justify-content-center">
          {/* In Time */}
          <div className="col-md-4">
            <div className="card custom-card h-100">
              <h5 className="card-title">
                Intime Details <div><FaClock className="text-primary fs-4 mt-1" /></div>
              </h5>
              <form className="d-flex flex-column h-100" onSubmit={handleSubmit}>
                <StaffIdInput
                  inputId="idInTime"
                  value={formData.id}
                  onChange={handleNumericIdChange}
                  staffNotFound={staffNotFound}
                />
                <div className="form-group mb-2">
                  <label>Name</label>
                  <input type="text" className="form-control" value={formData.name} readOnly />
                </div>
                <div className="form-group mb-2">
                  <label>Date</label>
                  <input type="date" className="form-control" value={formData.date} readOnly />
                </div>
                <div className="form-group mb-2">
                  <label>Day</label>
                  <input type="text" className="form-control" value={formData.day} readOnly />
                </div>
                <div className="form-group mb-2">
                  <label>In Time</label>
                  <input
                    type="time"
                    className="form-control"
                    value={formData.inTime}
                    onChange={(e) => setFormData((prev) => ({ ...prev, inTime: e.target.value }))}
                    onClick={() => setFormData((prev) => ({ ...prev, inTime: getCurrentTime() }))}
                  />
                </div>
                <div className="mt-auto">
                  <button
                    className="btn btn-primary btn-block"
                    type="submit"
                    disabled={staffNotFound || !formData.id}
                  >
                    Submit
                  </button>
                </div>
              </form>
            </div>
          </div>
          {/* Lunch */}
          <div className="col-md-4">
            <div className="card custom-card h-100">
              <h5 className="card-title">
                Lunch Details <div><FaUtensils className="text-warning fs-4 mt-1" /></div>
              </h5>
              <form className="d-flex flex-column h-100" onSubmit={handleLunchSubmit}>
                <StaffIdInput
                  inputId="idLunch"
                  value={formData.id}
                  onChange={handleNumericIdChange}
                  staffNotFound={staffNotFound}
                />
                <div className="form-group mb-2">
                  <label htmlFor="dateLunch">Date</label>
                  <input type="date" id="dateLunch" className="form-control" value={formData.date} readOnly />
                </div>
                <div className="form-group mb-2">
                  <label htmlFor="lunchOut">Lunch Out Time</label>
                  <input
                    type="time"
                    id="lunchOut"
                    className="form-control"
                    value={formData.lunchOut}
                    onClick={() => setFormData((prev) => ({ ...prev, lunchOut: getCurrentTime() }))}
                    readOnly
                  />
                </div>
                <div className="form-group mb-2">
                  <label htmlFor="lunchIn">Lunch In Time</label>
                  <input
                    type="time"
                    id="lunchIn"
                    className="form-control"
                    value={formData.lunchIn}
                    onClick={() => setFormData((prev) => ({ ...prev, lunchIn: getCurrentTime() }))}
                    readOnly
                  />
                </div>
                {timeDifferenceWarning && (
                  <div className="alert alert-warning mt-2">{timeDifferenceWarning}</div>
                )}
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
          {/* Out Time */}
          <div className="col-md-4">
            <div className="card custom-card h-100">
              <h5 className="card-title">
                Out Time Details <div><FaDoorOpen className="text-danger fs-4 mt-1" /></div>
              </h5>
              <form className="d-flex flex-column h-100" onSubmit={handleSubmit}>
                <StaffIdInput
                  inputId="idOutTime"
                  value={formData.id}
                  onChange={handleNumericIdChange}
                  staffNotFound={staffNotFound}
                />
                <div className="form-group mb-2">
                  <label htmlFor="dateOutTime">Date</label>
                  <input type="date" id="dateOutTime" className="form-control" value={formData.date} readOnly />
                </div>
                <div className="form-group mb-2">
                  <label htmlFor="outTime">Out Time</label>
                  <input
                    type="time"
                    id="outTime"
                    className="form-control"
                    value={formData.outTime}
                    onClick={() => setFormData((prev) => ({ ...prev, outTime: getCurrentTime() }))}
                    readOnly
                  />
                </div>
                <div className="form-group mb-3">
                  <label htmlFor="leaveType">Permission Type</label>
                  <select
                    id="leaveType"
                    className="form-control"
                    value={formData.leaveType}
                    onChange={handleChange}
                  >
                    <option disabled value="">
                      Select permission
                    </option>
                    <option value="Personal">Personal</option>
                    <option value="Health">Health</option>
                    <option value="Emergency">Emergency</option>
                    <option value="Office">Office Work</option>
                    <option value="Tom">Tom</option>
                    <option value="Call">Call</option>
                    <option value="Food">Food/Curry</option>
                    <option value="Casual">Casual</option>
                  </select>
                </div>
                <div className="mt-auto">
                  <button
                    className="btn btn-primary btn-block"
                    type="submit"
                    disabled={staffNotFound || !formData.id}
                  >
                    Submit
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Interface;
