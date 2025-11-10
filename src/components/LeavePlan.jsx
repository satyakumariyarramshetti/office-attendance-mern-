import React, { useState, useEffect } from 'react';
import DatePicker from "react-multi-date-picker";
import "./LeavePlan.css";

const LeavePlan = () => {
    const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000';

  const [form, setForm] = useState({
    id: '',       // Only numeric part
    name: '',
    phone: '',
    dates: []
  });

  // Fetch staff details when 4 digits are entered
  useEffect(() => {
    const fetchStaffDetails = async () => {
      if (form.id.length === 4) {
        const fullId = `PS-${form.id}`;
        try {
          const response = await fetch(`${API_BASE}/api/staffs/getById`, {
            method: 'POST',
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: fullId })
          });
          if (response.ok) {
            const data = await response.json();
            setForm(prev => ({
              ...prev,
              name: data.name || '',
              phone: data.phone || ''
            }));
          } else {
            setForm(prev => ({ ...prev, name: '', phone: '' }));
          }
        } catch (error) {
          setForm(prev => ({ ...prev, name: '', phone: '' }));
        }
      } else {
        // If less than 4 digits, clear name/phone
        setForm(prev => ({ ...prev, name: '', phone: '' }));
      }
    };
    fetchStaffDetails();
  }, [form.id]);

  // Remove an individual selected date
  const removeDate = (dateObj) => {
    setForm((prev) => ({
      ...prev,
      dates: prev.dates.filter((d) => d.toString() !== dateObj.toString())
    }));
  };

  // Text fields
  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  // Dates field
  const handleDateChange = (dates) => {
    setForm({ ...form, dates });
  };

  // Submit event
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

  // Cancel event
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
            value={`PS-${form.id}`}
            onChange={(e) => {
              let val = e.target.value;
              if (val.startsWith("PS-")) {
                val = val.slice(3);
              }
              // Allow only numbers
              val = val.replace(/[^0-9]/g, "");
              setForm({ ...form, id: val });
            }}
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
