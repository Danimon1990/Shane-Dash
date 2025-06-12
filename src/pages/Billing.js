import React, { useState, useEffect } from 'react';

const Billing = () => {
  const [billingData, setBillingData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedClient, setSelectedClient] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        console.log('Fetching data from Firebase Function...');
        const response = await fetch('https://us-central1-therapist-online.cloudfunctions.net/getSheetData');
        const data = await response.json();
        console.log('Raw data from Firebase:', data);
        
        if (Array.isArray(data)) {
          setBillingData(data);
        }
        setLoading(false);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError(err.message);
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleClientClick = (client) => {
    setSelectedClient(client);
  };

  const filteredClients = billingData.filter(client => {
    const fullName = `${client.data.firstName} ${client.data.lastName}`.toLowerCase();
    return fullName.includes(searchTerm.toLowerCase());
  });

  if (loading) return (
    <div className="flex">
      <div className="flex-1 p-8">Loading...</div>
    </div>
  );
  
  if (error) return (
    <div className="flex">
      <div className="flex-1 p-8">Error: {error}</div>
    </div>
  );

  return (
    <div className="flex">
      <div className="flex-1 p-8">
        <div className="container mx-auto">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold">Billing</h1>
            <div className="w-64">
              <input
                type="text"
                placeholder="Search clients..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Clients List */}
            <div className="md:col-span-1 bg-white rounded-lg shadow p-4">
              <h2 className="text-xl font-semibold mb-4">Clients List</h2>
              <div className="space-y-2">
                {filteredClients.map(client => (
                  <div
                    key={client.id}
                    className={`p-3 rounded cursor-pointer ${
                      selectedClient?.id === client.id
                        ? 'bg-indigo-100'
                        : 'hover:bg-gray-100'
                    }`}
                    onClick={() => handleClientClick(client)}
                  >
                    <div className="font-medium">
                      {client.data.firstName} {client.data.lastName}
                    </div>
                    <div className="text-sm text-gray-500">
                      Insurance: {client.insurance.provider}
                    </div>
                    <div className="text-sm text-gray-500">
                      Therapist: {client.therapist?.name || 'Unassigned'}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Billing Details */}
            {selectedClient && (
              <div className="md:col-span-2 bg-white rounded-lg shadow p-4">
                <h2 className="text-xl font-semibold mb-4">Billing Details</h2>
                <div className="space-y-6">
                  {/* Insurance Information */}
                  <section>
                    <h3 className="text-lg font-medium mb-2">Insurance Information</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm text-gray-500">Provider</label>
                        <div>{selectedClient.insurance.provider}</div>
                      </div>
                      <div>
                        <label className="text-sm text-gray-500">Policy Number</label>
                        <div>{selectedClient.insurance.policyNumber}</div>
                      </div>
                      <div>
                        <label className="text-sm text-gray-500">Group Number</label>
                        <div>{selectedClient.insurance.groupNumber}</div>
                      </div>
                      <div>
                        <label className="text-sm text-gray-500">Member ID</label>
                        <div>{selectedClient.insurance.memberId}</div>
                      </div>
                    </div>
                  </section>

                  {/* Payment Information */}
                  <section>
                    <h3 className="text-lg font-medium mb-2">Payment Information</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm text-gray-500">Payment Option</label>
                        <div>{selectedClient.insurance.paymentOption}</div>
                      </div>
                      <div>
                        <label className="text-sm text-gray-500">Private Pay Rate</label>
                        <div>{selectedClient.insurance.privatePayRate}</div>
                      </div>
                      <div>
                        <label className="text-sm text-gray-500">Deductible</label>
                        <div>{selectedClient.insurance.deductible}</div>
                      </div>
                      <div>
                        <label className="text-sm text-gray-500">Copay</label>
                        <div>{selectedClient.insurance.copay}</div>
                      </div>
                    </div>
                  </section>

                  {/* Billing History */}
                  <section>
                    <h3 className="text-lg font-medium mb-2">Billing History</h3>
                    <div className="space-y-4">
                      {selectedClient.billing?.history?.map((entry, index) => (
                        <div key={index} className="border-b pb-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="text-sm text-gray-500">Date</label>
                              <div>{entry.date}</div>
                            </div>
                            <div>
                              <label className="text-sm text-gray-500">Amount</label>
                              <div>${entry.amount}</div>
                            </div>
                            <div>
                              <label className="text-sm text-gray-500">Status</label>
                              <div className="capitalize">{entry.status}</div>
                            </div>
                            <div>
                              <label className="text-sm text-gray-500">Description</label>
                              <div>{entry.description}</div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Billing;
