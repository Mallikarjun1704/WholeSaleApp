import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { selectIsAuthenticated, selectUserRole } from '../features/auth/authSlice';

/**
 * Protected route wrapper
 * @param {object} props
 * @param {React.ReactNode} props.children - Child components to render
 * @param {string[]} [props.roles] - Allowed roles (e.g., ['admin']). If empty, any authenticated user is allowed.
 */
const ProtectedRoute = ({ children, roles = [] }) => {
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const userRole = useSelector(selectUserRole);
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (roles.length > 0 && !roles.includes(userRole)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
};

export default ProtectedRoute;
