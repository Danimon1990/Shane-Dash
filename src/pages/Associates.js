import React, { useState, useEffect } from 'react';

const Associates = () => {
  const [associates, setAssociates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedAssociate, setSelectedAssociate] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        console.log('Fetching data from Firebase Function...');
        const response = await fetch('https://us-central1-therapist-online.cloudfunctions.net/getSheetData');
        const data = await response.json();
        console.log('Raw data from Firebase:', data);
        
        if (Array.isArray(data)) {
          // Group clients by therapist
          const therapistMap = new Map();
          
          data.forEach(client => {
            const therapistName = client.data.therapist || 'Unassigned';
            console.log('Processing client for therapist:', therapistName, client);
            
            if (!therapistMap.has(therapistName)) {
              therapistMap.set(therapistName, {
                id: therapistName,
                name: therapistName,
                email: client.data.email || 'N/A',
                phone: client.data.phone || 'N/A',
                clients: []
              });
            }
            
            therapistMap.get(therapistName).clients.push({
              id: client.id,
              name: `${client.data.firstName} ${client.data.lastName}`,
              insurance: client.insurance.provider,
              active: client.active,
              phone: client.data.phone,
              email: client.data.email,
              birthDate: client.data.birthDate
            });
          });
          
          // Convert Map to Array and sort by name
          const therapists = Array.from(therapistMap.values())
            .sort((a, b) => a.name.localeCompare(b.name));
          
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
                      className={`p-3 bg-gray-50 rounded ${
                        !client.active ? 'opacity-50' : ''
                      }`}
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
