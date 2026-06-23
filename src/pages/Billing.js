import React, { useState, useEffect } from 'react';
import { useSecureData } from '../hooks/useSecureData';
import secureApiClient from '../utils/secureApiClient';

const Billing = () => {
  const { isAuthenticated, canPerform } = useSecureData();

  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClient, setSelectedClient] = useState(null);
  const [activeTab, setActiveTab] = useState('data');

  // Fetch all clients from Firestore via getPortalClients
  useEffect(() => {
    if (!isAuthenticated) {
      setLoading(false);
      setError('Authentication required');
      return;
    }
    if (!canPerform('view_billing')) {
      setLoading(false);
      setError('Insufficient permissions to view billing data');
      return;
    }
    setLoading(true);
    setError(null);
    secureApiClient.makeSecureRequest(
      secureApiClient.baseURLs.cloudFunctions.getPortalClients,
      { method: 'GET' }
    )
      .then(data => setClients(data.clients || []))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [isAuthenticated, canPerform]);

  const filteredClients = clients.filter(c => {
    const fullName = `${c.firstName} ${c.lastName}`.toLowerCase();
    return fullName.includes(searchTerm.toLowerCase());
  });

  const formatCurrency = (amount) => {
    if (!amount) return 'N/A';
    const num = parseFloat(amount);
    if (isNaN(num)) return amount;
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(num);
  };

  if (loading) return <div className="flex"><div className="flex-1 p-8">Loading...</div></div>;
  if (error) return <div className="flex"><div className="flex-1 p-8 text-red-600">Error: {error}</div></div>;

  return (
    <div className="flex">
      <div className="flex-1 p-8">
        <div className="container mx-auto">

          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-2xl font-bold">Billing Dashboard</h1>
              <p className="text-gray-600 mt-1">{filteredClients.length} clients</p>
            </div>
            <div className="w-64">
              <input
                type="text"
                placeholder="Search clients..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

            {/* Client List */}
            <div className="md:col-span-1 bg-white rounded-lg shadow p-4">
              <h2 className="text-xl font-semibold mb-4">
                Clients
                <span className="text-sm font-normal text-gray-500 ml-2">({filteredClients.length})</span>
              </h2>
              <div className="space-y-2 max-h-[600px] overflow-y-auto">
                {filteredClients.length === 0 ? (
                  <div className="text-gray-500 text-center py-4 text-sm">No clients found</div>
                ) : (
                  filteredClients.map(c => (
                    <div
                      key={c.uid}
                      className={`p-3 rounded cursor-pointer transition-colors ${
                        selectedClient?.uid === c.uid ? 'bg-indigo-100' : 'hover:bg-gray-100'
                      }`}
                      onClick={() => { setSelectedClient(c); setActiveTab('data'); }}
                    >
                      <div className="font-medium">{c.firstName} {c.lastName}</div>
                      <div className="text-sm text-gray-500">
                        {c.insuranceProvider || c.insuranceType || 'Private Pay'}
                      </div>
                      <div className="text-sm text-gray-500">
                        {c.paymentPreference === 'Insurance'
                          ? (c.copay ? `$${c.copay} copay` : 'Insurance')
                          : (c.paymentPreference || 'N/A')}
                      </div>
                      <div className={`text-xs mt-1 ${c.status === 'active' ? 'text-green-600' : 'text-gray-500'}`}>
                        {c.status === 'active' ? 'Active' : c.status === 'pending' ? 'Pending' : 'Inactive'}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Client Detail */}
            {selectedClient ? (
              <div className="md:col-span-2 bg-white rounded-lg shadow p-4">
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <h2 className="text-xl font-semibold">
                      {selectedClient.firstName} {selectedClient.lastName}
                    </h2>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      selectedClient.status === 'active'
                        ? 'bg-green-100 text-green-700'
                        : selectedClient.status === 'pending'
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      {selectedClient.status === 'active' ? 'Active' : selectedClient.status === 'pending' ? 'Pending' : 'Inactive'}
                    </span>
                  </div>
                </div>

                {/* Tabs */}
                <div className="border-b border-gray-200 mb-6">
                  <nav className="-mb-px flex space-x-8">
                    {[
                      { key: 'data',      label: 'Client Data' },
                      { key: 'insurance', label: 'Insurance & Billing' },
                    ].map(tab => (
                      <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key)}
                        className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                          activeTab === tab.key
                            ? 'border-indigo-500 text-indigo-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                      >{tab.label}</button>
                    ))}
                  </nav>
                </div>

                {/* Tab Content */}
                <div className="space-y-6">

                  {/* ── Client Data ── */}
                  {activeTab === 'data' && (
                    <div className="space-y-6">
                      <section>
                        <h3 className="text-lg font-medium mb-4 text-indigo-600">Basic Information</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="text-sm text-gray-500">First Name</label>
                            <div className="font-medium">{selectedClient.firstName || 'N/A'}</div>
                          </div>
                          <div>
                            <label className="text-sm text-gray-500">Last Name</label>
                            <div className="font-medium">{selectedClient.lastName || 'N/A'}</div>
                          </div>
                          <div>
                            <label className="text-sm text-gray-500">Email</label>
                            <div className="font-medium">{selectedClient.email || 'N/A'}</div>
                          </div>
                          <div>
                            <label className="text-sm text-gray-500">Phone</label>
                            <div className="font-medium">{selectedClient.phone || 'N/A'}</div>
                          </div>
                          <div>
                            <label className="text-sm text-gray-500">Date of Birth</label>
                            <div className="font-medium">{selectedClient.dateOfBirth || 'N/A'}</div>
                          </div>
                          <div>
                            <label className="text-sm text-gray-500">Gender / Pronouns</label>
                            <div className="font-medium">{selectedClient.gender || 'N/A'}</div>
                          </div>
                          <div>
                            <label className="text-sm text-gray-500">Marital Status</label>
                            <div className="font-medium">{selectedClient.maritalStatus || 'N/A'}</div>
                          </div>
                          <div>
                            <label className="text-sm text-gray-500">Employment Status</label>
                            <div className="font-medium">{selectedClient.employmentStatus || 'N/A'}</div>
                          </div>
                        </div>
                      </section>

                      <section>
                        <h3 className="text-lg font-medium mb-4 text-indigo-600">Address</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="text-sm text-gray-500">Street Address</label>
                            <div className="font-medium">{selectedClient.street || 'N/A'}</div>
                          </div>
                          <div>
                            <label className="text-sm text-gray-500">City</label>
                            <div className="font-medium">{selectedClient.city || 'N/A'}</div>
                          </div>
                          <div>
                            <label className="text-sm text-gray-500">State</label>
                            <div className="font-medium">{selectedClient.state || 'N/A'}</div>
                          </div>
                          <div>
                            <label className="text-sm text-gray-500">ZIP Code</label>
                            <div className="font-medium">{selectedClient.zip || 'N/A'}</div>
                          </div>
                        </div>
                      </section>

                      <section>
                        <h3 className="text-lg font-medium mb-4 text-indigo-600">Emergency Contact</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="text-sm text-gray-500">Name</label>
                            <div className="font-medium">{selectedClient.emergencyContactName || 'N/A'}</div>
                          </div>
                          <div>
                            <label className="text-sm text-gray-500">Phone</label>
                            <div className="font-medium">{selectedClient.emergencyContactPhone || 'N/A'}</div>
                          </div>
                        </div>
                      </section>

                      <section>
                        <h3 className="text-lg font-medium mb-4 text-indigo-600">Therapist Assignment</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="text-sm text-gray-500">Assigned Therapist</label>
                            <div className="font-medium">{selectedClient.assignedTherapistName || 'Unassigned'}</div>
                          </div>
                          <div>
                            <label className="text-sm text-gray-500">Status</label>
                            <div className={`font-medium ${
                              selectedClient.status === 'active' ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {selectedClient.status === 'active' ? 'Active' : selectedClient.status === 'pending' ? 'Pending' : 'Inactive'}
                            </div>
                          </div>
                        </div>
                      </section>
                    </div>
                  )}

                  {/* ── Insurance & Billing ── */}
                  {activeTab === 'insurance' && (
                    <div className="space-y-6">
                      <section>
                        <h3 className="text-lg font-medium mb-4 text-indigo-600">Payment Information</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="text-sm text-gray-500">Payment Preference</label>
                            <div className="font-medium">{selectedClient.paymentPreference || 'N/A'}</div>
                          </div>
                          <div>
                            <label className="text-sm text-gray-500">Copay</label>
                            <div className="font-medium">{formatCurrency(selectedClient.copay)}</div>
                          </div>
                          <div>
                            <label className="text-sm text-gray-500">Deductible</label>
                            <div className="font-medium">{formatCurrency(selectedClient.deductible)}</div>
                          </div>
                        </div>
                      </section>

                      <section>
                        <h3 className="text-lg font-medium mb-4 text-indigo-600">Insurance Details</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="text-sm text-gray-500">Provider</label>
                            <div className="font-medium">{selectedClient.insuranceProvider || selectedClient.insuranceType || 'N/A'}</div>
                          </div>
                          <div>
                            <label className="text-sm text-gray-500">Plan Name</label>
                            <div className="font-medium">{selectedClient.insurancePlanName || 'N/A'}</div>
                          </div>
                          <div>
                            <label className="text-sm text-gray-500">Member ID / Policy Number</label>
                            <div className="font-medium">{selectedClient.insuranceMemberId || 'N/A'}</div>
                          </div>
                          <div>
                            <label className="text-sm text-gray-500">Group Number</label>
                            <div className="font-medium">{selectedClient.insuranceGroupId || 'N/A'}</div>
                          </div>
                        </div>
                      </section>
                    </div>
                  )}

                </div>
              </div>
            ) : (
              <div className="md:col-span-2 bg-white rounded-lg shadow p-4 flex items-center justify-center min-h-48">
                <div className="text-center text-gray-500">
                  <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <h3 className="text-lg font-medium mb-2">Select a Client</h3>
                  <p className="text-sm">Choose a client from the list to view their billing information</p>
                </div>
              </div>
            )}
          </div>

          {/* Quick Actions */}
          {!selectedClient && (
            <div className="mt-6 bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  Export Billing Report
                </button>
                <button className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500">
                  Generate Insurance Claims
                </button>
                <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500">
                  View Payment History
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default Billing;
