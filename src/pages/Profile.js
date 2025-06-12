import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import ChangePassword from '../components/ChangePassword';

const Profile = () => {
  const { user } = useAuth();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <h1 className="text-2xl font-bold mb-6 text-center">Profile</h1>
        {/* User Information */}
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">User Information</h2>
          <div>
            <label className="block text-sm font-medium text-gray-700">Email</label>
            <div className="mt-1 text-gray-900">{user?.email}</div>
          </div>
        </div>
        {/* Change Password Section */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Change Password</h2>
          <ChangePassword />
        </div>
      </div>
    </div>
  );
};

export default Profile; 