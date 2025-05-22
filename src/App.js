// src/App.js
import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import TabContent from './components/TabContent';
import { AuthProvider } from './contexts/AuthContext';
import SignUp from './pages/SignUp';
import { Route, Routes, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import { BrowserRouter } from 'react-router-dom';

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
                  <Route path="/projects" element={<TabContent activeTab="projects" />} />
                  <Route path="/tasks" element={<TabContent activeTab="tasks" />} />
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