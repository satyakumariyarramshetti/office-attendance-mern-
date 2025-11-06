import React, { useState } from 'react';
import DatePicker from "react-multi-date-picker";
import "./LeavePlan.css";

const LeavePlan = () => {
  const [form, setForm] = useState({
    id: '',
    name: '',
    phone: '',
    dates: []
  });

  // Remove an individual selected date
  const removeDate = (dateObj) => {
    setForm((prev) => ({
      ...prev,
      dates: prev.dates.filter((d) => d.toString() !== dateObj.toString())
    }));
  };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleDateChange = (dates) => {
    setForm({ ...form, dates });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    alert('Leave request submitted!');
    setForm({
      id: '',
      name: '',
      phone: '',
      dates: []
    });
  };

  const handleCancel = () => {
    setForm({
      id: '',
      name: '',
      phone: '',
      dates: []
    });
  };

  return (
    <div className="leave-plan-container">
      <form className="leave-form" onSubmit={handleSubmit}>
        <h2>Leave Plan</h2>
        <label>
          Enter your ID:
          <input 
            type="text" 
            name="id" 
            value={form.id} 
            onChange={handleChange} 
            required 
          />
        </label>
        <label>
          Name:
          <input 
            type="text" 
            name="name" 
            value={form.name} 
            onChange={handleChange} 
            required 
          />
        </label>
        <label>
          Phone Number:
          <input 
            type="tel" 
            name="phone" 
            value={form.phone} 
            onChange={handleChange} 
            required 
          />
        </label>
        <label>
          Leave Calendar (Select Dates):
          <DatePicker
            multiple
            value={form.dates}
            onChange={handleDateChange}
            format="DD-MM-YYYY"
            className="date-picker"
            placeholder="Select leave dates"
          />
        </label>
        {/* Custom chip display for selected dates */}
        {form.dates.length > 0 && (
          <div className="selected-dates">
            {form.dates.map((dateObj, i) => (
              <span className="date-chip" key={i}>
                {dateObj.format ? dateObj.format("DD-MM-YYYY") : dateObj.toString()}
                <button type="button" className="remove-date" onClick={() => removeDate(dateObj)}>×</button>
              </span>
            ))}
          </div>
        )}
        <div className="form-buttons">
          <button type="submit" className="submit-btn">Submit</button>
          <button type="button" className="cancel-btn" onClick={handleCancel}>Cancel</button>
        </div>
      </form>
    </div>
  );
};

export default LeavePlan;
