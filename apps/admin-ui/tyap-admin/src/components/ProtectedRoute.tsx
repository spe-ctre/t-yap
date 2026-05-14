import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { canAccess, AdminRole, PageName } from '../utils/permissions';

const ProtectedRoute: React.FC<{ children: React.ReactNode; page?: PageName }> = ({ children, page }) => {
  const { isAuthenticated, role } = useAuth();

  // If not logged in, send to login page
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // If a page is specified, check if the role has access
  if (page && role && !canAccess(role as AdminRole, page)) {
    return <Navigate to="/access-denied" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;