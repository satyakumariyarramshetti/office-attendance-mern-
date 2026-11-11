import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import AdminLogin from './components/AdminLogin';
import Dashboard from './pages/Dashboard';
import Interface from './interface';
import ProtectedRoute from './components/ProtectedRoute';
import UserAttendance from './components/UserAttendance';
import LeavePlan from './components/LeavePlan';
import LPDashboard from './components/LPDashboard';
import LeaveTracker from './components/LeaveTracker';
import LeaveBalanceOverview from "./components/LeaveBalanceOverview";
import MonthlyLeaveSummary from "./components/MonthlyLeaveSummary";
import UserLogin from './components/UserLogin';

function App() {
  // Browser refresh ayina state maintain avvadaniki localStorage
  const [isAdmin, setIsAdmin] = useState(
    localStorage.getItem("isAdmin") === "true"
  );

  const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:5000";

  // null = checking, true = valid user session, false = not valid
  const [userValid, setUserValid] = useState(
    localStorage.getItem("userAuth") === "true" ? null : false
  );

  useEffect(() => {
    const userId = localStorage.getItem("userId");

    if (localStorage.getItem("userAuth") !== "true" || !userId) {
      setUserValid(false);
      return;
    }

    fetch(`${API_BASE}/api/users/check-status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.active === false) {
          // deleted / logged out by admin -> clear only user session keys
          localStorage.removeItem("userAuth");
          localStorage.removeItem("userId");
          localStorage.removeItem("username");
          setUserValid(false);
        } else {
          setUserValid(true);
        }
      })
      .catch(() => setUserValid(true)); // server down ayite lockout cheyyakudadu
  }, [API_BASE]);

  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route path="/admin-login" element={<AdminLogin setIsAdmin={setIsAdmin} />} />

        {/* Home Route: Logic for User Login */}
        <Route
          path="/"
          element={
            userValid === null ? (
              <p style={{ padding: "20px" }}>Checking session...</p>
            ) : userValid ? (
              <Interface />
            ) : (
              <UserLogin />
            )
          }
        />
        {/* User pages */}
        <Route path="/your-attendance" element={<UserAttendance />} /> 
        <Route path="/leave-tracker" element={<LeaveTracker />} />
        <Route path="/leave-plan" element={<LeavePlan />} />
        <Route path="/lp-dashboard" element={<LPDashboard />} />
        <Route path="/monthly-leave-summary" element={<MonthlyLeaveSummary />} />
        <Route path="/leave-balance-overview" element={<LeaveBalanceOverview />} />

        {/* --- PROTECTED ADMIN ROUTE --- */}
        {/* Ikkada okasari rasi unchithe chalu */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute isAllowed={isAdmin}>
              <Dashboard />
            </ProtectedRoute>
          }
        />

        {/* Handle unknown routes (Optional) */}
        <Route path="*" element={<h2 style={{padding: '20px'}}>404 - Page Not Found</h2>} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;