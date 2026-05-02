import React, { useState } from "react";
import "./AddStaffModal.css";

const departments = ["Common", "Piping", "Reverse Engineering", "On-Site", "C&S"];

const AddStaffModal = ({ onClose, onAdd }) => {
  const [formData, setFormData] = useState({
    id: "",
    name: "",
    designation: "",
    department: "",
    email: "",     
    phone: "",
    reportsTo: "",
    dob: "",            
    onboardingDate: "",
    identification: ""  
  });

  const handleChange = e => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onAdd(formData);
    onClose();
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-content wide-modal">
        <h3>Add New Staff</h3>
        <form onSubmit={handleSubmit}>
          
          <div className="form-grid">
            {/* Left Column */}
            <div className="form-column">
              <div className="form-group">
                <label>Staff ID</label>
                <input name="id" placeholder="Ex: PS-0003" onChange={handleChange} required />
              </div>

              <div className="form-group">
                <label>Full Name</label>
                <input name="name" placeholder="Enter name" onChange={handleChange} required />
              </div>

              <div className="form-group">
                <label>Designation</label>
                <input name="designation" placeholder="Designation" onChange={handleChange} required />
              </div>

              <div className="form-group">
                <label>Phone Number</label>
                <input name="phone" placeholder="Phone Number" onChange={handleChange} value={formData.phone} required />
              </div>

              <div className="form-group">
                <label>Identification (Password)</label>
                <input name="identification" placeholder="Unique Password" onChange={handleChange} value={formData.identification} required />
              </div>
            </div>

            {/* Right Column */}
            <div className="form-column">
              <div className="form-group">
                <label>Department</label>
                <select name="department" onChange={handleChange} value={formData.department} required>
                  <option value="" disabled>Select Department</option>
                  {departments.map(dept => <option key={dept} value={dept}>{dept}</option>)}
                </select>
              </div>

              <div className="form-group">
                <label>Email Address</label>
                <input name="email" type="email" placeholder="Email" onChange={handleChange} value={formData.email} required />
              </div>

              <div className="form-group">
                <label>Reports To</label>
                <input name="reportsTo" placeholder="Name or ID" onChange={handleChange} value={formData.reportsTo} />
              </div>

              <div className="form-group">
                <label>Date of Birth</label>
                <input type="date" name="dob" onChange={handleChange} value={formData.dob} />
              </div>

              <div className="form-group">
                <label>Onboarding Date</label>
                <input type="date" name="onboardingDate" onChange={handleChange} value={formData.onboardingDate} />
              </div>
            </div>
          </div>

          <div className="modal-buttons">
            <button type="submit" className="add-btn">Add Staff</button>
            <button onClick={onClose} type="button" className="cancel-btn">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddStaffModal;