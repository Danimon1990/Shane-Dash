import React, { useState } from 'react';

const Associates = () => {
  const [associates, setAssociates] = useState([
    // Sample data - will be replaced with Google Sheets data
    {
      id: 1,
      name: 'Dr. Sarah Johnson',
      email: 'sarah.johnson@example.com',
      phone: '123-456-7890',
      clients: [
        { id: 1, name: 'John Doe' },
        { id: 2, name: 'Jane Smith' }
      ],
      schedule: [
        {
          day: 'Monday',
          slots: [
            { time: '9:00 AM', client: 'John Doe' },
            { time: '10:00 AM', client: 'Jane Smith' }
          ]
        }
      ],
      timeSheets: [
        {
          date: '2023-01-15',
          hours: 8,
          clients: ['John Doe', 'Jane Smith']
        }
      ]
    }
  ]);

  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedAssociate, setSelectedAssociate] = useState(null);

  return (
    <div className="container mx-auto px-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Associates</h1>
        <button
          onClick={() => setShowAddForm(true)}
          className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700"
        >
          Add New Associate
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Associates List */}
        <div className="md:col-span-1 bg-white rounded-lg shadow p-4">
          <h2 className="text-xl font-semibold mb-4">Associates List</h2>
          <div className="space-y-2">
            {associates.map(associate => (
              <div
                key={associate.id}
                className={`p-3 rounded cursor-pointer ${
                  selectedAssociate?.id === associate.id
                    ? 'bg-indigo-100'
                    : 'hover:bg-gray-100'
                }`}
                onClick={() => setSelectedAssociate(associate)}
              >
                <div className="font-medium">{associate.name}</div>
                <div className="text-sm text-gray-500">
                  {associate.clients.length} clients
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Associate Details */}
        {selectedAssociate && (
          <div className="md:col-span-2 bg-white rounded-lg shadow p-4">
            <h2 className="text-xl font-semibold mb-4">Associate Details</h2>
            <div className="space-y-6">
              {/* Profile Data Section */}
              <section>
                <h3 className="text-lg font-medium mb-2">Profile Data</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-gray-500">Name</label>
                    <div>{selectedAssociate.name}</div>
                  </div>
                  <div>
                    <label className="text-sm text-gray-500">Email</label>
                    <div>{selectedAssociate.email}</div>
                  </div>
                  <div>
                    <label className="text-sm text-gray-500">Phone</label>
                    <div>{selectedAssociate.phone}</div>
                  </div>
                </div>
                <button className="mt-2 text-indigo-600 hover:text-indigo-800">
                  Edit
                </button>
              </section>

              {/* Clients Section */}
              <section>
                <h3 className="text-lg font-medium mb-2">Clients</h3>
                <div className="space-y-2">
                  {selectedAssociate.clients.map(client => (
                    <div
                      key={client.id}
                      className="p-2 bg-gray-50 rounded"
                    >
                      {client.name}
                    </div>
                  ))}
                </div>
                <button className="mt-2 text-indigo-600 hover:text-indigo-800">
                  Edit Clients
                </button>
              </section>

              {/* Schedule Section */}
              <section>
                <h3 className="text-lg font-medium mb-2">Schedule</h3>
                <div className="space-y-4">
                  {selectedAssociate.schedule.map((day, index) => (
                    <div key={index} className="border-b pb-4">
                      <h4 className="font-medium mb-2">{day.day}</h4>
                      <div className="space-y-2">
                        {day.slots.map((slot, slotIndex) => (
                          <div
                            key={slotIndex}
                            className="flex justify-between items-center p-2 bg-gray-50 rounded"
                          >
                            <span>{slot.time}</span>
                            <span>{slot.client}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                <button className="mt-2 text-indigo-600 hover:text-indigo-800">
                  Edit Schedule
                </button>
              </section>

              {/* Time Sheets Section */}
              <section>
                <h3 className="text-lg font-medium mb-2">Time Sheets</h3>
                <div className="space-y-4">
                  {selectedAssociate.timeSheets.map((sheet, index) => (
                    <div
                      key={index}
                      className="border-b pb-4"
                    >
                      <div className="flex justify-between items-center">
                        <span className="font-medium">{sheet.date}</span>
                        <span>{sheet.hours} hours</span>
                      </div>
                      <div className="mt-2 text-sm text-gray-500">
                        Clients: {sheet.clients.join(', ')}
                      </div>
                    </div>
                  ))}
                </div>
                <button className="mt-2 text-indigo-600 hover:text-indigo-800">
                  Add Time Sheet
                </button>
              </section>
            </div>
          </div>
        )}
      </div>

      {/* Add New Associate Form */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h2 className="text-xl font-semibold mb-4">Add New Associate</h2>
            <form className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Name
                </label>
                <input
                  type="text"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Email
                </label>
                <input
                  type="email"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Phone
                </label>
                <input
                  type="tel"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                >
                  Add Associate
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Associates;
