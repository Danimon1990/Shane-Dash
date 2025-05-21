import React, { useState } from 'react';

const Billing = () => {
  const [activeTab, setActiveTab] = useState('clients');
  const [selectedClient, setSelectedClient] = useState(null);
  const [selectedAssociate, setSelectedAssociate] = useState(null);

  const clients = [
    // Sample data - will be replaced with Google Sheets data
    {
      id: 1,
      name: 'John Doe',
      insurance: {
        name: 'Blue Cross',
        policy: '123456',
        rate: 100
      },
      billing: {
        sessions: [
          {
            date: '2023-01-15',
            therapist: 'Dr. Sarah Johnson',
            amount: 100,
            status: 'Paid'
          }
        ],
        totalAmount: 100,
        paidAmount: 100,
        outstandingAmount: 0
      }
    }
  ];

  const associates = [
    // Sample data - will be replaced with Google Sheets data
    {
      id: 1,
      name: 'Dr. Sarah Johnson',
      billing: {
        sessions: [
          {
            date: '2023-01-15',
            client: 'John Doe',
            amount: 100,
            status: 'Paid'
          }
        ],
        totalAmount: 100,
        paidAmount: 100,
        outstandingAmount: 0
      }
    }
  ];

  return (
    <div className="container mx-auto px-4">
      <h1 className="text-2xl font-bold mb-6">Billing</h1>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('clients')}
            className={`${
              activeTab === 'clients'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
          >
            Clients
          </button>
          <button
            onClick={() => setActiveTab('associates')}
            className={`${
              activeTab === 'associates'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
          >
            Associates
          </button>
        </nav>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* List Section */}
        <div className="md:col-span-1 bg-white rounded-lg shadow p-4">
          <h2 className="text-xl font-semibold mb-4">
            {activeTab === 'clients' ? 'Clients' : 'Associates'} List
          </h2>
          <div className="space-y-2">
            {activeTab === 'clients'
              ? clients.map(client => (
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
                      {client.insurance.name}
                    </div>
                  </div>
                ))
              : associates.map(associate => (
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
                      ${associate.billing.totalAmount} total
                    </div>
                  </div>
                ))}
          </div>
        </div>

        {/* Details Section */}
        <div className="md:col-span-2 bg-white rounded-lg shadow p-4">
          {activeTab === 'clients' && selectedClient ? (
            <>
              <h2 className="text-xl font-semibold mb-4">Client Billing Details</h2>
              <div className="space-y-6">
                {/* Insurance Information */}
                <section>
                  <h3 className="text-lg font-medium mb-2">Insurance Information</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm text-gray-500">Insurance Provider</label>
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
                </section>

                {/* Billing Summary */}
                <section>
                  <h3 className="text-lg font-medium mb-2">Billing Summary</h3>
                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div className="bg-gray-50 p-4 rounded">
                      <div className="text-sm text-gray-500">Total Amount</div>
                      <div className="text-xl font-semibold">
                        ${selectedClient.billing.totalAmount}
                      </div>
                    </div>
                    <div className="bg-gray-50 p-4 rounded">
                      <div className="text-sm text-gray-500">Paid Amount</div>
                      <div className="text-xl font-semibold">
                        ${selectedClient.billing.paidAmount}
                      </div>
                    </div>
                    <div className="bg-gray-50 p-4 rounded">
                      <div className="text-sm text-gray-500">Outstanding</div>
                      <div className="text-xl font-semibold">
                        ${selectedClient.billing.outstandingAmount}
                      </div>
                    </div>
                  </div>
                </section>

                {/* Sessions */}
                <section>
                  <h3 className="text-lg font-medium mb-2">Sessions</h3>
                  <div className="space-y-4">
                    {selectedClient.billing.sessions.map((session, index) => (
                      <div
                        key={index}
                        className="border-b pb-4"
                      >
                        <div className="flex justify-between items-center">
                          <div>
                            <div className="font-medium">{session.date}</div>
                            <div className="text-sm text-gray-500">
                              {session.therapist}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-medium">${session.amount}</div>
                            <div
                              className={`text-sm ${
                                session.status === 'Paid'
                                  ? 'text-green-600'
                                  : 'text-red-600'
                              }`}
                            >
                              {session.status}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            </>
          ) : activeTab === 'associates' && selectedAssociate ? (
            <>
              <h2 className="text-xl font-semibold mb-4">Associate Billing Details</h2>
              <div className="space-y-6">
                {/* Billing Summary */}
                <section>
                  <h3 className="text-lg font-medium mb-2">Billing Summary</h3>
                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div className="bg-gray-50 p-4 rounded">
                      <div className="text-sm text-gray-500">Total Amount</div>
                      <div className="text-xl font-semibold">
                        ${selectedAssociate.billing.totalAmount}
                      </div>
                    </div>
                    <div className="bg-gray-50 p-4 rounded">
                      <div className="text-sm text-gray-500">Paid Amount</div>
                      <div className="text-xl font-semibold">
                        ${selectedAssociate.billing.paidAmount}
                      </div>
                    </div>
                    <div className="bg-gray-50 p-4 rounded">
                      <div className="text-sm text-gray-500">Outstanding</div>
                      <div className="text-xl font-semibold">
                        ${selectedAssociate.billing.outstandingAmount}
                      </div>
                    </div>
                  </div>
                </section>

                {/* Sessions */}
                <section>
                  <h3 className="text-lg font-medium mb-2">Sessions</h3>
                  <div className="space-y-4">
                    {selectedAssociate.billing.sessions.map((session, index) => (
                      <div
                        key={index}
                        className="border-b pb-4"
                      >
                        <div className="flex justify-between items-center">
                          <div>
                            <div className="font-medium">{session.date}</div>
                            <div className="text-sm text-gray-500">
                              {session.client}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-medium">${session.amount}</div>
                            <div
                              className={`text-sm ${
                                session.status === 'Paid'
                                  ? 'text-green-600'
                                  : 'text-red-600'
                              }`}
                            >
                              {session.status}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            </>
          ) : (
            <div className="text-center text-gray-500">
              Select a {activeTab === 'clients' ? 'client' : 'associate'} to view details
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Billing;
