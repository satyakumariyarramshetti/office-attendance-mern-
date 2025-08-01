import React, { useState, useEffect } from "react";
import "./StaffDetails.css";
import AddStaffModal from "./AddStaffModal";

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
  const [isDeleting, setIsDeleting] = useState(false); // 🆕 Track delete loading

  // ✅ Fetch all staff from backend
  const fetchStaff = async () => {
    try {
      const response = await fetch(`${API_BASE}/staffs`);
      const data = await response.json();
      setStaff(data);
    } catch (err) {
      console.error("Error fetching staff:", err);
    }
  };

  // ✅ Initial fetch
  useEffect(() => {
    fetchStaff();
  }, []);

  // ✅ Reactive filtering
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

  const handleFilter = dept => setSelectedDept(dept);

  const handleAddStaff = async newStaff => {
    try {
      const response = await fetch('${API_BASE}/staffs', {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newStaff)
      });

      const message = await response.text();
      alert(message);
      fetchStaff();
    } catch (err) {
      console.error("Failed to add staff:", err);
    }
  };

  // 🗑️ Remove handler with loading state
 const handleRemove = async (id) => {
  if (!window.confirm("Are you sure you want to remove this staff member?")) return;

  setIsDeleting((prev) => ({ ...prev, [id]: true }));

  try {
    const response = await fetch(`${API_BASE}/staffs/${id}`, {
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
      <h2>Staff Details</h2>

      {/* 🔘 Department Buttons */}
      <div className="dept-buttons">
        {departments.map(dept => (
          <button
            key={dept}
            onClick={() => handleFilter(dept)}
            className={selectedDept === dept ? "active" : ""}
          >
            {dept}
          </button>
        ))}
        <button onClick={() => setShowModal(true)} className="add-staff-btn">
          Add Staff
        </button>
      </div>

      {/* 🔍 Search Bar */}
      <input
        type="text"
        className="search-input"
        placeholder="Search by ID or Name"
        value={searchTerm}
        onChange={e => setSearchTerm(e.target.value)}
      />

   {/* 📊 Staff Table */}
<div className="staff-table-container">
  <table className="staff-table">
    <thead>
      <tr>
        <th>ID</th>
        <th>Name</th>
        <th>Designation</th>
        <th>Department</th>
        <th>Gender</th>
        <th>Actions</th>
      </tr>
    </thead>
    <tbody>
      {filteredStaff.map(member => (
        <tr key={member._id || member.id}>
         <td data-label="ID">{member.id}</td>
      <td data-label="Name">{member.name}</td>
      <td data-label="Designation">{member.designation}</td>
      <td data-label="Department">{member.department}</td>
      <td data-label="Gender">{member.gender || "N/A"}</td>
      <td data-label="Actions">
            <button
          onClick={() => handleRemove(member._id)}
          disabled={!!isDeleting[member._id]}
          className="remove-btn"
        >
              {isDeleting ? "Removing..." : "Remove"}
            </button>
          </td>
        </tr>
      ))}
    </tbody>
  </table>
</div>


      {showModal && (
        <AddStaffModal
          onClose={() => setShowModal(false)}
          onAdd={handleAddStaff}
        />
      )}
    </div>
  );
};

export default StaffDetails;
