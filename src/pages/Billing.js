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

          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-lg shadow p-4">
              <div className="text-sm text-gray-500">Total Clients</div>
              <div className="text-2xl font-bold">{filteredClients.length}</div>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <div className="text-sm text-gray-500">Insurance Clients</div>
              <div className="text-2xl font-bold">
                {filteredClients.filter(c => c.insurance?.provider && c.insurance.provider !== 'Private Pay').length}
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <div className="text-sm text-gray-500">Private Pay</div>
              <div className="text-2xl font-bold">
                {filteredClients.filter(c => !c.insurance?.provider || c.insurance.provider === 'Private Pay').length}
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <div className="text-sm text-gray-500">Active Clients</div>
              <div className="text-2xl font-bold">
                {filteredClients.filter(c => c.data.status === 'Active').length}
              </div>
            </div>
          </div>

          {/* Clients Table */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold">Client Billing Information</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Client Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Insurance Provider
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Policy Number
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Member ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Payment Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Rate/Copay
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Deductible
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredClients.map(client => (
                    <tr key={client.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col">
                          <div className="text-sm font-medium text-gray-900">
                            {client.data.firstName} {client.data.lastName}
                          </div>
                          <div className="text-sm text-gray-500">
                            {client.data.email}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {client.insurance?.provider || 'Private Pay'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {client.insurance?.policyNumber || 'N/A'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {client.insurance?.memberId || 'N/A'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {client.insurance?.paymentOption || 'Private Pay'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {client.insurance?.paymentOption === 'Insurance' 
                            ? (client.insurance?.copay ? `$${client.insurance.copay}` : 'N/A')
                            : formatCurrency(client.insurance?.privatePayRate)
                          }
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {client.insurance?.deductible ? formatCurrency(client.insurance.deductible) : 'N/A'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          client.data.status === 'Active' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {client.data.status || 'Active'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Quick Actions */}
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
        </div>
      </div>
    </div>
  );
};

export default Billing;
