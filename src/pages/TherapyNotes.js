import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useSecureData } from '../hooks/useSecureData';
import TherapyNoteForm from '../components/TherapyNoteForm';
import TherapyNotesList from '../components/TherapyNotesList';

const TherapyNotes = () => {
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
  const [showNoteForm, setShowNoteForm] = useState(false);
  const [notesRefresh, setNotesRefresh] = useState(0);
  const [notification, setNotification] = useState(null);

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
      if (!canPerform('view_clients') || !canPerform('view_notes')) {
        setLoading(false);
        setError('Insufficient permissions to view therapy notes');
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

  // Handle client selection from navigation state
  useEffect(() => {
    if (location.state?.selectedClient) {
      setSelectedClient(location.state.selectedClient);
    }
  }, [location.state]);

  const handleClientClick = (client) => {
    setSelectedClient(client);
  };

  const filteredClients = clients.filter(client => {
    const fullName = `${client.data.firstName} ${client.data.lastName}`.toLowerCase();
    return fullName.includes(searchTerm.toLowerCase());
  });

  if (loading) return (
    <div className="flex">
      <div className="flex-1 p-8">Loading therapy notes...</div>
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
              <h1 className="text-2xl font-bold">Therapy Notes</h1>
              <p className="text-gray-600 mt-1">Manage notes for your assigned clients</p>
            </div>
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
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Clients List */}
            <div className="md:col-span-1 bg-white rounded-lg shadow p-4">
              <h2 className="text-xl font-semibold mb-4">
                Select Client
                <span className="text-sm font-normal text-gray-500 ml-2">
                  ({filteredClients.length} clients)
                </span>
              </h2>
              <div className="space-y-2">
                {filteredClients.map(client => (
                  <div
                    key={client.id}
                    className={`p-3 rounded cursor-pointer ${
                      selectedClient?.id === client.id
                        ? 'bg-indigo-100 border-2 border-indigo-300'
                        : 'hover:bg-gray-100 border-2 border-transparent'
                    }`}
                    onClick={() => handleClientClick(client)}
                  >
                    <div className="font-medium">
                      {client.data.firstName} {client.data.lastName}
                    </div>
                    <div className="text-sm text-gray-500">
                      {client.data.email}
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
                      'No clients found matching search'
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Notes Section */}
            {selectedClient ? (
              <div className="md:col-span-2 bg-white rounded-lg shadow p-4">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h2 className="text-xl font-semibold">
                      Therapy Notes: {selectedClient.data.firstName} {selectedClient.data.lastName}
                    </h2>
                    <p className="text-sm text-gray-600 mt-1">
                      Client Status: <span className={selectedClient.therapist?.status === 'Active' ? 'text-green-600' : 'text-red-600'}>
                        {selectedClient.therapist?.status || 'Inactive'}
                      </span>
                    </p>
                  </div>
                  <div className="flex space-x-2">
                    {canPerform('create_notes') && (
                      <button
                        onClick={() => setShowNoteForm(!showNoteForm)}
                        className={`px-4 py-2 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                          showNoteForm 
                            ? 'bg-gray-500 text-white hover:bg-gray-600' 
                            : 'bg-indigo-600 text-white hover:bg-indigo-700'
                        }`}
                      >
                        {showNoteForm ? 'Cancel' : 'New Note'}
                      </button>
                    )}
                  </div>
                </div>

                {/* New Note Form */}
                {showNoteForm && canPerform('create_notes') && (
                  <div className="mb-6 p-4 bg-gray-50 rounded-lg border">
                    <h3 className="text-lg font-medium mb-4">Create New Therapy Note</h3>
                    <TherapyNoteForm
                      clientId={selectedClient.id}
                      clientName={`${selectedClient.data.firstName} ${selectedClient.data.lastName}`}
                      clientData={selectedClient}
                      onClose={() => setShowNoteForm(false)}
                      onSaved={() => {
                        setShowNoteForm(false);
                        setNotesRefresh(prev => prev + 1);
                        showNotification('Therapy note saved successfully');
                      }}
                    />
                  </div>
                )}

                {/* Client Summary */}
                <div className="mb-6 p-4 bg-blue-50 rounded-lg border-l-4 border-blue-400">
                  <h3 className="text-sm font-semibold text-blue-800 mb-2">Client Summary</h3>
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

                {/* Notes List */}
                <div>
                  <h3 className="text-lg font-medium mb-4">
                    Session History
                    {canPerform('view_notes') ? '' : ' (Limited Access)'}
                  </h3>
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
                      <div className="mb-2">You don't have permission to view therapy notes</div>
                      <div className="text-sm">Contact your administrator if you need access</div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="md:col-span-2 bg-white rounded-lg shadow p-4 flex items-center justify-center">
                <div className="text-center text-gray-500">
                  <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <h3 className="text-lg font-medium mb-2">Select a Client</h3>
                  <p className="text-sm">Choose a client from the list to view and manage their therapy notes</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TherapyNotes;