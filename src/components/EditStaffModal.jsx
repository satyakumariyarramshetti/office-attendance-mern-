import React, { useState } from "react";
import "./EditStaffModal.css";

const EditStaffModal = ({ staffData, onClose, onUpdate }) => {
const [form, setForm] = useState({
  ...staffData,
  activityRequired:
    staffData.activityRequired !== undefined
    ? staffData.activityRequired
    : true
});
 const handleChange = (e) => {

 const {name,value}=e.target;

 setForm({
   ...form,
   [name]:
    name==="activityRequired"
    ? value==="true"
    : value
 });

};

  const handleSubmit = (e) => {
    e.preventDefault();
    onUpdate(form);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content wide-modal"> {/* ⬅️ Added a class for width */}
        <h3>Edit Staff Details</h3>
        <form onSubmit={handleSubmit}>
          <div className="form-grid"> {/* ⬅️ Grid container for 2 columns */}
            
            {/* Left Column */}
            <div className="form-column">
              <div className="form-group">
                <label>ID</label>
                <input name="id" value={form.id} disabled />
              </div>

              <div className="form-group">
                <label>Name</label>
                <input name="name" value={form.name} onChange={handleChange} />
              </div>

              <div className="form-group">
                <label>Designation</label>
                <input name="designation" value={form.designation} onChange={handleChange} />
              </div>

              <div className="form-group">
    <label>Designation Effective From</label>

  <input
    type="month"
    name="designationFrom"
    value={form.designationFrom || ""}
    onChange={handleChange}
  />
</div>

<div className="designation-history">

<h4>Designation History</h4>

{staffData.designationHistory?.length ? (

  [...staffData.designationHistory]
    .sort((a, b) => new Date(b.from) - new Date(a.from))
    .map((item, index) => (

      <div className="history-item" key={index}>

        <div className="history-designation">
          {item.designation}
        </div>

        <div className="history-date">
          From :
          {" "}
          {new Date(item.from).toLocaleDateString(
            "en-GB",
            {
              month: "short",
              year: "numeric"
            }
          )}
        </div>

      </div>

    ))

) : (

<p>No Designation History</p>

)}

</div>

              <div className="form-group">
                <label>Department</label>
                <input name="department" value={form.department} onChange={handleChange} />
              </div>

              <div className="form-group">
                <label>Identification (Unique)</label>
                <input 
                  name="identification" 
                  value={form.identification || ""} 
                  onChange={handleChange} 
                  placeholder="Enter unique identification"
                />
              </div>
            </div>

            {/* Right Column */}
            <div className="form-column">
              <div className="form-group">
                <label>Email</label>
                <input name="email" value={form.email || ""} onChange={handleChange} />
              </div>

              <div className="form-group">
                <label>Phone</label>
                <input name="phone" value={form.phone || ""} onChange={handleChange} />
              </div>

              <div className="form-group">
                <label>Reports To</label>
                <input name="reportsTo" value={form.reportsTo || ""} onChange={handleChange} />
              </div>

              <div className="form-group">
                <label>Date of Birth</label>
                <input 
                  type="date" 
                  name="dob" 
                  value={form.dob ? form.dob.split('T')[0] : ""} 
                  onChange={handleChange} 
                />
              </div>

              <div className="form-group">
                <label>Onboarding Date</label>
                <input 
                  type="date" 
                  name="onboardingDate" 
                  value={form.onboardingDate ? form.onboardingDate.split('T')[0] : ""} 
                  onChange={handleChange} 
                />
              </div>

              <div className="form-group">

<label>Activity Sheet Required</label>

<select
  name="activityRequired"
  value={form.activityRequired}
  onChange={handleChange}
>

<option value={true}>Yes</option>

<option value={false}>No</option>

</select>

</div>

             
<div className="form-group">
  <label>Employee Management</label>
  <select name="status" value={form.status || "Active Employee"} onChange={handleChange}>
    <option value="Active Employee">Active Employee</option>
    <option value="Inactive employee">Inactive employee</option>
  </select>
</div>

            </div>

          </div>

          <div className="modal-actions">
            <button type="submit" className="save-btn">Save Changes</button>
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