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
  basicSalaryPercentageValue: "",
  basicSalary: "",
  hraAmount: "",
  conveyanceAmount: "",
  telephoneAmount: "300",
  educationAmount: "200",
  supplementaryAmount: "",
  superannuationAmount: "",
  adhocAmount: "",
  specialAllowanceAmount: "",
  medicalAmount: "1250",
  pfEEAmount: "",
  pfERAmount: "",
  gratuityAmount: "",
  monthlyEarnings: "",
  pfDeduction: "",
  profTaxDeduction: "200.00", // Usually fixed
  monthlyDeductions: "",
  netSalary: "",
};

// Helper function to determine Provident Fund amounts
const calculatePf = (basic) => {
    if (basic > 15000) {
        return { pfEEAmount: "1800.00", pfERAmount: "1800.00" };
    }
    const pfValue = (basic * 0.12).toFixed(2);
    return { pfEEAmount: pfValue, pfERAmount: pfValue };
};

// Common allowances and benefits calculation
const getCommonData = (calculatedBasic) => {
    const data = { ...initialPayslipState };
    const pfAmounts = calculatePf(calculatedBasic);

    data.basicSalary = calculatedBasic.toFixed(2);
    data.hraAmount = (calculatedBasic * 0.40).toFixed(2);
    data.conveyanceAmount = (calculatedBasic * 0.05).toFixed(2);
    data.supplementaryAmount = (calculatedBasic * 0.20).toFixed(2);
    data.superannuationAmount = (calculatedBasic * 0.15).toFixed(2);
    data.gratuityAmount = (calculatedBasic * 0.0482).toFixed(2);
    data.pfEEAmount = pfAmounts.pfEEAmount;
    data.pfERAmount = pfAmounts.pfERAmount;
    
    return data;
};

// Method 1 Calculation
const getMethod1Data = (calculatedBasic) => {
    const data = getCommonData(calculatedBasic);
    data.telephoneAmount = "600";
    data.adhocAmount = (calculatedBasic * 0.26).toFixed(2);
    data.specialAllowanceAmount = "";
    return data;
};

// Method 2 Calculation
const getMethod2Data = (calculatedBasic) => {
    const data = getCommonData(calculatedBasic);
    data.telephoneAmount = "300";
    data.adhocAmount = (calculatedBasic * 0.26).toFixed(2);
    data.specialAllowanceAmount = "";
    return data;
};

// Method 3 Calculation
const getMethod3Data = (calculatedBasic) => {
    const data = getCommonData(calculatedBasic);
    data.telephoneAmount = "300";
    data.adhocAmount = (calculatedBasic * 0.26).toFixed(2);
    data.specialAllowanceAmount = "1900.00";
    return data;
};

// Method 4 Calculation
const getMethod4Data = (calculatedBasic) => {
    const data = getCommonData(calculatedBasic);
    data.telephoneAmount = "600";
    data.adhocAmount = (calculatedBasic * 0.26).toFixed(2);
    data.specialAllowanceAmount = "1900.00";
    return data;
};

// Method 5 Calculation
const getMethod5Data = (calculatedBasic) => {
    const data = getCommonData(calculatedBasic);
    data.telephoneAmount = "600";
    data.adhocAmount = "";
    data.specialAllowanceAmount = "3000.00";
    return data;
};

// Method 6 Calculation
const getMethod6Data = (calculatedBasic) => {
    const data = getCommonData(calculatedBasic);
    data.telephoneAmount = "300";
    data.adhocAmount = (calculatedBasic * 0.26).toFixed(2);
    data.specialAllowanceAmount = "3000.00";
    return data;
};

// Method 7 Calculation
const getMethod7Data = (calculatedBasic) => {
    const data = getCommonData(calculatedBasic);
    // Telephone reimbursement not specified, will use default from initial state
    data.adhocAmount = "";
    data.specialAllowanceAmount = "";
    return data;
};

// Method 8 Calculation
const getMethod8Data = (calculatedBasic) => {
    const data = getCommonData(calculatedBasic);
    data.telephoneAmount = "300";
    data.adhocAmount = (calculatedBasic * 0.26).toFixed(2);
    data.specialAllowanceAmount = "4000.00";
    return data;
};


function Payslip() {
  const pdfRef = useRef();
  const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:5000";


  const [formData, setFormData] = useState({
    empId: "", empName: "", designation: "", email: "",
    year: "2025", month: "May", day: "31",
  });

  const [payslipData, setPayslipData] = useState({
      ...initialPayslipState,
      headerMonthYear: "May-2025"
  });
  const [monthlyDetails, setMonthlyDetails] = useState({
    basicSalaryAmount: "", noOfDays: "", noOfWorkingDays: "", noOfLeaves: "", noOfPayDays: "",
  });

  const [specialAllowanceOption, setSpecialAllowanceOption] = useState("1900");
  const [specialAllowanceOther, setSpecialAllowanceOther] = useState("");

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
  }, []);

  useEffect(() => {
    const savedPdfCount = localStorage.getItem('pdfExportCount') || 0;
    const savedEmailCount = localStorage.getItem('emailExportCount') || 0;
    setPdfCount(parseInt(savedPdfCount, 10));
    setEmailCount(parseInt(savedEmailCount, 10));
  }, []);

  useEffect(() => {
    if (formData.month && formData.year) {
      const yearSuffix = formData.year.toString().slice(-2);
      const newHeader = `${formData.month}-${yearSuffix}`;
      setPayslipData(prevPayslipData => ({
        ...prevPayslipData,
        headerMonthYear: newHeader
      }));
    }
  }, [formData.month, formData.year]);

  useEffect(() => {
    const p = (v) => parseFloat(v) || 0;

    const {
        basicSalary, hraAmount, conveyanceAmount, telephoneAmount, educationAmount,
        supplementaryAmount, superannuationAmount, adhocAmount, specialAllowanceAmount,
        medicalAmount, pfEEAmount, pfERAmount, gratuityAmount, profTaxDeduction
    } = payslipData;

    const newPfDeduction = p(pfEEAmount);

    const earningsComponentsSum =
      p(basicSalary) + p(hraAmount) + p(conveyanceAmount) + p(telephoneAmount) +
      p(educationAmount) + p(supplementaryAmount) + p(superannuationAmount) +
      p(adhocAmount) + p(specialAllowanceAmount) + p(medicalAmount) +
      p(gratuityAmount);

    const totalEarningsSum = earningsComponentsSum + p(pfERAmount);
    const newMonthlyEarnings = totalEarningsSum;
    const newProfTaxDeduction = p(profTaxDeduction);
    const newMonthlyDeductions = newPfDeduction + newProfTaxDeduction;
    const newNetSalary = newMonthlyEarnings - newMonthlyDeductions;

    if (
      newPfDeduction.toFixed(2) !== p(payslipData.pfDeduction).toFixed(2) ||
      newMonthlyEarnings.toFixed(2) !== p(payslipData.monthlyEarnings).toFixed(2) ||
      newMonthlyDeductions.toFixed(2) !== p(payslipData.monthlyDeductions).toFixed(2) ||
      newNetSalary.toFixed(2) !== p(payslipData.netSalary).toFixed(2)
    ) {
        setPayslipData(prev => ({
            ...prev,
            pfDeduction: newPfDeduction > 0 ? newPfDeduction.toFixed(2) : "",
            monthlyEarnings: newMonthlyEarnings > 0 ? newMonthlyEarnings.toFixed(2) : "",
            monthlyDeductions: newMonthlyDeductions > 0 ? newMonthlyDeductions.toFixed(2) : "",
            netSalary: newNetSalary > 0 ? newNetSalary.toFixed(2) : "",
        }));
    }
  }, [payslipData]);

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
    setPayslipData(prev => ({...prev, ...getMethod1Data(calculatedBasic)}));
  };
  
  const handleMethod2 = () => {
    const calculatedBasic = calculateProratedBasic();
    if (calculatedBasic === null) return;
    setPayslipData(prev => ({...prev, ...getMethod2Data(calculatedBasic)}));
  };
  
  const handleMethod3 = () => {
    const calculatedBasic = calculateProratedBasic();
    if (calculatedBasic === null) return;
    setPayslipData(prev => ({...prev, ...getMethod3Data(calculatedBasic)}));
  };

  const handleMethod4 = () => {
    const calculatedBasic = calculateProratedBasic();
    if (calculatedBasic === null) return;
    setPayslipData(prev => ({...prev, ...getMethod4Data(calculatedBasic)}));
  };

  const handleMethod5 = () => {
    const calculatedBasic = calculateProratedBasic();
    if (calculatedBasic === null) return;
    setPayslipData(prev => ({...prev, ...getMethod5Data(calculatedBasic)}));
  };

  const handleMethod6 = () => {
    const calculatedBasic = calculateProratedBasic();
    if (calculatedBasic === null) return;
    setPayslipData(prev => ({...prev, ...getMethod6Data(calculatedBasic)}));
  };

  const handleMethod7 = () => {
    const calculatedBasic = calculateProratedBasic();
    if (calculatedBasic === null) return;
    setPayslipData(prev => ({...prev, ...getMethod7Data(calculatedBasic)}));
  };

  const handleMethod8 = () => {
    const calculatedBasic = calculateProratedBasic();
    if (calculatedBasic === null) return;
    setPayslipData(prev => ({...prev, ...getMethod8Data(calculatedBasic)}));
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
          setFormData((prev) => ({ ...prev, empName: data.name, designation: data.designation, email: data.email }));
          const employeeIndex = allEmployees.findIndex(emp => emp.id === `PS-${value}`);
          setCurrentEmployeeIndex(employeeIndex);
        }
      } catch (error) { console.error("Fetch failed:", error); }
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
      html2canvas: { scale: 4, useCORS: true, letterRendering: true },
      jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
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
      } else if (outputAction === 'datauristring') {
        return await worker.output('datauristring');
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
            year: employee.year,
            month: employee.month,
            day: employee.day,
        });

        const currentMonthlyDetails = {
            basicSalaryAmount: employee.basic_salary_amount,
            noOfDays: employee.no_of_days,
            noOfPayDays: employee.no_of_pay_days,
        };
        
        const calculatedBasic = (parseFloat(currentMonthlyDetails.basicSalaryAmount) * (parseFloat(currentMonthlyDetails.noOfPayDays) / parseFloat(currentMonthlyDetails.noOfDays)));
        
        let newPayslipData;
        if (employee.method_selection === 'Method 1') {
            newPayslipData = getMethod1Data(calculatedBasic);
        } else if (employee.method_selection === 'Method 2') {
            newPayslipData = getMethod2Data(calculatedBasic);
        } else if (employee.method_selection === 'Method 3') {
            newPayslipData = getMethod3Data(calculatedBasic);
        } else if (employee.method_selection === 'Method 4') {
            newPayslipData = getMethod4Data(calculatedBasic);
        } else if (employee.method_selection === 'Method 5') {
            newPayslipData = getMethod5Data(calculatedBasic);
        } else if (employee.method_selection === 'Method 6') {
            newPayslipData = getMethod6Data(calculatedBasic);
        } else if (employee.method_selection === 'Method 7') {
            newPayslipData = getMethod7Data(calculatedBasic);
        } else if (employee.method_selection === 'Method 8') {
            newPayslipData = getMethod8Data(calculatedBasic);
        } else {
            throw new Error(`Invalid method: ${employee.method_selection}`);
        }
        
        setPayslipData(prev => ({...prev, ...newPayslipData}));
        
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
                year: employee.year,
                month: employee.month,
                day: employee.day,
            });

            const currentMonthlyDetails = {
                basicSalaryAmount: employee.basic_salary_amount,
                noOfDays: employee.no_of_days,
                noOfPayDays: employee.no_of_pay_days,
            };
            
            const calculatedBasic = (parseFloat(currentMonthlyDetails.basicSalaryAmount) * (parseFloat(currentMonthlyDetails.noOfPayDays) / parseFloat(currentMonthlyDetails.noOfDays)));
            
            let newPayslipData;
            if (employee.method_selection === 'Method 1') {
                newPayslipData = getMethod1Data(calculatedBasic);
            } else if (employee.method_selection === 'Method 2') {
                newPayslipData = getMethod2Data(calculatedBasic);
            } else if (employee.method_selection === 'Method 3') {
                newPayslipData = getMethod3Data(calculatedBasic);
            } else if (employee.method_selection === 'Method 4') {
                newPayslipData = getMethod4Data(calculatedBasic);
            } else if (employee.method_selection === 'Method 5') {
                newPayslipData = getMethod5Data(calculatedBasic);
            } else if (employee.method_selection === 'Method 6') {
                newPayslipData = getMethod6Data(calculatedBasic);
            } else if (employee.method_selection === 'Method 7') {
                newPayslipData = getMethod7Data(calculatedBasic);
            } else if (employee.method_selection === 'Method 8') {
                newPayslipData = getMethod8Data(calculatedBasic);
            } else {
                throw new Error(`Invalid method: ${employee.method_selection}`);
            }
            
            setPayslipData(prev => ({...prev, ...newPayslipData}));
            
            await new Promise(resolve => setTimeout(resolve, 500)); 

            const pdfBlob = await performExport('blob', employee.employee_name, employee.month);
            if (pdfBlob) {
                const data = new FormData();
                data.append('employeeEmail', employee.email);
                data.append('file', pdfBlob, 'payslip.pdf');
                const response = await fetch(`${API_BASE}/api/payslip/send-payslip-email`, { method: 'POST', body: data });

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
  }

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
  }

  return (
    <div className={styles.payslipContainer}>
      {/* REVERTED BUTTONS TO YOUR ORIGINAL CODE */}
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
          {/* ADDED THE NEW METHOD BUTTONS */}
          <div className={styles.methodButtons}>
            <button onClick={handleMethod1}>Method 1</button>
            <button onClick={handleMethod2}>Method 2</button>
            <button onClick={handleMethod3}>Method 3</button>
            <button onClick={handleMethod4}>Method 4</button>
            <button onClick={handleMethod5}>Method 5</button>
            <button onClick={handleMethod6}>Method 6</button>
            <button onClick={handleMethod7}>Method 7</button>
            <button onClick={handleMethod8}>Method 8</button>
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
                  <div className={styles.formGroup}><label>Day:</label><SwappableField key="day" name="day" value={formData.day} onChange={handleChange} /></div>
                </div>
              </div>
              <table className={styles.compactPayslipTable}>
                {/* Table content remains the same */}
                <thead>
                  <tr>
                    <th colSpan="6" className={styles.headerInput}>
                      <SwappableField
                        key="headerMonthYear"
                        name="headerMonthYear"
                        value={payslipData.headerMonthYear}
                        onChange={handlePayslipChange}
                      />
                    </th>
                  </tr>
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
                    <td><SwappableField key="basicSalaryPercentageValue" name="basicSalaryPercentageValue" value={payslipData.basicSalaryPercentageValue} onChange={handlePayslipChange} type="text" placeholder="Enter" /></td>
                    <td><SwappableField key="basicSalary" name="basicSalary" value={payslipData.basicSalary} onChange={handlePayslipChange} type="text" placeholder="Enter" /></td>
                    <td>Medical</td>
                    <td className={styles.fixedCell}>Fixed</td>
                    <td><SwappableField key="medicalAmount" name="medicalAmount" value={payslipData.medicalAmount} type="number" readOnly /></td>
                  </tr>
                  <tr>
                    <td>HRA</td>
                    <td className={styles.fixedCell}>40%</td>
                    <td><SwappableField key="hraAmount" name="hraAmount" value={payslipData.hraAmount} onChange={handlePayslipChange} type="number" placeholder="Enter" /></td>
                    <td colSpan="3" className={styles.subHeaderCell}>C. Statutory Benefits</td>
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
                          <select
                              className={styles.editInput}
                              name="telephoneAmount"
                              value={payslipData.telephoneAmount}
                              onChange={handlePayslipChange}
                          >
                              <option value="300">300</option>
                              <option value="600">600</option>
                          </select>
                          <span className={styles.exportText}>{payslipData.telephoneAmount}</span>
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
                    <td className={styles.fixedCell}>4.82%</td>
                    <td><SwappableField key="gratuityAmount" name="gratuityAmount" value={payslipData.gratuityAmount} onChange={handlePayslipChange} type="number" placeholder="Enter" /></td>
                  </tr>
                  <tr>
                    <td>Supplementary Allowance</td>
                    <td className={styles.fixedCell}>20%</td>
                    <td><SwappableField key="supplementaryAmount" name="supplementaryAmount" value={payslipData.supplementaryAmount} onChange={handlePayslipChange} type="number" placeholder="Enter" /></td>
                    <td colSpan="2"><b>Monthly Earnings</b></td>
                    <td><SwappableField key="monthlyEarnings" name="monthlyEarnings" value={payslipData.monthlyEarnings} onChange={handlePayslipChange} type="number" readOnly placeholder="Auto" /></td>
                  </tr>
                  <tr>
                    <td>Superannuation Allowance</td>
                    <td className={styles.fixedCell}>15%</td>
                    <td><SwappableField key="superannuationAmount" name="superannuationAmount" value={payslipData.superannuationAmount} onChange={handlePayslipChange} type="number" placeholder="Enter" /></td>
                    <td colSpan="2"><b>Monthly Deductions</b></td>
                    <td><SwappableField key="monthlyDeductions" name="monthlyDeductions" value={payslipData.monthlyDeductions} onChange={handlePayslipChange} type="number" readOnly placeholder="Auto" /></td>
                  </tr>
                  <tr>
                    <td>Adhoc Allowance</td>
                    <td className={styles.fixedCell}>26%</td>
                    <td><SwappableField key="adhocAmount" name="adhocAmount" value={payslipData.adhocAmount} onChange={handlePayslipChange} type="number" placeholder="Enter" /></td>
                    <td>Provident Fund</td>
                    <td></td>
                    <td><SwappableField key="pfDeduction" name="pfDeduction" value={payslipData.pfDeduction} onChange={handlePayslipChange} type="number" readOnly placeholder="Auto" /></td>
                  </tr>
                  <tr>
                    <td>Special Allowance</td>
                    <td>
                      <div className={styles.specialAllowanceContainer}>
                        <select className={styles.editInput} value={specialAllowanceOption} onChange={e => setSpecialAllowanceOption(e.target.value)}>
                          <option value="1900">1900</option>
                          <option value="3000">3000</option>
                          <option value="4000">4000</option>
                          <option value="9000">9000</option>
                          <option value="Other">Other</option>
                        </select>
                        {specialAllowanceOption === 'Other' && (
                          <input className={styles.editInput} type="number" value={specialAllowanceOther} onChange={e => setSpecialAllowanceOther(e.target.value)} placeholder="Enter" />
                        )}
                      </div>
                      <span className={styles.exportText}>{payslipData.specialAllowanceAmount}</span>
                    </td>
                    <td><SwappableField key="specialAllowanceAmount" name="specialAllowanceAmount" value={payslipData.specialAllowanceAmount} onChange={handlePayslipChange} type="number" placeholder="Enter" /></td>
                    <td>Professional Tax</td>
                    <td></td>
                    <td><SwappableField key="profTaxDeduction" name="profTaxDeduction" value={payslipData.profTaxDeduction} onChange={handlePayslipChange} type="number" placeholder="Enter" /></td>
                  </tr>
                  <tr>
                    <td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td>
                    <td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td>
                  </tr>
                  <tr className={styles.netSalaryRow}>
                    <td colSpan="5"><b>Monthly Net Salary</b></td>
                    <td><SwappableField key="netSalary" name="netSalary" value={payslipData.netSalary} onChange={handlePayslipChange} type="number" readOnly placeholder="Auto" /></td>
                  </tr>
                </tbody>
              </table>
              <div className={styles.footerNote}>
                <p>For,</p>
                <p>Praxsol Engineering Private Limited</p>
              </div>
              <div className={styles.footerMeta}>
                <span>{formData.day}-{formData.month}-{formData.year}</span>
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