import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { FaArrowLeft } from "react-icons/fa";
import "./MonthlyLeaveSummary.css";

const MonthlyLeaveSummary = () => {
  const [employeeId, setEmployeeId] = useState("");
  const [groupedData, setGroupedData] = useState({});
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:5000";

  const fetchRecords = async () => {
    if (!employeeId.trim()) return;

    setLoading(true);

    try {
      const fullId = employeeId.startsWith("PS-")
        ? employeeId
        : `PS-${employeeId}`;

      const res = await axios.get(
        `${API_BASE}/api/attendance/${fullId}`
      );

      const leaveRecords = res.data.filter((r) => r.leaveType);

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
      alert("Employee not found");
      setGroupedData({});
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="summary-page-container">
      <div className="summary-content-card">

        {/* ✅ Back Button */}
        <button
          className="back-button"
          onClick={() => navigate(-1)}
        >
          <FaArrowLeft /> Back
        </button>

        <div className="summary-page-header">
          <h2>Monthly Leave History</h2>
          <p>Official record of all leaves taken by the employee</p>
        </div>

        <div className="summary-search-bar">
          <div className="id-input-wrapper">
            <span className="id-tag">PS-</span>
            <input
              type="text"
              placeholder="Enter ID (e.g. 0003)"
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              onKeyDown={(e) =>
                e.key === "Enter" && fetchRecords()
              }
            />
            <button
              onClick={fetchRecords}
              className="summary-fetch-btn"
            >
              {loading ? "..." : "Check Summary"}
            </button>
          </div>
        </div>

        {Object.keys(groupedData).length === 0 && !loading && (
          <div className="no-data-info">
            <p>
              Please enter a valid Staff ID to view leave records.
            </p>
          </div>
        )}

        {Object.keys(groupedData).map((month) => (
          <div key={month} className="month-record-block">
            <div className="month-accent-header">
              <h3>{month}</h3>
            </div>

            <div className="summary-table-wrapper">
              <table className="summary-data-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>NAME</th>
                    <th>DATE</th>
                    <th>LEAVE TYPE</th>
                  </tr>
                </thead>
                <tbody>
                  {groupedData[month].map((rec, index) => (
                    <tr key={index}>
                      <td className="id-text">{rec.id}</td>
                      <td className="name-text">{rec.name}</td>
                      <td className="date-text">
                        {new Date(rec.date).toLocaleDateString(
                          "en-GB"
                        )}
                      </td>
                      <td className="type-text">
                        {rec.halfDayReason
                          ? `${rec.leaveType} (${rec.halfDayReason})`
                          : rec.leaveType}
                      </td>
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