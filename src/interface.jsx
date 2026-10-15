import React, { useState, useCallback, useEffect, useRef } from "react";
import "./interface.css";
import { Link } from "react-router-dom";
// I added FaCalendarAlt here
import {
  FaClock,
  FaUtensils,
  FaDoorOpen,
  FaFileAlt,
  FaCalendarAlt,
} from "react-icons/fa";

// Prefix for Staff ID
const PS_PREFIX = "PS-";

// --- Reusable StaffIdInput Component (No changes) ---
const StaffIdInput = ({ inputId, value, onChange, staffNotFound }) => (
  <div className="form-group mb-2">
    <label htmlFor={inputId}>Enter your ID</label>
    <div className="input-group">
      <div className="input-group-prepend">
        <span className="input-group-text">{PS_PREFIX}</span>
      </div>
      <input
        type="text"
        id={inputId}
        className="form-control"
        value={value}
        onChange={onChange}
        maxLength={6} // Increased from 4 to 6 to fit "I0007"
        pattern="[A-Z0-9]*" // Allow letters and numbers
        inputMode="text" // Change from "numeric" to "text"
        autoComplete="off"
        placeholder="0000"
        onFocus={(e) => e.target.select()}
        style={{ imeMode: "disabled" }}
      />
    </div>
    {staffNotFound && (
      <small className="text-danger">
        Staff ID not found. Please check your ID.
      </small>
    )}
  </div>
);

// ✅ Helper function: convert "HH:MM" → total minutes
const timeToMinutes = (time) => {
  if (!time) return 0;
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
};

// ✅ Function to calculate net & gross minutes
const getNetAndGrossMins = (attendance) => {
  const inMins = timeToMinutes(attendance.inTime);
  const outMins = timeToMinutes(attendance.outTime);

  if (!attendance.inTime || !attendance.outTime) return { net: 0, gross: 0 };

  let lunchMins = 0;
  if (attendance.lunchOut && attendance.lunchIn) {
    const lOutM = timeToMinutes(attendance.lunchOut);
    const lInM = timeToMinutes(attendance.lunchIn);
    if (lInM > lOutM) lunchMins = lInM - lOutM;
  }

  const net = outMins - inMins - lunchMins;
  const gross = outMins - inMins;
  return { net, gross };
};

const Interface = () => {
  const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:5000";

  // --- STATE MANAGEMENT ---
  const [formData, setFormData] = useState({
    id: "",
    name: "",
    date: "",
    day: "",
    inTime: "",
    systemInTime: "",
    lunchIn: "",
    lunchOut: "",
    outTime: "",
    systemOutTime: "",
    permissionType: "",

    hours: "",
    dailyLeaveType: "",
    siteComments: "",
    leaveType: "",
    location: "",
    delayReason: "",
  });

  const [idInputs, setIdInputs] = useState({
    inTime: "",
    lunch: "",
    outTime: "",
    permission: "",
    leave: "",
  });

  // --- NEW: State to track how "In Time" was set ---
  const [inTimeMethod, setInTimeMethod] = useState(""); // Will be 'live' or 'manual'

  const [activeSideCard, setActiveSideCard] = useState(null);
  const [lunchSubmitEnabled, setLunchSubmitEnabled] = useState(false);
  const [message, setMessage] = useState("");
  const [staffNotFound, setStaffNotFound] = useState(false);
  const [lunchMessage, setLunchMessage] = useState({ text: "", type: "" });
  const [outTimeMessage, setOutTimeMessage] = useState({ text: "", type: "" });
  const [cOffEarnedDate, setCOffEarnedDate] = useState("");
  const [isOTElligible, setIsOTElligible] = useState(false);
  const [delayInfoMessage, setDelayInfoMessage] = useState("");
  const [outPermissionInfoMessage, setOutPermissionInfoMessage] = useState("");
  const [halfDayReason, setHalfDayReason] = useState(""); // reason for First/Second Half
  const [isInTimeLocked, setIsInTimeLocked] = useState(false);
  const [isOutTimeLocked, setIsOutTimeLocked] = useState(false);
  const [leaveIdentification, setLeaveIdentification] = useState("");
  const [leaveBalances, setLeaveBalances] = useState(null);
  const [isLeaveAuthenticated, setIsLeaveAuthenticated] = useState(false);
  const [leaveAuthMessage, setLeaveAuthMessage] = useState({
    text: "",
    type: "",
  });

  const [missingActivities, setMissingActivities] = useState([]);
  const [allMissingActivities, setAllMissingActivities] = useState([]);
  const [showMissingFull, setShowMissingFull] = useState(false);
  const [missingTotalCount, setMissingTotalCount] = useState(0);

  const [leaveInactivityWarning, setLeaveInactivityWarning] = useState(0);
  const inactivityTimeoutRef = useRef(null);
  const countdownIntervalRef = useRef(null);
  const leaveSelectionActiveRef = useRef(false);

  // --- HELPER FUNCTIONS ---
  const getCurrentDate = () => new Date().toISOString().split("T")[0];
  const getCurrentTime = () => new Date().toTimeString().slice(0, 5);
  const getCurrentDay = (dateString = null) =>
    new Date(dateString || new Date()).toLocaleString("en-US", {
      weekday: "long",
    });

  const isFutureDate = (date) => {
    if (!date) return false;
    const selected = new Date(date).setHours(0, 0, 0, 0);
    const today = new Date().setHours(0, 0, 0, 0);
    return selected > today;
  };

  // Helper to get previous day's date in YYYY-MM-DD format
  const getPrevDate = (dateString) => {
    const d = new Date(dateString);
    d.setDate(d.getDate() - 1);
    return d.toISOString().split("T")[0];
  };

  const minutesToHoursMinutes = (totalMinutes) => {
    if (isNaN(totalMinutes) || totalMinutes < 0) return "00:00";
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
  };

  const checkMissingActivities = useCallback(
    async (employeeId) => {
      if (!employeeId) return;

      try {
        const res = await fetch(
          `${API_BASE}/api/activity-reminder/missing-activities?employeeId=${employeeId}`,
        );

        const data = await res.json();

        // only recent 3 days for UI
        setMissingActivities(data.recentMissingDays || []);

        // complete list for View Full
        setAllMissingActivities(data.data || []);

        setMissingTotalCount(data.totalMissingDays || 0);
      } catch (err) {
        console.log(err);
        setMissingActivities([]);
      }
    },
    [API_BASE],
  );

  // --- CORE DATA FETCHING LOGIC ---
  const fetchStaffAndAttendance = useCallback(
    async (numericId, date, context) => {
      // Change 4 to 1 or 2 so it starts searching as soon as they type "I..."
      if (!numericId || numericId.length < 2 || !date) return;

      const fullId = PS_PREFIX + numericId; // This will now result in "PS-I0007"
      setStaffNotFound(false);
      setMessage("");
      let staffName = "";

      try {
        const staffRes = await fetch(`${API_BASE}/api/staffs/getById`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: fullId }),
        });

        if (staffRes.ok) {
          const staffData = await staffRes.json();
          staffName = staffData.name || "";
        }
        // 🔴 ఈ else if బ్లాక్ యాడ్ చేయండి (Inactive కేస్ కోసం)
        else if (staffRes.status === 403) {
          const errorData = await staffRes.json();
          setStaffNotFound(true);
          setMessage(`🚫 ${errorData.error}`); // బ్యాకెండ్ నుండి వచ్చే ఎర్రర్ చూపిస్తుంది
          setFormData((prev) => ({ ...prev, name: "", id: "" }));
          return;
        } else if (staffRes.status === 404) {
          setStaffNotFound(true);
          setMessage("⚠️ Staff ID not found.");
          setFormData((prev) => ({ ...prev, name: "", id: "" }));
          return;
        }
      } catch (error) {
        console.error("Error fetching staff:", error);
        setStaffNotFound(true);
        return;
      }

      try {
        const res = await fetch(`${API_BASE}/api/attendance/getByIdDate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: fullId, date }),
        });

        let attendanceData = {};

        if (res.ok) {
          attendanceData = await res.json();

          if (attendanceData.inTime) {
            setIsInTimeLocked(true);
          } else {
            setIsInTimeLocked(false);
          }

          if (attendanceData.outTime) {
            setIsOutTimeLocked(true);
          } else {
            setIsOutTimeLocked(false);
          }

          if (!attendanceData.lunchOut || !attendanceData.lunchIn)
            setLunchSubmitEnabled(true);
          else {
            setLunchSubmitEnabled(false);
            setMessage("🥗 Lunch In & Out already submitted.");
          }
        } else {
          setIsInTimeLocked(false);
          setIsOutTimeLocked(false);
          setLunchSubmitEnabled(true);
        }

        let newLunchOut = attendanceData.lunchOut || "";
        let newLunchIn = attendanceData.lunchIn || "";
        if (context === "lunch") {
          if (attendanceData.lunchOut && !attendanceData.lunchIn)
            newLunchIn = getCurrentTime();
          else if (!attendanceData.lunchOut) newLunchOut = getCurrentTime();
        }

        // --- MODIFIED: Set inTimeMethod to 'live' if time is auto-fetched ---
        let newInTime = attendanceData.inTime || "";
        if (context === "inTime" && !attendanceData.inTime) {
          newInTime = getCurrentTime();
          setInTimeMethod("live"); // Mark as live time
        }
        const newSystemInTime = attendanceData.systemInTime || "";
        const newSystemOutTime = attendanceData.systemOutTime || "";

        setFormData((prev) => ({
          ...prev,
          id: fullId,
          name: staffName,
          date: date,
          day: getCurrentDay(date),
          inTime: newInTime,
          systemInTime: newSystemInTime,
          outTime:
            attendanceData.outTime ||
            (context === "outTime" ? getCurrentTime() : ""),
          systemOutTime: newSystemOutTime,
          lunchOut: newLunchOut,
          lunchIn: newLunchIn,
          permissionType: attendanceData.permissionType || "",

          hours: attendanceData.hours || "",
          dailyLeaveType: attendanceData.dailyLeaveType || "",
          leaveType: attendanceData.leaveType || "",
          delayReason: attendanceData.delayReason || prev.delayReason || "",
        }));

        if (
          context === "inTime" ||
          context === "lunch" ||
          context === "outTime"
        ) {
          checkMissingActivities(fullId);
        }
      } catch (err) {
        console.error("Error fetching attendance:", err);
        setFormData((prev) => ({ ...prev, id: fullId, name: staffName }));
      }
    },
    [API_BASE, checkMissingActivities],
  );

  // --- useEffects (no changes needed here) ---
  useEffect(() => {
    if (idInputs.inTime.length < 4 || !formData.date) return;
    const timer = setTimeout(
      () => fetchStaffAndAttendance(idInputs.inTime, formData.date, "inTime"),
      500,
    );
    return () => clearTimeout(timer);
  }, [idInputs.inTime, formData.date, fetchStaffAndAttendance]);

  useEffect(() => {
    if (idInputs.lunch.length < 4 || !formData.date) return;
    const timer = setTimeout(
      () => fetchStaffAndAttendance(idInputs.lunch, formData.date, "lunch"),
      500,
    );
    return () => clearTimeout(timer);
  }, [idInputs.lunch, formData.date, fetchStaffAndAttendance]);

  useEffect(() => {
    if (idInputs.outTime.length < 4 || !formData.date) return;
    const timer = setTimeout(
      () => fetchStaffAndAttendance(idInputs.outTime, formData.date, "outTime"),
      500,
    );
    return () => clearTimeout(timer);
  }, [idInputs.outTime, formData.date, fetchStaffAndAttendance]);

  useEffect(() => {
    if (idInputs.permission.length < 4 || !formData.date) return;
    const timer = setTimeout(
      () =>
        fetchStaffAndAttendance(
          idInputs.permission,
          formData.date,
          "permission",
        ),
      500,
    );
    return () => clearTimeout(timer);
  }, [idInputs.permission, formData.date, fetchStaffAndAttendance]);

  useEffect(() => {
    if (idInputs.leave.length < 4 || !formData.date) return;
    const timer = setTimeout(
      () => fetchStaffAndAttendance(idInputs.leave, formData.date, "leave"),
      500,
    );
    return () => clearTimeout(timer);
  }, [idInputs.leave, formData.date, fetchStaffAndAttendance]);

  useEffect(() => {
    if (!formData.inTime || !formData.date || !formData.id) {
      setIsOTElligible(false);
      setFormData((prev) => ({ ...prev, delayReason: "" }));
      return;
    }

    const prevDate = getPrevDate(formData.date);
    fetch(`${API_BASE}/api/attendance/getByIdDate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: formData.id, date: prevDate }),
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((prevAtt) => {
        if (!prevAtt) {
          setIsOTElligible(false);
          return;
        }
        const { gross } = getNetAndGrossMins(prevAtt); // gross = out-in (no lunch)
        const inMinsToday = timeToMinutes(formData.inTime);

        // ✅ FIXED: Both conditions use GROSS, numeric comparisons
        if (
          (gross >= 630 && inMinsToday <= 570) ||
          (gross >= 690 && inMinsToday <= 600)
        ) {
          setIsOTElligible(true);
          setFormData((prev) => ({ ...prev, delayReason: "OT Reason" }));
        } else {
          setIsOTElligible(false);
          const lateThreshold = timeToMinutes("09:15"); // 555 min
          if (inMinsToday > lateThreshold) {
            setFormData((prev) => ({
              ...prev,
              delayReason: prev.delayReason || "Late Mark",
            }));
          } else {
            setFormData((prev) => ({ ...prev, delayReason: "" }));
          }
        }
      })
      .catch(() => setIsOTElligible(false));
  }, [formData.inTime, formData.date, formData.id, API_BASE]);

  useEffect(() => {
    const checkInterval = setInterval(async () => {
      const userId = localStorage.getItem("userId");
      if (userId) {
        try {
          const res = await fetch(`${API_BASE}/api/users/check-status`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId }),
          });

          if (res.ok) {
            const data = await res.json();
            if (data.active === false) {
              alert(
                "Your session has been terminated by the Admin. Please login again to continue.",
              );
              localStorage.clear();
              window.location.href = "/";
            }
          }
        } catch (err) {
          console.error("Session check failed:", err);
        }
      }
    }, 10000);

    return () => clearInterval(checkInterval);
  }, [API_BASE]);

  // --- NEW: INACTIVITY TIMER LOGIC ---
  const resetInactivityTimer = useCallback(() => {
    // Only run if the leave card is active and authenticated
    if (activeSideCard !== "leave" || !isLeaveAuthenticated) return;

    clearTimeout(inactivityTimeoutRef.current);
    clearInterval(countdownIntervalRef.current);

    setLeaveInactivityWarning(0);

    // If user is currently interacting with the Leave Type dropdown,
    // don't start the inactivity countdown.
    if (leaveSelectionActiveRef.current) {
      return;
    }

    // Start inactivity timer
    inactivityTimeoutRef.current = setTimeout(() => {
      let seconds = 5;

      setLeaveInactivityWarning(seconds);

      countdownIntervalRef.current = setInterval(() => {
        // If user became active again, stop countdown
        if (leaveSelectionActiveRef.current) {
          clearInterval(countdownIntervalRef.current);
          setLeaveInactivityWarning(0);
          return;
        }

        seconds -= 1;

        if (seconds <= 0) {
          clearInterval(countdownIntervalRef.current);

          // Auto-close and logout
          setActiveSideCard(null);
          setIsLeaveAuthenticated(false);
          setLeaveIdentification("");
          setLeaveBalances(null);
          setLeaveInactivityWarning(0);
        } else {
          setLeaveInactivityWarning(seconds);
        }
      }, 1000);
    }, 5000);
  }, [activeSideCard, isLeaveAuthenticated]);

  // Trigger timer when the card opens/authenticates
  useEffect(() => {
    if (activeSideCard === "leave" && isLeaveAuthenticated) {
      resetInactivityTimer();
    } else {
      clearTimeout(inactivityTimeoutRef.current);
      clearInterval(countdownIntervalRef.current);
      setLeaveInactivityWarning(0);
    }
    return () => {
      clearTimeout(inactivityTimeoutRef.current);
      clearInterval(countdownIntervalRef.current);
    };
  }, [activeSideCard, isLeaveAuthenticated, resetInactivityTimer]);

  useEffect(() => {
    if (formData.lunchOut && formData.lunchIn) {
      const duration =
        timeToMinutes(formData.lunchIn) - timeToMinutes(formData.lunchOut);
      if (duration > 30)
        setLunchMessage({
          text: `You had taken ${duration} minutes instead of 30 minutes.`,
          type: "warning",
        });
      else if (duration >= 0)
        setLunchMessage({
          text: `Great! You've taken only ${duration} minutes for lunch. Well done!`,
          type: "success",
        });
      else setLunchMessage({ text: "", type: "" });
    } else {
      setLunchMessage({ text: "", type: "" });
    }
  }, [formData.lunchOut, formData.lunchIn]);

  useEffect(() => {
    if (formData.inTime && formData.outTime) {
      let lunchMins = 0;
      if (formData.lunchOut && formData.lunchIn) {
        const lunchDuration =
          timeToMinutes(formData.lunchIn) - timeToMinutes(formData.lunchOut);
        if (lunchDuration > 0) lunchMins = lunchDuration;
      }
      const totalWorkMins =
        timeToMinutes(formData.outTime) -
        timeToMinutes(formData.inTime) -
        lunchMins;
      if (totalWorkMins > 0) {
        const workHoursFormatted = minutesToHoursMinutes(totalWorkMins);
        if (totalWorkMins >= 510)
          setOutTimeMessage({
            text: `Excellent work! You've dedicated ${workHoursFormatted} hours today. Your commitment is appreciated.`,
            type: "success",
          });
        else
          setOutTimeMessage({
            text: `Attention: Your total working time is ${workHoursFormatted}, which is less than the expected 8 hours and 30 minutes.`,
            type: "warning",
          });
      } else {
        setOutTimeMessage({ text: "", type: "" });
      }
    } else {
      setOutTimeMessage({ text: "", type: "" });
    }
  }, [formData.inTime, formData.outTime, formData.lunchOut, formData.lunchIn]);

  const handleIdChange = (e, cardType) => {
    // REMOVE: const sanitizedValue = e.target.value.replace(/\D/g, '');

    // NEW: Allow letters and numbers, then force to Uppercase
    const sanitizedValue = e.target.value
      .replace(/[^a-zA-Z0-9]/g, "")
      .toUpperCase();

    setIdInputs((prev) => ({ ...prev, [cardType]: sanitizedValue }));

    // ✅ NEW: Reset leave authentication if they change the ID
    if (cardType === "leave") {
      setIsLeaveAuthenticated(false);
      setLeaveBalances(null);
      setLeaveAuthMessage({ text: "", type: "" });
      setLeaveIdentification("");
    }

    if (!formData.date) {
      const today = getCurrentDate();
      setFormData((prev) => ({
        ...prev,
        date: today,
        day: getCurrentDay(today),
      }));
    }
  };

  const handleDateChange = (e) => {
    const selectedDate = e.target.value;
    setFormData((prev) => ({
      ...prev,
      date: selectedDate,
      day: getCurrentDay(selectedDate),
    }));
  };

  const handleChange = (e) => {
    const { id, value } = e.target;

    if (id === "dailyLeaveType") {
      let comments = "";

      if (value === "Site comments") {
        const userComment = window.prompt("Please enter Site Comments info:");
        comments = userComment || "";
      }

      setFormData((prev) => ({
        ...prev,
        dailyLeaveType: value,
        siteComments: comments,
      }));

      if (value === "Second 50% Leave") {
        setOutPermissionInfoMessage(
          "You Have Selected Second 50% Leave. Kindly Update The Leave Section As Well.",
        );
      } else {
        setOutPermissionInfoMessage("");
      }

      return;
    }

    // Add this block right here:
    if (id === "delayReason") {
      setFormData((prev) => ({ ...prev, delayReason: value }));

      if (value === "First 50% Leave") {
        setDelayInfoMessage(
          "You Have Selected First 50% Leave. Kindly Update The Leave Section Also.",
        );
      } else {
        setDelayInfoMessage("");
      }

      return;
    }

    // --- MODIFIED: Set inTimeMethod to 'manual' on direct change ---
    if (id === "inTime") {
      setInTimeMethod("manual"); // Mark as manual entry
    }
    if (id === "leaveType") {
      if (value !== "C-Off Leave") {
        setCOffEarnedDate("");
      }
      // reset half‑day reason whenever leave type changes
      if (value !== "First Half Leave" && value !== "Second Half Leave") {
        setHalfDayReason("");
      }
    }

    if (id === "outTime") {
      if (value >= "18:00") {
        setFormData((prev) => ({
          ...prev,
          outTime: value,
          dailyLeaveType: "Casual Type",
        }));
      } else {
        setFormData((prev) => ({
          ...prev,
          outTime: value,
          dailyLeaveType: "",
        }));
      }
      return;
    }
    if (id === "halfDayReason") {
      setHalfDayReason(value);
      return;
    }
    // <-- ADD THIS DEFAULT CASE -->
    setFormData((prev) => ({ ...prev, [id]: value }));
  };

  // --- SUBMISSION LOGIC ---
  const submitData = async (payload, formType) => {
    try {
      const response = await fetch(`${API_BASE}/api/attendance/save`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json();

      if (response.ok) {
        // --- ✅ Custom pop-ups ---
        const now = new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        });
        let msg = "";
        switch (formType) {
          case "inTime":
            msg = `${payload.name} submitted In-Time at ${payload.inTime || now}`;
            break;
          case "lunchStart":
            msg = `${payload.name} submitted Lunch Start at ${payload.lunchOut || now}`;
            break;
          case "lunchEnd":
            msg = `${payload.name} submitted Lunch End at ${payload.lunchIn || now}`;
            break;
          case "outTime":
            msg = `${payload.name} submitted Out-Time at ${payload.outTime || now}`;
            break;
          case "permission":
            msg = `${payload.name} submitted Permission request.`;
            break;
          // Interface.js లోని submitData ఫంక్షన్‌లో 'leave' కేస్‌ని ఇలా మార్చండి:

          case "leave":
            // బ్యాకెండ్ నుండి వచ్చిన మెసేజ్‌ని తీసుకుంటాం
            let leaveBaseMsg =
              result.message ||
              (result.isLOP
                ? `${payload.name}, your leave makes the balance negative and may be treated as LOP.`
                : "Leave submitted successfully.");

            if (result.balances) {
              const { casualLeaves, sickLeaves, privilegeLeaves } =
                result.balances;
              msg = `${leaveBaseMsg}\n\nRemaining Balances:\n• Casual: ${casualLeaves}\n• Sick: ${sickLeaves}\n• Privilege: ${privilegeLeaves}`;
              setLeaveBalances((prev) => ({
                ...prev,
                casualLeaves,
                sickLeaves,
                privilegeLeaves,
                lopLeaves: result.balances.lopLeaves ?? prev?.lopLeaves,
              }));
            } else {
              msg = leaveBaseMsg;
            }
            break;
          default:
            msg = result.message || "Submitted successfully!";
        }
        alert(msg);

        // ✅ NEW: If form is LEAVE, DO NOT wipe global state (auto-refresh logic)
        if (formType === "leave") {
          setFormData((prev) => ({
            ...prev,
            leaveType: "", // Clear selection
            date: getCurrentDate(), // Reset date to today
            day: getCurrentDay(getCurrentDate()),
          }));
          setHalfDayReason("");
          setCOffEarnedDate("");
          resetInactivityTimer(); // reset timer on submit
          return; // Skip the global reset below!
        }
        // -------------------------

        // reset everything as before
        setIdInputs({
          inTime: "",
          lunch: "",
          outTime: "",
          permission: "",
          leave: "",
        });
        setFormData({
          id: "",
          name: "",
          date: "",
          day: "",
          inTime: "",
          lunchIn: "",
          lunchOut: "",
          outTime: "",
          permissionType: "",
          hours: "",
          dailyLeaveType: "",
          siteComments: "",
          leaveType: "",
          location: "",
          delayReason: "",
        });
        setInTimeMethod("");
        setStaffNotFound(false);
        setMessage("");
        setLunchSubmitEnabled(false);
        setActiveSideCard(null);
        setIsInTimeLocked(false);
        setIsOutTimeLocked(false);
        setMissingActivities([]);
        setAllMissingActivities([]);
        setMissingTotalCount(0);
        setShowMissingFull(false);
        setLeaveIdentification("");
        setLeaveBalances(null);
        setIsLeaveAuthenticated(false);
        setLeaveAuthMessage({ text: "", type: "" });
      } else {
        alert(result.error || "Submission failed!");
      }
    } catch (err) {
      console.error("Submission error:", err);
      alert("Failed to submit.");
    }
  };

  // ✅ NEW: Leave Authentication Function (Updated Flow)
  const authenticateLeave = async () => {
    if (!leaveIdentification) {
      setLeaveAuthMessage({
        text: "Please enter identification code.",
        type: "danger",
      });
      return;
    }

    try {
      setLeaveAuthMessage({ text: "Authenticating...", type: "info" });
      const res = await fetch(
        `${API_BASE}/api/leave-balance/my-leave-balance`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ identification: leaveIdentification }),
        },
      );

      const data = await res.json();

      if (res.ok) {
        setLeaveBalances(data);
        setIsLeaveAuthenticated(true);
        setLeaveAuthMessage({
          text: "Verified Successfully!",
          type: "success",
        });

        // Auto-fill the Employee ID input!
        // We slice off the "PS-" prefix so the reusable StaffIdInput component works correctly
        const rawId = data.employeeId.startsWith(PS_PREFIX)
          ? data.employeeId.slice(PS_PREFIX.length)
          : data.employeeId;

        setIdInputs((prev) => ({ ...prev, leave: rawId }));
        // Note: The existing useEffect will detect this ID change and automatically fetch Name, Dates, etc.
      } else {
        setLeaveAuthMessage({
          text: data.message || "Invalid identification code.",
          type: "danger",
        });
        setIsLeaveAuthenticated(false);
        setLeaveBalances(null);
      }
    } catch (error) {
      console.error("Auth error:", error);
      setLeaveAuthMessage({
        text: "Error connecting to server.",
        type: "danger",
      });
    }
  };

  const handleSubmit = async (e, formType) => {
    e.preventDefault();
    if (staffNotFound || !formData.id) {
      alert("Please enter a valid Staff ID before submitting.");
      return;
    }
    if (isFutureDate(formData.date)) {
      alert("Attendance for future dates is not allowed.");
      return;
    }

    const payload = {
      id: formData.id,
      name: formData.name,
      date: formData.date,
      day: formData.day,
    };

    if (formType === "inTime") {
      payload.inTime = formData.inTime;
      payload.inTimeMethod = inTimeMethod;
      // NEW: actual computer time at submit
      const now = new Date().toTimeString().slice(0, 5); // "HH:MM"
      payload.systemInTime = now;

      const inLate = formData.inTime > "09:15";
      let delayReasonToSend = formData.delayReason;

      if (isOTElligible && inLate) {
        // Force OT Reason when eligible
        delayReasonToSend = "OT Reason";
      } else if (inLate && !delayReasonToSend) {
        // Normal late, no selection -> default to Late Mark
        delayReasonToSend = "Late Mark";
      } else if (!inLate) {
        // Not late -> no delay reason
        delayReasonToSend = "";
      }

      payload.delayReason = delayReasonToSend;
      // The rest is unchanged
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            payload.location = `${pos.coords.latitude}, ${pos.coords.longitude}`;
            submitData(payload, "inTime"); // ✅ pass type
          },
          () => submitData(payload, "inTime"),
        );
      } else submitData(payload, "inTime");
      return;
    }

    if (formType === "outTime") {
      const [h, m] = formData.outTime.split(":").map(Number);
      const totalMinutes = h * 60 + m;
      const sixPm = 18 * 60;

      // Auto-assign Casual Type if time >= 18:00
      if (totalMinutes >= sixPm) {
        formData.dailyLeaveType = "Casual Type";
      }

      if (totalMinutes < sixPm && !formData.dailyLeaveType) {
        alert("Please select a permission type for out-time before 18:00.");
        return;
      }

      payload.outTime = formData.outTime;
      const systemOutNow = new Date();
      const systemOutDate = [
        systemOutNow.getFullYear(),
        String(systemOutNow.getMonth() + 1).padStart(2, "0"),
        String(systemOutNow.getDate()).padStart(2, "0"),
      ].join("-");
      payload.systemOutTime = `${systemOutDate} ${systemOutNow.toTimeString().slice(0, 5)}`;
      payload.dailyLeaveType = formData.dailyLeaveType;
      payload.siteComments = formData.siteComments;
      submitData(payload, "outTime");
      return;
    }

    if (formType === "permission") {
      payload.permissionType = formData.permissionType;
      payload.hours = formData.hours;

      if (!formData.hours) {
        alert("Please enter how many hours of permission you took.");
        return;
      }

      submitData(payload, "permission");
      return;
    }
  };

  const handleLunchSubmit = async (e) => {
    e.preventDefault();
    if (staffNotFound || !formData.id) {
      alert("Please enter a valid Staff ID before submitting.");
      return;
    }

    const payload = {
      id: formData.id,
      name: formData.name,
      date: formData.date,
      day: formData.day,
      lunchOut: formData.lunchOut || "",
      lunchIn: formData.lunchIn || "",
    };

    // decide start or end message
    let type = "";
    if (formData.lunchOut && !formData.lunchIn) type = "lunchStart";
    else if (formData.lunchOut && formData.lunchIn) type = "lunchEnd";
    else type = "lunchStart";

    submitData(payload, type);
  };

  const handleLeaveSubmit = async (e) => {
    e.preventDefault();
    if (staffNotFound || !formData.id) {
      alert("Please enter a valid Staff ID before submitting.");
      return;
    }

    let leaveType = formData.leaveType;
    // Prevent submitting a leave whose balance is now 0
    if (leaveType === "Casual Leave" && !canSelectCasual) {
      alert("Casual Leave balance is 0. Please select another leave type.");
      setFormData((prev) => ({
        ...prev,
        leaveType: "",
      }));
      return;
    }

    if (leaveType === "Sick Leave" && !canSelectSick) {
      alert("Sick Leave balance is 0. Please select another leave type.");
      setFormData((prev) => ({
        ...prev,
        leaveType: "",
      }));
      return;
    }

    if (leaveType === "Privilege Leave" && !canSelectPrivilege) {
      alert("Privilege Leave is not available for the selected date.");
      setFormData((prev) => ({
        ...prev,
        leaveType: "",
      }));
      return;
    }
    // Validate half-day reason
    if (
      (leaveType === "First Half Leave" || leaveType === "Second Half Leave") &&
      !halfDayReason
    ) {
      alert(
        "Please select reason (Sick / Casual / Privilege) for half-day leave.",
      );
      return;
    }

    // C-Off special handling (you already had this)
    if (leaveType === "C-Off Leave") {
      if (!cOffEarnedDate) {
        alert('Please select "C-Off Earned On" date.');
        return;
      }
      leaveType = `C-Off Leave [Earned on: ${cOffEarnedDate}]`;
    }

    const payload = {
      id: formData.id,
      name: formData.name,
      date: formData.date,
      day: formData.day,
      leaveType,
      halfDayReason,
    };

    submitData(payload, "leave");
  };
  // --- NEW: Dynamic Leave Options Logic ---
  const isJunior = leaveBalances?.role === "junior";

  // Juniors use casualLeaves count for both Sick and Casual options
  const canSelectSick = isJunior
    ? leaveBalances?.casualLeaves > 0
    : leaveBalances?.sickLeaves > 0;

  const canSelectCasual = leaveBalances?.casualLeaves > 0;

  // Base privilege check: must be senior and have balance > 0
  let baseCanSelectPrivilege = !isJunior && leaveBalances?.privilegeLeaves > 0;
  let canSelectPrivilege = baseCanSelectPrivilege;
  let plErrorMessage = "(0 Balance)"; // Default error message

  // ✅ STRICT MONTH CHECK: If they have PL, verify it was earned IN OR BEFORE the selected month
  if (
    baseCanSelectPrivilege &&
    formData.date &&
    leaveBalances?.plCreditHistory?.length > 0
  ) {
    const selectedDateObj = new Date(formData.date);

    // Create an absolute month value to easily compare (Year * 12 + Month)
    const selectedAbsoluteMonth =
      selectedDateObj.getFullYear() * 12 + selectedDateObj.getMonth();

    // Filter credits that were given in or before the selected month
    const validCredits = leaveBalances.plCreditHistory.filter((history) => {
      const historyDate = new Date(history.creditedOn);
      const historyAbsoluteMonth =
        historyDate.getFullYear() * 12 + historyDate.getMonth();
      return historyAbsoluteMonth <= selectedAbsoluteMonth; // <= means same month or earlier is valid!
    });

    // If no credits exist in or before this month, they can't use it!
    if (validCredits.length === 0) {
      canSelectPrivilege = false;

      // Get months for the error message (e.g., Earned in Nov, can't use in Oct)
      const earliestCreditTime = Math.min(
        ...leaveBalances.plCreditHistory.map((h) =>
          new Date(h.creditedOn).getTime(),
        ),
      );
      const earliestCredit = new Date(earliestCreditTime);

      const earliestMonth = earliestCredit.toLocaleString("default", {
        month: "short",
      });
      const selectedMonthStr = selectedDateObj.toLocaleString("default", {
        month: "short",
      });

      plErrorMessage = `(Earned in ${earliestMonth}, can't use in ${selectedMonthStr})`;
    }
  }

  // If they have absolutely no leaves to deduct from, hide half-day options too
  const hasAnyBalanceForHalfDay =
    canSelectSick || canSelectCasual || canSelectPrivilege;
  // ----------------------------------------

  const handleLeaveTypeFocus = () => {
    // User is actively using the dropdown
    leaveSelectionActiveRef.current = true;

    clearTimeout(inactivityTimeoutRef.current);
    clearInterval(countdownIntervalRef.current);

    setLeaveInactivityWarning(0);
  };

  const handleLeaveTypeBlur = () => {
    // Dropdown interaction is finished
    leaveSelectionActiveRef.current = false;

    resetInactivityTimer();
  };

  const handleLeaveTypeChange = (e) => {
    // Selecting an option is activity
    leaveSelectionActiveRef.current = true;

    handleChange(e);

    // Give the user time after selecting
    setTimeout(() => {
      leaveSelectionActiveRef.current = false;
      resetInactivityTimer();
    }, 500);
  };

  // Clear leave selection if its balance becomes unavailable
  useEffect(() => {
    if (!formData.leaveType) return;

    const selectedLeave = formData.leaveType;

    const isInvalidSelection =
      (selectedLeave === "Sick Leave" && !canSelectSick) ||
      (selectedLeave === "Casual Leave" && !canSelectCasual) ||
      (selectedLeave === "Privilege Leave" && !canSelectPrivilege);

    if (isInvalidSelection) {
      setFormData((prev) => ({
        ...prev,
        leaveType: "",
      }));
      setHalfDayReason("");
    }
  }, [formData.leaveType, canSelectSick, canSelectCasual, canSelectPrivilege]);

  return (
    <div className="main-wrapper">
      <header className="attendance-header">
        {/* ఇక్కడ మనం లోగో మరియు టైటిల్ ని ఒకే గ్రూప్ గా చేస్తున్నాం */}
        <div className="logo-title-container">
          <img
            src="https://tse4.mm.bing.net/th/id/OIP.kBa9Zzw_lXJ4D67y_kWZ5QHaG7?rs=1&pid=ImgDetMain&o=7&rm=3"
            alt="Company Logo"
            className="company-logo"
          />
          <div className="header-title">
            <span style={{ marginRight: "8px" }}></span>
            Attendance Portal
          </div>
        </div>

        <div className="header-links">
          {/* మీ పాత బటన్స్ కోడ్ అంతా ఇక్కడ ఉంటుంది */}
          <Link to="/your-attendance" className="btn custom-blue-btn me-2">
            Your Attendance
          </Link>
          <Link to="/leave-tracker" className="btn custom-blue-btn me-2">
            Your Leave Tracker
          </Link>
          <Link to="/leave-plan" className="btn btn-outline-light me-2">
            Your Leave Plan
          </Link>
          <Link to="/lp-dashboard" className="btn btn-outline-light me-2">
            LP Dashboard
          </Link>
          <Link to="/admin-login" className="admin-login-link">
            Admin login
          </Link>
        </div>
      </header>

      <div className="container-fluid px-4 py-5">
        <div className="row">
          {/* In Time Card */}
          <div className="col-lg-3 col-md-6 mb-4">
            <div className="card custom-card h-100">
              <h5 className="card-title">
                InTime Details{" "}
                <div>
                  <FaClock className="text-primary fs-4 mt-1" />
                </div>
              </h5>
              <form
                id="inTimeForm"
                className="d-flex flex-column h-100"
                onSubmit={(e) => handleSubmit(e, "inTime")}
              >
                <StaffIdInput
                  inputId="idInTime"
                  value={idInputs.inTime}
                  onChange={(e) => handleIdChange(e, "inTime")}
                  staffNotFound={staffNotFound}
                />
                <div className="form-group mb-2">
                  <label>Name</label>
                  <input
                    type="text"
                    className="form-control"
                    value={formData.name}
                    readOnly
                  />
                </div>
                <div className="form-group mb-2">
                  <label>Date</label>
                  <input
                    type="date"
                    className="form-control"
                    value={formData.date}
                    onChange={handleDateChange}
                    max={getCurrentDate()}
                  />
                </div>
                <div className="form-group mb-2">
                  <label>Day</label>
                  <input
                    type="text"
                    className="form-control"
                    value={formData.day}
                    readOnly
                  />
                </div>
                {/* --- MODIFIED: Added a label to show the time method --- */}
                <div className="form-group mb-2">
                  <label>
                    In Time (Entered)
                    {inTimeMethod && (
                      <span className="time-method-badge">{inTimeMethod}</span>
                    )}
                  </label>
                  <input
                    type="time"
                    id="inTime"
                    className="form-control"
                    value={formData.inTime}
                    onChange={handleChange}
                    readOnly={isInTimeLocked} // <--- ఈ లైన్ యాడ్ చేయండి
                    style={
                      isInTimeLocked
                        ? { backgroundColor: "#e9ecef", cursor: "not-allowed" }
                        : {}
                    } // ఆప్షనల్: గ్రే కలర్ కోసం
                  />
                </div>

                {/* Conditionally show Delay Reason if inTime is after 09:15 */}
                {formData.inTime &&
                  timeToMinutes(formData.inTime) > timeToMinutes("09:15") && (
                    <div className="form-group mb-2">
                      <label>Delay Reason</label>

                      <select
                        id="delayReason"
                        className="form-control"
                        value={
                          isOTElligible
                            ? "OT Reason"
                            : formData.delayReason || "Late Mark"
                        }
                        onChange={handleChange}
                        required
                        disabled={isOTElligible}
                      >
                        <option value="Late Mark">Late Mark</option>
                        <option value="Permission">Permission</option>
                        <option value="TOM">TOM</option>
                        <option value="Late Flexi">Late Flexi</option>
                        <option value="Project Requirement">
                          Project Requirement
                        </option>
                        <option value="Office Work">Office Work</option>
                        <option value="First 50% Leave">First 50% Leave</option>
                        <option value="Deputation">Deputation</option>
                        {isOTElligible && (
                          <option value="OT Reason">OT Reason</option>
                        )}
                      </select>

                      {isOTElligible && (
                        <small className="text-success">
                          OT Reason automatically applied due to previous day's
                          extra hours.
                        </small>
                      )}

                      {delayInfoMessage && (
                        <div
                          className="mt-1 px-2 py-1"
                          style={{
                            backgroundColor: "#fd5a09ff",
                            color: "#fbfafbff",
                            borderRadius: "4px",
                            fontSize: "0.9rem",
                          }}
                        >
                          {delayInfoMessage}
                        </div>
                      )}
                    </div>
                  )}

                {missingTotalCount > 0 && (
                  <div className="activity-alert">
                    <b>⚠️ Activity Sheet Pending</b>

                    <p>Total Missing Days : {missingTotalCount}</p>

                    <ul>
                      {missingActivities.map((item, index) => (
                        <li key={index}>{item.missingActivityDate}</li>
                      ))}
                    </ul>

                    {missingTotalCount > 3 && (
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-primary"
                        onClick={() => setShowMissingFull(true)}
                      >
                        View Full
                      </button>
                    )}
                  </div>
                )}

                <div className="mt-auto">
                  <button
                    className="btn btn-primary btn-block"
                    type="submit"
                    disabled={staffNotFound || !formData.id}
                  >
                    Submit
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Other cards remain unchanged in their JSX structure */}
          {/* Lunch Card */}
          <div className="col-lg-3 col-md-6 mb-4">
            <div className="card custom-card h-100">
              <h5 className="card-title">
                Lunch Details{" "}
                <div>
                  <FaUtensils className="text-warning fs-4 mt-1" />
                </div>
              </h5>
              <form
                className="d-flex flex-column h-100"
                onSubmit={handleLunchSubmit}
              >
                <StaffIdInput
                  inputId="idLunch"
                  value={idInputs.lunch}
                  onChange={(e) => handleIdChange(e, "lunch")}
                  staffNotFound={staffNotFound}
                />
                <div className="form-group mb-2">
                  <label>Date</label>
                  <input
                    type="date"
                    className="form-control"
                    value={formData.date}
                    readOnly
                  />
                </div>
                <div className="form-group mb-2">
                  <label>Lunch Start Time</label>
                  <input
                    type="time"
                    id="lunchOut"
                    className="form-control"
                    value={formData.lunchOut}
                    readOnly
                  />
                </div>
                <div className="form-group mb-2">
                  <label>Lunch End Time</label>
                  <input
                    type="time"
                    id="lunchIn"
                    className="form-control"
                    value={formData.lunchIn}
                    readOnly
                  />
                </div>
                {lunchMessage.text && (
                  <div
                    className={`time-message mb-2 ${lunchMessage.type === "success" ? "text-success" : "text-danger"}`}
                  >
                    {lunchMessage.text}
                  </div>
                )}
                <div className="mt-auto">
                  <button
                    className="btn btn-primary btn-block"
                    disabled={
                      !lunchSubmitEnabled || staffNotFound || !formData.id
                    }
                    type="submit"
                  >
                    Submit
                  </button>
                </div>
              </form>
              {message && (
                <div className="alert alert-info mt-2">{message}</div>
              )}
            </div>
          </div>
          {/* Out Time Card */}
          <div className="col-lg-3 col-md-6 mb-4">
            <div className="card custom-card h-100">
              <h5 className="card-title">
                Out Time Details{" "}
                <div>
                  <FaDoorOpen className="text-danger fs-4 mt-1" />
                </div>
              </h5>
              <form
                className="d-flex flex-column h-100"
                onSubmit={(e) => handleSubmit(e, "outTime")}
              >
                <StaffIdInput
                  inputId="idOutTime"
                  value={idInputs.outTime}
                  onChange={(e) => handleIdChange(e, "outTime")}
                  staffNotFound={staffNotFound}
                />
                <div className="form-group mb-2">
                  <label>Date</label>
                  <input
                    type="date"
                    className="form-control"
                    value={formData.date}
                    readOnly
                  />
                </div>
                <div className="form-group mb-2">
                  <label>Out Time</label>
                  <input
                    type="time"
                    id="outTime"
                    className="form-control"
                    value={formData.outTime}
                    onChange={handleChange}
                    readOnly={isOutTimeLocked}
                    style={
                      isOutTimeLocked
                        ? { backgroundColor: "#e9ecef", cursor: "not-allowed" }
                        : {}
                    }
                  />
                </div>
                <div className="form-group mb-3">
                  <label htmlFor="dailyLeaveType">Permission Type</label>
                  <select
                    id="dailyLeaveType"
                    className="form-control"
                    value={formData.dailyLeaveType}
                    onChange={handleChange}
                    disabled={isOutTimeLocked}
                  >
                    <option value="">Select Permission</option>
                    <option value="Second 50% Leave">Second 50% Leave</option>
                    <option value="Personal Permission">
                      Personal Permission
                    </option>
                    <option value="Health Issue">Health Issue</option>
                    <option value="Emergency Permission">
                      Emergency Permission
                    </option>
                    <option value="Office Work">Office Work</option>
                    <option value="Site comments">Site comments</option>
                    <option value="TOM">TOM</option>
                    <option value="FLEXI">FLEXI</option>
                    <option value="Call">Call</option>
                    <option value="Festival">Festival</option>
                    <option value="Project Requirement">
                      Project Requirement
                    </option>
                    <option value="WFH">WFH</option>
                    <option value="Casual Type">Casual Type</option>
                  </select>

                  {outPermissionInfoMessage && (
                    <div
                      className="mt-1 px-2 py-1"
                      style={{
                        backgroundColor: "#fd5a09ff",
                        color: "#fbfafbff",
                        borderRadius: "4px",
                        fontSize: "0.9rem",
                      }}
                    >
                      {outPermissionInfoMessage}
                    </div>
                  )}
                </div>

                {outTimeMessage.text && (
                  <div
                    className={`time-message mb-3 ${outTimeMessage.type === "success" ? "text-success" : "text-danger"}`}
                  >
                    {outTimeMessage.text}
                  </div>
                )}
                <div className="mt-auto">
                  <button
                    className="btn btn-primary btn-block"
                    type="submit"
                    disabled={staffNotFound || !formData.id || isOutTimeLocked}
                  >
                    Submit
                  </button>
                </div>
              </form>
            </div>
          </div>
          {/* Permission/Leave Column */}
          <div className="col-lg-3 col-md-6 mb-4">
            <div className="h-100">
              {activeSideCard === "permission" ? (
                <div
                  className="card custom-card h-100"
                  style={{ position: "relative" }}
                >
                  <button
                    className="close-btn"
                    onClick={() => setActiveSideCard(null)}
                    style={{
                      position: "absolute",
                      right: "15px",
                      top: "15px",
                      background: "transparent",
                      border: "none",
                      fontSize: "1.6rem",
                    }}
                    aria-label="Close Permission Card"
                    type="button"
                  >
                    &times;
                  </button>
                  <h5 className="card-title">
                    Permission Details{" "}
                    <div>
                      <FaFileAlt />
                    </div>
                  </h5>
                  <form
                    className="d-flex flex-column h-100"
                    onSubmit={(e) => handleSubmit(e, "permission")}
                  >
                    <StaffIdInput
                      inputId="idPermission"
                      value={idInputs.permission}
                      onChange={(e) => handleIdChange(e, "permission")}
                      staffNotFound={staffNotFound}
                    />
                    <div className="form-group mb-2">
                      <label>Name</label>
                      <input
                        type="text"
                        className="form-control"
                        value={formData.name}
                        readOnly
                      />
                    </div>
                    <div className="form-group mb-2">
                      <label>Date</label>
                      <input
                        type="date"
                        className="form-control"
                        value={formData.date}
                        onChange={handleDateChange}
                        max={getCurrentDate()}
                      />
                    </div>
                    <div className="form-group mb-2">
                      <label>Day</label>
                      <input
                        type="text"
                        className="form-control"
                        value={formData.day}
                        readOnly
                      />
                    </div>
                    <div className="form-group mb-2">
                      <label htmlFor="permissionType">Type of Permission</label>
                      <input
                        type="text"
                        id="permissionType"
                        className="form-control"
                        value={formData.permissionType}
                        onChange={handleChange}
                        placeholder="e.g., Personal, Health"
                      />
                    </div>
                    {/* Permission Hours Input */}
                    <div className="form-group mb-2">
                      <label htmlFor="hours">Hours</label>
                      <input
                        type="text"
                        id="hours"
                        className="form-control"
                        placeholder="e.g., 1 or 1.5"
                        value={formData.hours}
                        onChange={handleChange}
                      />
                    </div>

                    <div className="mt-auto">
                      <button
                        className="btn btn-primary btn-block"
                        type="submit"
                        disabled={staffNotFound || !formData.id}
                      >
                        Submit Permission
                      </button>
                    </div>
                  </form>
                </div>
              ) : activeSideCard === "leave" ? (
                <div
                  className="card custom-card h-100"
                  style={{ position: "relative" }}
                >
                  <button
                    className="close-btn"
                    onClick={() => {
                      setActiveSideCard(null);
                      setIsLeaveAuthenticated(false);
                      setLeaveIdentification("");
                      setLeaveBalances(null);
                      setLeaveAuthMessage({ text: "", type: "" });
                      setLeaveInactivityWarning(0);
                      setIdInputs((prev) => ({ ...prev, leave: "" })); // Clears the ID input
                    }}
                    style={{
                      position: "absolute",
                      right: "15px",
                      top: "15px",
                      background: "transparent",
                      border: "none",
                      fontSize: "1.6rem",
                      zIndex: 10,
                    }}
                    aria-label="Close Leave Card"
                    type="button"
                  >
                    &times;
                  </button>
                  <h5 className="card-title mb-2">
                    Leave Details{" "}
                    <FaCalendarAlt className="text-success fs-4 mt-1" />
                  </h5>

                  {/* ✅ Timer UI overlay */}
                  {leaveInactivityWarning > 0 && (
                    <div
                      className="alert alert-danger p-1 text-center mb-2"
                      style={{ fontSize: "0.80rem" }}
                    >
                      Closing due to inactivity in{" "}
                      <b>{leaveInactivityWarning}s</b>... move cursor to stay.
                    </div>
                  )}

                  {/* ✅ Activity listeners to reset the timer */}
                  <div
                    className="d-flex flex-column h-100"
                    onMouseMove={resetInactivityTimer}
                    onKeyDown={resetInactivityTimer}
                    onClick={resetInactivityTimer}
                  >
                    {!isLeaveAuthenticated ? (
                      <div className="verification-section my-auto">
                        <div className="text-center mb-3">
                          <small className="text-muted">
                            Authenticate to access your leave portal
                          </small>
                        </div>
                        <div className="form-group mb-2">
                          <label>Identification Code</label>
                          <input
                            type="password"
                            className="form-control text-center"
                            placeholder="Enter Code"
                            value={leaveIdentification}
                            onChange={(e) =>
                              setLeaveIdentification(e.target.value)
                            }
                          />
                        </div>
                        {leaveAuthMessage.text && (
                          <small
                            className={`text-${leaveAuthMessage.type} d-block mb-2 text-center`}
                          >
                            {leaveAuthMessage.text}
                          </small>
                        )}
                        <button
                          type="button"
                          className="btn btn-secondary btn-block mt-3"
                          onClick={authenticateLeave}
                          disabled={!leaveIdentification}
                        >
                          Verify Code
                        </button>
                      </div>
                    ) : (
                      <form
                        className="d-flex flex-column h-100 fade-in"
                        onSubmit={handleLeaveSubmit}
                      >
                        {/* ✅ Clean, one-line balance summary with large text and no LOP */}
                        <div className="d-flex justify-content-around align-items-center mb-3 p-2 bg-light border rounded">
                          <div>
                            <span
                              className="text-muted fw-bold me-1"
                              style={{ fontSize: "0.85rem" }}
                            >
                              CASUAL:
                            </span>
                            <span className="fs-5 fw-bold text-dark">
                              {leaveBalances.casualLeaves}
                            </span>
                          </div>
                          <div>
                            <span
                              className="text-muted fw-bold me-1"
                              style={{ fontSize: "0.85rem" }}
                            >
                              SICK:
                            </span>
                            <span className="fs-5 fw-bold text-dark">
                              {leaveBalances.sickLeaves}
                            </span>
                          </div>
                          <div>
                            <span
                              className="text-muted fw-bold me-1"
                              style={{ fontSize: "0.85rem" }}
                            >
                              PRIVILEGE:
                            </span>
                            <span className="fs-5 fw-bold text-dark">
                              {leaveBalances.privilegeLeaves}
                            </span>
                          </div>
                        </div>
                        {/* {leaveBalances?.role === "senior" &&
                          leaveBalances?.nextPrivilegeLeave && (
                            <div
                              className="mb-3 px-2 py-2 border rounded"
                              style={{
                                background: "#eef7ff",
                                borderColor: "#b8dcff",
                                fontSize: "0.82rem",
                                color: "#174a7c",
                              }}
                            >
                              <strong>Next Privilege Leave:</strong> 1 PL will
                              be added after completing{" "}
                              <strong>
                                {
                                  leaveBalances.nextPrivilegeLeave
                                    .workingDaysRequired
                                }
                              </strong>{" "}
                              working days.
                              <br />
                              Expected date:{" "}
                              <strong>
                                {new Date(
                                  leaveBalances.nextPrivilegeLeave
                                    .nextPrivilegeLeaveDate,
                                ).toLocaleDateString("en-IN", {
                                  day: "2-digit",
                                  month: "short",
                                  year: "numeric",
                                })}
                              </strong>
                            </div>
                          )} */}

                        {/* Note: ID input is still present so the user can easily see their ID. */}
                        <StaffIdInput
                          inputId="idLeave"
                          value={idInputs.leave}
                          onChange={(e) => handleIdChange(e, "leave")}
                          staffNotFound={staffNotFound}
                        />

                        <div className="form-group mb-2">
                          <label>Name</label>
                          <input
                            type="text"
                            className="form-control"
                            value={formData.name}
                            readOnly
                          />
                        </div>

                        {/* ✅ Compact Date and Day Side-by-Side */}
                        <div className="form-row d-flex gap-2 mb-2">
                          <div className="form-group w-50">
                            <label>Date</label>
                            <input
                              type="date"
                              className="form-control"
                              value={formData.date}
                              onChange={handleDateChange}
                              max={getCurrentDate()}
                            />
                          </div>
                          <div className="form-group w-50">
                            <label>Day</label>
                            <input
                              type="text"
                              className="form-control"
                              value={formData.day}
                              readOnly
                            />
                          </div>
                        </div>

                        <div className="form-group mb-2">
                          <label htmlFor="leaveType">Leave Type</label>
                          <select
                            id="leaveType"
                            className="form-control"
                            value={formData.leaveType || ""}
                            onChange={handleLeaveTypeChange}
                            onFocus={handleLeaveTypeFocus}
                            onBlur={handleLeaveTypeBlur}
                            onMouseDown={handleLeaveTypeFocus}
                            required
                            disabled={!formData.date}
                          >
                            <option value="" disabled>
                              {!formData.date
                                ? "Select Date First"
                                : "Select Leave Type"}
                            </option>

                            {/* ✅ Styled disabled options to look grayed out */}
                            <option
                              value="Sick Leave"
                              disabled={!canSelectSick}
                              style={{
                                color: !canSelectSick ? "#a0a0a0" : "inherit",
                              }}
                            >
                              Sick Leave {!canSelectSick && "(0 Balance)"}
                            </option>
                            <option
                              value="Casual Leave"
                              disabled={!canSelectCasual}
                              style={{
                                color: !canSelectCasual ? "#a0a0a0" : "inherit",
                              }}
                            >
                              Casual Leave {!canSelectCasual && "(0 Balance)"}
                            </option>

                            {/* ✅ Privilege Leave with dynamic date-based error message */}
                            <option
                              value="Privilege Leave"
                              disabled={!canSelectPrivilege}
                              style={{
                                color: !canSelectPrivilege
                                  ? "#a0a0a0"
                                  : "inherit",
                              }}
                            >
                              Privilege Leave{" "}
                              {!canSelectPrivilege && plErrorMessage}
                            </option>

                            <option value="C-Off Leave">C-Off Leave</option>

                            <option
                              value="First Half Leave"
                              disabled={!hasAnyBalanceForHalfDay}
                              style={{
                                color: !hasAnyBalanceForHalfDay
                                  ? "#a0a0a0"
                                  : "inherit",
                              }}
                            >
                              First Half Leave
                            </option>
                            <option
                              value="Second Half Leave"
                              disabled={!hasAnyBalanceForHalfDay}
                              style={{
                                color: !hasAnyBalanceForHalfDay
                                  ? "#a0a0a0"
                                  : "inherit",
                              }}
                            >
                              Second Half Leave
                            </option>

                            <option value="Travel Leave">Travel Leave</option>
                            <option value="Client/Site Visit">
                              Client/Site Visit
                            </option>
                            <option value="Over-Time Leave">
                              Over-Time Leave
                            </option>
                            <option value="LOP Leave">LOP Leave</option>
                          </select>
                        </div>

                        {(formData.leaveType === "First Half Leave" ||
                          formData.leaveType === "Second Half Leave") && (
                          <div className="form-group mb-2">
                            <label htmlFor="halfDayReason">
                              Reason for Half Day
                            </label>
                            <select
                              id="halfDayReason"
                              className="form-control"
                              value={halfDayReason}
                              onChange={handleChange}
                              required
                            >
                              <option disabled value="">
                                Select Reason
                              </option>
                              <option
                                value="Sick Leave"
                                disabled={!canSelectSick}
                                style={{
                                  color: !canSelectSick ? "#a0a0a0" : "inherit",
                                }}
                              >
                                Sick Leave {!canSelectSick && "(0 Balance)"}
                              </option>
                              <option
                                value="Casual Leave"
                                disabled={!canSelectCasual}
                                style={{
                                  color: !canSelectCasual
                                    ? "#a0a0a0"
                                    : "inherit",
                                }}
                              >
                                Casual Leave {!canSelectCasual && "(0 Balance)"}
                              </option>
                              <option
                                value="Privilege Leave"
                                disabled={!canSelectPrivilege}
                                style={{
                                  color: !canSelectPrivilege
                                    ? "#a0a0a0"
                                    : "inherit",
                                }}
                              >
                                Privilege Leave{" "}
                                {!canSelectPrivilege && plErrorMessage}
                              </option>
                            </select>
                          </div>
                        )}
                        {formData.leaveType === "C-Off Leave" && (
                          <div className="form-group mb-2">
                            <label htmlFor="cOffEarnedDate">
                              C-Off Earned On
                            </label>
                            <input
                              type="date"
                              id="cOffEarnedDate"
                              className="form-control"
                              value={cOffEarnedDate}
                              onChange={(e) =>
                                setCOffEarnedDate(e.target.value)
                              }
                              required
                            />
                          </div>
                        )}

                        <div className="mt-auto pt-2">
                          <button
                            className="btn btn-primary btn-block"
                            type="submit"
                            disabled={staffNotFound || !formData.id}
                          >
                            Submit Leave
                          </button>
                        </div>
                      </form>
                    )}
                  </div>
                </div>
              ) : (
                <div className="stubs-wrapper h-100">
                  <div
                    className="card-stub"
                    onClick={() => setActiveSideCard("permission")}
                  >
                    <div className="stub-icon">
                      <FaFileAlt />
                    </div>
                    <span className="stub-title">Permission</span>
                  </div>
                  <div
                    className="card-stub"
                    onClick={() => setActiveSideCard("leave")}
                  >
                    <div className="stub-icon">
                      <FaCalendarAlt />
                    </div>
                    <span className="stub-title">Leave</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      {showMissingFull && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
          }}
        >
          <div
            style={{
              background: "#fff",
              padding: "20px",
              borderRadius: "10px",
              width: "400px",
              maxHeight: "80vh",
              overflowY: "auto",
            }}
          >
            <h5>Complete Missing Activity Dates</h5>

            <p>Total : {missingTotalCount} Days</p>

            <ul>
              {allMissingActivities.map((item, index) => (
                <li key={index}>{item.missingActivityDate}</li>
              ))}
            </ul>

            <button
              className="btn btn-danger"
              onClick={() => setShowMissingFull(false)}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Interface;
