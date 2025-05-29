// src/pages/Clients.js
import React, { useState, useEffect } from 'react';

const Clients = () => {
  const [activeFilter, setActiveFilter] = useState(true);
  const [selectedClient, setSelectedClient] = useState(null);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchSheetData = async () => {
      try {
        console.log('Starting to fetch data from Firebase Function...');
        const response = await fetch('https://us-central1-therapist-online.cloudfunctions.net/getSheetData');
        console.log('Response status:', response.status);
        const data = await response.json();
        console.log('Received data from Firebase Function:', data);
        
        if (Array.isArray(data) && data.length > 0) {
          console.log('Setting clients with data:', data);
          setClients(data);
        } else {
          console.log('No data received or empty array');
          setClients([]);
        }
        setLoading(false);
      } catch (err) {
        console.error('Error fetching sheet data:', err);
        setError(err.message);
        setLoading(false);
      }
    };

    fetchSheetData();
  }, []);

  const filteredClients = clients.filter(client => client.active === activeFilter);

  if (loading) return <div className="container mx-auto px-4">Loading...</div>;
  if (error) return <div className="container mx-auto px-4">Error: {error}</div>;

  return (
    <div className="container mx-auto px-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Clients</h1>
        <div className="flex items-center space-x-4">
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={activeFilter}
              onChange={() => setActiveFilter(!activeFilter)}
              className="form-checkbox h-5 w-5 text-indigo-600"
            />
            <span>Show Active Clients</span>
          </label>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Client List */}
        <div className="md:col-span-1 bg-white rounded-lg shadow p-4">
          <h2 className="text-xl font-semibold mb-4">Client List</h2>
          <div className="space-y-2">
            {filteredClients.map(client => (
              <div
                key={client.id}
                className={`p-3 rounded cursor-pointer ${
                  selectedClient?.id === client.id
                    ? 'bg-indigo-100'
                    : 'hover:bg-gray-100'
                }`}
                onClick={() => setSelectedClient(client)}
              >
                <div className="font-medium">{client.name}</div>
                <div className="text-sm text-gray-500">
                  {client.data.insurance}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Client Details */}
        {selectedClient && (
          <div className="md:col-span-2 bg-white rounded-lg shadow p-4">
            <h2 className="text-xl font-semibold mb-4">Client Details</h2>
            <div className="space-y-6">
              {/* Data Section */}
              <section>
                <h3 className="text-lg font-medium mb-2">Data</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-gray-500">First Name</label>
                    <div>{selectedClient.data.firstName}</div>
                  </div>
                  <div>
                    <label className="text-sm text-gray-500">Last Name</label>
                    <div>{selectedClient.data.lastName}</div>
                  </div>
                  <div>
                    <label className="text-sm text-gray-500">Therapist</label>
                    <div>{selectedClient.data.therapist}</div>
                  </div>
                  <div>
                    <label className="text-sm text-gray-500">Phone</label>
                    <div>{selectedClient.data.phone}</div>
                  </div>
                  <div>
                    <label className="text-sm text-gray-500">Email</label>
                    <div>{selectedClient.data.email}</div>
                  </div>
                  <div>
                    <label className="text-sm text-gray-500">Birth Date</label>
                    <div>{selectedClient.data.birthDate}</div>
                  </div>
                </div>
                <button className="mt-2 text-indigo-600 hover:text-indigo-800">
                  Edit
                </button>
              </section>

              {/* Therapist Section */}
              <section>
                <h3 className="text-lg font-medium mb-2">Therapist</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-gray-500">Therapist</label>
                    <div>{selectedClient.therapist.name}</div>
                  </div>
                  <div>
                    <label className="text-sm text-gray-500">Start Date</label>
                    <div>{selectedClient.therapist.startDate}</div>
                  </div>
                </div>
                <button className="mt-2 text-indigo-600 hover:text-indigo-800">
                  Edit
                </button>
              </section>

              {/* Insurance Section */}
              <section>
                <h3 className="text-lg font-medium mb-2">Insurance</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-gray-500">Provider</label>
                    <div>{selectedClient.insurance.provider}</div>
                  </div>
                  <div>
                    <label className="text-sm text-gray-500">ID Number</label>
                    <div>{selectedClient.insurance.idNumber}</div>
                  </div>
                  <div>
                    <label className="text-sm text-gray-500">Copay</label>
                    <div>{selectedClient.insurance.copay}</div>
                  </div>
                  <div>
                    <label className="text-sm text-gray-500">Deductible</label>
                    <div>{selectedClient.insurance.deductible}</div>
                  </div>
                  <div>
                    <label className="text-sm text-gray-500">Insurance</label>
                    <div>{selectedClient.insurance.insurance}</div>
                  </div>
                </div>
                <button className="mt-2 text-indigo-600 hover:text-indigo-800">
                  Edit
                </button>
              </section>

              {/* Medical Information Section */}
              <section>
                <h3 className="text-lg font-medium mb-2">Medical Information</h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm text-gray-500">Diagnosis</label>
                    <div className="mt-1">{selectedClient.medicalInfo.diagnosis}</div>
                  </div>
                  <div>
                    <label className="text-sm text-gray-500">CPT</label>
                    <div className="mt-1">{selectedClient.medicalInfo.cpt}</div>
                  </div>
                </div>
                <button className="mt-2 text-indigo-600 hover:text-indigo-800">
                  Edit
                </button>
              </section>

              {/* Concerns Section */}
              <section>
                <h3 className="text-lg font-medium mb-2">Concerns</h3>
                <div className="mt-1">{selectedClient.concerns}</div>
                <button className="mt-2 text-indigo-600 hover:text-indigo-800">
                  Edit
                </button>
              </section>

              {/* Treatment Plan Section */}
              <section>
                <h3 className="text-lg font-medium mb-2">Treatment Plan</h3>
                <div className="mt-1">{selectedClient.treatmentPlan}</div>
                <button className="mt-2 text-indigo-600 hover:text-indigo-800">
                  Edit
                </button>
              </section>

              {/* Progress Notes Section */}
              <section>
                <h3 className="text-lg font-medium mb-2">Progress Notes</h3>
                <div className="space-y-4">
                  {selectedClient.progressNotes.map((note, index) => (
                    <div key={index} className="border-b pb-4">
                      <div className="text-sm text-gray-500">{note.date}</div>
                      <div className="mt-1">{note.note}</div>
                    </div>
                  ))}
                </div>
                <button className="mt-4 text-indigo-600 hover:text-indigo-800">
                  Add New Note
                </button>
              </section>

              {/* Closure Section */}
              <section>
                <h3 className="text-lg font-medium mb-2">Closure</h3>
                <div className="space-y-4">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={!selectedClient.closure.isActive}
                      onChange={() => {
                        // TODO: Implement closure toggle
                      }}
                      className="form-checkbox h-5 w-5 text-indigo-600"
                    />
                    <span className="ml-2">Mark as Inactive</span>
                  </div>
                  {!selectedClient.closure.isActive && (
                    <div className="space-y-2">
                      <div>
                        <label className="text-sm text-gray-500">Closure Date</label>
                        <div>{selectedClient.closure.date}</div>
                      </div>
                      <div>
                        <label className="text-sm text-gray-500">Closure Notes</label>
                        <div>{selectedClient.closure.notes}</div>
                      </div>
                    </div>
                  )}
                </div>
                <button className="mt-2 text-indigo-600 hover:text-indigo-800">
                  Edit
                </button>
              </section>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Clients;
