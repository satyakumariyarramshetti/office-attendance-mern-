// components/ProtectedRoute.js
import React from 'react';
import { Navigate } from 'react-router-dom';

const ProtectedRoute = ({ isAllowed, children }) => {
  // okavela isAllowed false ayithe (admin login avvakapothe)
  // redirect them to admin-login page
  if (!isAllowed) {
    return <Navigate to="/admin-login" replace />;
  }

  // okavela allowed ayithe, children (Dashboard) ni chupinchu
  return children;
};

export default ProtectedRoute;