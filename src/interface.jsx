// import React, { useState, useEffect, useCallback,useRef } from 'react';
// import './interface.css';
// import { Link } from 'react-router-dom';
// import { FaClock, FaUtensils, FaDoorOpen } from 'react-icons/fa';
// import { debounce } from 'lodash';

// // Prefix for Staff ID
// const PS_PREFIX = 'PS-';

// const Interface = () => {
//   const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:5000";
//   const inTimeRef = useRef(null);
//   const lunchRef = useRef(null);
//   const outTimeRef = useRef(null);
//   const [activeForm, setActiveForm] = useState("intime"); // or 'lunch' or 'out'


//   const [formData, setFormData] = useState({
//     id: '',
//     name: '',
//     date: '',
//     day: '',
//     inTime: '',
//     lunchIn: '',
//     lunchOut: '',
//     outTime: '',
//     casualType: '',
//     leaveType: '',
//     location: '', // <-- Added for location data
//   });

//   const [lunchSubmitEnabled, setLunchSubmitEnabled] = useState(false);
//   const [timeDifferenceWarning, setTimeDifferenceWarning] = useState('');
//   const [message, setMessage] = useState('');
//   const [staffNotFound, setStaffNotFound] = useState(false);

//   // Helpers
//   const getCurrentDate = () => new Date().toISOString().split('T')[0];
//   const getCurrentTime = () => new Date().toTimeString().slice(0, 5);
//   const getCurrentDay = (dateString = null) =>
//     new Date(dateString || new Date()).toLocaleDateString('en-US', { weekday: 'long' });

//   const isFutureDate = (date) => {
//     if (!date) return false;
//     const selected = new Date(date).setHours(0, 0, 0, 0);
//     const today = new Date().setHours(0, 0, 0, 0);
//     return selected > today;
//   };

//   // Debounced fetch function
//   const fetchStaffAndAttendance = useCallback(
//     debounce(async (fullId, date = getCurrentDate()) => {
//       if (!fullId) return;

//       const formattedDate = date;
//       const currentDay = getCurrentDay(formattedDate);
//       let name = '';

//       try {
//         const staffRes = await fetch(`${API_BASE}/api/staffs/getById`, {
//           method: 'POST',
//           headers: { 'Content-Type': 'application/json' },
//           body: JSON.stringify({ id: fullId }),
//         });

//         if (staffRes.ok) {
//           const staffData = await staffRes.json();
//           name = staffData.name || '';
//           setStaffNotFound(false);
//           setMessage('');
//         } else if (staffRes.status === 404) {
//           name = '';
//           setStaffNotFound(true);
//           setMessage('⚠️ Staff ID not found.');
//           setFormData((prev) => ({
//             ...prev,
//             name: '', date: '', day: '', inTime: '', lunchIn: '', lunchOut: '', outTime: '', casualType: '', leaveType: '',
//           }));
//           setLunchSubmitEnabled(false);
//           return;
//         } else {
//           name = '';
//           setStaffNotFound(false);
//           setMessage('');
//         }
//       } catch (error) {
//         console.error('Error fetching staff:', error);
//         name = '';
//         setStaffNotFound(false);
//         setMessage('');
//       }

//       let newFormData = {
//         id: fullId, name, date: formattedDate, day: currentDay, inTime: formData.inTime || getCurrentTime(),
//         lunchOut: '', lunchIn: '', outTime: '', casualType: '', leaveType: '', location: '',
//       };

//       try {
//         const res = await fetch(`${API_BASE}/api/attendance/getByIdDate`, {
//           method: 'POST',
//           headers: { 'Content-Type': 'application/json' },
//           body: JSON.stringify({ id: fullId, date: formattedDate }),
//         });

//         if (res.ok) {
//           const data = await res.json();
//           newFormData = {
//             ...newFormData,
//             name: data.name || newFormData.name,
//             inTime: data.inTime || newFormData.inTime,
//             lunchOut: data.lunchOut || '',
//             lunchIn: data.lunchIn || '',
//             outTime: data.outTime || '',
//             casualType: data.casualType || '',
//             leaveType: data.leaveType || '',
//           };
//           if (!data.lunchOut || !data.lunchIn) {
//             setLunchSubmitEnabled(true);
//             setMessage('');
//           } else {
//             setLunchSubmitEnabled(false);
//             setMessage('🥗 Lunch In & Out already submitted.');
//           }
//         } else {
//           setLunchSubmitEnabled(true);
//           setMessage('');
//         }
//       } catch (err) {
//         console.error('Error fetching attendance:', err);
//         setMessage('');
//         setLunchSubmitEnabled(true);
//       }

//       setFormData(newFormData);
//     }, 400),
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//     [formData.inTime]
//   );

//   const handleNumericIdChange = (e) => {
//     let value = e.target.value.replace(/\D/g, '').slice(0, 4);
//     setFormData((prev) => ({ ...prev, id: value ? PS_PREFIX + value : '' }));

//     if (value.length < 4) {
//       setFormData((prev) => ({
//         ...prev, name: '', date: '', day: '', inTime: '', lunchIn: '', lunchOut: '', outTime: '', casualType: '', leaveType: '',
//       }));
//       setLunchSubmitEnabled(false);
//       setMessage('');
//       setTimeDifferenceWarning('');
//       setStaffNotFound(false);
//       fetchStaffAndAttendance.cancel();
//       return;
//     }

//     if (value.length === 4) {
//       fetchStaffAndAttendance(PS_PREFIX + value, formData.date || getCurrentDate());
//     }
//   };

//   const handleDateChange = (e) => {
//     const selectedDate = e.target.value;
//     const selectedDay = getCurrentDay(selectedDate);
//     setFormData((prev) => ({ ...prev, date: selectedDate, day: selectedDay }));
//     if (formData.id) {
//       fetchStaffAndAttendance(formData.id, selectedDate);
//     }
//   };

//   const handleChange = (e) => {
//     const { id, value } = e.target;
//     setFormData((prev) => ({ ...prev, [id]: value }));
//   };

//   useEffect(() => {
//     if (formData.outTime) {
//       const [hour] = formData.outTime.split(':').map(Number);
//       if (hour >= 18) {
//         setFormData((prev) => ({ ...prev, casualType: 'Casual Type', leaveType: 'Casual' }));
//       } else {
//         setFormData((prev) => ({ ...prev, casualType: '', leaveType: '' }));
//       }
//     }
//   }, [formData.outTime]);

//   useEffect(() => {
//     if (formData.inTime && formData.outTime) {
//       const [inHour, inMin] = formData.inTime.split(':').map(Number);
//       const [outHour, outMin] = formData.outTime.split(':').map(Number);
//       const diff = (outHour * 60 + outMin) - (inHour * 60 + inMin);
//       setTimeDifferenceWarning(diff > 30 ? '⚠️ Time difference between In and Out is more than 30 minutes.' : '');
//     } else {
//       setTimeDifferenceWarning('');
//     }
//   }, [formData.inTime, formData.outTime]);

//   // New function to handle the actual API call
//   // In interface.jsx

// const submitData = async (payload) => {
//   try {
//     const response = await fetch(`${API_BASE}/api/attendance/save`, {
//       method: 'POST',
//       headers: { 'Content-Type': 'application/json' },
//       body: JSON.stringify(payload),
//     });
//     const result = await response.json();
//     alert(response.ok ? result.message || 'Submitted successfully!' : result.error || 'Submission failed!');

//     // --- ADD THIS 'if' BLOCK ---
//     if (response.ok) {
//       // Clear the form to prevent re-submissions and confusion
//       setFormData({
//         id: '', name: '', date: '', day: '', inTime: '',
//         lunchIn: '', lunchOut: '', outTime: '', casualType: '',
//         leaveType: '', location: '',
//       });
//       setStaffNotFound(false);
//       setMessage('');
//       setLunchSubmitEnabled(false);
//     }
//     // --- END OF BLOCK ---

//   } catch (err) {
//     console.error('Submission error:', err);
//     alert('Failed to submit.');
//   }
// };

//   // MODIFIED submit handler for In Time and Out Time
//   const handleSubmit = async (e) => {
//     e.preventDefault();
//     if (staffNotFound) {
//       alert('Please enter a valid Staff ID before submitting.');
//       return;
//     }
//     if (isFutureDate(formData.date)) {
//       alert('Attendance for future dates is not allowed.');
//       return;
//     }

//     // Check if submitting In-Time to request location
//     const isSubmittingInTime = e.nativeEvent.submitter.closest('form').contains(document.getElementById('idInTime'));

//     if (isSubmittingInTime && navigator.geolocation) {
//       // Request location
//       navigator.geolocation.getCurrentPosition(
//         (position) => {
//           const { latitude, longitude } = position.coords;
//           const locationString = `${latitude}, ${longitude}`;
          
//           // Create a new payload with the location
//           const payloadWithLocation = { ...formData, location: locationString };
          
//           // Proceed with the submission
//           submitData(payloadWithLocation);
//         },
//         (error) => {
//           console.error("Error getting location: ", error);
//           alert("Could not get user location. Submitting without it.");
//           // Submit without location data on error
//           submitData(formData);
//         }
//       );
//     } else {
//       // If geolocation is not available or not an In-Time submission, submit without location
//       if(isSubmittingInTime) {
//         alert("Geolocation is not supported by your browser. Submitting without location.");
//       }
//       submitData(formData);
//     }
//   };

//   const handleLunchSubmit = async (e) => {
//     e.preventDefault();
//     if (!formData.id || !formData.date) {
//       alert('Please enter ID and Date before submitting.');
//       return;
//     }
//     if (staffNotFound) {
//       alert('Please enter a valid Staff ID before submitting.');
//       return;
//     }
//     try {
//       const response = await fetch(`${API_BASE}/api/attendance/save`, {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify({
//           id: formData.id, name: formData.name, date: formData.date, day: formData.day,
//           lunchOut: formData.lunchOut || '', lunchIn: formData.lunchIn || '',
//         }),
//       });
//       const result = await response.json();
//       alert(response.ok ? result.message || 'Lunch submitted!' : result.error || 'Submission failed.');
//       if (response.ok) {
//         setFormData((prev) => ({ ...prev, lunchOut: '', lunchIn: '' }));
//         setLunchSubmitEnabled(false);
//         setMessage(result.message || '');
//       }
//     } catch (err) {
//       console.error('Submission error:', err);
//       alert('Lunch submission failed.');
//     }
//   };

//   const StaffIdInput = ({ inputId, value, onChange, staffNotFound,shouldAutoFocus}) => (
//     <div className="form-group mb-2">
//       <label htmlFor={inputId}>Enter your ID</label>
//       <div className="input-group">
//         <div className="input-group-prepend">
//           <span className="input-group-text">{PS_PREFIX}</span>
//         </div>
//         <input
//           type="text" id={inputId} className="form-control"
//           value={value.replace(/^PS-/, '')} onChange={onChange}
//           maxLength={4} pattern="[0-9]*" inputMode="numeric"
//           autoComplete="off" placeholder="0003" 
//           autoFocus={shouldAutoFocus} // 👈 use dynamic autofocus   
//              />
//       </div>
//       {staffNotFound && (
//         <small className="text-danger">Staff ID not found. Please check your ID.</small>
//       )}
//     </div>
//   );
  

//   return (
//     <div className="main-wrapper">
//       <header className="attendance-header">
//         <img
//           src="https://tse4.mm.bing.net/th/id/OIP.kBa9Zzw_lXJ4D67y_kWZ5QHaG7?rs=1&pid=ImgDetMain&o=7&rm=3"
//           alt="Company Logo" className="company-logo"
//         />
//         <div className="header-title">Attendance System</div>
//         <div className="admin-login">
//           <Link to="/admin-login">Admin login</Link>
//         </div>
//       </header>
//       <div className="container py-5">
//         <div className="row justify-content-center">
//           {/* In Time */}
//           <div className="col-md-4">
//             <div className="card custom-card h-100" onClick={() => setActiveForm("inTime")}>
//               <h5 className="card-title">
//                 Intime Details <div><FaClock className="text-primary fs-4 mt-1" /></div>
//               </h5>
//               <form className="d-flex flex-column h-100" onSubmit={handleSubmit}>
//                 <StaffIdInput
//                   inputId="idInTime" value={formData.id}
//                   onChange={handleNumericIdChange} staffNotFound={staffNotFound}
//                   shouldAutoFocus={activeForm === "inTime"}
//                 />
//                 <div className="form-group mb-2">
//                   <label>Name</label>
//                   <input type="text" className="form-control" value={formData.name} readOnly />
//                 </div>
//                 <div className="form-group mb-2">
//                   <label>Date</label>
//                   <input
//                     type="date" className="form-control"
//                     value={formData.date} onChange={handleDateChange} max={getCurrentDate()}
//                   />
//                 </div>
//                 <div className="form-group mb-2">
//                   <label>Day</label>
//                   <input type="text" className="form-control" value={formData.day} readOnly />
//                 </div>
//                 <div className="form-group mb-2">
//                   <label>In Time</label>
//                   <input
//                     type="time" className="form-control" value={formData.inTime}
//                     onChange={(e) => setFormData((prev) => ({ ...prev, inTime: e.target.value }))}
//                     onClick={() => setFormData((prev) => ({ ...prev, inTime: getCurrentTime() }))}
//                   />
//                 </div>
//                 <div className="mt-auto">
//                   <button className="btn btn-primary btn-block" type="submit" disabled={staffNotFound || !formData.id}>
//                     Submit
//                   </button>
//                 </div>
//               </form>
//             </div>
//           </div>
//           {/* Lunch */}
//           <div className="col-md-4">
//             <div className="card custom-card h-100" onClick={() => setActiveForm("lunch")}>
//               <h5 className="card-title">
//                 Lunch Details <div><FaUtensils className="text-warning fs-4 mt-1" /></div>
//               </h5>
//               <form className="d-flex flex-column h-100" onSubmit={handleLunchSubmit}>
//                 <StaffIdInput
//                   inputId="idLunch" value={formData.id}
//                   onChange={handleNumericIdChange} staffNotFound={staffNotFound}
//                   shouldAutoFocus={activeForm === "lunch"
//                   }
//                 />
//                 <div className="form-group mb-2">
//                   <label htmlFor="dateLunch">Date</label>
//                   <input type="date" id="dateLunch" className="form-control" value={formData.date} readOnly />
//                 </div>
//                 <div className="form-group mb-2">
//                   <label htmlFor="lunchOut">Lunch Out Time</label>
//                   <input
//                     type="time" id="lunchOut" className="form-control" value={formData.lunchOut}
//                     onClick={() => setFormData((prev) => ({ ...prev, lunchOut: getCurrentTime() }))}
//                     readOnly
//                   />
//                 </div>
//                 <div className="form-group mb-2">
//                   <label htmlFor="lunchIn">Lunch In Time</label>
//                   <input
//                     type="time" id="lunchIn" className="form-control" value={formData.lunchIn}
//                     onClick={() => setFormData((prev) => ({ ...prev, lunchIn: getCurrentTime() }))}
//                     readOnly
//                   />
//                 </div>
//                 {timeDifferenceWarning && (
//                   <div className="alert alert-warning mt-2">{timeDifferenceWarning}</div>
//                 )}
//                 <div className="mt-auto">
//                   <button className="btn btn-primary btn-block" disabled={!lunchSubmitEnabled || staffNotFound || !formData.id} type="submit">
//                     Submit
//                   </button>
//                 </div>
//               </form>
//               {message && <div className="alert alert-info mt-2">{message}</div>}
//             </div>
//           </div>
//           {/* Out Time */}
//           <div className="col-md-4">
//             <div className="card custom-card h-100" onClick={() => setActiveForm("out")}>
//               <h5 className="card-title">
//                 Out Time Details <div><FaDoorOpen className="text-danger fs-4 mt-1" /></div>
//               </h5>
//               <form className="d-flex flex-column h-100" onSubmit={handleSubmit}>
//                 <StaffIdInput
//                   inputId="idOutTime" value={formData.id}
//                   onChange={handleNumericIdChange} staffNotFound={staffNotFound}
//                   shouldAutoFocus={activeForm === "out"}

//                 />
//                 <div className="form-group mb-2">
//                   <label htmlFor="dateOutTime">Date</label>
//                   <input type="date" id="dateOutTime" className="form-control" value={formData.date} readOnly />
//                 </div>
//                 <div className="form-group mb-2">
//                   <label htmlFor="outTime">Out Time</label>
//                   <input
//                     type="time" id="outTime" className="form-control" value={formData.outTime}
//                     onClick={() => setFormData((prev) => ({ ...prev, outTime: getCurrentTime() }))}
//                     onChange={(e) => setFormData((prev) => ({ ...prev, outTime: e.target.value }))}
//                   />
//                 </div>
//                 <div className="form-group mb-3">
//                   <label htmlFor="leaveType">Permission Type</label>
//                   <select id="leaveType" className="form-control" value={formData.leaveType} onChange={handleChange}>
//                     <option disabled value="">Select permission</option>
//                     <option value="Personal">Personal</option>
//                     <option value="Health">Health</option>
//                     <option value="Emergency">Emergency</option>
//                     <option value="Office">Office Work</option>
//                     <option value="Tom">Tom</option>
//                     <option value="Call">Call</option>
//                     <option value="Food">Food/Curry</option>
//                     <option value="Casual">Casual</option>
//                   </select>
//                 </div>
//                 <div className="mt-auto">
//                   <button className="btn btn-primary btn-block" type="submit" disabled={staffNotFound || !formData.id}>
//                     Submit
//                   </button>
//                 </div>
//               </form>
//             </div>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default Interface;








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

    // Add special logic just for the outTime input
    if (id === 'outTime') {
      if (value > '18:00') {
        // If time is after 18:00, automatically set permission to 'Casual Type'
        setFormData(prev => ({
          ...prev,
          outTime: value,
          dailyLeaveType: 'Casual Type'
        }));
      } else {
        // If time is 18:00 or earlier, update the time and clear the permission,
        // forcing the user to select one.
        setFormData(prev => ({
          ...prev,
          outTime: value,
          dailyLeaveType: '' 
        }));
      }
    } else {
      // For all other inputs, update state normally
      setFormData((prev) => ({ ...prev, [id]: value }));
    }
  };

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
                      <select id="leaveType" className="form-control" value={formData.leaveType} onChange={handleChange}>
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