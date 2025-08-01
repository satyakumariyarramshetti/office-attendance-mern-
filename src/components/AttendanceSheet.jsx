import React, { useEffect, useState } from 'react';
import './AttendanceSheet.css';
import { useNavigate } from 'react-router-dom';
// 1️⃣ Import XLSX if you want Excel export
import * as XLSX from "xlsx";   // <-- add this line

const AttendanceSheet = () => {
  const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:5000/api";
  const [records, setRecords] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const isAuthenticated = localStorage.getItem('adminToken');
    if (!isAuthenticated) {
      navigate('/admin-login');
    }
  }, [navigate]);

  useEffect(() => {
    setLoading(true);
    setError(null);

    fetch(`${API_BASE}/attendance/all`)
      .then(res => res.json())
      .then(data => {
        setRecords(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to fetch', err);
        setError('Failed to load attendance data');
        setLoading(false);
      });
  }, []);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    if (isNaN(date)) return '';
    return date.toLocaleDateString();
  };

  const groupedRecords = records.reduce((acc, record) => {
    if (!acc[record.id]) {
      acc[record.id] = [];
    }
    acc[record.id].push(record);
    return acc;
  }, {});

  const normalizedSearch = searchTerm.trim().toLowerCase();

  function normalizedDateString(dateVal) {
    if (!dateVal) return '';
    const d = new Date(dateVal);
    if (isNaN(d)) return '';
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  }

  const filteredGroupedRecords = Object.entries(groupedRecords).filter(
    ([id, entries]) => {
      const lowerId = id.toLowerCase();

      if (lowerId.includes(normalizedSearch)) return true;
      if (
        normalizedSearch.length === 3 &&
        lowerId.slice(-3) === normalizedSearch
      ) return true;

      return entries.some(entry => {
        const nameMatch =
          entry.name && entry.name.toLowerCase().includes(normalizedSearch);
        const dbDateNorm = normalizedDateString(entry.date);
        const rawDateStr = entry.date ? entry.date.toString().toLowerCase() : '';
        const searchLower = normalizedSearch;
        const normalizedSearchIsDate =
          Boolean(new Date(searchTerm)) && !isNaN(new Date(searchTerm));
        let dateMatch = false;
        if (normalizedSearchIsDate) {
          const searchNormDate = normalizedDateString(searchTerm);
          dateMatch =
            dbDateNorm.includes(searchNormDate) || searchNormDate.includes(dbDateNorm);
        } else {
          dateMatch = dbDateNorm.includes(searchLower) || rawDateStr.includes(searchLower);
        }
        return nameMatch || dateMatch;
      });
    }
  );

  // 2️⃣ COLLECT displayed (filtered) rows in flat array (for export)
  const displayedRows = [];
  filteredGroupedRecords.forEach(([id, records]) => {
    // Use your filtering logic as in table
    records.forEach(record => {
      const nameMatch = record.name && record.name.toLowerCase().includes(normalizedSearch);
      const dbDateNorm = normalizedDateString(record.date);
      const rawDateStr = record.date ? record.date.toString().toLowerCase() : '';
      const searchLower = normalizedSearch;
      const normalizedSearchIsDate =
        Boolean(new Date(searchTerm)) && !isNaN(new Date(searchTerm));
      let dateMatch = false;
      if (normalizedSearchIsDate) {
        const searchNormDate = normalizedDateString(searchTerm);
        dateMatch = dbDateNorm.includes(searchNormDate) || searchNormDate.includes(dbDateNorm);
      } else {
        dateMatch = dbDateNorm.includes(searchLower) || rawDateStr.includes(searchLower);
      }
      if (nameMatch || dateMatch || id.toLowerCase().includes(normalizedSearch)) {
        displayedRows.push(record);
      }
    });
  });

  // 3️⃣ CSV EXPORT FUNCTION
  function exportToCSV() {
    if (!displayedRows.length) return;
    const headers = [
      "ID", "Name", "Date", "Day", "In Time", "Lunch Out", "Lunch In", "Out Time", "Leave Type"
    ];
    const csvRows = [headers.join(",")];
    for (const record of displayedRows) {
      const row = [
        record.id ?? '',
        record.name ?? '',
        formatDate(record.date),
        record.day ?? '',
        record.inTime ?? '',
        record.lunchOut ?? '',
        record.lunchIn ?? '',
        record.outTime ?? '',
        record.leaveType ?? ''
      ].map(field => `"${field}"`);
      csvRows.push(row.join(','));
    }
    const csvString = csvRows.join("\n");
    const blob = new Blob([csvString], { type: "text/csv" });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = "attendance.csv";
    a.click();
  }

  // 4️⃣ EXCEL EXPORT FUNCTION
  function exportToExcel() {
    if (!displayedRows.length) return;
    const exportArray = displayedRows.map(record => ({
      ID: record.id,
      Name: record.name,
      Date: formatDate(record.date),
      Day: record.day,
      "In Time": record.inTime,
      "Lunch Out": record.lunchOut,
      "Lunch In": record.lunchIn,
      "Out Time": record.outTime,
      "Leave Type": record.leaveType,
    }));
    const ws = XLSX.utils.json_to_sheet(exportArray);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Attendance");
    XLSX.writeFile(wb, "attendance.xlsx");
  }

  // ------ RENDER BELOW -------
  return (
    <div className="container admin-container mt-4">
      <h2 className="admin-title">Attendance Sheet</h2>

      <input
        type="text"
        className="form-control mb-3"
        placeholder="Search by ID, Name, or Date (e.g. 30/07/2025)"
        aria-label="Search attendance by employee ID, name, or date"
        value={searchTerm}
        onChange={e => setSearchTerm(e.target.value)}
      />

      {loading && <p>Loading attendance data...</p>}
      {error && <p className="text-danger">{error}</p>}

      {!loading && !error && (
        <>
          <div className="table-responsive scrollable-table">
            <table className="table table-bordered admin-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Name</th>
                  <th>Date</th>
                  <th>Day</th>
                  <th>In Time</th>
                  <th>Lunch Out</th>
                  <th>Lunch In</th>
                  <th>Out Time</th>
                  <th>Leave Type</th>
                </tr>
              </thead>
              <tbody>
                {filteredGroupedRecords.map(([id, records]) => {
                  const filteredRecords = records.filter(record => {
                    const nameMatch = record.name && record.name.toLowerCase().includes(normalizedSearch);
                    const dbDateNorm = normalizedDateString(record.date);
                    const rawDateStr = record.date ? record.date.toString().toLowerCase() : '';
                    const searchLower = normalizedSearch;
                    const normalizedSearchIsDate =
                      Boolean(new Date(searchTerm)) && !isNaN(new Date(searchTerm));
                    let dateMatch = false;
                    if (normalizedSearchIsDate) {
                      const searchNormDate = normalizedDateString(searchTerm);
                      dateMatch = dbDateNorm.includes(searchNormDate) || searchNormDate.includes(dbDateNorm);
                    } else {
                      dateMatch = dbDateNorm.includes(searchLower) || rawDateStr.includes(searchLower);
                    }
                    return nameMatch || dateMatch || id.toLowerCase().includes(normalizedSearch);
                  });

                  return filteredRecords.map((record, idx) => (
                    <tr key={`${id}-${idx}`}>
                      <td data-label="ID">{record.id}</td>
                      <td data-label="Name">{record.name}</td>
                      <td data-label="Date">{formatDate(record.date)}</td>
                      <td data-label="Day">{record.day}</td>
                      <td data-label="In Time">{record.inTime}</td>
                      <td data-label="Lunch Out">{record.lunchOut}</td>
                      <td data-label="Lunch In">{record.lunchIn}</td>
                      <td data-label="Out Time">{record.outTime}</td>
                      <td data-label="Leave Type">{record.leaveType}</td>
                    </tr>
                  ));
                })}
              </tbody>
            </table>
          </div>
          {/* 5️⃣ EXPORT BUTTONS BELOW TABLE */}
          <div className="export-btn-group" style={{ marginTop: 22, marginBottom: 30, textAlign: 'right' }}>
            <button className="btn btn-outline-success me-2" onClick={exportToCSV}>
              Export to CSV
            </button>
            <button className="btn btn-outline-primary" onClick={exportToExcel}>
              Export to Excel
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default AttendanceSheet;
