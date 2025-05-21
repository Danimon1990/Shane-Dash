import React from 'react';

const TabContent = ({ activeTab }) => {
  // Sample data - in a real app, this would come from your backend
  const clients = [
    { id: 1, name: 'John Doe', email: 'john@example.com', dateStarted: '2024-01-15', age: 35 },
    { id: 2, name: 'Jane Smith', email: 'jane@example.com', dateStarted: '2024-02-20', age: 42 },
    // Add more clients as needed
  ];

  const associates = [
    { id: 1, name: 'Silvia Popa', specialty: 'Clinical Psychology' },
    { id: 2, name: 'Dahkotahv Beckham', specialty: 'Family Therapy' },
    { id: 3, name: 'Avery Williams', specialty: 'Child Psychology' },
    { id: 4, name: 'Nicole Mosher', specialty: 'Couples Therapy' },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'clients':
        return (
          <div className="w-full p-8">
            <h2 className="text-2xl font-bold mb-4">Clients</h2>
            <div className="space-y-4">
              {clients.map(client => (
                <div key={client.id} className="bg-white p-6 rounded-lg shadow hover:bg-gray-50 transition-colors">
                  <div className="flex flex-col gap-4">
                    <div className="flex justify-between items-start">
                      <h3 className="font-semibold text-lg">{client.name}</h3>
                      <span className="text-sm text-gray-500">Age: {client.age}</span>
                    </div>
                    <div className="flex flex-col gap-2">
                      <p className="text-gray-600">{client.email}</p>
                      <p className="text-sm text-gray-500">
                        Started: {new Date(client.dateStarted).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
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
            <h2 className="text-2xl font-bold mb-4">Clinical Forms</h2>
            <p>Clinical forms will be displayed here.</p>
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