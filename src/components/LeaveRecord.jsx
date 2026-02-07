import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './LeaveRecord.css';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

const LeaveRecord = () => {
  const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:5000";
  const [leaveRecords, setLeaveRecords] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const isAuthenticated = localStorage.getItem('adminToken');
    if (!isAuthenticated) {
      navigate('/admin-login');
    }

    setLoading(true);
    fetch(`${API_BASE}/api/attendance/all`)
      .then(res => res.json())
      .then(data => {
        const filteredLeaves = data.filter(record => !!record.leaveType);
        setLeaveRecords(filteredLeaves);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to fetch attendance data:', err);
        setError('Failed to load leave data.');
        setLoading(false);
      });
  }, [navigate, API_BASE]);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    if (isNaN(date)) return '';
    return date.toLocaleDateString('en-GB');
  };

  const groupedByMonth = leaveRecords.reduce((acc, record) => {
    const month = new Date(record.date).toLocaleString('default', { month: 'long', year: 'numeric' });
    if (!acc[month]) acc[month] = [];
    acc[month].push(record);
    return acc;
  }, {});

  const normalizedSearch = searchTerm.trim().toLowerCase();
  const filteredData = Object.keys(groupedByMonth)
    .map(month => {
      const filteredRecords = groupedByMonth[month].filter(record => {
        const leaveTypeStr = (record.leaveType || '').toLowerCase();
        return (
          record.id.toLowerCase().includes(normalizedSearch) ||
          (record.name || '').toLowerCase().includes(normalizedSearch) ||
          formatDate(record.date).includes(normalizedSearch) ||
          leaveTypeStr.includes(normalizedSearch)
        );
      });
      return { month, records: filteredRecords };
    })
    .filter(group => group.records.length > 0);

  // Export function
  const exportToExcel = (month, records) => {
    // Prepare worksheet data
    const wsData = records.map(r => ({
      ID: r.id,
      Name: r.name,
      Date: formatDate(r.date),
      'Leave Type': r.leaveType
    }));

    // Create worksheet and workbook
    const worksheet = XLSX.utils.json_to_sheet(wsData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, month);

    // Generate buffer
    const wbout = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    // Save file
    saveAs(new Blob([wbout], { type: 'application/octet-stream' }), `${month}-leave-records.xlsx`);
  };

  return (
    <div className="leave-record-container">
      <div className="page-wrap">
        <h2 className="leave-record-title">Leave Records</h2>

        <input
          type="text"
          className="form-control leave-record-search"
          placeholder="Search by ID, Name, Date, or Leave Type"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
        />

        {loading && <p>Loading data...</p>}
        {error && <p className="text-danger">{error}</p>}

        {!loading && !error && (
          <div className="card">
            {filteredData.length === 0 ? (
              <p className="no-records-message">No leave records found matching your search.</p>
            ) : (
              filteredData.map(({ month, records }) => (
                <div key={month} className="month-group">
                  <div className="month-header" style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                    <span>{month}</span>
                    <button onClick={() => exportToExcel(month, records)}>Export to Excel</button>
                  </div>
                  <div className="table-responsive">
                    <table className="leave-record-table">
                      <thead>
                        <tr>
                          <th>ID</th>
                          <th>Name</th>
                          <th>Date</th>
                          <th>Leave Type</th>
                        </tr>
                      </thead>
                      <tbody>
                        {records.map(record => (
                          <tr key={`${record.id}-${record.date}`}>
                            <td data-label="ID">{record.id}</td>
                            <td data-label="Name">{record.name}</td>
                            <td data-label="Date">{formatDate(record.date)}</td>
                            <td data-label="Leave Type">{record.leaveType}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default LeaveRecord;

