// src/components/Sidebar.js
import React from 'react';
import { useNavigate } from 'react-router-dom';

const Sidebar = ({ activeTab, onTabChange }) => {
  const navItems = [
    { id: 'clients', label: 'Clients' },
    { id: 'associates', label: 'Associates' },
    { id: 'billing', label: 'Billing' },
    { id: 'admin', label: 'Admin' },
    { id: 'calendar', label: 'Calendar' },
    { id: 'forms', label: 'Clinical Forms' },
  ];

  const navigate = useNavigate();

  return (
    <div className="w-64 min-h-screen bg-gray-800 text-white flex flex-col py-8 px-4">
      <h1 className="text-2xl font-bold mb-10">Shane Bruce Office</h1>
      <nav className="flex-1">
        <ul className="space-y-2">
          {navItems.map((item) => (
            <li key={item.id}>
              <button
                onClick={() => navigate('/' + item.id)}
                className={`w-full text-left px-4 py-2 rounded transition-colors font-medium focus:outline-none focus:ring-2 focus:ring-indigo-400 ${
                  activeTab === item.id ? 'bg-gray-700' : 'hover:bg-gray-700'
                }`}
              >
                {item.label}
              </button>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
};

export default Sidebar;