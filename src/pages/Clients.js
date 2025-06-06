// src/pages/Clients.js
import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

const Clients = () => {
  const location = useLocation();
  const [activeFilter, setActiveFilter] = useState(true);
  const [selectedClient, setSelectedClient] = useState(null);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('info'); // 'info', 'insurance', 'notes'
  const [showTherapistMenu, setShowTherapistMenu] = useState(false);
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const clientRef = useRef(null);

  const [therapists] = useState([
    'Shane Bruce',
    'Silvia Popa',
    'Dahkotahv Beckham',
    'Avery Williams',
    'Nicole Mosher'
  ]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        console.log('Fetching data from Firebase Function...');
        const response = await fetch('https://us-central1-therapist-online.cloudfunctions.net/getSheetData');
        const data = await response.json();
        console.log('Raw data from Firebase:', data);
        
        if (Array.isArray(data)) {
          const formattedClients = data.map((client, index) => ({
            id: index + 1,
            name: `${client.data.firstName} ${client.data.lastName}`,
            active: client.therapist?.status === 'Active',
            data: client.data,
            insurance: client.insurance,
            billing: client.billing,
            medical: client.medical,
            concerns: client.concerns,
            documents: client.documents,
            therapist: client.therapist,
            progressNotes: client.progressNotes || [],
            closure: client.closure || {
              isActive: true,
              date: null,
              notes: ''
            }
          }));
          setClients(formattedClients);
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

  // Handle navigation from Associates page
  useEffect(() => {
    if (location.state?.selectedClient) {
      const client = location.state.selectedClient;
      setSelectedClient(client);
      
      // If we need to scroll to the client
      if (location.state.scrollToClient && clientRef.current) {
        clientRef.current.scrollIntoView({ behavior: 'smooth' });
      }
    }
  }, [location.state]);

  const filteredClients = clients.filter(client => client.active === activeFilter);

  const renderTabs = () => {
    return (
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('info')}
            className={`${
              activeTab === 'info'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
          >
            Client Information
          </button>
          <button
            onClick={() => setActiveTab('insurance')}
            className={`${
              activeTab === 'insurance'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
          >
            Insurance & Payments
          </button>
          <button
            onClick={() => setActiveTab('notes')}
            className={`${
              activeTab === 'notes'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
          >
            Notes & Documents
          </button>
        </nav>
      </div>
    );
  };

  const renderClientInfo = () => (
    <div className="space-y-6">
      {/* Basic Information Section */}
      <section>
        <h3 className="text-lg font-medium mb-2">Basic Information</h3>
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
            <label className="text-sm text-gray-500">Email</label>
            <div>{selectedClient.data.email}</div>
          </div>
          <div>
            <label className="text-sm text-gray-500">Phone</label>
            <div>{selectedClient.data.phone}</div>
          </div>
          <div>
            <label className="text-sm text-gray-500">Birth Date</label>
            <div>{selectedClient.data.birthDate}</div>
          </div>
          <div>
            <label className="text-sm text-gray-500">Gender</label>
            <div>{selectedClient.data.gender}</div>
          </div>
        </div>
      </section>

      {/* Address Section */}
      <section>
        <h3 className="text-lg font-medium mb-2">Address</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-gray-500">Street</label>
            <div>{selectedClient.data.address.street}</div>
          </div>
          <div>
            <label className="text-sm text-gray-500">City</label>
            <div>{selectedClient.data.address.city}</div>
          </div>
          <div>
            <label className="text-sm text-gray-500">State</label>
            <div>{selectedClient.data.address.state}</div>
          </div>
          <div>
            <label className="text-sm text-gray-500">Zip Code</label>
            <div>{selectedClient.data.address.zipCode}</div>
          </div>
        </div>
      </section>

      {/* Emergency Contact Section */}
      <section>
        <h3 className="text-lg font-medium mb-2">Emergency Contact</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-gray-500">Name</label>
            <div>{selectedClient.data.emergencyContact.name}</div>
          </div>
          <div>
            <label className="text-sm text-gray-500">Phone</label>
            <div>{selectedClient.data.emergencyContact.phone}</div>
          </div>
        </div>
      </section>
    </div>
  );

  const renderInsuranceInfo = () => (
    <div className="space-y-6">
      {/* Insurance Section */}
      <section>
        <h3 className="text-lg font-medium mb-2">Insurance Information</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-gray-500">Provider</label>
            <div>{selectedClient.insurance.provider}</div>
          </div>
          <div>
            <label className="text-sm text-gray-500">Plan Name</label>
            <div>{selectedClient.insurance.planName}</div>
          </div>
          <div>
            <label className="text-sm text-gray-500">Member ID</label>
            <div>{selectedClient.insurance.memberId}</div>
          </div>
          <div>
            <label className="text-sm text-gray-500">Group Number</label>
            <div>{selectedClient.insurance.groupNumber}</div>
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
        </div>
      </section>
    </div>
  );

  const renderNotesAndDocuments = () => (
    <div className="space-y-6">
      {/* Medical Information Section */}
      <section>
        <h3 className="text-lg font-medium mb-2">Medical Information</h3>
        <div className="space-y-4">
          <div>
            <label className="text-sm text-gray-500">Physician Name</label>
            <div>{selectedClient.medical.physicianName}</div>
          </div>
          <div>
            <label className="text-sm text-gray-500">Physician Phone</label>
            <div>{selectedClient.medical.physicianPhone}</div>
          </div>
          <div>
            <label className="text-sm text-gray-500">Physician Address</label>
            <div>{selectedClient.medical.physicianAddress}</div>
          </div>
          <div>
            <label className="text-sm text-gray-500">Medications</label>
            <div>{selectedClient.data.medications.list}</div>
          </div>
        </div>
      </section>

      {/* Concerns Section */}
      <section>
        <h3 className="text-lg font-medium mb-2">Concerns</h3>
        <div className="space-y-4">
          <div>
            <label className="text-sm text-gray-500">Selected Concerns</label>
            <div>{selectedClient.concerns.selectedConcerns}</div>
          </div>
          <div>
            <label className="text-sm text-gray-500">Other Concerns</label>
            <div>{selectedClient.concerns.otherConcerns}</div>
          </div>
          <div>
            <label className="text-sm text-gray-500">Primary Concern</label>
            <div>{selectedClient.concerns.primaryConcern}</div>
          </div>
        </div>
      </section>

      {/* Documents Section */}
      <section>
        <h3 className="text-lg font-medium mb-2">Documents</h3>
        <div className="space-y-4">
          <div>
            <label className="text-sm text-gray-500">Merged Document ID</label>
            <div>{selectedClient.documents.mergedDocId}</div>
          </div>
          <div>
            <label className="text-sm text-gray-500">Document Status</label>
            <div>{selectedClient.documents.mergeStatus}</div>
          </div>
          {selectedClient.documents.mergedDocUrl && (
            <div>
              <a 
                href={selectedClient.documents.mergedDocUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-indigo-600 hover:text-indigo-800"
              >
                View Document
              </a>
            </div>
          )}
        </div>
      </section>
    </div>
  );

  const handleTherapistAssign = async (therapistName) => {
    try {
      console.log('Assigning therapist:', therapistName, 'to client:', selectedClient);
      const response = await fetch('https://us-central1-therapist-online.cloudfunctions.net/updateClientTherapist', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          clientId: selectedClient.data.email,
          therapist: therapistName
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Server response:', errorText);
        throw new Error(`Failed to update therapist: ${errorText}`);
      }

      // Update local state
      setClients(clients.map(client => 
        client.data.email === selectedClient.data.email
          ? { ...client, therapist: { ...client.therapist, name: therapistName } }
          : client
      ));
      setShowTherapistMenu(false);
    } catch (err) {
      console.error('Error updating therapist:', err);
      setError(err.message);
    }
  };

  const handleStatusToggle = async () => {
    try {
      console.log('Toggling status for client:', selectedClient);
      const response = await fetch('https://us-central1-therapist-online.cloudfunctions.net/updateClientStatus', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          clientId: selectedClient.data.email,
          status: !selectedClient.active
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Server response:', errorText);
        throw new Error(`Failed to update status: ${errorText}`);
      }

      // Update local state
      setClients(clients.map(client => 
        client.data.email === selectedClient.data.email
          ? { ...client, active: !client.active }
          : client
      ));
    } catch (err) {
      console.error('Error updating status:', err);
      setError(err.message);
    }
  };

  if (loading) return <div className="container mx-auto px-4">Loading...</div>;
  if (error) return <div className="container mx-auto px-4">Error: {error}</div>;

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
                ref={selectedClient?.id === client.id ? clientRef : null}
                className={`p-4 bg-white rounded-lg shadow mb-4 ${
                  selectedClient?.id === client.id ? 'ring-2 ring-indigo-500' : ''
                }`}
                onClick={() => setSelectedClient(client)}
              >
                <div className="font-medium">{client.name}</div>
                <div className="text-sm text-gray-500">
                  {client.insurance.provider}
                </div>
                <div className="text-sm text-gray-500">
                  Therapist: {client.therapist?.name || 'Unassigned'}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Client Details */}
        {selectedClient && (
          <div className="md:col-span-2 bg-white rounded-lg shadow p-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Client Details</h2>
              <div className="flex space-x-4">
                {/* Therapist Assignment Button */}
                <div className="relative">
                  <button
                    onClick={() => setShowTherapistMenu(!showTherapistMenu)}
                    className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700"
                  >
                    Assign Therapist
                  </button>
                  {showTherapistMenu && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10">
                      <div className="py-1">
                        {therapists.map((therapist) => (
                          <button
                            key={therapist}
                            onClick={() => handleTherapistAssign(therapist)}
                            className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                          >
                            {therapist}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Status Toggle Button */}
                <button
                  onClick={handleStatusToggle}
                  className={`px-4 py-2 rounded ${
                    selectedClient.active
                      ? 'bg-green-600 hover:bg-green-700'
                      : 'bg-red-600 hover:bg-red-700'
                  } text-white`}
                >
                  {selectedClient.active ? 'Active' : 'Inactive'}
                </button>
              </div>
            </div>
            {renderTabs()}
            <div className="mt-4">
              {activeTab === 'info' && renderClientInfo()}
              {activeTab === 'insurance' && renderInsuranceInfo()}
              {activeTab === 'notes' && renderNotesAndDocuments()}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Clients;
