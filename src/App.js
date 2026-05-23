import React, { useState } from 'react';
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

  const isUserAuthenticated = localStorage.getItem("userAuth") === "true";

  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route path="/admin-login" element={<AdminLogin setIsAdmin={setIsAdmin} />} />

        {/* Home Route: Logic for User Login */}
        <Route path="/" element={isUserAuthenticated ? <Interface /> : <UserLogin />} />

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