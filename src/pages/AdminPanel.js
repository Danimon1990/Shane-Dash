import React, { useState } from 'react';

const AdminPanel = () => {
  const [activeTab, setActiveTab] = useState('users');
  const [selectedUser, setSelectedUser] = useState(null);

  const users = [
    // Sample data - will be replaced with Google Workspace data
    {
      id: 1,
      name: 'John Doe',
      email: 'john.doe@example.com',
      role: 'admin',
      status: 'Active',
      lastLogin: '2023-01-15 10:30 AM'
    }
  ];

  return (
    <div className="container mx-auto px-4">
      <h1 className="text-2xl font-bold mb-6">Admin Panel</h1>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('users')}
            className={`${
              activeTab === 'users'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
          >
            Users
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`${
              activeTab === 'settings'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
          >
            Settings
          </button>
          <button
            onClick={() => setActiveTab('integrations')}
            className={`${
              activeTab === 'integrations'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
          >
            Integrations
          </button>
        </nav>
      </div>

      {activeTab === 'users' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Users List */}
          <div className="md:col-span-1 bg-white rounded-lg shadow p-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Users</h2>
              <button className="text-indigo-600 hover:text-indigo-800">
                Add User
              </button>
            </div>
            <div className="space-y-2">
              {users.map(user => (
                <div
                  key={user.id}
                  className={`p-3 rounded cursor-pointer ${
                    selectedUser?.id === user.id
                      ? 'bg-indigo-100'
                      : 'hover:bg-gray-100'
                  }`}
                  onClick={() => setSelectedUser(user)}
                >
                  <div className="font-medium">{user.name}</div>
                  <div className="text-sm text-gray-500">{user.role}</div>
                </div>
              ))}
            </div>
          </div>

          {/* User Details */}
          {selectedUser && (
            <div className="md:col-span-2 bg-white rounded-lg shadow p-4">
              <h2 className="text-xl font-semibold mb-4">User Details</h2>
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-gray-500">Name</label>
                    <div>{selectedUser.name}</div>
                  </div>
                  <div>
                    <label className="text-sm text-gray-500">Email</label>
                    <div>{selectedUser.email}</div>
                  </div>
                  <div>
                    <label className="text-sm text-gray-500">Role</label>
                    <div>{selectedUser.role}</div>
                  </div>
                  <div>
                    <label className="text-sm text-gray-500">Status</label>
                    <div>{selectedUser.status}</div>
                  </div>
                  <div>
                    <label className="text-sm text-gray-500">Last Login</label>
                    <div>{selectedUser.lastLogin}</div>
                  </div>
                </div>
                <div className="flex space-x-3">
                  <button className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700">
                    Edit User
                  </button>
                  <button className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50">
                    Reset Password
                  </button>
                  <button className="px-4 py-2 border border-red-300 rounded text-red-700 hover:bg-red-50">
                    Delete User
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Settings</h2>
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium mb-2">General Settings</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Practice Name
                  </label>
                  <input
                    type="text"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Time Zone
                  </label>
                  <select className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500">
                    <option>Eastern Time (ET)</option>
                    <option>Central Time (CT)</option>
                    <option>Mountain Time (MT)</option>
                    <option>Pacific Time (PT)</option>
                  </select>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-medium mb-2">Email Settings</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    SMTP Server
                  </label>
                  <input
                    type="text"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    SMTP Port
                  </label>
                  <input
                    type="number"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <button className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700">
                Save Settings
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'integrations' && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Integrations</h2>
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium mb-2">Google Workspace</h3>
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded">
                <div>
                  <div className="font-medium">Google Workspace</div>
                  <div className="text-sm text-gray-500">
                    Connect your Google Workspace account
                  </div>
                </div>
                <button className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700">
                  Connect
                </button>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-medium mb-2">Google Calendar</h3>
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded">
                <div>
                  <div className="font-medium">Google Calendar</div>
                  <div className="text-sm text-gray-500">
                    Connect your Google Calendar
                  </div>
                </div>
                <button className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700">
                  Connect
                </button>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-medium mb-2">Google Sheets</h3>
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded">
                <div>
                  <div className="font-medium">Google Sheets</div>
                  <div className="text-sm text-gray-500">
                    Connect your Google Sheets
                  </div>
                </div>
                <button className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700">
                  Connect
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
