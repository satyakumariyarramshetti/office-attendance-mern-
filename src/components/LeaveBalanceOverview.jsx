import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { FaArrowLeft } from "react-icons/fa";
import "./LeaveBalanceOverview.css";

const LeaveBalanceOverview = () => {
  const [idCode, setIdCode] = useState(""); // Changed name to idCode
  const [balance, setBalance] = useState(null);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:5000";

  const handleSearch = async () => {
    if (!idCode.trim()) return;

    try {
      setError("");
      setBalance(null);

      // GET కి బదులు POST ఉపయోగిస్తున్నాం
      const res = await axios.post(`${API_BASE}/api/leave-balance/my-leave-balance`, {
        identification: idCode
      });

      setBalance(res.data);
    } catch (err) {
      setError(err.response?.data?.message || "Employee not found");
    }
  };

  return (
    <div className="balance-wrapper">
      <div className="balance-card">
        <button className="back-button" onClick={() => navigate(-1)}><FaArrowLeft /> Back</button>
        <h2 className="balance-title">Leave Balance Overview</h2>

        <div className="search-section">
          {/* PS- బాక్స్ తీసేశాను, ఎందుకంటే ఇది పాస్‌వర్డ్ లాంటిది */}
          <input
            type="password" // Password style
            placeholder="Enter Identification Code"
            value={idCode}
            onChange={(e) => setIdCode(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            style={{ borderRadius: '8px', flex: 1 }}
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