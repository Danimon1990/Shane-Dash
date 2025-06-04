// src/pages/Clients.js
import React, { useState, useEffect } from 'react';

const Clients = () => {
  const [activeFilter, setActiveFilter] = useState(true);
  const [selectedClient, setSelectedClient] = useState(null);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('info'); // 'info', 'insurance', 'notes'

  useEffect(() => {
    const fetchSheetData = async () => {
      try {
        console.log('Starting to fetch data from Firebase Function...');
        const response = await fetch('https://us-central1-therapist-online.cloudfunctions.net/getSheetData');
        console.log('Response status:', response.status);
        const data = await response.json();
        console.log('Received data from Firebase Function:', data);
        
        if (Array.isArray(data) && data.length > 0) {
          console.log('Setting clients with data:', data);
          setClients(data);
        } else {
          console.log('No data received or empty array');
          setClients([]);
        }
        setLoading(false);
      } catch (err) {
        console.error('Error fetching sheet data:', err);
        setError(err.message);
        setLoading(false);
      }
    };

    fetchSheetData();
  }, []);

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
                className={`p-3 rounded cursor-pointer ${
                  selectedClient?.id === client.id
                    ? 'bg-indigo-100'
                    : 'hover:bg-gray-100'
                }`}
                onClick={() => setSelectedClient(client)}
              >
                <div className="font-medium">{client.name}</div>
                <div className="text-sm text-gray-500">
                  {client.insurance.provider}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Client Details */}
        {selectedClient && (
          <div className="md:col-span-2 bg-white rounded-lg shadow p-4">
            <h2 className="text-xl font-semibold mb-4">Client Details</h2>
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
