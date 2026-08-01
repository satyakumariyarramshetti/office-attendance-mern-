

import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import './MonthlyDetails.css';

// ▼▼▼▼▼ NEW: Helper function for the LOP calculation logic ▼▼▼▼▼
const calculateLateMarkLOP = (lateMarks) => {
  // The first 5 late marks are free
  if (lateMarks <= 5) {
    return 0;
  }
  
  // Calculate how many late marks are above the free limit
  const excessLateMarks = lateMarks - 5;
  
  // For every group of 3 excess marks, apply 0.5 LOP.
  // Math.ceil rounds up to the nearest whole number (e.g., 1/3=0.33 -> 1, 4/3=1.33 -> 2)
  const lopDays = Math.ceil(excessLateMarks / 3) * 0.5;
  
  return lopDays;
};


const MonthlyDetails = () => {
  const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000';
  
  const [staff, setStaff] = useState([]);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  
  const HOLIDAY_NAMES = [
    "Republic Day", "Independence Day", "Gandhi Jayanti", "Sankranti / Pongal",
    "Bakrid", "Christmas", "Dussehra"
  ];

  useEffect(() => {
    const fetchInitialData = async () => {
      setLoading(true);
      try {
        const [staffRes, attendanceRes] = await Promise.all([
          fetch(`${API_BASE}/api/staffs`), 
          fetch(`${API_BASE}/api/attendance/all`)
        ]);

        if (!staffRes.ok || !attendanceRes.ok) throw new Error('Failed to fetch initial data.');

        const staffData = await staffRes.json();
        const attendanceData = await attendanceRes.json();

        setStaff(staffData);
        setRecords(attendanceData);
        
      } catch (err) {
        setError('Failed to load data. Please check the server connection.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchInitialData();
  }, [API_BASE]);

 const handleDateChange = (event) => {
  const [year, month] = event.target.value.split('-');
  setSelectedDate(new Date(year, month - 1, 1));
};

  const getDaysInMonth = (year, month) => {
    return new Date(year, month + 1, 0).getDate();
  };

const processMonthlyData = () => {
  const year = selectedDate.getFullYear();
  const month = selectedDate.getMonth();

  // ప్రస్తుత వ్యూ లో ఉన్న నెల/సంవత్సరం విలువ (పోలిక కోసం)
  const currentViewValue = year * 12 + month;

  const monthlyRecords = records.filter(record => {
    const recordDate = new Date(record.date);
    return recordDate.getFullYear() === year && recordDate.getMonth() === month;
  });

  const attendanceMap = monthlyRecords.reduce((acc, record) => {
    if (!acc[record.id]) {
      acc[record.id] = { workingDays: 0, leaves: 0, lateMarksCount: 0 };
    }
    if (record.delayReason === 'Late Mark') {
      acc[record.id].lateMarksCount += 1;
    }
    const isHoliday = record.holidayName || (record.leaveType && HOLIDAY_NAMES.includes(record.leaveType));
    if (isHoliday) return acc;

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

  // ▼▼▼ ఇక్కడ మార్పు చేయబడింది: filter ని యాడ్ చేశాము ▼▼▼
  const fullReport = staff
    .filter(employee => {
      // ఒకవేళ ఎంప్లాయీ Active అయితే రిపోర్ట్‌లో చూపించు
      if (employee.status !== "Inactive employee") return true;

      // ఒకవేళ Inactive అయితే, వారి Exit Date ని చెక్ చేయాలి
      if (!employee.inactivationDate) return true; 

      const exitDate = new Date(employee.inactivationDate);
      const exitValue = exitDate.getFullYear() * 12 + exitDate.getMonth();

      // మీరు చూస్తున్న నెల, వారు వెళ్ళిపోయిన నెల కంటే తక్కువ లేదా సమానంగా ఉంటేనే చూపించు
      // ఉదాహరణకు: జూన్ లో వెళ్ళిపోతే, జూలై రిపోర్ట్ లో వారు కనిపించరు.
      return currentViewValue <= exitValue;
    })
    .map(employee => {
      const employeeAttendance = attendanceMap[employee.id];
      const lateMarks = employeeAttendance ? employeeAttendance.lateMarksCount : 0;
      const lopFromLateMarks = calculateLateMarkLOP(lateMarks);

      return {
        employee_id: employee.id,
        employee_name: employee.name,
        no_of_days: getDaysInMonth(year, month),
        no_of_working_days: employeeAttendance ? employeeAttendance.workingDays : 0,
        no_of_leaves: employeeAttendance ? employeeAttendance.leaves : 0,
        monthly_late_marks: lateMarks,
        late_marks_lop: lopFromLateMarks,
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
        "Monthly Late Marks Count": report.monthly_late_marks,
        // ▼▼▼▼▼ NEW: Add the LOP column to the Excel export ▼▼▼▼▼
        "Late Marks LOP": report.late_marks_lop,
    }));

    const ws = XLSX.utils.json_to_sheet(dataForExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Monthly Report");
    XLSX.writeFile(wb, fileName);
  };

  return (
    <div className="monthly-details-container">
      <div className="page-wrap">
        <h2 className="admin-title">Monthly Details</h2>
        
        <div className="toolbar-container">
          <div className="month-picker-container">
            <label htmlFor="month-select">Select Month: </label>
         
<input 
  type="month" 
  id="month-select"
  value={`${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}`}
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
                    <th>Monthly Late Marks</th>
                    {/* ▼▼▼▼▼ NEW: Add the new table header for LOP ▼▼▼▼▼ */}
                    <th>Late Marks LOP</th>
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
                        <td>{report.monthly_late_marks}</td>
                        {/* ▼▼▼▼▼ NEW: Display the calculated LOP data ▼▼▼▼▼ */}
                        <td>{report.late_marks_lop}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      {/* ▼▼▼▼▼ NEW: Adjust colspan for the new column ▼▼▼▼▼ */}
                      <td colSpan="7">No staff members found.</td>
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