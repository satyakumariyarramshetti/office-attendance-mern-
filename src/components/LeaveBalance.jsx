import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './LeaveBalance.css';

const API_URL = process.env.REACT_APP_API_URLL || "http://localhost:5000/api/leave-balance";
const LeaveBalance = () => {
  const [balances, setBalances] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  const [formData, setFormData] = useState({
    employeeId: '',
    name: '',
    role: 'junior',
  });
  const [searchTerm, setSearchTerm] = useState('');

  const fetchBalances = async () => {
    try {
      const res = await axios.get(API_URL);
      setBalances(res.data);
    } catch (error) {
      console.error("Error fetching leave balances:", error);
    }
  };

  useEffect(() => { fetchBalances(); }, []);

  const handleAddFormChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleEditFormChange = (e) => {
    const { name, value } = e.target;
    const updatedValue = ['casualLeaves', 'sickLeaves', 'privilegeLeaves', 'monthlyLeaveStatus'].includes(name) 
      ? Number(value) 
      : value;
    setEditingMember({ ...editingMember, [name]: updatedValue });
  };

  const handleAddMember = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API_URL}/add`, formData);
      fetchBalances();
      setShowAddModal(false);
      setFormData({ employeeId: '', name: '', role: 'junior' });
    } catch (error) {
      let msg = "An unexpected error occurred.";
      if (error.response) msg = error.response.data.message || "Error from server.";
      else if (error.request) msg = "Could not connect to the server.";
      else msg = error.message;
      alert(msg);
    }
  };
  
  const openEditModal = (member) => {
    setEditingMember(member);
    setShowEditModal(true);
  };

  const handleUpdateMember = async (e) => {
    e.preventDefault();
    if (!editingMember) return;
    try {
      await axios.put(`${API_URL}/edit/${editingMember._id}`, editingMember);
      fetchBalances();
      setShowEditModal(false);
      setEditingMember(null);
    } catch (error) {
      console.error("Error updating member:", error);
      alert("Failed to update member.");
    }
  };

  const handleRemoveMember = async (id) => {
    if (window.confirm('Are you sure you want to remove this member?')) {
      try {
        await axios.delete(`${API_URL}/remove/${id}`);
        fetchBalances();
      } catch (error) {
        console.error("Error removing member:", error);
      }
    }
  };

  
  const handleResetMonthlyLeaves = async () => {
    if (window.confirm('Are you sure you want to add 1 leave to all junior employees? This should only be done once at the start of the month.')) {
      try {
        const res = await axios.post(`${API_URL}/reset-monthly`);
        alert(res.data.message);
        fetchBalances();
      } catch (error) {
        const msg = error.response ? error.response.data.message : "An error occurred.";
        console.error("Error resetting monthly leaves:", error);
        alert(`Error: ${msg}`);
      }
    }
  };

  const filteredBalances = balances.filter(balance =>
    balance.employeeId.toLowerCase().includes(searchTerm.toLowerCase()) ||
    balance.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="leave-balance-container">
      <div className="page-wrap">
        <div className="lb-toolbar">
          <h2 className="lb-title">Leave Balance Status</h2>
          <div>
            <button
              className="reset-leaves-btn"
              onClick={handleResetMonthlyLeaves}
              title="Adds 1 leave to every junior employee's balance."
            >
              Reset Monthly Leaves
            </button>
            <button className="add-member-btn" onClick={() => setShowAddModal(true)}>
              + Add Member
            </button>
          </div>
        </div>
        
        <div className="search-container">
          <input
            type="text"
            placeholder="Search by Employee ID or Name"
            className="search-input"
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="card">
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Employee ID</th>
                  <th>Name</th>
                  <th>Role</th>
                  <th>Casual Leaves</th>
                  <th>Sick Leaves</th>
                  <th>Privilege Leaves</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredBalances.map((b) => (
                  <tr key={b._id}>
                    <td>{b.employeeId}</td>
                    <td>{b.name}</td>
                    <td>{b.role}</td>
                    <td>{b.role === 'senior' ? b.casualLeaves : b.monthlyLeaveStatus}</td>
                    <td>{b.role === 'senior' ? b.sickLeaves : 'N/A'}</td>
                    <td>{b.role === 'senior' ? b.privilegeLeaves : 'N/A'}</td>
                    <td className="action-buttons">
                      <button className="edit-btn" onClick={() => openEditModal(b)}>Edit</button>
                      <button className="remove-btn" onClick={() => handleRemoveMember(b._id)}>Remove</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {showAddModal && (
        <div className="modal-backdrop">
          <div className="modal-content">
            <h3>Add New Member</h3>
            <form onSubmit={handleAddMember}>
              <input type="text" name="employeeId" placeholder="Employee ID (e.g., PS-0000)" value={formData.employeeId} onChange={handleAddFormChange} required />
              <input type="text" name="name" placeholder="Full Name" value={formData.name} onChange={handleAddFormChange} required />
              <select name="role" value={formData.role} onChange={handleAddFormChange}>
                <option value="junior">Junior</option>
                <option value="senior">Senior</option>
              </select>
              <div className="modal-actions">
                <button type="submit">Submit</button>
                <button type="button" onClick={() => setShowAddModal(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showEditModal && editingMember && (
        <div className="modal-backdrop">
          <div className="modal-content">
            <h3>Edit Member Details</h3>
            <form onSubmit={handleUpdateMember}>
              <label>Employee ID</label>
              <input type="text" name="employeeId" value={editingMember.employeeId} onChange={handleEditFormChange} required />
              
              <label>Full Name</label>
              <input type="text" name="name" value={editingMember.name} onChange={handleEditFormChange} required />

              <label>Role</label>
              <select name="role" value={editingMember.role} onChange={handleEditFormChange}>
                <option value="junior">Junior</option>
                <option value="senior">Senior</option>
              </select>

              {editingMember.role === 'senior' ? (
                <>
                  <label>Casual Leaves</label>
                  <input type="number" name="casualLeaves" value={editingMember.casualLeaves} onChange={handleEditFormChange} />
                  <label>Sick Leaves</label>
                  <input type="number" name="sickLeaves" value={editingMember.sickLeaves} onChange={handleEditFormChange} />
                  <label>Privilege Leaves</label>
                  <input type="number" name="privilegeLeaves" value={editingMember.privilegeLeaves} onChange={handleEditFormChange} />
                </>
              ) : (
                <>
                  <label>Monthly Leaves</label>
                  <input type="number" name="monthlyLeaveStatus" value={editingMember.monthlyLeaveStatus} onChange={handleEditFormChange} />
                </>
              )}
              
              <div className="modal-actions">
                <button type="submit">Save Changes</button>
                <button type="button" onClick={() => setShowEditModal(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default LeaveBalance;



