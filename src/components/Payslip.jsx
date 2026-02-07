import React, { useRef, useState, useEffect } from "react";
import styles from "./Payslip.module.css";
import html2pdf from "html2pdf.js";
import * as XLSX from 'xlsx';
import JSZip from 'jszip';

const SwappableField = React.memo(({ name, value, onChange, ...props }) => {
  return (
    <>
      <input className={styles.editInput} name={name} value={value} onChange={onChange} {...props} />
      <span className={styles.exportText}>{value}</span>
    </>
  );
});

// Initial state for a clean payslip
const initialPayslipState = {
  basicSalary: "",
  hraAmount: "",
  conveyanceAmount: "",
  telephoneAmount: "300",
  educationAmount: "200",
  specialAllowanceAmount: "",
  medicalAmount: "1250",
  pfEEAmount: "",
  pfERAmount: "",
  gratuityAmount: "",
  monthlyTotal: "",
  monthlyEarnings: "",
  profTaxDeduction: "200.00",
  netSalary: ""
  
};

// Helper function to determine Provident Fund amounts (12% or fixed 1800)
const calculatePf = (basic) => {
  if (basic > 15000) {
    return { pfEEAmount: "1800.00", pfERAmount: "1800.00" };
  }
  const pfValue = (basic * 0.12).toFixed(2);
  return { pfEEAmount: pfValue, pfERAmount: pfValue };
};

// Method 1 - EXACT FORMULAS as specified
// getMethod1Data function same as previous (formulas perfect)
const getMethod1Data = (calculatedBasic) => {
  const data = { ...initialPayslipState };
  
  // Fixed values
  data.basicSalary = calculatedBasic.toFixed(2);
  data.telephoneAmount = "300";
  data.educationAmount = "200";
  data.medicalAmount = "1250";
  data.profTaxDeduction = "200.00";
  
  // Formula calculations
  data.hraAmount = (calculatedBasic * 0.40).toFixed(2);
  data.conveyanceAmount = (calculatedBasic * 0.05).toFixed(2);
  const pfAmounts = calculatePf(calculatedBasic);
  data.pfEEAmount = pfAmounts.pfEEAmount;
  data.pfERAmount = pfAmounts.pfERAmount;
  data.gratuityAmount = (calculatedBasic * 0.0465).toFixed(2);
  
  // Special Allowance formula
  const specialAllowanceCalc = 
    calculatedBasic - (
      parseFloat(data.hraAmount) + parseFloat(data.conveyanceAmount) + 
      parseFloat(data.telephoneAmount) + parseFloat(data.educationAmount) + 
      parseFloat(data.medicalAmount) + parseFloat(data.pfEEAmount) + 
      parseFloat(data.pfERAmount) + parseFloat(data.gratuityAmount)
    );
  data.specialAllowanceAmount = Math.max(0, specialAllowanceCalc).toFixed(2);
  
  // Monthly Total
  const monthlyTotal = 
    parseFloat(data.basicSalary) + parseFloat(data.hraAmount) + parseFloat(data.conveyanceAmount) +
    parseFloat(data.telephoneAmount) + parseFloat(data.educationAmount) + parseFloat(data.specialAllowanceAmount) +
    parseFloat(data.medicalAmount) + parseFloat(data.pfERAmount) + parseFloat(data.pfEEAmount) + parseFloat(data.gratuityAmount);
  data.monthlyTotal = monthlyTotal.toFixed(2);
  
  // Monthly Earnings
  data.monthlyEarnings = (monthlyTotal - parseFloat(data.pfEEAmount)).toFixed(2);
  
  // Net Salary
  data.netSalary = (parseFloat(data.monthlyEarnings) - parseFloat(data.pfERAmount) - 200).toFixed(2);
  
  return data;
};

function Payslip() {
  const pdfRef = useRef();
  const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:5000";

  const [formData, setFormData] = useState({
    empId: "", empName: "", designation: "", email: "",
    year: "2025", month: "May", day: "31",
  });

  const [payslipData, setPayslipData] = useState(initialPayslipState);
  const [monthlyDetails, setMonthlyDetails] = useState({
    basicSalaryAmount: "", noOfDays: "", noOfWorkingDays: "", noOfLeaves: "", noOfPayDays: "",
  });

  const [pdfCount, setPdfCount] = useState(0);
  const [emailCount, setEmailCount] = useState(0);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  
  const [allEmployees, setAllEmployees] = useState([]);
  const [currentEmployeeIndex, setCurrentEmployeeIndex] = useState(-1);
  const [excelData, setExcelData] = useState([]);

  useEffect(() => {
    const fetchAllEmployees = async () => {
      try {
        const response = await fetch(`${API_BASE}/api/staffs/getAll`);
        if (response.ok) {
          const data = await response.json();
          setAllEmployees(data);
        }
      } catch (error) {
        console.error("Failed to fetch employees:", error);
      }
    };
    fetchAllEmployees();
  }, [API_BASE]);

  useEffect(() => {
    const savedPdfCount = localStorage.getItem('pdfExportCount') || 0;
    const savedEmailCount = localStorage.getItem('emailExportCount') || 0;
    setPdfCount(parseInt(savedPdfCount, 10));
    setEmailCount(parseInt(savedEmailCount, 10));
  }, []);

 

  const updateEmployeeData = (employee) => {
    setFormData({
      empId: (employee.id || '').toString().replace('PS-', '').trim(),
      empName: employee.name,
      designation: employee.designation,
      email: employee.email,
      year: "2025",
      month: "May",
      day: "31",
    });
  };

  const handlePrevious = () => {
    if (allEmployees.length > 0) {
      const newIndex = (currentEmployeeIndex - 1 + allEmployees.length) % allEmployees.length;
      setCurrentEmployeeIndex(newIndex);
      updateEmployeeData(allEmployees[newIndex]);
    }
  };

  const handleNext = () => {
    if (allEmployees.length > 0) {
      const newIndex = (currentEmployeeIndex + 1) % allEmployees.length;
      setCurrentEmployeeIndex(newIndex);
      updateEmployeeData(allEmployees[newIndex]);
    }
  };

  const handleMonthlyDetailsChange = (e) => {
    const { name, value } = e.target;
    setMonthlyDetails({ ...monthlyDetails, [name]: value });
  };

  const calculateProratedBasic = () => {
    const { basicSalaryAmount, noOfDays, noOfPayDays } = monthlyDetails;
    if (!basicSalaryAmount || !noOfDays || !noOfPayDays) {
      alert("Please fill in Basic Salary Amount, No. of Days, and No. of Pay Days in Monthly Details.");
      return null;
    }
    return (parseFloat(basicSalaryAmount) * (parseFloat(noOfPayDays) / parseFloat(noOfDays)));
  };

  const handleMethod1 = () => {
    const calculatedBasic = calculateProratedBasic();
    if (calculatedBasic === null) return;
    setPayslipData(getMethod1Data(calculatedBasic));
  };

  const handleChange = async (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });

    if (name === "empId" && value.length >= 4) {
      try {
        const response = await fetch(`${API_BASE}/api/staffs/getById`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: `PS-${value}` }),
        });
        const data = await response.json();
        if (response.ok && data) {
          setFormData((prev) => ({ 
            ...prev, 
            empName: data.name, 
            designation: data.designation, 
            email: data.email 
          }));
          const employeeIndex = allEmployees.findIndex(emp => emp.id === `PS-${value}`);
          setCurrentEmployeeIndex(employeeIndex);
        }
      } catch (error) { 
        console.error("Fetch failed:", error); 
      }
    }
  };

  const handlePayslipChange = (e) => {
    const { name, value } = e.target;
    setPayslipData({ ...payslipData, [name]: value });
  };

  const performExport = async (outputAction, employeeName, month) => {
    const element = pdfRef.current;
    if (!element) return;
    element.classList.add(styles.exportView);
   const opt = {
  margin: 0,
  filename: `${employeeName || "Payslip"}_${month || "Month"}.pdf`,
  image: { type: "jpeg", quality: 1.0 },
  html2canvas: {
    scale: 4,             
    useCORS: true,
    letterRendering: true,
    backgroundColor: "#ffffff"
  },
  jsPDF: {
    unit: "mm",
    format: "a4",
    orientation: "portrait",
    compress: false       
  }
};

    const worker = html2pdf().set(opt).from(element);
    try {
      if (outputAction === 'save') {
        await worker.save();
        const newCount = pdfCount + 1;
        setPdfCount(newCount);
        localStorage.setItem('pdfExportCount', newCount);
      } else if (outputAction === 'blob') {
        return await worker.outputPdf('blob');
      }
    } catch (error) {
      console.error("PDF generation failed", error);
    } finally {
      element.classList.remove(styles.exportView);
    }
  };
  
  const handleBulkPdfExport = async () => {
    if (excelData.length === 0) {
      alert("Please process an Excel file first.");
      return;
    }

    setProcessing(true);
    setProgress(0);
    const zip = new JSZip();
    const failedEmployees = [];

    for (let i = 0; i < excelData.length; i++) {
      const employee = excelData[i];
      const employeeIdentifier = employee.employee_name || employee.employee_id || `Row ${i + 2}`;

      try {
        setFormData({
          empId: (employee.employee_id || '').toString().replace('PS-', '').trim(),
          empName: employee.employee_name,
          designation: employee.designation,
          email: employee.email,
          year: employee.year || "2025",
          month: employee.month || "May",
          day: employee.day || "31",
        });

       const currentMonthlyDetails = {
  basicSalaryAmount: employee.basic_salary_amount,
  noOfDays: employee.no_of_days,
  noOfWorkingDays: employee.no_of_working_days,
  noOfLeaves: employee.no_of_leaves,
  noOfPayDays: employee.no_of_pay_days,
};

setMonthlyDetails(currentMonthlyDetails);

        
        const calculatedBasic = (parseFloat(currentMonthlyDetails.basicSalaryAmount) * 
                               (parseFloat(currentMonthlyDetails.noOfPayDays) / 
                               parseFloat(currentMonthlyDetails.noOfDays)));
        
        const newPayslipData = getMethod1Data(calculatedBasic);
        setPayslipData(newPayslipData);
        
        await new Promise(resolve => setTimeout(resolve, 500)); 

        const pdfBlob = await performExport('blob', employee.employee_name, employee.month);
        if (pdfBlob) {
          zip.file(`${employee.employee_name}_${employee.month}_payslip.pdf`, pdfBlob);
        } else {
          throw new Error("PDF generation failed");
        }
      } catch (error) {
        console.error(`Failed to process employee ${employeeIdentifier}:`, error);
        failedEmployees.push(employeeIdentifier);
      }
      setProgress(((i + 1) / excelData.length) * 100);
    }

    if (Object.keys(zip.files).length > 0) {
      zip.generateAsync({ type: "blob" }).then(function(content) {
        const link = document.createElement('a');
        link.href = URL.createObjectURL(content);
        link.download = "payslips.zip";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      });
    }

    setProcessing(false);

    if (failedEmployees.length > 0) {
      alert(`Processing complete. Failed to generate PDFs for: ${failedEmployees.join(', ')}`);
    } else {
      alert("All payslips have been exported to a zip file.");
    }
  };
  
  const handleBulkEmailExport = async () => {
    if (excelData.length === 0) {
      alert("Please process an Excel file first.");
      return;
    }

    setProcessing(true);
    setProgress(0);
    const failedEmployees = [];
    const noEmailEmployees = [];

    for (let i = 0; i < excelData.length; i++) {
      const employee = excelData[i];
      const employeeIdentifier = employee.employee_name || employee.employee_id || `Row ${i + 2}`;

      if (!employee.email) {
        noEmailEmployees.push(employeeIdentifier);
        continue;
      }

      try {
        setFormData({
          empId: (employee.employee_id || '').toString().replace('PS-', '').trim(),
          empName: employee.employee_name,
          designation: employee.designation,
          email: employee.email,
          year: employee.year || "2025",
          month: employee.month || "May",
          day: employee.day || "31",
        });

        const currentMonthlyDetails = {
          basicSalaryAmount: employee.basic_salary_amount,
          noOfDays: employee.no_of_days,
          noOfPayDays: employee.no_of_pay_days,
        };
        
        const calculatedBasic = (parseFloat(currentMonthlyDetails.basicSalaryAmount) * 
                               (parseFloat(currentMonthlyDetails.noOfPayDays) / 
                               parseFloat(currentMonthlyDetails.noOfDays)));
        
        const newPayslipData = getMethod1Data(calculatedBasic);
        setPayslipData(newPayslipData);
        
        await new Promise(resolve => setTimeout(resolve, 500)); 

        const pdfBlob = await performExport('blob', employee.employee_name, employee.month);
        if (pdfBlob) {
          const data = new FormData();
          data.append('employeeEmail', employee.email);
          data.append('file', pdfBlob, 'payslip.pdf');
          const response = await fetch(`${API_BASE}/api/payslip/send-payslip-email`, { 
            method: 'POST', body: data 
          });

          if(response.ok) {
            setEmailCount(prevCount => {
              const newCount = prevCount + 1;
              localStorage.setItem('emailExportCount', newCount);
              return newCount;
            });
          } else {
            throw new Error("Server failed to send email");
          }
        } else {
          throw new Error("PDF generation failed");
        }
      } catch (error) {
        console.error(`Failed to process employee ${employeeIdentifier}:`, error);
        failedEmployees.push(employeeIdentifier);
      }
      setProgress(((i + 1) / excelData.length) * 100);
    }

    setProcessing(false);

    let alertMessage = "Email export process finished.\n";
    if (failedEmployees.length > 0) {
      alertMessage += `Failed to send emails to: ${failedEmployees.join(', ')}\n`;
    }
    if (noEmailEmployees.length > 0) {
      alertMessage += `Skipped due to no email address: ${noEmailEmployees.join(', ')}\n`;
    }
    if(failedEmployees.length === 0 && noEmailEmployees.length === 0) {
      alertMessage = "All payslip emails have been sent successfully!";
    }
    
    alert(alertMessage);
  };

  const resetCounts = () => {
    if (window.confirm("Are you sure you want to reset the export counts?")) {
      setPdfCount(0);
      setEmailCount(0);
      localStorage.setItem('pdfExportCount', 0);
      localStorage.setItem('emailExportCount', 0);
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onload = (evt) => {
      const bstr = evt.target.result;
      const wb = XLSX.read(bstr, { type: 'binary' });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const data = XLSX.utils.sheet_to_json(ws);
      setExcelData(data);
      alert(`${data.length} employee records loaded from Excel. Ready to export PDF or Email.`);
    };
    reader.readAsBinaryString(file);
    e.target.value = '';
  };

const mpaValue = `${monthlyDetails.noOfDays || 0}/${monthlyDetails.noOfPayDays || 0}/${monthlyDetails.noOfLeaves || 0}`;

 


  return (
    <div className={styles.payslipContainer}>
      <div className={styles.externalButtons}>
        <div className={styles.pdfExportGroup}>
          <button onClick={handlePrevious}>&lt;</button>
          <button onClick={handleBulkPdfExport}>Export as PDF</button>
          <button onClick={handleNext}>&gt;</button>
        </div>
        <button onClick={handleBulkEmailExport}>Export to Email</button>
        <input type="file" id="file_upload" onChange={handleFileUpload} style={{display: 'none'}} accept=".xlsx, .xls"/>
        <button onClick={() => document.getElementById('file_upload').click()}>Process Excel File</button>
      </div>

      {processing && (
        <div className={styles.progressBarContainer}>
          <div className={styles.progressBar} style={{ width: `${progress}%` }}>
            {Math.round(progress)}%
          </div>
        </div>
      )}

      <div className={styles.mainContent}>
        <div className={styles.leftColumn}>
          <div className={styles.monthlyDetailsCard}>
            <h3>Monthly Details</h3>
            <div className={styles.formGroup}>
              <label>Basic Salary Amount:</label>
              <input name="basicSalaryAmount" value={monthlyDetails.basicSalaryAmount} onChange={handleMonthlyDetailsChange} type="number" placeholder="Enter" />
            </div>
            <div className={styles.formGroup}>
              <label>No. of Days:</label>
              <input name="noOfDays" value={monthlyDetails.noOfDays} onChange={handleMonthlyDetailsChange} type="number" placeholder="Enter" />
            </div>
            <div className={styles.formGroup}>
              <label>No. of Working Days:</label>
              <input name="noOfWorkingDays" value={monthlyDetails.noOfWorkingDays} onChange={handleMonthlyDetailsChange} type="number" placeholder="Enter" />
            </div>
            <div className={styles.formGroup}>
              <label>No. of Leaves:</label>
              <input name="noOfLeaves" value={monthlyDetails.noOfLeaves} onChange={handleMonthlyDetailsChange} type="number" placeholder="Enter" />
            </div>
            <div className={styles.formGroup}>
              <label>No. of Pay Days:</label>
              <input name="noOfPayDays" value={monthlyDetails.noOfPayDays} onChange={handleMonthlyDetailsChange} type="number" placeholder="Enter" />
            </div>
          </div>
          <div className={styles.methodButtons}>
            <button onClick={handleMethod1}>Method 1</button>
          </div>
        </div>

        <div className={styles.middleColumn}>
          <div className={styles.pdfWrapper} ref={pdfRef}>
            <div className={styles.payslip}>
              <div className={styles.headerTop}>
                <div className={styles.logoSection}><img src="/CompanyLogo.png" alt="Logo" /></div>
                <div className={styles.companyTitle}>
                  <h3>Praxsol Engineering Private Limited</h3>
                  <h2>PAYSLIP</h2>
                </div>
              </div>

              <div className={styles.employeeDetailsGrid}>
                <div className={styles.leftDetails}>
                  <div className={styles.formGroup}>
                    <label>Employee ID:</label>
                    <div>
                      <span className={styles.exportText}>PS- {formData.empId}</span>
                      <div className={`${styles.inputGroup} ${styles.editInput}`}>
                        <span className={styles.prefix}>PS-</span>
                        <input className={styles.inputWithPrefix} name="empId" value={formData.empId} onChange={handleChange} placeholder="0003" maxLength={4} />
                      </div>
                    </div>
                  </div>
                  <div className={styles.formGroup}><label>Employee Name:</label><SwappableField key="empName" name="empName" value={formData.empName} onChange={handleChange} /></div>
                  <div className={styles.formGroup}><label>Designation:</label><SwappableField key="designation" name="designation" value={formData.designation} onChange={handleChange} /></div>
                  <div className={`${styles.formGroup} ${styles.emailField}`}><label>Email:</label><SwappableField key="email" name="email" value={formData.email} onChange={handleChange} /></div>
                </div>
                <div className={styles.rightDetails}>
                  <div className={styles.formGroup}><label>Year:</label><SwappableField key="year" name="year" value={formData.year} onChange={handleChange} /></div>
                  <div className={styles.formGroup}><label>Month:</label><SwappableField key="month" name="month" value={formData.month} onChange={handleChange} /></div>
<div className={styles.formGroup}>
  <label>M/P/A:</label>
  <span className={styles.exportText}>{mpaValue}</span>
  <input className={styles.editInput} value={mpaValue} readOnly />
</div>



                </div>
              </div>

             <table className={styles.compactPayslipTable}>
 <thead>
  <tr>
    <th>A. Monthly Benefits</th>
    <th></th>
    <th>Monthly</th>
    <th>B. Annual Benefits</th>
    <th></th>
    <th>Monthly</th>
  </tr>
</thead>

  <tbody>
    <tr>
      <td>Basic Salary</td>
      <td><SwappableField key="basicSalaryPercentageValue" name="basicSalaryPercentageValue" value={payslipData.basicSalaryPercentageValue || ""} onChange={handlePayslipChange} type="text" placeholder="Enter" /></td>
      <td><SwappableField key="basicSalary" name="basicSalary" value={payslipData.basicSalary} onChange={handlePayslipChange} type="number" placeholder="Enter" /></td>
      <td>Medical</td>
      <td className={styles.fixedCell}>Fixed</td>
      <td><SwappableField key="medicalAmount" name="medicalAmount" value={payslipData.medicalAmount} type="number" readOnly /></td>
    </tr>
    <tr>
      <td>HRA</td>
      <td className={styles.fixedCell}>40%</td>
      <td><SwappableField key="hraAmount" name="hraAmount" value={payslipData.hraAmount} onChange={handlePayslipChange} type="number" placeholder="Enter" /></td>
<td className={styles.subHeaderCell}>C. Statutory Benefits</td>
<td></td>
<td></td>
    </tr>
    <tr>
      <td>Conveyance Allowance</td>
      <td className={styles.fixedCell}>5%</td>
      <td><SwappableField key="conveyanceAmount" name="conveyanceAmount" value={payslipData.conveyanceAmount} onChange={handlePayslipChange} type="number" placeholder="Enter" /></td>
      <td>Provident Fund- EE</td>
      <td></td>
      <td><SwappableField key="pfEEAmount" name="pfEEAmount" value={payslipData.pfEEAmount} onChange={handlePayslipChange} type="number" placeholder="Enter" /></td>
    </tr>
    <tr>
      <td>Telephone Reimbursement</td>
      <td className={styles.fixedCell}>Fixed</td>
      <td>
        <div className={styles.inputContainer}>
          <span className={styles.exportText}>{payslipData.telephoneAmount}</span>
          <input className={styles.editInput} name="telephoneAmount" value={payslipData.telephoneAmount} type="number" readOnly />
        </div>
      </td>
      <td>Provident Fund-ER</td>
      <td></td>
      <td><SwappableField key="pfERAmount" name="pfERAmount" value={payslipData.pfERAmount} onChange={handlePayslipChange} type="number" placeholder="Enter" /></td>
    </tr>
    <tr>
      <td>Children Education Allowance</td>
      <td className={styles.fixedCell}>Fixed</td>
      <td><SwappableField key="educationAmount" name="educationAmount" value={payslipData.educationAmount} type="number" readOnly /></td>
      <td>Gratuity</td>
      <td className={styles.fixedCell}>4.65%</td>
      <td><SwappableField key="gratuityAmount" name="gratuityAmount" value={payslipData.gratuityAmount} onChange={handlePayslipChange} type="number" placeholder="Enter" /></td>
    </tr>
    {/* Supplementary Allowance DELETED - Special Allowance moved here */}
    <tr>
      <td>Special Allowance</td>
      <td className={styles.fixedCell}>Fixed</td>
      <td><SwappableField key="specialAllowanceAmount" name="specialAllowanceAmount" value={payslipData.specialAllowanceAmount} onChange={handlePayslipChange} type="number" placeholder="Enter" /></td>
      <td><b>Monthly Earnings</b></td>
<td></td>
<td>
  <SwappableField
    key="monthlyEarnings"
    name="monthlyEarnings"
    value={payslipData.monthlyEarnings}
    readOnly
  />
</td>

    </tr>
    {/* Superannuation Allowance DELETED - BLANK SPACE */}
    <tr>
      <td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td>
     <td><b>Monthly Deductions</b></td>
<td></td>
<td></td>

    </tr>
    {/* Adhoc Allowance DELETED - BLANK SPACE */}
    <tr>
      <td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td>
      <td>Provident Fund</td>
      <td></td>
      <td><SwappableField key="pfDeduction" name="pfDeduction" value={payslipData.pfDeduction || ""} onChange={handlePayslipChange} type="number" readOnly placeholder="Auto" /></td>
    </tr>
    <tr>
      <td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td>
      <td>Professional Tax</td>
      <td></td>
      <td><SwappableField key="profTaxDeduction" name="profTaxDeduction" value={payslipData.profTaxDeduction} onChange={handlePayslipChange} type="number" placeholder="Enter" /></td>
    </tr>
    
    <tr className={styles.netSalaryRow}>
      <td></td>
<td></td>
<td></td>
<td><b>Monthly Net Salary</b></td>
<td></td>
<td>
  <SwappableField
    key="netSalary"
    name="netSalary"
    value={payslipData.netSalary}
    readOnly
  />
</td>

    </tr>
  </tbody>
</table>

              <div className={styles.footerNote}>
                <p>For,</p>
                <p>Praxsol Engineering Private Limited</p>
              </div>
              <div className={styles.footerMeta}>
<span>{formData.month}-{formData.year}</span>
                <span>Confidential – All Rights Reserved - Praxsol</span>
                <span>Doc.No: PSE-COM-RD-3D-001</span>
              </div>
            </div>
          </div>
        </div>

        <div className={styles.rightColumn}>
          <div className={styles.statsCard}>
            <h3>Export Statistics</h3>
            <div className={styles.statItem}>
              <span>PDFs Generated:</span>
              <strong>{pdfCount}</strong>
            </div>
            <div className={styles.statItem}>
              <span>Emails Exported:</span>
              <strong>{emailCount}</strong>
            </div>
            <button className={styles.resetButton} onClick={resetCounts}>Reset Counts</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Payslip;
