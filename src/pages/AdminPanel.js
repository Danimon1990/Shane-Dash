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
    <div className="flex">
      <div className="flex-1 p-8">
        <div className="container mx-auto">
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

          {/* Tab Content */}
          {activeTab === 'users' && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">Users</h2>
              <div className="space-y-4">
                {users.map(user => (
                  <div key={user.id} className="border-b pb-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm text-gray-500">Name</label>
                        <div>{user.name}</div>
                      </div>
                      <div>
                        <label className="text-sm text-gray-500">Email</label>
                        <div>{user.email}</div>
                      </div>
                      <div>
                        <label className="text-sm text-gray-500">Role</label>
                        <div className="capitalize">{user.role}</div>
                      </div>
                      <div>
                        <label className="text-sm text-gray-500">Status</label>
                        <div>{user.status}</div>
                      </div>
                      <div>
                        <label className="text-sm text-gray-500">Last Login</label>
                        <div>{user.lastLogin}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
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
                        defaultValue="Shane Bruce Office"
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
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;
