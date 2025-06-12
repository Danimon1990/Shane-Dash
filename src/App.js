// src/App.js
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Sidebar from './components/Sidebar';
import Login from './pages/Login';
import SignUp from './pages/SignUp';
import EmailVerification from './pages/EmailVerification';
import Clients from './pages/Clients';
import Associates from './pages/Associates';
import Billing from './pages/Billing';
import Calendar from './pages/Calendar';
import ClinicalForms from './pages/ClinicalForms';
import AdminPanel from './pages/AdminPanel';
import AISummary from './pages/AISummary';
import { useAuth } from './contexts/AuthContext';
import './App.css';

// Separate layout for authenticated pages
const AuthenticatedLayout = ({ children }) => {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 bg-white">
        {children}
      </main>
    </div>
  );
};

// Separate layout for unauthenticated pages (like login)
const UnauthenticatedLayout = ({ children }) => {
  return (
    <div className="min-h-screen bg-gray-100">
      {children}
    </div>
  );
};

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={
            <UnauthenticatedLayout>
              <Login />
            </UnauthenticatedLayout>
          } />
          <Route path="/signup" element={
            <UnauthenticatedLayout>
              <SignUp />
            </UnauthenticatedLayout>
          } />
          <Route path="/verify-email" element={
            <UnauthenticatedLayout>
              <EmailVerification />
            </UnauthenticatedLayout>
          } />

          {/* Protected routes */}
          <Route path="/clients" element={
            <ProtectedRoute>
              <AuthenticatedLayout>
                <Clients />
              </AuthenticatedLayout>
            </ProtectedRoute>
          } />
          <Route path="/associates" element={
            <ProtectedRoute>
              <AuthenticatedLayout>
                <Associates />
              </AuthenticatedLayout>
            </ProtectedRoute>
          } />
          <Route path="/billing" element={
            <ProtectedRoute>
              <AuthenticatedLayout>
                <Billing />
              </AuthenticatedLayout>
            </ProtectedRoute>
          } />
          <Route path="/calendar" element={
            <ProtectedRoute>
              <AuthenticatedLayout>
                <Calendar />
              </AuthenticatedLayout>
            </ProtectedRoute>
          } />
          <Route path="/forms" element={
            <ProtectedRoute>
              <AuthenticatedLayout>
                <ClinicalForms />
              </AuthenticatedLayout>
            </ProtectedRoute>
          } />
          <Route path="/forms/ai-summary" element={
            <ProtectedRoute>
              <AuthenticatedLayout>
                <AISummary />
              </AuthenticatedLayout>
            </ProtectedRoute>
          } />
          <Route path="/admin" element={
            <ProtectedRoute>
              <AuthenticatedLayout>
                <AdminPanel />
              </AuthenticatedLayout>
            </ProtectedRoute>
          } />

          {/* Default route */}
          <Route path="/" element={<Navigate to="/login" replace />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;