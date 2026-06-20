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
  const [selectedDept, setSelectedDept] = useState("All");
  const [searchTerm, setSearchTerm] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState({});
  const [editModal, setEditModal] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState(null);

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

  useEffect(() => {
    let filtered = selectedDept === "All"
      ? staff
      : staff.filter(item => item.department === selectedDept);

    if (searchTerm.trim()) {
      filtered = filtered.filter(item =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.id.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    setFilteredStaff(filtered);
  }, [selectedDept, staff, searchTerm]);

  const handleFilter = (dept) => setSelectedDept(dept);

  const handleExportStaff = () => {
    const dataToExport = filteredStaff.length ? filteredStaff : staff;
    const rows = dataToExport.map(s => ({
      ID: s.id,
      Name: s.name,
      Designation: s.designation,
      Department: s.department,
      Identification: s.identification || "",
      Email: s.email || "",
      Phone: s.phone || "",
      "DOB": s.dob ? new Date(s.dob).toLocaleDateString('en-GB') : "",
      "Onboarding Date": s.onboardingDate ? new Date(s.onboardingDate).toLocaleDateString('en-GB') : "",
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Staff");
    XLSX.writeFile(workbook, "staff-details.xlsx");
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
                      </div>
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
                  <td colSpan="7" className="empty-row">No staff found matches your search criteria.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && <AddStaffModal onClose={() => setShowModal(false)} onAdd={handleAddStaff} />}
      {editModal && <EditStaffModal staffData={selectedStaff} onClose={() => setEditModal(false)} onUpdate={handleUpdateStaff} />}
    </div>
  );
};

export default StaffDetails;