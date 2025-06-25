import React from 'react';
import { useAuth } from '../contexts/AuthContext';

const Home = () => {
  const { currentUser } = useAuth();
  return (
    <div className="flex flex-col items-center justify-center h-full mt-12">
      <h1 className="text-3xl font-bold mb-4">Welcome to the Shane Bruce Office Dashboard</h1>
      <p className="text-lg">Hello{currentUser?.name ? `, ${currentUser.name}` : ''}! We're glad to have you here.</p>
      <p className="mt-2 text-gray-600">Use the menu on the left to get started.</p>
    </div>
  );
};

export default Home; 