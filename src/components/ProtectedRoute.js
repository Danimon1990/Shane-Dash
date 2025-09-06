import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ROLES, getNavigationForRole } from '../config/roles';

const ProtectedRoute = ({ children }) => {
  const { currentUser, loading } = useAuth();
  const location = useLocation();

  console.log('🛡️ ProtectedRoute check:', { 
    loading, 
    currentUser: currentUser ? `${currentUser.email} (verified: ${currentUser.emailVerified})` : 'null',
    pathname: location.pathname 
  });

  // Show loading while checking auth state
  if (loading) {
    console.log('⏳ ProtectedRoute: Still loading, showing loading screen');
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  // If user is not logged in, redirect to login
  if (!currentUser) {
    console.log('🚫 ProtectedRoute: No currentUser, redirecting to login');
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If user's email is not verified, redirect to login
  if (!currentUser.emailVerified) {
    console.log('📧 ProtectedRoute: Email not verified, redirecting to login');
    return <Navigate to="/login" replace />;
  }

  // Route restrictions based on role
  if (currentUser?.role) {
    const allowedPaths = getNavigationForRole(currentUser.role).map(item => item.path);
    allowedPaths.push('/'); // Allow home page
    
    // Apply role-specific restrictions
    if (!allowedPaths.includes(location.pathname)) {
      console.log(`🚫 ProtectedRoute: ${currentUser.role} user accessing restricted path, redirecting`);
      
      // Redirect to appropriate default page based on role
      switch (currentUser.role) {
        case ROLES.ADMIN:
          return <Navigate to="/clients" replace />;
        case ROLES.BILLING:
          return <Navigate to="/billing" replace />;
        case ROLES.THERAPIST:
          return <Navigate to="/my-clients" replace />;
        case ROLES.ASSOCIATE:
          return <Navigate to="/associates" replace />;
        case ROLES.VIEWER:
          return <Navigate to="/associates" replace />;
        default:
          return <Navigate to="/associates" replace />;
      }
    }
  }

  console.log('✅ ProtectedRoute: Access granted');
  return children;
};

export default ProtectedRoute; 