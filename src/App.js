import React, { useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import AdminLogin from './components/AdminLogin'; // assuming this is your login page
import Dashboard from './pages/Dashboard'; // admin dashboard
// import PrivateRoute from './routes/PrivateRoute'; // protect admin route
import Interface from './interface'; // home or public landing page (optional)
import ProtectedRoute from './components/ProtectedRoute';
function App() {
  const [isAdmin, setIsAdmin] = useState(
  localStorage.getItem("isAdmin") === "true"
);
  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        
  <Route path="/admin-login" element={<AdminLogin setIsAdmin={setIsAdmin} />} />
        <Route path="/" element={<Interface />} />

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
