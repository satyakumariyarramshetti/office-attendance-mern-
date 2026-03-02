import React, { useState } from "react";
import axios from "axios";
import "./LeaveBalanceOverview.css";

const LeaveBalanceOverview = () => {
  const [employeeId, setEmployeeId] = useState("");
  const [balance, setBalance] = useState(null);
  const [error, setError] = useState("");

  const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:5000";

  const handleSearch = async () => {
    if (!employeeId.trim()) return;

    try {
      setError("");
      setBalance(null);

      // 👇 Automatically attach PS-
      const fullEmployeeId = `PS-${employeeId}`;

      const res = await axios.get(
        `${API_BASE}/api/leave-balance/employee/${fullEmployeeId}`
      );

      setBalance(res.data);
    } catch (err) {
      setError("Employee not found");
    }
  };

  // 👇 Enter key support
  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  return (
    <div className="balance-wrapper">
      <div className="balance-card">
        <h2 className="balance-title">Leave Balance Overview</h2>

        <div className="search-section">
          <div className="prefix-box">PS-</div>
          <input
            type="text"
            placeholder="Enter ID (e.g. 0003)"
            value={employeeId}
            onChange={(e) => setEmployeeId(e.target.value)}
            onKeyDown={handleKeyPress}
          />
          <button onClick={handleSearch}>Check</button>
        </div>

        {error && <p className="error-text">{error}</p>}

        {balance && (
          <div className="balance-grid">
            <h3 className="employee-name">{balance.name}</h3>

            <div className="leave-card">
              <span>Casual</span>
              <h4>{balance.casualLeaves}</h4>
            </div>

            <div className="leave-card">
              <span>Sick</span>
              <h4>{balance.sickLeaves}</h4>
            </div>

            <div className="leave-card">
              <span>Privilege</span>
              <h4>{balance.privilegeLeaves}</h4>
            </div>

            <div className="leave-card">
              <span>LOP</span>
              <h4>{balance.lopLeaves}</h4>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LeaveBalanceOverview;