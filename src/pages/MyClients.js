import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useSecureData } from '../hooks/useSecureData';
import TherapyNoteForm from '../components/TherapyNoteForm';
import TherapyNotesList from '../components/TherapyNotesList';
import TreatmentPlanList from '../components/TreatmentPlanList';

const MyClients = () => {
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
  const [activeNotesTab, setActiveNotesTab] = useState('progress'); // 'progress' or 'treatment'
  const [showActiveOnly, setShowActiveOnly] = useState(true);
  const [notification, setNotification] = useState(null);
  const [showNoteForm, setShowNoteForm] = useState(false);
  const [notesRefresh, setNotesRefresh] = useState(0);

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
        
        // Backend now handles therapist filtering based on robust name matching
        // No need to filter here since the API returns only the therapist's clients
        setClients(data);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [isAuthenticated, canPerform, secureClientOperations, currentUser]);

  // Handle client selection
  useEffect(() => {
    if (location.state?.selectedClient) {
      setSelectedClient(location.state.selectedClient);
    }
  }, [location.state]);

  const handleClientClick = (client) => {
    setSelectedClient(client);
  };

  const handleStatusChange = async (clientId, status) => {
    try {
      if (!canPerform('edit_clients')) {
        showNotification('Insufficient permissions to update client status', 'error');
        return;
      }

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

      showNotification(`${clientName} status updated to ${status}`, 'success');

    } catch (error) {
      console.error('Error updating status:', error);
      showNotification('Failed to update client status', 'error');
    }
  };

  const filteredClients = clients.filter(client => {
    const fullName = `${client.data.firstName} ${client.data.lastName}`.toLowerCase();
    const matchesSearch = fullName.includes(searchTerm.toLowerCase());
    
    const isActive = client.therapist?.status === 'Active';
    const matchesStatus = showActiveOnly ? isActive : !isActive;
    
    return matchesSearch && matchesStatus;
  });

  if (loading) return (
    <div className="flex">
      <div className="flex-1 p-8">Loading your clients...</div>
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
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-2xl font-bold">My Clients</h1>
              <p className="text-gray-600 mt-1">Clients assigned to you ({filteredClients.length} total)</p>
            </div>
            <div className="flex items-center space-x-4">
              {/* Search Input */}
              <div className="w-64">
                <input
                  type="text"
                  placeholder="Search my clients..."
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
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Clients List */}
            <div className="md:col-span-1 bg-white rounded-lg shadow p-4">
              <h2 className="text-xl font-semibold mb-4">
                My Client List
                <span className="text-sm font-normal text-gray-500 ml-2">
                  ({filteredClients.length} {showActiveOnly ? 'active' : 'inactive'})
                </span>
              </h2>
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
                      Insurance: {client.insurance?.provider || 'N/A'}
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
                    {clients.length === 0 ? (
                      <div>
                        <div className="mb-2">No clients assigned to you yet</div>
                        <div className="text-xs">Contact your administrator if you expect to see clients here</div>
                      </div>
                    ) : (
                      `No ${showActiveOnly ? 'active' : 'inactive'} clients found`
                    )}
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
                      Insurance & Billing
                    </button>
                    <button
                      onClick={() => setActiveTab('clinical')}
                      className={`${
                        activeTab === 'clinical'
                          ? 'border-indigo-500 text-indigo-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                    >
                      Clinical Information
                    </button>
                    <button
                      onClick={() => setActiveTab('notes')}
                      className={`${
                        activeTab === 'notes'
                          ? 'border-indigo-500 text-indigo-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                    >
                      Therapy Notes
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
                      </div>

                      <h3 className="text-lg font-medium mb-2 mt-6">Contact Information</h3>
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
                      </div>

                      <h3 className="text-lg font-medium mb-2 mt-6">Insurance Information</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm text-gray-500">Provider</label>
                          <div>{selectedClient.insurance.provider}</div>
                        </div>
                        <div>
                          <label className="text-sm text-gray-500">Plan Name</label>
                          <div>{selectedClient.insurance.planName || 'N/A'}</div>
                        </div>
                        <div>
                          <label className="text-sm text-gray-500">Member ID</label>
                          <div>{selectedClient.insurance.memberId || 'N/A'}</div>
                        </div>
                        <div>
                          <label className="text-sm text-gray-500">Deductible Amount</label>
                          <div>{selectedClient.insurance.deductible || 'N/A'}</div>
                        </div>
                        <div>
                          <label className="text-sm text-gray-500">Copay Amount</label>
                          <div>{selectedClient.insurance.copay || 'N/A'}</div>
                        </div>
                      </div>
                    </section>
                  )}

                  {activeTab === 'clinical' && (
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
                          <label className="text-sm text-gray-500">Medications</label>
                          <div className="whitespace-pre-wrap">{selectedClient.medical?.medications || 'N/A'}</div>
                        </div>
                      </div>

                      <h3 className="text-lg font-medium mb-2 mt-6">Therapy-Relevant Concerns</h3>
                      <div className="space-y-4">
                        <div>
                          <label className="text-sm text-gray-500">Reported Concerns</label>
                          <div className="mt-1">
                            {selectedClient.concerns?.reportedConcerns?.length > 0 ? (
                              selectedClient.concerns.reportedConcerns.map((concern, index) => (
                                <span key={index} className="inline-block bg-blue-100 rounded-full px-3 py-1 text-sm font-semibold text-blue-700 mr-2 mb-2">
                                  {concern}
                                </span>
                              ))
                            ) : (
                              <span className="text-gray-500 italic">No specific concerns reported</span>
                            )}
                          </div>
                        </div>
                        <div>
                          <label className="text-sm text-gray-500">Primary Concern (Most Important)</label>
                          <div className="mt-1 p-3 bg-yellow-50 rounded-lg border-l-4 border-yellow-400">
                            <div className="font-medium text-yellow-800">{selectedClient.concerns?.primaryConcern || 'No primary concern specified'}</div>
                          </div>
                        </div>
                        <div>
                          <label className="text-sm text-gray-500">Primary Concern Description</label>
                          <div className="mt-1 p-4 bg-gray-50 rounded-lg whitespace-pre-wrap border-l-4 border-blue-400">
                            {selectedClient.concerns?.primaryDescription || 'No detailed description provided'}
                          </div>
                        </div>
                        <div>
                          <label className="text-sm text-gray-500">Additional Issues or Concerns</label>
                          <div className="whitespace-pre-wrap p-3 bg-gray-50 rounded-lg">
                            {selectedClient.concerns?.otherConcerns || 'No additional concerns reported'}
                          </div>
                        </div>
                      </div>

                      <h3 className="text-lg font-medium mb-2 mt-6">Reason for Reaching Out</h3>
                      <div className="p-4 bg-blue-50 rounded-lg border-l-4 border-blue-400">
                        <div className="whitespace-pre-wrap">{selectedClient.data.reasonForReachingOut || 'No reason specified'}</div>
                      </div>
                    </section>
                  )}

                  {activeTab === 'notes' && (
                    <section>
                      <h3 className="text-lg font-medium mb-4">Therapy Notes</h3>
                      
                      {/* Sub-tabs for Notes */}
                      <div className="border-b border-gray-200 mb-6">
                        <nav className="-mb-px flex space-x-8">
                          <button
                            onClick={() => setActiveNotesTab('progress')}
                            className={`${
                              activeNotesTab === 'progress'
                                ? 'border-indigo-500 text-indigo-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm`}
                          >
                            Progress Notes
                          </button>
                          <button
                            onClick={() => setActiveNotesTab('treatment')}
                            className={`${
                              activeNotesTab === 'treatment'
                                ? 'border-green-500 text-green-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm`}
                          >
                            Treatment Plan
                          </button>
                        </nav>
                      </div>

                      {/* Progress Notes Tab Content */}
                      {activeNotesTab === 'progress' && (
                        <div>
                          <div className="flex justify-between items-center mb-4">
                            <h4 className="text-md font-medium">Progress Notes</h4>
                            {canPerform('create_notes') && (
                              <button
                                onClick={() => setShowNoteForm(!showNoteForm)}
                                className={`px-4 py-2 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                                  showNoteForm 
                                    ? 'bg-gray-500 text-white hover:bg-gray-600' 
                                    : 'bg-indigo-600 text-white hover:bg-indigo-700'
                                }`}
                              >
                                {showNoteForm ? 'Cancel' : 'New Progress Note'}
                              </button>
                            )}
                          </div>

                          {/* New Note Form */}
                          {showNoteForm && canPerform('create_notes') && (
                            <div className="mb-6 p-4 bg-gray-50 rounded-lg border">
                              <h4 className="text-md font-medium mb-4">Create New Progress Note</h4>
                              <TherapyNoteForm
                                clientId={selectedClient.id}
                                clientName={`${selectedClient.data.firstName} ${selectedClient.data.lastName}`}
                                clientData={selectedClient}
                                onClose={() => setShowNoteForm(false)}
                                onSaved={() => {
                                  setShowNoteForm(false);
                                  setNotesRefresh(prev => prev + 1);
                                  showNotification('Progress note saved successfully');
                                }}
                              />
                            </div>
                          )}

                          {/* Client Summary */}
                          <div className="mb-6 p-4 bg-blue-50 rounded-lg border-l-4 border-blue-400">
                            <h4 className="text-sm font-semibold text-blue-800 mb-2">Client Summary</h4>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <span className="text-blue-600 font-medium">Primary Concern:</span>
                                <div className="text-gray-800">{selectedClient.concerns?.primaryConcern || 'Not specified'}</div>
                              </div>
                              <div>
                                <span className="text-blue-600 font-medium">Date of Birth:</span>
                                <div className="text-gray-800">{selectedClient.data.birthDate}</div>
                              </div>
                              <div>
                                <span className="text-blue-600 font-medium">Phone:</span>
                                <div className="text-gray-800">{selectedClient.data.phone}</div>
                              </div>
                              <div>
                                <span className="text-blue-600 font-medium">Emergency Contact:</span>
                                <div className="text-gray-800">{selectedClient.data.emergencyContact?.name || 'Not provided'}</div>
                              </div>
                            </div>
                            {selectedClient.concerns?.primaryDescription && (
                              <div className="mt-3">
                                <span className="text-blue-600 font-medium text-sm">Primary Concern Details:</span>
                                <div className="text-gray-800 text-sm mt-1 whitespace-pre-wrap">
                                  {selectedClient.concerns.primaryDescription}
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Progress Notes List */}
                          <div>
                            <h4 className="text-md font-medium mb-4">Session History</h4>
                            {canPerform('view_notes') ? (
                              <TherapyNotesList 
                                clientId={selectedClient.id} 
                                key={notesRefresh}
                                showClientName={false}
                                allowEdit={canPerform('edit_notes')}
                                allowDelete={canPerform('delete_notes')}
                              />
                            ) : (
                              <div className="text-gray-500 text-center py-8">
                                <div className="mb-2">You don't have permission to view progress notes</div>
                                <div className="text-sm">Contact your administrator if you need access</div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Treatment Plan Tab Content */}
                      {activeNotesTab === 'treatment' && (
                        <div>
                          {/* Client Summary for Treatment Plans */}
                          <div className="mb-6 p-4 bg-green-50 rounded-lg border-l-4 border-green-400">
                            <h4 className="text-sm font-semibold text-green-800 mb-2">Client Summary for Treatment Planning</h4>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <span className="text-green-600 font-medium">Primary Concern:</span>
                                <div className="text-gray-800">{selectedClient.concerns?.primaryConcern || 'Not specified'}</div>
                              </div>
                              <div>
                                <span className="text-green-600 font-medium">Date of Birth:</span>
                                <div className="text-gray-800">{selectedClient.data.birthDate}</div>
                              </div>
                              <div>
                                <span className="text-green-600 font-medium">Phone:</span>
                                <div className="text-gray-800">{selectedClient.data.phone}</div>
                              </div>
                              <div>
                                <span className="text-green-600 font-medium">Emergency Contact:</span>
                                <div className="text-gray-800">{selectedClient.data.emergencyContact?.name || 'Not provided'}</div>
                              </div>
                            </div>
                            {selectedClient.concerns?.primaryDescription && (
                              <div className="mt-3">
                                <span className="text-green-600 font-medium text-sm">Primary Concern Details:</span>
                                <div className="text-gray-800 text-sm mt-1 whitespace-pre-wrap">
                                  {selectedClient.concerns.primaryDescription}
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Treatment Plans List */}
                          <div>
                            {canPerform('view_notes') ? (
                              <TreatmentPlanList 
                                clientId={selectedClient.id} 
                                clientName={`${selectedClient.data.firstName} ${selectedClient.data.lastName}`}
                                clientData={selectedClient}
                              />
                            ) : (
                              <div className="text-gray-500 text-center py-8">
                                <div className="mb-2">You don't have permission to view treatment plans</div>
                                <div className="text-sm">Contact your administrator if you need access</div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
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

export default MyClients;