import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { FaArrowLeft, FaSearch, FaRegCalendarAlt } from "react-icons/fa";
import "./MonthlyLeaveSummary.css";

const MonthlyLeaveSummary = () => {
  const [idCode, setIdCode] = useState("");
  const [groupedData, setGroupedData] = useState({});
  const [loading, setLoading] = useState(false);
  const [staffInfo, setStaffInfo] = useState(null);
  
  const navigate = useNavigate();
  const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:5000";

  const fetchRecords = async () => {
    if (!idCode.trim()) return;
    setLoading(true);

    try {
      const res = await axios.post(`${API_BASE}/api/attendance/my-attendance`, {
        identification: idCode
      });

      const leaveRecords = res.data.records.filter((r) => r.leaveType);
      setStaffInfo({ name: res.data.staffName, id: res.data.staffId });

      const grouped = {};
      leaveRecords.forEach((rec) => {
        const dateObj = new Date(rec.date);
        const month = dateObj.toLocaleString("en-US", { month: "long" });
        const year = dateObj.getFullYear();
        const key = `${month} ${year}`;
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(rec);
      });

      setGroupedData(grouped);
    } catch (err) {
      alert("Invalid Identification Code");
      setGroupedData({});
      setStaffInfo(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="summary-page-container">
      <div className="summary-content-card">
        <div className="top-nav">
          <button className="back-link" onClick={() => navigate(-1)}>
            <FaArrowLeft /> Back
          </button>
        </div>

        <div className="summary-page-header">
          <div className="icon-circle">
            <FaRegCalendarAlt />
          </div>
          <h2>Monthly Leave History</h2>
          <p>Secure access to your official leave records</p>
        </div>

        <div className="summary-search-section">
          <div className="modern-search-box">
            <input
              type="password"
              placeholder="Enter Identification Code"
              value={idCode}
              onChange={(e) => setIdCode(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && fetchRecords()}
            />
            <button onClick={fetchRecords} className="modern-search-btn">
              {loading ? <div className="spinner"></div> : <><FaSearch /> Check Summary</>}
            </button>
          </div>
        </div>

        {staffInfo && (
          <div className="staff-welcome-note">
            Showing records for: <strong>{staffInfo.name} ({staffInfo.id})</strong>
          </div>
        )}

        {Object.keys(groupedData).length === 0 && !loading && (
          <div className="empty-state">
            <img src="https://cdn-icons-png.flaticon.com/512/7486/7486744.png" alt="search" />
            <p>Please enter your Identification Code to view leave history.</p>
          </div>
        )}

        {Object.keys(groupedData).map((month) => (
          <div key={month} className="month-section">
            <div className="month-title-bar">
              <h3>{month}</h3>
              <span className="leave-count">{groupedData[month].length} Leaves</span>
            </div>

            <div className="modern-table-container">
              <table className="modern-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Day</th>
                    <th>Leave Type</th>
                    <th>Details</th>
                  </tr>
                </thead>
                <tbody>
                  {groupedData[month].map((rec, index) => (
                    <tr key={index}>
                      <td className="date-cell">{new Date(rec.date).toLocaleDateString("en-GB")}</td>
                      <td>{rec.day}</td>
                      <td>
                        <span className={`leave-badge ${rec.leaveType.replace(/\s+/g, '-').toLowerCase()}`}>
                          {rec.leaveType}
                        </span>
                      </td>
                      <td className="detail-cell">{rec.halfDayReason || "Full Day"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MonthlyLeaveSummary;