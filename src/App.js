// src/App.js
import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import TabContent from './components/TabContent';
import { AuthProvider } from './contexts/AuthContext';
import SignUp from './pages/SignUp';
import { Route, Routes, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import { BrowserRouter } from 'react-router-dom';
import AISummary from './pages/AISummary';

function App() {
  const [activeTab, setActiveTab] = useState('clients');

  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="min-h-screen bg-gray-100">
          <div className="flex">
            {/* Left column - Sidebar */}
            <div className="w-64 bg-gray-800 text-white">
              <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />
            </div>

            {/* Right column - Content */}
            <main className="flex-1 bg-white">
              <div className="p-8">
                <Routes>
                  <Route path="/" element={<Navigate to="/login" replace />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/signup" element={<SignUp />} />
                  <Route path="/clients" element={<TabContent activeTab="clients" />} />
                  <Route path="/associates" element={<TabContent activeTab="associates" />} />
                  <Route path="/billing" element={<TabContent activeTab="billing" />} />
                  <Route path="/admin" element={<TabContent activeTab="admin" />} />
                  <Route path="/calendar" element={<TabContent activeTab="calendar" />} />
                  <Route path="/forms" element={<TabContent activeTab="forms" />} />
                  <Route path="/forms/ai-summary" element={<AISummary />} />
                </Routes>
              </div>
            </main>
          </div>
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;