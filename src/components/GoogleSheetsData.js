import React, { useState, useEffect } from 'react';
import { useSecureData } from '../hooks/useSecureData';

const GoogleSheetsData = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { 
    isAuthenticated, 
    userRole, 
    secureClientOperations,
    canPerform 
  } = useSecureData();

  useEffect(() => {
    const fetchSheetData = async () => {
      if (!isAuthenticated) {
        setError('Authentication required');
        setLoading(false);
        return;
      }

      if (!canPerform('view_clients')) {
        setError('Insufficient permissions to view client data');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        
        // Use secure API client to fetch data
        const clients = await secureClientOperations.getAllClients();
        setData(clients);
      } catch (err) {
        console.error('Error fetching sheet data:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchSheetData();
  }, [isAuthenticated, canPerform, secureClientOperations]);

  if (!isAuthenticated) {
    return (
      <div className="p-4">
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded">
          Please log in to view client data.
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-4">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          <span className="ml-2">Loading client data...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          Error: {error}
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="p-4">
        <div className="bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded">
          No client data available.
        </div>
      </div>
    );
  }

  // Get all unique keys from the data for table headers
  const allKeys = new Set();
  data.forEach(client => {
    if (client.data) {
      Object.keys(client.data).forEach(key => allKeys.add(key));
    }
    if (client.insurance) {
      Object.keys(client.insurance).forEach(key => allKeys.add(`insurance.${key}`));
    }
    if (client.billing) {
      Object.keys(client.billing).forEach(key => allKeys.add(`billing.${key}`));
    }
    if (client.medical) {
      Object.keys(client.medical).forEach(key => allKeys.add(`medical.${key}`));
    }
  });

  const headers = Array.from(allKeys).sort();

  return (
    <div className="p-4">
      <div className="mb-4">
        <h2 className="text-2xl font-bold mb-2">Client Data</h2>
        <div className="text-sm text-gray-600">
          Role: {userRole} | Total Clients: {data.length}
        </div>
        <div className="text-xs text-gray-500 mt-1">
          Data is filtered based on your role permissions
        </div>
      </div>
      
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border border-gray-300">
          <thead>
            <tr>
              <th className="px-6 py-3 border-b border-gray-300 bg-gray-100 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Name
              </th>
              {headers.map((header) => (
                <th
                  key={header}
                  className="px-6 py-3 border-b border-gray-300 bg-gray-100 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  {header.replace('.', ' ')}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((client, index) => (
              <tr key={index} className={index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 border-b border-gray-300">
                  {client.name}
                </td>
                {headers.map((header) => {
                  let value = '';
                  
                  if (header.startsWith('insurance.')) {
                    const key = header.replace('insurance.', '');
                    value = client.insurance?.[key] || '';
                  } else if (header.startsWith('billing.')) {
                    const key = header.replace('billing.', '');
                    value = client.billing?.[key] || '';
                  } else if (header.startsWith('medical.')) {
                    const key = header.replace('medical.', '');
                    value = client.medical?.[key] || '';
                  } else {
                    value = client.data?.[header] || '';
                  }

                  // Mask sensitive data based on role
                  if (userRole === 'associate' && (header.includes('card') || header.includes('security'))) {
                    value = '***';
                  }

                  return (
                    <td
                      key={header}
                      className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 border-b border-gray-300"
                    >
                      {value}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default GoogleSheetsData; 