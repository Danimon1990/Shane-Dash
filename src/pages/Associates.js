import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const Associates = () => {
  const navigate = useNavigate();
  const [associates, setAssociates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedAssociate, setSelectedAssociate] = useState(null);

  // Define the list of therapists to match Clients.js
  const therapistList = [
    'Shane Bruce',
    'Silvia Popa',
    'Dahkotahv Beckham',
    'Avery Williams',
    'Nicole Mosher'
  ];

  useEffect(() => {
    const fetchData = async () => {
      try {
        console.log('Fetching data from Firebase Function...');
        const response = await fetch('https://us-central1-therapist-online.cloudfunctions.net/getSheetData');
        const data = await response.json();
        console.log('Raw data from Firebase:', data);
        
        if (Array.isArray(data)) {
          // Create a map for each therapist
          const therapistMap = new Map(
            therapistList.map(name => [
              name,
              {
                id: name,
                name: name,
                email: 'N/A',
                phone: 'N/A',
                clients: []
              }
            ])
          );
          
          // Add an "Unassigned" category
          therapistMap.set('Unassigned', {
            id: 'Unassigned',
            name: 'Unassigned',
            email: 'N/A',
            phone: 'N/A',
            clients: []
          });
          
          // Group clients by therapist
          data.forEach(client => {
            const therapistName = client.therapist?.name || 'Unassigned';
            console.log('Processing client for therapist:', therapistName, client);
            
            if (therapistMap.has(therapistName)) {
              therapistMap.get(therapistName).clients.push({
                id: client.id,
                name: `${client.data.firstName} ${client.data.lastName}`,
                insurance: client.insurance.provider,
                active: client.therapist?.status === 'Active',
                phone: client.data.phone,
                email: client.data.email,
                birthDate: client.data.birthDate,
                clientData: client // Store the full client data for navigation
              });
            } else {
              // If therapist not in list, add to Unassigned
              therapistMap.get('Unassigned').clients.push({
                id: client.id,
                name: `${client.data.firstName} ${client.data.lastName}`,
                insurance: client.insurance.provider,
                active: client.therapist?.status === 'Active',
                phone: client.data.phone,
                email: client.data.email,
                birthDate: client.data.birthDate,
                clientData: client // Store the full client data for navigation
              });
            }
          });
          
          // Convert Map to Array and sort by name
          const therapists = Array.from(therapistMap.values())
            .sort((a, b) => {
              // Put Unassigned at the end
              if (a.name === 'Unassigned') return 1;
              if (b.name === 'Unassigned') return -1;
              return a.name.localeCompare(b.name);
            });
          
          console.log('Processed therapists:', therapists);
          setAssociates(therapists);
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
    // Navigate to clients page with the selected client
    navigate('/clients', { 
      state: { 
        selectedClient: client.clientData,
        scrollToClient: true
      }
    });
  };

  // Add console log for selected associate
  useEffect(() => {
    console.log('Selected associate changed:', selectedAssociate);
  }, [selectedAssociate]);

  if (loading) return <div className="container mx-auto px-4">Loading...</div>;
  if (error) return <div className="container mx-auto px-4">Error: {error}</div>;

  return (
    <div className="container mx-auto px-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Therapists</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Therapists List */}
        <div className="md:col-span-1 bg-white rounded-lg shadow p-4">
          <h2 className="text-xl font-semibold mb-4">Therapists List</h2>
          <div className="space-y-2">
            {associates.map(therapist => (
              <div
                key={therapist.id}
                className={`p-3 rounded cursor-pointer ${
                  selectedAssociate?.id === therapist.id
                    ? 'bg-indigo-100'
                    : 'hover:bg-gray-100'
                }`}
                onClick={() => {
                  console.log('Clicked therapist:', therapist);
                  setSelectedAssociate(therapist);
                }}
              >
                <div className="font-medium">{therapist.name}</div>
                <div className="text-sm text-gray-500">
                  {therapist.clients.length} clients
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Therapist Details */}
        {selectedAssociate && (
          <div className="md:col-span-2 bg-white rounded-lg shadow p-4">
            <h2 className="text-xl font-semibold mb-4">Therapist Details</h2>
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
              </section>

              {/* Clients Section */}
              <section>
                <h3 className="text-lg font-medium mb-2">Clients</h3>
                <div className="space-y-2">
                  {selectedAssociate.clients.map(client => (
                    <div
                      key={client.id}
                      className={`p-3 bg-gray-50 rounded cursor-pointer hover:bg-gray-100 transition-colors ${
                        !client.active ? 'opacity-50' : ''
                      }`}
                      onClick={() => handleClientClick(client)}
                    >
                      <div className="font-medium">{client.name}</div>
                      <div className="text-sm text-gray-500">
                        Insurance: {client.insurance}
                      </div>
                      <div className="text-sm text-gray-500">
                        Phone: {client.phone}
                      </div>
                      <div className="text-sm text-gray-500">
                        Email: {client.email}
                      </div>
                      {!client.active && (
                        <div className="text-sm text-red-500 mt-1">
                          Inactive
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Associates;
