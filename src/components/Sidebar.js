// src/components/Sidebar.js
import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Sidebar = ({ activeTab }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser, logout } = useAuth();

  // Define the list of therapists to match other components
  const therapistList = [
    'Shane Bruce',
    'Silvia Popa',
    'Dahkotahv Beckham',
    'Avery Williams',
    'Nicole Mosher'
  ];

  // Check if user is a therapist (by role or name)
  const isTherapist = currentUser?.role === 'therapist' || therapistList.includes(currentUser?.name);

  // Check if user is a billing user
  const isBilling = currentUser?.role === 'billing';

  // If billing, only show Billing tab
  const navItems = isBilling
    ? [
        { id: 'billing', label: 'Billing', path: '/billing', adminOnly: false, hideForTherapist: false },
      ]
    : [
        { id: 'clients', label: 'Clients', path: '/clients', adminOnly: false, hideForTherapist: true },
        { id: 'associates', label: 'Associates', path: '/associates', adminOnly: false, hideForTherapist: false },
        { id: 'billing', label: 'Billing', path: '/billing', adminOnly: false, hideForTherapist: true },
        { id: 'admin', label: 'Admin', path: '/admin', adminOnly: true, hideForTherapist: false },
        { id: 'calendar', label: 'Calendar', path: '/calendar', adminOnly: false, hideForTherapist: false },
        { id: 'forms', label: 'Clinical Forms', path: '/forms', adminOnly: true, hideForTherapist: false },
      ];

  // Filter nav items based on user role
  const filteredNavItems = navItems.filter(item => {
    // Hide admin-only items for non-admin users
    if (item.adminOnly && currentUser?.role !== 'admin') {
      return false;
    }
    
    // Hide therapist-restricted items for therapist users
    if (item.hideForTherapist && isTherapist && currentUser?.role !== 'admin') {
      return false;
    }
    
    return true;
  });

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Get current path without leading slash
  const currentPath = location.pathname.slice(1);

  return (
    <div className="w-64 min-h-screen bg-gray-800 text-white flex flex-col py-8 px-4">
      <h1 className="text-2xl font-bold mb-10">Shane Bruce Office</h1>
      <nav className="flex-1">
        <ul className="space-y-2">
          {filteredNavItems.map((item) => (
            <li key={item.id}>
              <button
                onClick={() => navigate(item.path)}
                className={`w-full text-left px-4 py-2 rounded transition-colors font-medium focus:outline-none focus:ring-2 focus:ring-indigo-400 ${
                  currentPath === item.id ? 'bg-gray-700' : 'hover:bg-gray-700'
                }`}
              >
                {item.label}
              </button>
            </li>
          ))}
        </ul>
      </nav>
      
      {/* User Profile and Logout Section - Always visible */}
      <div className="mt-auto border-t border-gray-700 pt-4">
        <div className="px-4 py-2 text-sm text-gray-300">
          {currentUser?.name || currentUser?.email}
          {isTherapist && currentUser?.role !== 'admin' && (
            <div className="text-xs text-blue-300">Therapist</div>
          )}
        </div>
        <button
          onClick={handleLogout}
          className="w-full text-left px-4 py-2 rounded transition-colors font-medium hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-400 text-red-400 hover:text-red-300"
        >
          Logout
        </button>
      </div>
    </div>
  );
};

export default Sidebar;