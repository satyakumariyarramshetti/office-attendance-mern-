import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import './MonthlyDetails.css';

const MonthlyDetails = () => {
  const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000';
  
  const [staff, setStaff] = useState([]);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const HOLIDAY_NAMES = [
  "Republic Day",
  "Independence Day",
  "Gandhi Jayanti",
  "Sankranti / Pongal",
  "Bakrid",
  "Christmas",
  "Dussehra"
];


  useEffect(() => {
    const fetchInitialData = async () => {
      setLoading(true);
      try {
        const [staffRes, attendanceRes] = await Promise.all([
          // CORRECTED this line to use '/api/staff' (singular)
          fetch(`${API_BASE}/api/staffs`), 
          fetch(`${API_BASE}/api/attendance/all`)
        ]);

        if (!staffRes.ok || !attendanceRes.ok) {
          throw new Error('Failed to fetch initial data.');
        }

        const staffData = await staffRes.json();
        const attendanceData = await attendanceRes.json();

        setStaff(staffData);
        setRecords(attendanceData);
        
      } catch (err) {
        setError('Failed to load data. Please check the connection to the server.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchInitialData();
  }, [API_BASE]);

  const handleDateChange = (event) => {
    setSelectedDate(new Date(event.target.value + 'T00:00:00'));
  };

  const getDaysInMonth = (year, month) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const processMonthlyData = () => {
    const year = selectedDate.getFullYear();
    const month = selectedDate.getMonth();

    const monthlyRecords = records.filter(record => {
      const recordDate = new Date(record.date);
      return recordDate.getFullYear() === year && recordDate.getMonth() === month;
    });

    const attendanceMap = monthlyRecords.reduce((acc, record) => {
      if (!acc[record.id]) {
        acc[record.id] = { workingDays: 0, leaves: 0 };
      }

      const isHoliday = record.holidayName || (record.leaveType && HOLIDAY_NAMES.includes(record.leaveType));

if (isHoliday) {
  // skip counting this day as leave or working day
  return acc;
}

      if (record.leaveType && (record.leaveType.includes('First Half Leave') || record.leaveType.includes('Second Half Leave'))) {
  acc[record.id].workingDays += 0.5;
  acc[record.id].leaves += 0.5;
} else if (record.leaveType) {
        acc[record.id].leaves += 1;
      } else if (record.inTime && record.outTime) {
        acc[record.id].workingDays += 1;
      }
      
      return acc;
    }, {});

    const fullReport = staff.map(employee => {
      const employeeAttendance = attendanceMap[employee.id];
      return {
        employee_id: employee.id,
        employee_name: employee.name,
        no_of_days: getDaysInMonth(year, month),
        no_of_working_days: employeeAttendance ? employeeAttendance.workingDays : 0,
        no_of_leaves: employeeAttendance ? employeeAttendance.leaves : 0,
      };
    });

    return fullReport.sort((a, b) => a.employee_id.localeCompare(b.employee_id));
  };
  
  const monthlyReport = processMonthlyData();

  const handleExport = () => {
    const monthName = selectedDate.toLocaleString('default', { month: 'long' });
    const year = selectedDate.getFullYear();
    const fileName = `Monthly_Report_${monthName}_${year}.xlsx`;

    const dataForExport = monthlyReport.map(report => ({
        "Employee ID": report.employee_id,
        "Employee Name": report.employee_name,
        "Days in Month": report.no_of_days,
        "Working Days": report.no_of_working_days,
        "Leaves": report.no_of_leaves,
    }));

    const ws = XLSX.utils.json_to_sheet(dataForExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Monthly Report");
    XLSX.writeFile(wb, fileName);
  };

  return (
    // The outer container still handles overall padding
    <div className="monthly-details-container">
      {/* 1. ADD a 'page-wrap' div to center the content */}
      <div className="page-wrap">
        <h2 className="admin-title">Monthly Details</h2>
        
        <div className="toolbar-container">
          <div className="month-picker-container">
            <label htmlFor="month-select">Select Month: </label>
            <input 
              type="month" 
              id="month-select"
              value={selectedDate.toISOString().slice(0, 7)}
              onChange={handleDateChange}
            />
          </div>
          <button onClick={handleExport} className="export-button" disabled={loading || monthlyReport.length === 0}>
            Export as Excel
          </button>
        </div>

        {loading && <p>Loading data...</p>}
        {error && <p className="text-danger">{error}</p>}
        
        {!loading && !error && (
          // 2. ADD a 'card' div to wrap the table and give it the card style
          <div className="card">
            <div className="table-responsive">
              <table className="table table-bordered admin-table">
                <thead>
                  <tr>
                    <th>Employee ID</th>
                    <th>Employee Name</th>
                    <th>Days in Month</th>
                    <th>Working Days</th>
                    <th>Leaves</th>
                  </tr>
                </thead>
                <tbody>
                  {monthlyReport.length > 0 ? (
                    monthlyReport.map(report => (
                      <tr key={report.employee_id}>
                        <td>{report.employee_id}</td>
                        <td>{report.employee_name}</td>
                        <td>{report.no_of_days}</td>
                        <td>{report.no_of_working_days}</td>
                        <td>{report.no_of_leaves}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="5">No staff members found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MonthlyDetails;