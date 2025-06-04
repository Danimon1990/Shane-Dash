import React, { useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import TabContent from '../components/TabContent';
import AISummary from './AISummary';

const Dashboard = () => {
  const [activeTab, setActiveTab] = useState('clients');

  return (
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
              <Route path="/" element={<TabContent activeTab={activeTab} />} />
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
  );
};

export default Dashboard; 