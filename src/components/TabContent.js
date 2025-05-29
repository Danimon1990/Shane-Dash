import React from 'react';
import { useNavigate } from 'react-router-dom';
import Clients from '../pages/Clients';

const TabContent = ({ activeTab }) => {
  const navigate = useNavigate();

  // Sample data for associates only
  const associates = [
    { id: 1, name: 'Silvia Popa', specialty: 'Clinical Psychology' },
    { id: 2, name: 'Dahkotahv Beckham', specialty: 'Family Therapy' },
    { id: 3, name: 'Avery Williams', specialty: 'Child Psychology' },
    { id: 4, name: 'Nicole Mosher', specialty: 'Couples Therapy' },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'clients':
        return <Clients />;
      case 'associates':
        return (
          <div className="w-full p-8">
            <h2 className="text-2xl font-bold mb-4">Associates</h2>
            <div className="flex flex-wrap gap-6">
              {associates.map(associate => (
                <div key={associate.id} className="bg-white p-6 rounded-lg shadow w-full md:w-1/4">
                  <h3 className="font-semibold text-lg">{associate.name}</h3>
                  <p className="text-gray-600">{associate.specialty}</p>
                </div>
              ))}
            </div>
          </div>
        );
      case 'billing':
        return (
          <div className="w-full p-8">
            <h2 className="text-2xl font-bold mb-4">Billing</h2>
            <p>Billing information will be displayed here.</p>
          </div>
        );
      case 'calendar':
        return (
          <div className="w-full p-8">
            <h2 className="text-2xl font-bold mb-4">Calendar</h2>
            <p>Calendar view will be displayed here.</p>
          </div>
        );
      case 'forms':
        return (
          <div className="w-full p-8">
            <h2 className="text-2xl font-bold mb-4">Forms</h2>
            <ul className="list-disc pl-6 text-lg">
              <li className="mb-2">
                <button className="text-indigo-600 hover:underline" onClick={() => navigate('/forms/ai-summary')}>
                  AI summary
                </button>
              </li>
              <li>progress-integration</li>
            </ul>
          </div>
        );
      case 'admin':
        return (
          <div className="w-full p-8">
            <h2 className="text-2xl font-bold mb-4">Admin Panel</h2>
            <p>Admin controls will be displayed here.</p>
          </div>
        );
      default:
        return (
          <div className="w-full p-8">
            <h2 className="text-2xl font-bold mb-4">Welcome</h2>
            <p>Please select a tab to view its contents.</p>
          </div>
        );
    }
  };

  return (
    <div className="mt-28 w-full"> {/* Add margin-top to account for fixed navbar and tabs */}
      {renderContent()}
    </div>
  );
};

export default TabContent; 