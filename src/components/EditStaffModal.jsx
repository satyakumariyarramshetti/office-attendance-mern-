import React, { useState } from "react";
import "./EditStaffModal.css";

const EditStaffModal = ({ staffData, onClose, onUpdate }) => {
  const [form, setForm] = useState({ ...staffData });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onUpdate(form);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h3>Edit Staff Details</h3>
        <form onSubmit={handleSubmit}>
          <label>ID</label>
          <input name="id" value={form.id} disabled />

          <label>Name</label>
          <input name="name" value={form.name} onChange={handleChange} />

          <label>Designation</label>
          <input
            name="designation"
            value={form.designation}
            onChange={handleChange}
          />

          <label>Department</label>
          <input
            name="department"
            value={form.department}
            onChange={handleChange}
          />

          <label>Gender</label>
          <select name="gender" value={form.gender} onChange={handleChange}>
            <option>Male</option>
            <option>Female</option>
            <option>Other</option>
          </select>

          <label>Phone</label>
          <input
            name="phone"
            value={form.phone || ""}
            onChange={handleChange}
          />

          <div className="modal-actions">
            <button type="submit" className="save-btn">Save</button>
            <button type="button" onClick={onClose} className="cancel-btn">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditStaffModal;
