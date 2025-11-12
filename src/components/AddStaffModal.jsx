import React, { useState } from "react";
import "./AddStaffModal.css"; // optional styling


const departments = [
  "Common",
  "Piping",
  "Reverse Engineering",
  "On-Site",
  "C&S",
];



const AddStaffModal = ({ onClose, onAdd }) => {
 const [formData, setFormData] = useState({
  id: "",
  name: "",
  designation: "",
  department: "",
  email: "",     
  phone: ""      
});



  const handleChange = e => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

 const handleSubmit = (e) => {
  e.preventDefault();
  console.log("Submitting staff data:", JSON.stringify(formData, null, 2));

  onAdd(formData);
  onClose();
};


  return (
    <div className="modal-backdrop">
      <div className="modal-content">
        <h3>Add New Staff</h3>
        <form onSubmit={handleSubmit}>
          <input name="id" placeholder="ID" onChange={handleChange} required />
          <input name="name" placeholder="Name" onChange={handleChange} required />
          <input name="designation" placeholder="Designation" onChange={handleChange} required />
          <input
  name="phone"
  placeholder="Phone Number"
  onChange={handleChange}
  value={formData.phone}
  required
/>


          {/* Dropdown for Department */}
          <select
            name="department"
            onChange={handleChange}
            value={formData.department}
            
          >
            <option value="" disabled>
              Select Department
            </option>
            {departments.map(dept => (
              <option key={dept} value={dept}>
                {dept}
              </option>
            ))}
          </select>

          
          <input
  name="email"
  placeholder="Email"
  onChange={handleChange}
  value={formData.email}
  required
/>


          <div className="modal-buttons">
            <button type="submit">Add</button>
            <button onClick={onClose} type="button">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddStaffModal;
