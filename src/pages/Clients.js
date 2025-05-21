// src/pages/Clients.js
import React, { useState } from 'react';

const Clients = () => {
  const [activeFilter, setActiveFilter] = useState(true);
  const [selectedClient, setSelectedClient] = useState(null);
  const [clients, setClients] = useState([
    // Sample data - will be replaced with Google Sheets data
    {
      id: 1,
      name: 'John Doe',
      active: true,
      data: {
        firstName: 'John',
        lastName: 'Doe',
        insurance: 'Blue Cross',
        phone: '123-456-7890',
        birthDate: '1990-01-01'
      },
      therapist: {
        name: 'Dr. Smith',
        startDate: '2023-01-01'
      },
      insurance: {
        name: 'Blue Cross',
        policy: '123456',
        rate: 100
      },
      medicalInfo: {
        conditions: ['Anxiety', 'Depression'],
        medications: ['Medication A', 'Medication B']
      },
      concerns: 'Patient is experiencing anxiety and depression symptoms',
      treatmentPlan: 'Weekly therapy sessions focusing on CBT techniques',
      progressNotes: [
        {
          date: '2023-01-15',
          note: 'Patient showed improvement in managing anxiety symptoms'
        }
      ],
      closure: {
        isActive: true,
        date: null,
        notes: ''
      }
    }
  ]);

  const filteredClients = clients.filter(client => client.active === activeFilter);

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
                    <label className="text-sm text-gray-500">Insurance</label>
                    <div>{selectedClient.data.insurance}</div>
                  </div>
                  <div>
                    <label className="text-sm text-gray-500">Phone</label>
                    <div>{selectedClient.data.phone}</div>
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
                    <label className="text-sm text-gray-500">Insurance Name</label>
                    <div>{selectedClient.insurance.name}</div>
                  </div>
                  <div>
                    <label className="text-sm text-gray-500">Policy Number</label>
                    <div>{selectedClient.insurance.policy}</div>
                  </div>
                  <div>
                    <label className="text-sm text-gray-500">Rate</label>
                    <div>${selectedClient.insurance.rate}</div>
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
                    <label className="text-sm text-gray-500">Conditions</label>
                    <div className="mt-1">
                      {selectedClient.medicalInfo.conditions.join(', ')}
                    </div>
                  </div>
                  <div>
                    <label className="text-sm text-gray-500">Medications</label>
                    <div className="mt-1">
                      {selectedClient.medicalInfo.medications.join(', ')}
                    </div>
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
