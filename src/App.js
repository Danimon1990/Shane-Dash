// src/App.js
import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import TabContent from './components/TabContent';
import { AuthProvider } from './contexts/AuthContext';

function App() {
  const [activeTab, setActiveTab] = useState('clients');

  return (
    <AuthProvider>
      <div className="min-h-screen bg-gray-100">
        <div className="flex">
          {/* Left column - Sidebar */}
          <div className="w-64 bg-gray-800 text-white">
            <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />
          </div>

          {/* Right column - Content */}
          <main className="flex-1 bg-white">
            <div className="p-8">
              <TabContent activeTab={activeTab} />
            </div>
          </main>
        </div>
      </div>
    </AuthProvider>
  );
}

export default App;