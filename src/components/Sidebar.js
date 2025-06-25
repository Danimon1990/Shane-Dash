// src/components/Sidebar.js
import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getNavigationForRole, getRoleDisplayName, ROLES } from '../config/roles';

const Sidebar = ({ activeTab }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser, logout } = useAuth();

  // Get navigation items based on user role
  const navItems = getNavigationForRole(currentUser?.role);

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
          {navItems.map((item) => (
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
          {currentUser?.role && (
            <div className="text-xs text-blue-300">
              {getRoleDisplayName(currentUser.role)}
            </div>
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