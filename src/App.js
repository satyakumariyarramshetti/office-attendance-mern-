import React, { useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import AdminLogin from './components/AdminLogin'; // assuming this is your login page
import Dashboard from './pages/Dashboard'; // admin dashboard
// import PrivateRoute from './routes/PrivateRoute'; // protect admin route
import Interface from './interface'; // home or public landing page (optional)
import ProtectedRoute from './components/ProtectedRoute';
import UserAttendance from './components/UserAttendance'; // <-- Import the new component
import LeavePlan from './components/LeavePlan';
import LPDashboard from './components/LPDashboard';
import LeaveTracker from './components/LeaveTracker';
import LeaveBalanceOverview from "./components/LeaveBalanceOverview";
import MonthlyLeaveSummary from "./components/MonthlyLeaveSummary";

import UserLogin from './components/UserLogin'; 



function App() {
  const [isAdmin, setIsAdmin] = useState(
  localStorage.getItem("isAdmin") === "true"
);

  const isUserAuthenticated = localStorage.getItem("userAuth") === "true";



  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
  {/* Admin Login Route */}
        <Route path="/admin-login" element={<AdminLogin setIsAdmin={setIsAdmin} />} />

       
        <Route path="/" element={isUserAuthenticated ? <Interface /> : <UserLogin />} />
       
        {/* --- ADD THIS LINE FOR THE USER ATTENDANCE PAGE --- */}
        <Route path="/your-attendance" element={<UserAttendance />} /> 
        <Route path="/leave-tracker" element={<LeaveTracker />} />
        <Route path="/leave-plan" element={<LeavePlan />} />
<Route path="/lp-dashboard" element={<LPDashboard />} />
<Route path="/monthly-leave-summary" element={<MonthlyLeaveSummary />} /><Route
  path="/leave-balance-overview"
  element={<LeaveBalanceOverview />}
/>


        {/* Protected route */}
        <Route
    path="/admin"
    element={
      <ProtectedRoute isAllowed={isAdmin}>
        <Dashboard />
      </ProtectedRoute>
    }
  />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
