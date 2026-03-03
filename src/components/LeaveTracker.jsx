import React from "react";
import { useNavigate } from "react-router-dom";
import "./LeaveTracker.css";
import { FaBalanceScale, FaHistory, FaArrowLeft } from "react-icons/fa";

const LeaveTracker = () => {
  const navigate = useNavigate();

  return (
    <div className="leave-tracker-wrapper">
      <div className="leave-tracker-card">

        {/* Back Button */}
        <button 
          className="back-button"
          onClick={() => navigate(-1)}
        >
          <FaArrowLeft /> Back
        </button>

        <h2 className="leave-tracker-title">Your Leave Tracker</h2>

        <div className="leave-tracker-buttons">

          <div 
            className="tracker-button-card"
            onClick={() => navigate("/leave-balance-overview")}
          >
            <FaBalanceScale className="tracker-icon" />
            <h5>Leave Balance Overview</h5>
            <p>Check your available leave balances</p>
          </div>

          <div 
            className="tracker-button-card"
            onClick={() => navigate("/monthly-leave-summary")}
          >
            <FaHistory className="tracker-icon" />
            <h5>Your Leave Record</h5>
            <p>View your previous leave history</p>
          </div>

        </div>
      </div>
    </div>
  );
};

export default LeaveTracker;