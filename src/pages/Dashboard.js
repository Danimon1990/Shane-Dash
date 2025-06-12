import React, { useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import TabContent from '../components/TabContent';
import Clients from './Clients';
import Associates from './Associates';
import Billing from './Billing';
import AdminPanel from './AdminPanel';
import Calendar from './Calendar';
import ClinicalForms from './ClinicalForms';
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
              <Route path="clients" element={<Clients />} />
              <Route path="associates" element={<Associates />} />
              <Route path="billing" element={<Billing />} />
              <Route path="admin" element={<AdminPanel />} />
              <Route path="calendar" element={<Calendar />} />
              <Route path="clinical-forms" element={<ClinicalForms />} />
              <Route path="forms/ai-summary" element={<AISummary />} />
            </Routes>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Dashboard; 