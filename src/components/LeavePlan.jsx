import React, { useState, useEffect } from 'react';
import DatePicker from "react-multi-date-picker";
import "./LeavePlan.css";

const LeavePlan = () => {
  const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000';

  const [form, setForm] = useState({
    id: '',
    name: '',
    email: '',
    reportsTo: '',
    leaveReason: '',
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
              email: data.email || '',
              reportsTo: data.reportsTo || ''
            }));
          } else {
            setForm(prev => ({
              ...prev,
              name: '',
              email: '',
              reportsTo: ''
            }));
          }
        } catch (error) {
          setForm(prev => ({
            ...prev,
            name: '',
            email: '',
            reportsTo: ''
          }));
        }
      } else {
        setForm(prev => ({
          ...prev,
          name: '',
          email: '',
          reportsTo: ''
        }));
      }
    };
    fetchStaffDetails();
  }, [form.id, API_BASE]);

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
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${API_BASE}/api/leave-requests/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: `PS-${form.id}`,
          name: form.name,
          email: form.email,
          reportsTo: form.reportsTo,
          leaveReason: form.leaveReason,
          dates: form.dates.map(d => d.format ? d.format("DD-MM-YYYY") : d.toString())
        })
      });
      if (response.ok) {
        alert('Leave request submitted!');
        setForm({
          id: '',
          name: '',
          email: '',
          reportsTo: '',
          leaveReason: '',
          dates: []
        });
      } else {
        alert('Error submitting leave request');
      }
    } catch (error) {
      alert('Network or server error');
    }
  };

  // Cancel event
  const handleCancel = () => {
    setForm({
      id: '',
      name: '',
      email: '',
      reportsTo: '',
      leaveReason: '',
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
            readOnly
            style={{ background: "#f4f7fa" }}
          />
        </label>
        <label>
          Email:
          <input
            type="email"
            name="email"
            value={form.email}
            onChange={handleChange}
            required
            readOnly
            style={{ background: "#f4f7fa" }}
          />
        </label>
        <label>
          Reports To:
          <input
            type="text"
            name="reportsTo"
            value={form.reportsTo}
            onChange={handleChange}
            required
            readOnly
            style={{ background: "#f4f7fa" }}
          />
        </label>
        <label>
          Leave Reason:
          <textarea
            name="leaveReason"
            value={form.leaveReason}
            onChange={handleChange}
            required
            placeholder="Enter your reason for leave"
            style={{ minHeight: "50px" }}
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
