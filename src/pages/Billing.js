import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useSecureData } from '../hooks/useSecureData';

const Billing = () => {
  const { currentUser } = useAuth();
  const { isAuthenticated, canPerform, secureClientOperations, isInitialized } = useSecureData();
  const [billingData, setBillingData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClient, setSelectedClient] = useState(null);
  const [activeTab, setActiveTab] = useState('data');

  // Debug logging
  useEffect(() => {
    console.log('🔍 Billing Debug Info:');
    console.log('Current User:', currentUser);
    console.log('Is Authenticated:', isAuthenticated);
    console.log('Is Initialized:', isInitialized);
    console.log('Can Perform view_billing:', canPerform('view_billing'));
    console.log('User Role:', currentUser?.role);
  }, [currentUser, isAuthenticated, isInitialized, canPerform]);

  useEffect(() => {
    const fetchData = async () => {
      console.log('🔄 Starting fetchData in Billing...');
      console.log('isInitialized:', isInitialized);
      console.log('isAuthenticated:', isAuthenticated);
      console.log('canPerform view_billing:', canPerform('view_billing'));
      
      // Wait for initialization
      if (!isInitialized) {
        console.log('⏳ Waiting for auth initialization...');
        return;
      }
      
      if (!isAuthenticated) {
        console.log('❌ Not authenticated');
        setLoading(false);
        setError('Authentication required');
        return;
      }

      if (!canPerform('view_billing')) {
        console.log('❌ Cannot perform view_billing');
        setLoading(false);
        setError('Insufficient permissions to view billing data');
        return;
      }

      try {
        console.log('✅ Fetching billing data using secure API...');
        const data = await secureClientOperations.getAllClients();
        console.log('✅ Billing data received:', data);
        
        if (Array.isArray(data)) {
          setBillingData(data);
        }
        setLoading(false);
      } catch (err) {
        console.error('❌ Error fetching billing data:', err);
        setError(err.message);
        setLoading(false);
      }
    };

    fetchData();
  }, [isInitialized, isAuthenticated, canPerform, secureClientOperations]);

  const filteredClients = billingData.filter(client => {
    const fullName = `${client.data.firstName} ${client.data.lastName}`.toLowerCase();
    return fullName.includes(searchTerm.toLowerCase());
  });

  const handleClientClick = (client) => {
    setSelectedClient(client);
  };

  const formatCurrency = (amount) => {
    if (!amount) return 'N/A';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

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
            <h1 className="text-2xl font-bold">Billing Dashboard</h1>
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
            {/* Clients List - Left Column */}
            <div className="md:col-span-1 bg-white rounded-lg shadow p-4">
              <h2 className="text-xl font-semibold mb-4">
                Clients ({filteredClients.length})
              </h2>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {filteredClients.map(client => (
                  <div
                    key={client.id}
                    className={`p-3 rounded cursor-pointer transition-colors ${
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
                      {client.insurance?.provider || 'Private Pay'}
                    </div>
                    <div className="text-sm text-gray-500">
                      {client.insurance?.paymentOption === 'Insurance' 
                        ? (client.insurance?.copay ? `$${client.insurance.copay} copay` : 'Insurance')
                        : formatCurrency(client.insurance?.privatePayRate)
                      }
                    </div>
                    <div className={`text-xs mt-1 ${
                      client.therapist?.status === 'Active'
                        ? 'text-green-600' 
                        : 'text-gray-600'
                    }`}>
                      {client.therapist?.status === 'Active' ? 'Active' : 'Inactive'}
                    </div>
                  </div>
                ))}
                {filteredClients.length === 0 && (
                  <div className="text-gray-500 text-center py-4">
                    No clients found
                  </div>
                )}
              </div>
            </div>

            {/* Client Details - Right Column */}
            {selectedClient && (
              <div className="md:col-span-2 bg-white rounded-lg shadow p-4">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-semibold">Client Details</h2>
                  <div className="text-sm text-gray-500">
                    Status: {selectedClient.therapist?.status === 'Active' ? 'Active' : 'Inactive'}
                  </div>
                </div>

                {/* Tabs */}
                <div className="border-b border-gray-200 mb-6">
                  <nav className="-mb-px flex space-x-8">
                    <button
                      onClick={() => setActiveTab('data')}
                      className={`${
                        activeTab === 'data'
                          ? 'border-indigo-500 text-indigo-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                    >
                      Client Data
                    </button>
                    <button
                      onClick={() => setActiveTab('insurance')}
                      className={`${
                        activeTab === 'insurance'
                          ? 'border-indigo-500 text-indigo-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                    >
                      Insurance & Billing
                    </button>
                  </nav>
                </div>

                {/* Tab Content */}
                <div className="space-y-6">
                  {activeTab === 'data' && (
                    <div className="space-y-6">
                      {/* Basic Information */}
                      <section>
                        <h3 className="text-lg font-medium mb-4 text-indigo-600">Basic Information</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="text-sm text-gray-500">First Name</label>
                            <div className="font-medium">{selectedClient.data?.firstName || 'N/A'}</div>
                          </div>
                          <div>
                            <label className="text-sm text-gray-500">Last Name</label>
                            <div className="font-medium">{selectedClient.data?.lastName || 'N/A'}</div>
                          </div>
                          <div>
                            <label className="text-sm text-gray-500">Email</label>
                            <div className="font-medium">{selectedClient.data?.email || 'N/A'}</div>
                          </div>
                          <div>
                            <label className="text-sm text-gray-500">Phone</label>
                            <div className="font-medium">{selectedClient.data?.phone || 'N/A'}</div>
                          </div>
                          <div>
                            <label className="text-sm text-gray-500">Date of Birth</label>
                            <div className="font-medium">{selectedClient.data?.birthDate || 'N/A'}</div>
                          </div>
                          <div>
                            <label className="text-sm text-gray-500">Gender/Preferred Pronoun</label>
                            <div className="font-medium">{selectedClient.data?.gender || 'N/A'}</div>
                          </div>
                          <div>
                            <label className="text-sm text-gray-500">Marital Status</label>
                            <div className="font-medium">{selectedClient.data?.maritalStatus || 'N/A'}</div>
                          </div>
                          <div>
                            <label className="text-sm text-gray-500">Employment Status</label>
                            <div className="font-medium">{selectedClient.data?.employmentStatus || 'N/A'}</div>
                          </div>
                        </div>
                      </section>

                      {/* Address Information */}
                      <section>
                        <h3 className="text-lg font-medium mb-4 text-indigo-600">Address Information</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="text-sm text-gray-500">Street Address</label>
                            <div className="font-medium">{selectedClient.data?.address?.street || 'N/A'}</div>
                          </div>
                          <div>
                            <label className="text-sm text-gray-500">City</label>
                            <div className="font-medium">{selectedClient.data?.address?.city || 'N/A'}</div>
                          </div>
                          <div>
                            <label className="text-sm text-gray-500">State</label>
                            <div className="font-medium">{selectedClient.data?.address?.state || 'N/A'}</div>
                          </div>
                          <div>
                            <label className="text-sm text-gray-500">ZIP Code</label>
                            <div className="font-medium">{selectedClient.data?.address?.zipCode || 'N/A'}</div>
                          </div>
                        </div>
                      </section>

                      {/* Emergency Contact */}
                      <section>
                        <h3 className="text-lg font-medium mb-4 text-indigo-600">Emergency Contact</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="text-sm text-gray-500">Name</label>
                            <div className="font-medium">{selectedClient.data?.emergencyContact?.name || 'N/A'}</div>
                          </div>
                          <div>
                            <label className="text-sm text-gray-500">Phone</label>
                            <div className="font-medium">{selectedClient.data?.emergencyContact?.phone || 'N/A'}</div>
                          </div>
                        </div>
                      </section>

                      {/* Therapist Assignment */}
                      <section>
                        <h3 className="text-lg font-medium mb-4 text-indigo-600">Therapist Assignment</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="text-sm text-gray-500">Assigned Therapist</label>
                            <div className="font-medium">{selectedClient.therapist?.name || 'Unassigned'}</div>
                          </div>
                          <div>
                            <label className="text-sm text-gray-500">Status</label>
                            <div className={`font-medium ${
                              selectedClient.therapist?.status === 'Active' 
                                ? 'text-green-600' 
                                : 'text-red-600'
                            }`}>
                              {selectedClient.therapist?.status || 'Inactive'}
                            </div>
                          </div>
                        </div>
                      </section>
                    </div>
                  )}

                  {activeTab === 'insurance' && (
                    <div className="space-y-6">
                      {/* Payment Information */}
                      <section>
                        <h3 className="text-lg font-medium mb-4 text-indigo-600">Payment Information</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="text-sm text-gray-500">Payment Option</label>
                            <div className="font-medium">{selectedClient.insurance?.paymentOption || 'N/A'}</div>
                          </div>
                          <div>
                            <label className="text-sm text-gray-500">Private Pay Rate</label>
                            <div className="font-medium">{formatCurrency(selectedClient.insurance?.privatePayRate)}</div>
                          </div>
                          <div>
                            <label className="text-sm text-gray-500">Agreed Payment Amount</label>
                            <div className="font-medium">{formatCurrency(selectedClient.insurance?.agreedAmount)}</div>
                          </div>
                        </div>
                      </section>

                      {/* Insurance Information */}
                      <section>
                        <h3 className="text-lg font-medium mb-4 text-indigo-600">Insurance Details</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="text-sm text-gray-500">Provider</label>
                            <div className="font-medium">{selectedClient.insurance?.provider || 'Private Pay'}</div>
                          </div>
                          <div>
                            <label className="text-sm text-gray-500">Plan Name</label>
                            <div className="font-medium">{selectedClient.insurance?.planName || 'N/A'}</div>
                          </div>
                          <div>
                            <label className="text-sm text-gray-500">Member ID</label>
                            <div className="font-medium">{selectedClient.insurance?.memberId || 'N/A'}</div>
                          </div>
                          <div>
                            <label className="text-sm text-gray-500">Group Number</label>
                            <div className="font-medium">{selectedClient.insurance?.groupNumber || 'N/A'}</div>
                          </div>
                          <div>
                            <label className="text-sm text-gray-500">Primary/Dependent</label>
                            <div className="font-medium">{selectedClient.insurance?.primaryOrDependent || 'N/A'}</div>
                          </div>
                          <div>
                            <label className="text-sm text-gray-500">Insurance Phone</label>
                            <div className="font-medium">{selectedClient.insurance?.phone || 'N/A'}</div>
                          </div>
                        </div>
                      </section>

                      {/* Financial Details */}
                      <section>
                        <h3 className="text-lg font-medium mb-4 text-indigo-600">Financial Details</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <label className="text-sm text-gray-500">Deductible</label>
                            <div className="font-medium">{formatCurrency(selectedClient.insurance?.deductible)}</div>
                          </div>
                          <div>
                            <label className="text-sm text-gray-500">Copay</label>
                            <div className="font-medium">{formatCurrency(selectedClient.insurance?.copay)}</div>
                          </div>
                          <div>
                            <label className="text-sm text-gray-500">Out-of-Pocket Max</label>
                            <div className="font-medium">{formatCurrency(selectedClient.insurance?.outOfPocket)}</div>
                          </div>
                        </div>
                      </section>

                      {/* Credit Card Information */}
                      <section>
                        <h3 className="text-lg font-medium mb-4 text-indigo-600">Credit Card Information</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="text-sm text-gray-500">Name on Card</label>
                            <div className="font-medium">{selectedClient.insurance?.cardName || 'N/A'}</div>
                          </div>
                          <div>
                            <label className="text-sm text-gray-500">Card Type</label>
                            <div className="font-medium">{selectedClient.insurance?.cardType || 'N/A'}</div>
                          </div>
                          <div>
                            <label className="text-sm text-gray-500">Card Number</label>
                            <div className="font-medium">
                              {selectedClient.insurance?.cardNumber ? '••••' + selectedClient.insurance.cardNumber.slice(-4) : 'N/A'}
                            </div>
                          </div>
                          <div>
                            <label className="text-sm text-gray-500">Expiration</label>
                            <div className="font-medium">{selectedClient.insurance?.cardExpiration || 'N/A'}</div>
                          </div>
                          <div>
                            <label className="text-sm text-gray-500">Billing ZIP</label>
                            <div className="font-medium">{selectedClient.insurance?.billingZip || 'N/A'}</div>
                          </div>
                        </div>
                      </section>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Quick Actions - Only show when no client is selected */}
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
