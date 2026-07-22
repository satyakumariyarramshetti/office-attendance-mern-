import React, { useState, useEffect, useCallback } from "react";
import "./StaffDetails.css";
import AddStaffModal from "./AddStaffModal";
import EditStaffModal from "./EditStaffModal";
import * as XLSX from "xlsx";

const departments = [
  "All",
  "Common",
  "Piping",
  "Reverse Engineering",
  "On-Site",
  "C&S",
];

const StaffDetails = () => {
  const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:5000";
  const [staff, setStaff] = useState([]);
  const [filteredStaff, setFilteredStaff] = useState([]);
  const [viewMode, setViewMode] = useState("Active Employee");
  const [selectedDept, setSelectedDept] = useState("All");
  const [searchTerm, setSearchTerm] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState({});
  const [editModal, setEditModal] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [showDateForm, setShowDateForm] = useState(false);
const [tempStaffData, setTempStaffData] = useState(null);
const [selectedInactivateDate, setSelectedInactivateDate] = useState("");

  const fetchStaff = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/staffs`);
      const data = await res.json();
      setStaff(data);
    } catch (err) {
      console.error("Error fetching staff:", err);
    }
  }, [API_BASE]);

  useEffect(() => {
    fetchStaff();
  }, [fetchStaff]);

 // Step 2: Status బట్టి ఫిల్టర్ చేయడం
useEffect(() => {
  // ముందుగా Active/Inactive బట్టి ఫిల్టర్
  let filtered = staff.filter(item => (item.status || "Active Employee") === viewMode);

  // తర్వాత డిపార్ట్‌మెంట్ ఫిల్టర్
  if (selectedDept !== "All") {
    filtered = filtered.filter(item => item.department === selectedDept);
  }

  // తర్వాత సెర్చ్ ఫిల్టర్
  if (searchTerm.trim()) {
    filtered = filtered.filter(item =>
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.id.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }

   filtered.sort((a, b) => {
    return a.id.localeCompare(b.id, undefined, { numeric: true, sensitivity: 'base' });
  });
  
  setFilteredStaff(filtered);
}, [selectedDept, staff, searchTerm, viewMode]);

  const handleFilter = (dept) => setSelectedDept(dept);

  const handleExportStaff = () => {
    const dataToExport = filteredStaff.length ? filteredStaff : staff;
    const rows = dataToExport.map(s => ({
      ID: s.id,
      Name: s.name,
      Designation: s.designation,
      Department: s.department,
      Status: s.status || "Active Employee",
      Identification: s.identification || "",
      Email: s.email || "",
      Phone: s.phone || "",
      "DOB": s.dob ? new Date(s.dob).toLocaleDateString('en-GB') : "",
      "Onboarding Date": s.onboardingDate ? new Date(s.onboardingDate).toLocaleDateString('en-GB') : "",
    "Exit Date": s.inactivationDate ? new Date(s.inactivationDate).toLocaleDateString('en-GB') : "N/A"
  }));

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Staff");
XLSX.writeFile(workbook, `staff-details-${viewMode}.xlsx`); 
  };

  const handleAddStaff = async (newStaff) => {
    try {
      const response = await fetch(`${API_BASE}/api/staffs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newStaff),
      });
      if (!response.ok) {
        const errorText = await response.text();
        alert(`Failed to add staff: ${errorText}`);
        return;
      }
      const data = await response.json();
      alert(data.message || "Staff added successfully!");
      fetchStaff();
      setShowModal(false);
    } catch (err) {
      console.error("Failed to add staff:", err);
      alert("Error while adding staff.");
    }
  };

  const handleUpdateStaff = async (updatedStaff) => {
    try {
      const response = await fetch(`${API_BASE}/api/staffs/${updatedStaff._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedStaff),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Update failed");
      alert(data.message);
      fetchStaff();
      setEditModal(false);
    } catch (err) {
      console.error("Error updating staff:", err);
      alert("Failed to update staff.");
    }
  };

  const handleRemove = async (id) => {
    if (!window.confirm("Are you sure you want to remove this staff member?")) return;
    setIsDeleting((prev) => ({ ...prev, [id]: true }));
    try {
      const response = await fetch(`${API_BASE}/api/staffs/${id}`, {
        method: "DELETE",
      });
      const message = await response.text();
      alert(message);
      fetchStaff();
    } catch (err) {
      console.error("Failed to remove staff:", err);
      alert("Failed to remove staff member.");
    } finally {
      setIsDeleting((prev) => ({ ...prev, [id]: false }));
    }
  };

  const handleInactivateConfirm = async () => {
  if (!selectedInactivateDate) {
    alert("Please select the inactivation date.");
    return;
  }

  const updatedStaff = {
    ...tempStaffData,
    status: "Inactive employee",
    inactivationDate: selectedInactivateDate // ఇది backend కి వెళ్తుంది
  };

  await handleUpdateStaff(updatedStaff);
  
  // ఫార్మ్ క్లోజ్ చేసి డేటా క్లియర్ చేయి
  setShowDateForm(false);
  setTempStaffData(null);
  setSelectedInactivateDate("");
};

  return (
    <div className="staff-details-container">
      <header className="staff-header">
        <div className="header-info">
          <h1>Staff Directory</h1>
          <p>Manage and view all staff members details efficiently.</p>
        </div>
        <div className="header-actions">
          <button onClick={handleExportStaff} className="btn btn-secondary">
            <span className="icon">📤</span> Export
          </button>
          <button onClick={() => setShowModal(true)} className="btn btn-primary">
            <span className="icon">➕</span> Add Staff
          </button>
        </div>
      </header>

  
<div className="status-toggle-bar">
  <button 
    className={`status-tab ${viewMode === "Active Employee" ? "active" : ""}`}
    onClick={() => setViewMode("Active Employee")}
  >
    Active Members ({staff.filter(s => (s.status || "Active Employee") === "Active Employee").length})
  </button>
  <button 
    className={`status-tab inactive ${viewMode === "Inactive employee" ? "active" : ""}`}
    onClick={() => setViewMode("Inactive employee")}
  >
    Inactive Members ({staff.filter(s => s.status === "Inactive employee").length})
  </button>
</div>


      <div className="toolbar-section">
        <nav className="dept-filter-tabs">
          {departments.map(dept => (
            <button
              key={dept}
              onClick={() => handleFilter(dept)}
              className={selectedDept === dept ? "tab active" : "tab"}
            >
              {dept}
            </button>
          ))}
        </nav>
        <div className="search-box">
          <input
            type="text"
            className="modern-search"
            placeholder="Find by name or employee ID..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="staff-table-card">
        <div className="table-responsive">
          <table className="modern-table">
            <thead>
              <tr>
                <th> Employee ID</th>
                <th>Employee Name</th>
                <th>Designation</th>
                <th>Department</th>
                <th>Contact Information</th>
                <th>Important Dates</th>
                <th>Employee Management</th>
                <th className="text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredStaff.length > 0 ? (
                filteredStaff.map(member => (
                  <tr key={member._id || member.id}>
                    <td className="id-cell">{member.id}</td>
                    <td>
                      <div className="name-cell">
                        <span className="full-name">{member.name}</span>
                        <span className="sub-text">ID: {member.identification || "N/A"}</span>
                      </div>
                    </td>
                    <td>{member.designation}</td>
                    <td><span className={`badge dept-${member.department?.toLowerCase().replace(/\s+/g, '-') || 'default'}`}>{member.department}</span></td>
                    <td>
                      <div className="contact-cell">
                        <span className="email-text">{member.email || "—"}</span>
                        <span className="phone-text">{member.phone || "—"}</span>
                      </div>
                    </td>
                   <td>
  <div className="date-cell">
    <span>DOB: {member.dob ? new Date(member.dob).toLocaleDateString('en-GB') : "—"}</span>
    <span>Joined: {member.onboardingDate ? new Date(member.onboardingDate).toLocaleDateString('en-GB') : "—"}</span>
    
   {/* ఇన్యాక్టివ్ అయితే Exit Date ని చూపించు */}
{member.status === "Inactive employee" && member.inactivationDate && (
  <span style={{ color: "#d9534f", fontWeight: "600", marginTop: "4px" }}>
    Exit: {new Date(member.inactivationDate).toLocaleDateString('en-GB')}
  </span>
)}

  </div>
</td>

                    <td>
  <select 
    className="status-select"
    value={member.status || "Active Employee"}
    onChange={(e) => {
      const newStatus = e.target.value;
      if (newStatus === "Inactive employee") {
        setTempStaffData(member); 
        setShowDateForm(true);    
      } else {
        // Active కి మారిస్తే డైరెక్ట్ గా అప్డేట్ చేయి (డేట్ ని క్లియర్ చేస్తూ)
        handleUpdateStaff({ ...member, status: newStatus, inactivationDate: null });
      }
    }}
  >
    <option value="Active Employee">Active Employee</option>
    <option value="Inactive employee">Inactive employee</option>
  </select>
</td>

                    <td>
                      <div className="action-group">
                        <button onClick={() => { setSelectedStaff(member); setEditModal(true); }} className="action-btn edit" title="Edit Staff">✏️</button>
                        <button onClick={() => handleRemove(member._id)} disabled={!!isDeleting[member._id]} className="action-btn delete" title="Remove Staff">
                          {isDeleting[member._id] ? "..." : "🗑️"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="8" className="empty-row">No staff found matches your search criteria.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && <AddStaffModal onClose={() => setShowModal(false)} onAdd={handleAddStaff} />}
      {editModal && <EditStaffModal staffData={selectedStaff} onClose={() => setEditModal(false)} onUpdate={handleUpdateStaff} />}

{/* Inactivation Date Selection Form */}
{showDateForm && (
  <div className="modal-backdrop">
    <div className="modal-content" style={{ maxWidth: "400px", padding: "25px" }}>
      <h3 style={{ marginBottom: "15px" }}>Select Inactivation Date</h3>
      <p>Employee: <strong>{tempStaffData?.name}</strong></p>
      
      <div className="form-group" style={{ marginTop: "15px" }}>
        <label>Select Date</label> {/* Label ని కూడా మార్చుకోవచ్చు */}
        <input 
          type="date"  // ఇక్కడ 'month' నుండి 'date' కి మార్చాము
          className="form-control"
          value={selectedInactivateDate}
          onChange={(e) => setSelectedInactivateDate(e.target.value)}
          required
        />
      </div>

      <div className="modal-buttons" style={{ marginTop: "20px", display: "flex", gap: "10px" }}>
        <button 
          onClick={handleInactivateConfirm} 
          className="add-btn" 
          style={{ backgroundColor: "#d9534f" }}
        >
          Confirm Inactivate
        </button>
        <button 
          onClick={() => setShowDateForm(false)} 
          className="cancel-btn"
        >
          Cancel
        </button>
      </div>
    </div>
  </div>
)}


    </div>
  );
};

export default StaffDetails;