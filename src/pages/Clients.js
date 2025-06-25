// src/pages/Clients.js
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useSecureData } from '../hooks/useSecureData';
import TherapyNoteForm from '../components/TherapyNoteForm';
import TherapyNotesList from '../components/TherapyNotesList';

const Clients = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser } = useAuth();
  const { 
    isAuthenticated, 
    userRole, 
    secureClientOperations,
    canPerform 
  } = useSecureData();
  
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedClient, setSelectedClient] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('data');
  const [showActiveOnly, setShowActiveOnly] = useState(true);
  const [showAllClients, setShowAllClients] = useState(false);
  const [notification, setNotification] = useState(null);
  const [showNoteForm, setShowNoteForm] = useState(false);
  const [notesRefresh, setNotesRefresh] = useState(0);

  // Define the list of therapists to match Associates.js
  const therapistList = [
    'Shane Bruce',
    'Silvia Popa',
    'Dahkotahv Beckham',
    'Avery Williams',
    'Nicole Mosher'
  ];

  // Auto-hide notification after 5 seconds
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        setNotification(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
  };

  const closeNotification = () => {
    setNotification(null);
  };

  useEffect(() => {
    const fetchData = async () => {
      if (!isAuthenticated) {
        setLoading(false);
        setError('Authentication required');
        return;
      }
      if (!canPerform('view_clients')) {
        setLoading(false);
        setError('Insufficient permissions to view clients');
        return;
      }
      try {
        setLoading(true);
        setError(null);
        const data = await secureClientOperations.getAllClients();
        setClients(data);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [isAuthenticated, canPerform, secureClientOperations]);

  // Handle client selection from Associates page
  useEffect(() => {
    if (location.state?.selectedClient) {
      setSelectedClient(location.state.selectedClient);
      if (location.state.scrollToClient) {
        const element = document.getElementById(`client-${location.state.selectedClient.id}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth' });
        }
      }
    }
  }, [location.state]);

  const handleClientClick = (client) => {
    setSelectedClient(client);
  };

  const handleTherapistChange = async (clientId, therapistName) => {
    try {
      // Check permissions
      if (!canPerform('assign_therapists')) {
        showNotification('Insufficient permissions to assign therapists', 'error');
        return;
      }

      // Find the client to get their name for the notification
      const client = clients.find(c => c.id === clientId);
      const clientName = client ? `${client.data.firstName} ${client.data.lastName}` : 'Client';
      const clientEmail = client?.data?.email;
      
      // Update the client's therapist in the local state
      setClients(clients.map(client => {
        if (client.id === clientId) {
          return {
            ...client,
            therapist: {
              name: therapistName,
              status: 'Active'
            }
          };
        }
        return client;
      }));

      // Update the selected client if it's the one being modified
      if (selectedClient?.id === clientId) {
        setSelectedClient({
          ...selectedClient,
          therapist: {
            name: therapistName,
            status: 'Active'
          }
        });
      }

      // Show success notification
      if (therapistName === 'Unassigned') {
        showNotification(`${clientName} has been unassigned from their therapist`, 'info');
      } else {
        showNotification(`${clientName} has been assigned to ${therapistName}`, 'success');
      }

      // Call the secure API to update the therapist in Google Sheets
      if (clientEmail) {
        try {
          await secureClientOperations.updateClientTherapist(clientEmail, therapistName);
        } catch (apiError) {
          console.error('API error updating therapist:', apiError);
          showNotification('Failed to update therapist in Google Sheets', 'error');
        }
      } else {
        showNotification('Client email not found, cannot update Google Sheets', 'error');
      }
    } catch (error) {
      console.error('Error updating therapist:', error);
      showNotification('Failed to update therapist assignment', 'error');
    }
  };

  const handleStatusChange = async (clientId, status) => {
    try {
      // Check permissions
      if (!canPerform('edit_clients')) {
        showNotification('Insufficient permissions to update client status', 'error');
        return;
      }

      // Find the client to get their name for the notification
      const client = clients.find(c => c.id === clientId);
      const clientName = client ? `${client.data.firstName} ${client.data.lastName}` : 'Client';
      
      // Update the client's status in the local state
      setClients(clients.map(client => {
        if (client.id === clientId) {
          return {
            ...client,
            therapist: {
              ...client.therapist,
              status: status
            }
          };
        }
        return client;
      }));

      // Update the selected client if it's the one being modified
      if (selectedClient?.id === clientId) {
        setSelectedClient({
          ...selectedClient,
          therapist: {
            ...selectedClient.therapist,
            status: status
          }
        });
      }

      // Show success notification
      showNotification(`${clientName} status updated to ${status}`, 'success');

      // TODO: Add API call to update the status in the backend
      console.log(`Updating status for client ${clientId} to ${status}`);
    } catch (error) {
      console.error('Error updating status:', error);
      showNotification('Failed to update client status', 'error');
    }
  };

  const filteredClients = clients.filter(client => {
    // First filter by search term
    const fullName = `${client.data.firstName} ${client.data.lastName}`.toLowerCase();
    const matchesSearch = fullName.includes(searchTerm.toLowerCase());
    
    // Then filter by active/inactive status
    const isActive = client.therapist?.status === 'Active';
    const matchesStatus = showActiveOnly ? isActive : !isActive;
    
    return matchesSearch && matchesStatus;
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
        {/* Notification Popup */}
        {notification && (
          <div className="fixed top-4 right-4 z-50 max-w-sm">
            <div className={`rounded-lg shadow-lg p-4 ${
              notification.type === 'success' ? 'bg-green-500 text-white' :
              notification.type === 'error' ? 'bg-red-500 text-white' :
              notification.type === 'info' ? 'bg-blue-500 text-white' :
              'bg-gray-500 text-white'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="mr-3">
                    {notification.type === 'success' && (
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    )}
                    {notification.type === 'error' && (
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                    )}
                    {notification.type === 'info' && (
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                  <p className="text-sm font-medium">{notification.message}</p>
                </div>
                <button
                  onClick={closeNotification}
                  className="ml-4 text-white hover:text-gray-200 focus:outline-none"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="container mx-auto">
          {/* Debug Info - Remove this in production */}
          {false && process.env.NODE_ENV === 'development' && (
            <div className="mb-4 p-3 bg-yellow-100 border border-yellow-300 rounded">
              <strong>Debug Info:</strong> User: {currentUser?.name} | Role: {currentUser?.role} | 
              Is Therapist by Name: {therapistList.includes(currentUser?.name) ? 'Yes' : 'No'} | 
              Clients Count: {clients.length} | Filtered Count: {filteredClients.length}
            </div>
          )}
          
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold">Clients</h1>
            <div className="flex items-center space-x-4">
              {/* Search Input */}
              <div className="w-64">
                <input
                  type="text"
                  placeholder="Search clients..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              
              {/* Active/Inactive Toggle */}
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium">Show:</span>
                <button
                  onClick={() => setShowActiveOnly(true)}
                  className={`px-3 py-1 rounded text-sm font-medium ${
                    showActiveOnly 
                      ? 'bg-green-500 text-white' 
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  Active
                </button>
                <button
                  onClick={() => setShowActiveOnly(false)}
                  className={`px-3 py-1 rounded text-sm font-medium ${
                    !showActiveOnly 
                      ? 'bg-red-500 text-white' 
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  Inactive
                </button>
              </div>
              
              {/* Show All Clients Toggle - Only show for admin users */}
              {currentUser?.role === 'admin' && (
                <button
                  onClick={() => setShowAllClients(!showAllClients)}
                  className={`px-4 py-2 rounded text-sm font-medium ${
                    showAllClients 
                      ? 'bg-blue-500 text-white' 
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  {showAllClients ? 'Show My Clients' : 'Show All Clients'}
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Clients List */}
            <div className="md:col-span-1 bg-white rounded-lg shadow p-4">
              <h2 className="text-xl font-semibold mb-4">
                Clients List 
                <span className="text-sm font-normal text-gray-500 ml-2">
                  ({filteredClients.length} {showActiveOnly ? 'active' : 'inactive'})
                </span>
              </h2>
              <div className="space-y-2">
                {filteredClients.map(client => (
                  <div
                    key={client.id}
                    id={`client-${client.id}`}
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
                      Insurance: {client.insurance?.provider || 'N/A'}
                    </div>
                    <div className="text-sm text-gray-500">
                      Therapist: {client.therapist?.name || 'Unassigned'}
                    </div>
                    <div className={`text-sm mt-1 ${
                      client.therapist?.status === 'Active' 
                        ? 'text-green-600' 
                        : 'text-red-600'
                    }`}>
                      {client.therapist?.status || 'Inactive'}
                    </div>
                  </div>
                ))}
                {filteredClients.length === 0 && (
                  <div className="text-gray-500 text-center py-4">
                    No {showActiveOnly ? 'active' : 'inactive'} clients found
                  </div>
                )}
              </div>
            </div>

            {/* Client Details */}
            {selectedClient && (
              <div className="md:col-span-2 bg-white rounded-lg shadow p-4">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-semibold">Client Details</h2>
                  <div className="flex space-x-4">
                    <select
                      value={selectedClient.therapist?.name || 'Unassigned'}
                      onChange={(e) => handleTherapistChange(selectedClient.id, e.target.value)}
                      className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="Unassigned">Unassigned</option>
                      {therapistList.map(therapist => (
                        <option key={therapist} value={therapist}>
                          {therapist}
                        </option>
                      ))}
                    </select>
                    <select
                      value={selectedClient.therapist?.status || 'Inactive'}
                      onChange={(e) => handleStatusChange(selectedClient.id, e.target.value)}
                      className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                    </select>
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
                      Data
                    </button>
                    <button
                      onClick={() => setActiveTab('insurance')}
                      className={`${
                        activeTab === 'insurance'
                          ? 'border-indigo-500 text-indigo-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                    >
                      Insurance
                    </button>
                    <button
                      onClick={() => setActiveTab('notes')}
                      className={`${
                        activeTab === 'notes'
                          ? 'border-indigo-500 text-indigo-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                    >
                      Notes
                    </button>
                  </nav>
                </div>

                {/* Tab Content */}
                <div className="space-y-6">
                  {activeTab === 'data' && (
                    <section>
                      <h3 className="text-lg font-medium mb-2">Basic Information</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm text-gray-500">Legal First Name</label>
                          <div>{selectedClient.data.firstName}</div>
                        </div>
                        <div>
                          <label className="text-sm text-gray-500">Preferred Name</label>
                          <div>{selectedClient.data.preferredName || selectedClient.data.firstName}</div>
                        </div>
                        <div>
                          <label className="text-sm text-gray-500">Legal Last Name</label>
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
                          <label className="text-sm text-gray-500">Date of Birth</label>
                          <div>{selectedClient.data.birthDate}</div>
                        </div>
                        <div>
                          <label className="text-sm text-gray-500">Gender/Preferred Pronoun</label>
                          <div>{selectedClient.data.gender}</div>
                        </div>
                        <div>
                          <label className="text-sm text-gray-500">Marital Status</label>
                          <div>{selectedClient.data.maritalStatus}</div>
                        </div>
                        <div>
                          <label className="text-sm text-gray-500">Employment Status</label>
                          <div>{selectedClient.data.employmentStatus}</div>
                        </div>
                        <div>
                          <label className="text-sm text-gray-500">Employer/School</label>
                          <div>{selectedClient.data.employer}</div>
                        </div>
                        <div>
                          <label className="text-sm text-gray-500">Referral Source</label>
                          <div>{selectedClient.data.referralSource}</div>
                        </div>
                        <div>
                          <label className="text-sm text-gray-500">Reason for reaching out</label>
                          <div className="whitespace-pre-wrap">{selectedClient.data.reasonForReachingOut}</div>
                        </div>
                      </div>

                      <h3 className="text-lg font-medium mb-2 mt-6">Address</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm text-gray-500">Street Address</label>
                          <div>{selectedClient.data.address?.street}</div>
                        </div>
                        <div>
                          <label className="text-sm text-gray-500">City</label>
                          <div>{selectedClient.data.address?.city}</div>
                        </div>
                        <div>
                          <label className="text-sm text-gray-500">State</label>
                          <div>{selectedClient.data.address?.state}</div>
                        </div>
                        <div>
                          <label className="text-sm text-gray-500">Zip Code</label>
                          <div>{selectedClient.data.address?.zipCode}</div>
                        </div>
                      </div>

                      <h3 className="text-lg font-medium mb-2 mt-6">Emergency Contact</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm text-gray-500">Name</label>
                          <div>{selectedClient.data.emergencyContact?.name}</div>
                        </div>
                        <div>
                          <label className="text-sm text-gray-500">Phone</label>
                          <div>{selectedClient.data.emergencyContact?.phone}</div>
                        </div>
                      </div>
                    </section>
                  )}

                  {activeTab === 'insurance' && (
                    <section>
                      <h3 className="text-lg font-medium mb-2">Payment Information</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm text-gray-500">Payment Options</label>
                          <div>{selectedClient.insurance.paymentOption}</div>
                        </div>
                        <div>
                          <label className="text-sm text-gray-500">Private Pay Rate</label>
                          <div>{selectedClient.insurance.privatePayRate || 'N/A'}</div>
                        </div>
                        <div>
                          <label className="text-sm text-gray-500">Agreed Payment Amount</label>
                          <div>{selectedClient.insurance.agreedAmount || 'N/A'}</div>
                        </div>
                      </div>

                      <h3 className="text-lg font-medium mb-2 mt-6">Insurance Information</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm text-gray-500">Provider</label>
                          <div>{selectedClient.insurance.provider}</div>
                        </div>
                        <div>
                          <label className="text-sm text-gray-500">Primary/Dependent</label>
                          <div>{selectedClient.insurance.primaryOrDependent || 'N/A'}</div>
                        </div>
                        <div>
                          <label className="text-sm text-gray-500">Plan Name</label>
                          <div>{selectedClient.insurance.planName || 'N/A'}</div>
                        </div>
                        <div>
                          <label className="text-sm text-gray-500">Member ID/Policy Number</label>
                          <div>{selectedClient.insurance.memberId || 'N/A'}</div>
                        </div>
                        <div>
                          <label className="text-sm text-gray-500">Group Number</label>
                          <div>{selectedClient.insurance.groupNumber || 'N/A'}</div>
                        </div>
                        <div>
                          <label className="text-sm text-gray-500">Insurance Phone</label>
                          <div>{selectedClient.insurance.phone || 'N/A'}</div>
                        </div>
                        <div>
                          <label className="text-sm text-gray-500">Deductible Amount</label>
                          <div>{selectedClient.insurance.deductible || 'N/A'}</div>
                        </div>
                        <div>
                          <label className="text-sm text-gray-500">Copay Amount</label>
                          <div>{selectedClient.insurance.copay || 'N/A'}</div>
                        </div>
                        <div>
                          <label className="text-sm text-gray-500">Out-of-pocket Amount</label>
                          <div>{selectedClient.insurance.outOfPocket || 'N/A'}</div>
                        </div>
                      </div>

                      <h3 className="text-lg font-medium mb-2 mt-6">Credit Card Information</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm text-gray-500">Name on Card</label>
                          <div>{selectedClient.insurance.cardName || 'N/A'}</div>
                        </div>
                        <div>
                          <label className="text-sm text-gray-500">Card Type</label>
                          <div>{selectedClient.insurance.cardType || 'N/A'}</div>
                        </div>
                        <div>
                          <label className="text-sm text-gray-500">Card Number</label>
                          <div>{selectedClient.insurance.cardNumber ? '••••' + selectedClient.insurance.cardNumber.slice(-4) : 'N/A'}</div>
                        </div>
                        <div>
                          <label className="text-sm text-gray-500">Expiration Date</label>
                          <div>{selectedClient.insurance.cardExpiration || 'N/A'}</div>
                        </div>
                        <div>
                          <label className="text-sm text-gray-500">Billing Zip Code</label>
                          <div>{selectedClient.insurance.billingZip || 'N/A'}</div>
                        </div>
                      </div>

                      <h3 className="text-lg font-medium mb-2 mt-6">Agreements</h3>
                      <div className="space-y-2">
                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            checked={selectedClient.agreements?.policies}
                            readOnly
                            className="mr-2"
                          />
                          <label>Read and understand policies</label>
                        </div>
                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            checked={selectedClient.agreements?.cancellation}
                            readOnly
                            className="mr-2"
                          />
                          <label>Agree to cancellation policy</label>
                        </div>
                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            checked={selectedClient.agreements?.privacy}
                            readOnly
                            className="mr-2"
                          />
                          <label>Consent for treatment</label>
                        </div>
                      </div>
                    </section>
                  )}

                  {activeTab === 'notes' && (
                    <section>
                      <h3 className="text-lg font-medium mb-2">Medical Information</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm text-gray-500">Physician Name</label>
                          <div>{selectedClient.medical?.physicianName || 'N/A'}</div>
                        </div>
                        <div>
                          <label className="text-sm text-gray-500">Physician Phone</label>
                          <div>{selectedClient.medical?.physicianPhone || 'N/A'}</div>
                        </div>
                        <div>
                          <label className="text-sm text-gray-500">Physician Address</label>
                          <div>{selectedClient.medical?.physicianAddress || 'N/A'}</div>
                        </div>
                        <div>
                          <label className="text-sm text-gray-500">Medications</label>
                          <div className="whitespace-pre-wrap">{selectedClient.medical?.medications || 'N/A'}</div>
                        </div>
                      </div>

                      <h3 className="text-lg font-medium mb-2 mt-6">Concerns</h3>
                      <div className="space-y-4">
                        <div>
                          <label className="text-sm text-gray-500">Selected Concerns</label>
                          <div className="mt-1">
                            {selectedClient.concerns?.selected?.map((concern, index) => (
                              <span key={index} className="inline-block bg-gray-100 rounded-full px-3 py-1 text-sm font-semibold text-gray-700 mr-2 mb-2">
                                {concern}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div>
                          <label className="text-sm text-gray-500">Other Concerns</label>
                          <div className="whitespace-pre-wrap">{selectedClient.concerns?.other || 'No'}</div>
                        </div>
                        <div>
                          <label className="text-sm text-gray-500">Primary Concern</label>
                          <div className="mt-1 whitespace-pre-wrap">{selectedClient.concerns?.primary}</div>
                        </div>
                        <div>
                          <label className="text-sm text-gray-500">Primary Concern Description</label>
                          <div className="mt-1 p-4 bg-gray-50 rounded-lg whitespace-pre-wrap">
                            {selectedClient.concerns?.primaryDescription || 'No description provided'}
                          </div>
                        </div>
                      </div>

                      <h3 className="text-lg font-medium mb-2 mt-6">Documents</h3>
                      <div className="space-y-4">
                        <div>
                          <label className="text-sm text-gray-500">Client Chart ID</label>
                          <div>{selectedClient.documents?.chartId || 'N/A'}</div>
                        </div>
                        <div>
                          <label className="text-sm text-gray-500">Client Chart URL</label>
                          <div className="break-all">{selectedClient.documents?.chartUrl || 'N/A'}</div>
                        </div>
                        <div>
                          <label className="text-sm text-gray-500">Document Merge Status</label>
                          <div>{selectedClient.documents?.mergeStatus || 'N/A'}</div>
                        </div>
                      </div>

                      <h3 className="text-lg font-medium mb-2 mt-6">Therapy Notes</h3>
                      {currentUser?.role === 'admin' && (
                        <div className="mb-4">
                          {!showNoteForm && (
                            <button
                              onClick={() => setShowNoteForm(true)}
                              className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            >
                              New Therapy Note
                            </button>
                          )}
                          {showNoteForm && (
                            <TherapyNoteForm
                              clientId={selectedClient.id}
                              clientName={`${selectedClient.data.firstName} ${selectedClient.data.lastName}`}
                              onClose={() => setShowNoteForm(false)}
                              onSaved={() => {
                                setShowNoteForm(false);
                                setNotesRefresh(prev => prev + 1);
                              }}
                            />
                          )}
                        </div>
                      )}
                      <TherapyNotesList clientId={selectedClient.id} key={notesRefresh} />
                    </section>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Clients;
