import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useSecureData } from '../hooks/useSecureData';
import TherapyNoteForm from '../components/TherapyNoteForm';
import TherapyNotesList from '../components/TherapyNotesList';
import secureApiClient from '../utils/secureApiClient';

const TherapyNotes = () => {
  const location = useLocation();
  const { isAuthenticated, canPerform } = useSecureData();

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
      const timer = setTimeout(() => setNotification(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const showNotification = (message, type = 'success') => setNotification({ message, type });

  // Fetch clients from Firestore via getPortalClients
  // Role filtering is handled server-side: therapists/associates only see their assigned clients
  useEffect(() => {
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
    setLoading(true);
    setError(null);
    secureApiClient.makeSecureRequest(
      secureApiClient.baseURLs.cloudFunctions.getPortalClients,
      { method: 'GET' }
    )
      .then(data => setClients(data.clients || []))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [isAuthenticated, canPerform]);

  // Handle client pre-selected from navigation state
  useEffect(() => {
    if (location.state?.selectedClient) {
      setSelectedClient(location.state.selectedClient);
    }
  }, [location.state]);

  // TherapyNoteForm checks clientData.therapist?.name (legacy shape) to verify
  // the therapist is assigned to this client before allowing note creation.
  // We normalize here so the form works correctly without modifying it.
  const clientDataForForm = selectedClient
    ? {
        ...selectedClient,
        therapist: { name: selectedClient.assignedTherapistName || '' }
      }
    : null;

  const filteredClients = clients.filter(c => {
    const fullName = `${c.firstName} ${c.lastName}`.toLowerCase();
    return fullName.includes(searchTerm.toLowerCase());
  });

  if (loading) return (
    <div className="flex"><div className="flex-1 p-8">Loading therapy notes...</div></div>
  );

  if (error) return (
    <div className="flex"><div className="flex-1 p-8 text-red-600">Error: {error}</div></div>
  );

  return (
    <div className="flex">
      <div className="flex-1 p-8">

        {/* Notification */}
        {notification && (
          <div className="fixed top-4 right-4 z-50 max-w-sm">
            <div className={`rounded-lg shadow-lg p-4 ${
              notification.type === 'success' ? 'bg-green-500 text-white' :
              notification.type === 'error'   ? 'bg-red-500 text-white' :
              'bg-blue-500 text-white'
            }`}>
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">{notification.message}</p>
                <button onClick={() => setNotification(null)} className="ml-4 text-white hover:text-gray-200">
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
            <div className="w-64">
              <input
                type="text"
                placeholder="Search clients..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

            {/* Client List */}
            <div className="md:col-span-1 bg-white rounded-lg shadow p-4">
              <h2 className="text-xl font-semibold mb-4">
                Select Client
                <span className="text-sm font-normal text-gray-500 ml-2">
                  ({filteredClients.length} clients)
                </span>
              </h2>
              <div className="space-y-2">
                {filteredClients.length === 0 ? (
                  <div className="text-gray-500 text-center py-4 text-sm">
                    {clients.length === 0
                      ? <div><div className="mb-2">No clients assigned to you yet</div><div className="text-xs">Contact your administrator if you expect to see clients here</div></div>
                      : 'No clients found matching search'}
                  </div>
                ) : (
                  filteredClients.map(c => (
                    <div
                      key={c.uid}
                      className={`p-3 rounded cursor-pointer ${
                        selectedClient?.uid === c.uid
                          ? 'bg-indigo-100 border-2 border-indigo-300'
                          : 'hover:bg-gray-100 border-2 border-transparent'
                      }`}
                      onClick={() => { setSelectedClient(c); setShowNoteForm(false); }}
                    >
                      <div className="font-medium">{c.firstName} {c.lastName}</div>
                      <div className="text-sm text-gray-500">{c.email}</div>
                      <div className={`text-sm mt-1 ${c.status === 'active' ? 'text-green-600' : 'text-red-600'}`}>
                        {c.status === 'active' ? 'Active' : c.status === 'pending' ? 'Pending' : 'Inactive'}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Notes Section */}
            {selectedClient ? (
              <div className="md:col-span-2 bg-white rounded-lg shadow p-4">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h2 className="text-xl font-semibold">
                      Therapy Notes: {selectedClient.firstName} {selectedClient.lastName}
                    </h2>
                    <p className="text-sm text-gray-600 mt-1">
                      Client Status:{' '}
                      <span className={selectedClient.status === 'active' ? 'text-green-600' : 'text-red-600'}>
                        {selectedClient.status === 'active' ? 'Active' : selectedClient.status === 'pending' ? 'Pending' : 'Inactive'}
                      </span>
                    </p>
                  </div>
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

                {/* New Note Form */}
                {showNoteForm && canPerform('create_notes') && (
                  <div className="mb-6 p-4 bg-gray-50 rounded-lg border">
                    <h3 className="text-lg font-medium mb-4">Create New Therapy Note</h3>
                    <TherapyNoteForm
                      clinicalId={selectedClient.clinicalId}
                      clientName={`${selectedClient.firstName} ${selectedClient.lastName}`}
                      clientData={clientDataForForm}
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
                      <span className="text-blue-600 font-medium">Reported Concerns:</span>
                      <div className="text-gray-800">
                        {selectedClient.conditions?.length > 0
                          ? selectedClient.conditions.join(', ')
                          : 'Not specified'}
                      </div>
                    </div>
                    <div>
                      <span className="text-blue-600 font-medium">Date of Birth:</span>
                      <div className="text-gray-800">{selectedClient.dateOfBirth || 'Not on file'}</div>
                    </div>
                    <div>
                      <span className="text-blue-600 font-medium">Phone:</span>
                      <div className="text-gray-800">{selectedClient.phone || 'Not on file'}</div>
                    </div>
                    <div>
                      <span className="text-blue-600 font-medium">Emergency Contact:</span>
                      <div className="text-gray-800">{selectedClient.emergencyContactName || 'Not provided'}</div>
                    </div>
                  </div>
                  {selectedClient.reasonForReachingOut && (
                    <div className="mt-3">
                      <span className="text-blue-600 font-medium text-sm">Reason for Reaching Out:</span>
                      <div className="text-gray-800 text-sm mt-1 whitespace-pre-wrap">
                        {selectedClient.reasonForReachingOut}
                      </div>
                    </div>
                  )}
                </div>

                {/* Notes List */}
                <div>
                  <h3 className="text-lg font-medium mb-4">
                    Session History
                    {!canPerform('view_notes') && ' (Limited Access)'}
                  </h3>
                  {canPerform('view_notes') ? (
                    <TherapyNotesList
                      clinicalId={selectedClient.clinicalId}
                      legacyClientId={selectedClient.legacyClientId}
                      key={notesRefresh}
                    />
                  ) : (
                    <div className="text-gray-500 text-center py-8 text-sm">
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
