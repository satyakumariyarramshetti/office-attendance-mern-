import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import AdminLogin from './components/AdminLogin'; // assuming this is your login page
import Dashboard from './pages/Dashboard'; // admin dashboard
import PrivateRoute from './routes/PrivateRoute'; // protect admin route
import Interface from './interface'; // home or public landing page (optional)

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<Interface />} />
        <Route path="/login" element={<AdminLogin />} />

        {/* Protected route */}
        <Route
          path="/admin"
          element={
            <PrivateRoute>
              <Dashboard />
            </PrivateRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
