import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

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

  console.log('✅ ProtectedRoute: Access granted');
  return children;
};

export default ProtectedRoute; 