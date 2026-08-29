import React, { useState } from "react";
import "./EditStaffModal.css";

const EditStaffModal = ({ staffData, onClose, onUpdate }) => {
  // form state లో history ని కూడా ఉంచుకోవాలి
  const [form, setForm] = useState({
    ...staffData,
    designationHistory: staffData.designationHistory || [],
    activityRequired:
      staffData.activityRequired !== undefined
        ? staffData.activityRequired
        : true,
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm({
      ...form,
      [name]: name === "activityRequired" ? value === "true" : value,
    });
  };

  // --- EditStaffModal.js లోపల ---

// ఒక హెల్పర్ ఫంక్షన్: హిస్టరీలో ఏది లేటెస్ట్ అయితే దాన్ని మెయిన్ బాక్స్‌కి సెట్ చేస్తుంది
const syncWithLatestHistory = (newHistory) => {
  if (newHistory.length === 0) return {};

  // డేట్ ప్రకారం సార్ట్ చేసి లేటెస్ట్ ఐటమ్ ని తీసుకుంటాం
  const sorted = [...newHistory].sort((a, b) => new Date(b.from) - new Date(a.from));
  const latest = sorted[0];

  return {
    designation: latest.designation,
    designationFrom: latest.from ? new Date(latest.from).toISOString().slice(0, 7) : ""
  };
};

// --- Delete History ---
const handleDeleteHistory = (itemToDelete) => {
  if (window.confirm("Are you sure you want to delete this history record?")) {
    const newHistory = form.designationHistory.filter(item => item !== itemToDelete);
    
    // లేటెస్ట్ ఐటమ్ ని వెతికి మెయిన్ బాక్స్ ని అప్డేట్ చేస్తాం
    const latestData = syncWithLatestHistory(newHistory);
    
    setForm({ 
      ...form, 
      designationHistory: newHistory,
      ...latestData // ఇది పైన ఉన్న Designation బాక్స్ ని మారుస్తుంది
    });
  }
};

// --- Edit History ---
const handleEditHistory = (itemToEdit) => {
  const newDesignation = prompt("Update Designation:", itemToEdit.designation);
  const newDateRaw = prompt("Update From Date (YYYY-MM):", 
    itemToEdit.from ? new Date(itemToEdit.from).toISOString().slice(0, 7) : ""
  );

  if (newDesignation && newDateRaw) {
    const newHistory = form.designationHistory.map((item) => {
      if (item === itemToEdit) {
        return {
          ...item,
          designation: newDesignation,
          from: new Date(newDateRaw + "-01").toISOString(),
        };
      }
      return item;
    });

    // ఎడిట్ చేసాక కూడా ఏది లేటెస్ట్ ఉంటే అది మెయిన్ బాక్స్ లోకి రావాలి
    const latestData = syncWithLatestHistory(newHistory);

    setForm({ 
      ...form, 
      designationHistory: newHistory,
      ...latestData // Syncing main field
    });
  }
};



  const handleSubmit = (e) => {
    e.preventDefault();
    onUpdate(form);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content wide-modal">
        <h3>Edit Staff Details</h3>
        <form onSubmit={handleSubmit}>
          <div className="form-grid">
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
  <label>Designation (Current/Latest)</label>
  <input 
    name="designation" 
    value={form.designation} 
    onChange={handleChange} 
    style={{ backgroundColor: "#f0f8ff", fontWeight: "bold" }} // హైలైట్ చేయడానికి
  />
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

              {/* Designation History Section */}
              <div className="designation-history-section">
                <h4>Designation History</h4>
               <div className="history-list-container">
  {form.designationHistory.length > 0 ? (
    [...form.designationHistory]
      .sort((a, b) => new Date(b.from) - new Date(a.from))
      .map((item, sortedIndex) => ( // ఇక్కడ index ని వాడకండి
        <div className="history-item-editable" key={item._id || sortedIndex}>
          <div className="history-details">
            <div className="history-designation">{item.designation}</div>
            <div className="history-date">
              From: {new Date(item.from).toLocaleDateString("en-GB", { month: "short", year: "numeric" })}
            </div>
          </div>
          <div className="history-actions">
            {/* ఇక్కడ index కి బదులుగా నేరుగా item ని పంపిస్తున్నాము */}
            <button type="button" onClick={() => handleEditHistory(item)} className="mini-btn edit-btn">✏️</button>
            <button type="button" onClick={() => handleDeleteHistory(item)} className="mini-btn delete-btn">🗑️</button>
          </div>
        </div>
      ))
  ) : (
    <p className="history-empty">No Designation History</p>
  )}
</div>

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
                />
              </div>
            </div>

            {/* Right Column (మిగతా ఫీల్డ్స్ మీ పాత కోడ్ లో ఉన్నట్లే ఉంచండి) */}
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
                <input type="date" name="dob" value={form.dob ? form.dob.split('T')[0] : ""} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label>Onboarding Date</label>
                <input type="date" name="onboardingDate" value={form.onboardingDate ? form.onboardingDate.split('T')[0] : ""} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label>Activity Sheet Required</label>
                <select name="activityRequired" value={form.activityRequired} onChange={handleChange}>
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
              {form.status === "Inactive employee" && (
                <div className="form-group">
                  <label>Inactivation Date (Exit Date)</label>
                  <input type="date" name="inactivationDate" value={form.inactivationDate ? form.inactivationDate.split('T')[0] : ""} onChange={handleChange} />
                </div>
              )}
            </div>
          </div>

          <div className="modal-actions">
            <button type="submit" className="save-btn">Save Changes</button>
            <button type="button" onClick={onClose} className="cancel-btn">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditStaffModal;