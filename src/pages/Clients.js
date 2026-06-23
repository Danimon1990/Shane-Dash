import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useSecureData } from '../hooks/useSecureData';
import TherapyNoteForm from '../components/TherapyNoteForm';
import TherapyNotesList from '../components/TherapyNotesList';
import secureApiClient from '../utils/secureApiClient';

const Clients = () => {
  const location = useLocation();
  const { isAuthenticated, canPerform } = useSecureData();

  const [clients, setClients] = useState([]);
  const [therapistList, setTherapistList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedClient, setSelectedClient] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('data');
  const [showActiveOnly, setShowActiveOnly] = useState(true);
  const [notification, setNotification] = useState(null);
  const [showNoteForm, setShowNoteForm] = useState(false);
  const [notesRefresh, setNotesRefresh] = useState(0);
  const [assigning, setAssigning] = useState(null);

  // Auto-hide notification after 5 seconds
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const showNotification = (message, type = 'success') => setNotification({ message, type });

  // Fetch all clients from Firestore via getPortalClients
  useEffect(() => {
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
    setLoading(true);
    setError(null);
    secureApiClient.makeSecureRequest(
      secureApiClient.baseURLs.cloudFunctions.getPortalClients,
      { method: 'GET' }
    )
      .then(data => {
        setClients(data.clients || []);
        setTherapistList(data.therapists || []);
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [isAuthenticated, canPerform]);

  // Handle client pre-selected from navigation state (e.g. from Associates page)
  useEffect(() => {
    if (location.state?.selectedClient) {
      setSelectedClient(location.state.selectedClient);
    }
  }, [location.state]);

  const handleStatusChange = async (clinicalId, status) => {
    if (!canPerform('edit_clients')) {
      showNotification('Insufficient permissions to update client status', 'error');
      return;
    }
    const prevClients = clients;
    // Optimistic update
    setClients(prev => prev.map(c => c.clinicalId === clinicalId ? { ...c, status } : c));
    if (selectedClient?.clinicalId === clinicalId) {
      setSelectedClient(prev => ({ ...prev, status }));
    }
    try {
      await secureApiClient.makeSecureRequest(
        secureApiClient.baseURLs.cloudFunctions.updatePortalClientStatus,
        { method: 'POST', body: JSON.stringify({ clinicalId, status }) }
      );
      const c = prevClients.find(c => c.clinicalId === clinicalId);
      showNotification(`${c ? `${c.firstName} ${c.lastName}` : 'Client'} status updated to ${status}`, 'success');
    } catch (err) {
      // Revert on failure
      setClients(prevClients);
      if (selectedClient?.clinicalId === clinicalId) {
        const original = prevClients.find(c => c.clinicalId === clinicalId);
        if (original) setSelectedClient(original);
      }
      showNotification('Failed to update client status', 'error');
    }
  };

  const handleAssignTherapist = async (clinicalId, therapistUid) => {
    const therapist = therapistList.find(t => t.uid === therapistUid);
    setAssigning(clinicalId);
    try {
      await secureApiClient.makeSecureRequest(
        secureApiClient.baseURLs.cloudFunctions.assignPortalClientTherapist,
        {
          method: 'POST',
          body: JSON.stringify({ clinicalId, therapistUid, therapistName: therapist?.name || '' })
        }
      );
      const updates = {
        assignedTherapistId: therapistUid,
        assignedTherapistName: therapist?.name || '',
        status: 'active'
      };
      setClients(prev => prev.map(c => c.clinicalId === clinicalId ? { ...c, ...updates } : c));
      if (selectedClient?.clinicalId === clinicalId) {
        setSelectedClient(prev => ({ ...prev, ...updates }));
      }
      showNotification('Therapist assigned successfully', 'success');
    } catch (err) {
      showNotification('Failed to assign therapist', 'error');
    } finally {
      setAssigning(null);
    }
  };

  const filteredClients = clients.filter(c => {
    const fullName = `${c.firstName} ${c.lastName}`.toLowerCase();
    const matchesSearch = fullName.includes(searchTerm.toLowerCase());
    const isActive = c.status === 'active';
    return matchesSearch && (showActiveOnly ? isActive : !isActive);
  });

  if (loading) return <div className="flex"><div className="flex-1 p-8">Loading...</div></div>;
  if (error) return <div className="flex"><div className="flex-1 p-8 text-red-600">Error: {error}</div></div>;

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

          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-2xl font-bold">Clients</h1>
              <p className="text-gray-600 mt-1">
                {filteredClients.length} {showActiveOnly ? 'active' : 'inactive'} clients
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <input
                type="text"
                placeholder="Search clients..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-64 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium">Show:</span>
                <button
                  onClick={() => setShowActiveOnly(true)}
                  className={`px-3 py-1 rounded text-sm font-medium ${showActiveOnly ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                >Active</button>
                <button
                  onClick={() => setShowActiveOnly(false)}
                  className={`px-3 py-1 rounded text-sm font-medium ${!showActiveOnly ? 'bg-red-500 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                >Inactive</button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

            {/* Client List */}
            <div className="md:col-span-1 bg-white rounded-lg shadow p-4">
              <h2 className="text-xl font-semibold mb-4">
                Clients List
                <span className="text-sm font-normal text-gray-500 ml-2">({filteredClients.length})</span>
              </h2>
              <div className="space-y-2">
                {filteredClients.length === 0 ? (
                  <div className="text-gray-500 text-center py-4 text-sm">
                    {clients.length === 0
                      ? 'No clients found'
                      : `No ${showActiveOnly ? 'active' : 'inactive'} clients`}
                  </div>
                ) : (
                  filteredClients.map(c => (
                    <div
                      key={c.uid}
                      className={`p-3 rounded cursor-pointer ${selectedClient?.uid === c.uid ? 'bg-indigo-100' : 'hover:bg-gray-100'}`}
                      onClick={() => { setSelectedClient(c); setActiveTab('data'); setShowNoteForm(false); }}
                    >
                      <div className="font-medium">{c.firstName} {c.lastName}</div>
                      <div className="text-sm text-gray-500">
                        {c.insuranceProvider || c.insuranceType || 'No insurance on file'}
                      </div>
                      <div className="text-sm text-gray-500">
                        {c.assignedTherapistName || 'Unassigned'}
                      </div>
                      <div className={`text-sm mt-0.5 ${c.status === 'active' ? 'text-green-600' : 'text-amber-600'}`}>
                        {c.status === 'active' ? 'Active' : c.status === 'pending' ? 'Pending' : 'Inactive'}
                      </div>
                      {!c.assignedTherapistId && (
                        <div className="text-xs text-amber-600 font-medium mt-0.5">⚠ Unassigned</div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Client Detail Panel */}
            {selectedClient && (
              <div className="md:col-span-2 bg-white rounded-lg shadow p-4">

                {/* Detail Header */}
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h2 className="text-xl font-semibold">
                      {selectedClient.firstName} {selectedClient.lastName}
                      {selectedClient.preferredName && selectedClient.preferredName !== selectedClient.firstName && (
                        <span className="text-base font-normal text-gray-500 ml-2">
                          ({selectedClient.preferredName})
                        </span>
                      )}
                    </h2>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        selectedClient.status === 'active'
                          ? 'bg-green-100 text-green-700'
                          : selectedClient.status === 'pending'
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-gray-100 text-gray-600'
                      }`}>
                        {selectedClient.status === 'active' ? 'Active' : selectedClient.status === 'pending' ? 'Pending' : 'Inactive'}
                      </span>
                      {selectedClient.assignedTherapistName && (
                        <span className="text-xs text-gray-500">
                          Therapist: {selectedClient.assignedTherapistName}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 flex-wrap justify-end">
                    {/* Status change */}
                    {canPerform('edit_clients') && (
                      <select
                        value={selectedClient.status === 'active' ? 'active' : 'inactive'}
                        onChange={e => handleStatusChange(selectedClient.clinicalId, e.target.value)}
                        className="px-3 py-1.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                      </select>
                    )}

                    {/* Therapist assignment */}
                    {canPerform('assign_therapists') && (
                      <div className="flex items-center gap-2">
                        <label className="text-sm text-gray-600 font-medium">Assign:</label>
                        <select
                          value={selectedClient.assignedTherapistId || ''}
                          disabled={assigning === selectedClient.clinicalId}
                          onChange={e => {
                            if (!e.target.value) return;
                            handleAssignTherapist(selectedClient.clinicalId, e.target.value);
                          }}
                          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                          <option value="">— Select therapist —</option>
                          {therapistList.map(t => (
                            <option key={t.uid} value={t.uid}>{t.name}</option>
                          ))}
                        </select>
                        {assigning === selectedClient.clinicalId && (
                          <span className="text-xs text-gray-400">Saving…</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Tabs */}
                <div className="border-b border-gray-200 mb-6">
                  <nav className="-mb-px flex space-x-8">
                    {[
                      { key: 'data',      label: 'Client Information' },
                      { key: 'insurance', label: 'Insurance & Billing' },
                      { key: 'clinical',  label: 'Clinical' },
                      { key: 'notes',     label: 'Therapy Notes' },
                    ].map(tab => (
                      <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key)}
                        className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                          activeTab === tab.key
                            ? 'border-indigo-500 text-indigo-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                      >{tab.label}</button>
                    ))}
                  </nav>
                </div>

                {/* Tab Content */}
                <div className="space-y-6">

                  {/* ── Client Information ── */}
                  {activeTab === 'data' && (
                    <section>
                      <h3 className="text-lg font-medium mb-2">Basic Information</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm text-gray-500">Legal First Name</label>
                          <div>{selectedClient.firstName || '—'}</div>
                        </div>
                        <div>
                          <label className="text-sm text-gray-500">Preferred Name</label>
                          <div>{selectedClient.preferredName || selectedClient.firstName || '—'}</div>
                        </div>
                        <div>
                          <label className="text-sm text-gray-500">Legal Last Name</label>
                          <div>{selectedClient.lastName || '—'}</div>
                        </div>
                        <div>
                          <label className="text-sm text-gray-500">Date of Birth</label>
                          <div>{selectedClient.dateOfBirth || '—'}</div>
                        </div>
                        <div>
                          <label className="text-sm text-gray-500">Gender / Pronouns</label>
                          <div>{selectedClient.gender || '—'}</div>
                        </div>
                        <div>
                          <label className="text-sm text-gray-500">Marital Status</label>
                          <div>{selectedClient.maritalStatus || '—'}</div>
                        </div>
                        <div>
                          <label className="text-sm text-gray-500">Employment Status</label>
                          <div>{selectedClient.employmentStatus || '—'}</div>
                        </div>
                        <div>
                          <label className="text-sm text-gray-500">Referral Source</label>
                          <div>{selectedClient.referralSource || '—'}</div>
                        </div>
                        <div>
                          <label className="text-sm text-gray-500">Email</label>
                          <div>{selectedClient.email || '—'}</div>
                        </div>
                        <div>
                          <label className="text-sm text-gray-500">Phone</label>
                          <div>{selectedClient.phone || '—'}</div>
                        </div>
                      </div>

                      <h3 className="text-lg font-medium mb-2 mt-6">Address</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm text-gray-500">Street Address</label>
                          <div>{selectedClient.street || '—'}</div>
                        </div>
                        <div>
                          <label className="text-sm text-gray-500">City</label>
                          <div>{selectedClient.city || '—'}</div>
                        </div>
                        <div>
                          <label className="text-sm text-gray-500">State</label>
                          <div>{selectedClient.state || '—'}</div>
                        </div>
                        <div>
                          <label className="text-sm text-gray-500">Zip Code</label>
                          <div>{selectedClient.zip || '—'}</div>
                        </div>
                      </div>

                      <h3 className="text-lg font-medium mb-2 mt-6">Emergency Contact</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm text-gray-500">Name</label>
                          <div>{selectedClient.emergencyContactName || '—'}</div>
                        </div>
                        <div>
                          <label className="text-sm text-gray-500">Phone</label>
                          <div>{selectedClient.emergencyContactPhone || '—'}</div>
                        </div>
                      </div>
                    </section>
                  )}

                  {/* ── Insurance & Billing ── */}
                  {activeTab === 'insurance' && (
                    <section>
                      <h3 className="text-lg font-medium mb-2">Payment</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm text-gray-500">Payment Preference</label>
                          <div>{selectedClient.paymentPreference || '—'}</div>
                        </div>
                        <div>
                          <label className="text-sm text-gray-500">Copay</label>
                          <div>{selectedClient.copay || '—'}</div>
                        </div>
                        <div>
                          <label className="text-sm text-gray-500">Deductible</label>
                          <div>{selectedClient.deductible || '—'}</div>
                        </div>
                      </div>

                      <h3 className="text-lg font-medium mb-2 mt-6">Insurance</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm text-gray-500">Provider</label>
                          <div>{selectedClient.insuranceProvider || selectedClient.insuranceType || '—'}</div>
                        </div>
                        <div>
                          <label className="text-sm text-gray-500">Plan Name</label>
                          <div>{selectedClient.insurancePlanName || '—'}</div>
                        </div>
                        <div>
                          <label className="text-sm text-gray-500">Member ID / Policy Number</label>
                          <div>{selectedClient.insuranceMemberId || '—'}</div>
                        </div>
                        <div>
                          <label className="text-sm text-gray-500">Group Number</label>
                          <div>{selectedClient.insuranceGroupId || '—'}</div>
                        </div>
                      </div>
                    </section>
                  )}

                  {/* ── Clinical ── */}
                  {activeTab === 'clinical' && (
                    <section>
                      {selectedClient.reasonForReachingOut && (
                        <div className="mb-6">
                          <h3 className="text-lg font-medium mb-2">Reason for Reaching Out</h3>
                          <div className="p-4 bg-blue-50 rounded-lg border-l-4 border-blue-400 text-sm whitespace-pre-wrap">
                            {selectedClient.reasonForReachingOut}
                          </div>
                        </div>
                      )}

                      {selectedClient.conditions?.length > 0 && (
                        <div className="mb-6">
                          <h3 className="text-lg font-medium mb-2">Reported Concerns</h3>
                          <div className="flex flex-wrap gap-2">
                            {selectedClient.conditions.map((cond, i) => (
                              <span key={i} className="inline-block bg-blue-100 rounded-full px-3 py-1 text-sm font-semibold text-blue-700">
                                {cond}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {selectedClient.medicationsCurrent && (
                        <div className="mb-6">
                          <h3 className="text-lg font-medium mb-2">Current Medications</h3>
                          <div className="p-3 bg-gray-50 rounded-lg text-sm">
                            {selectedClient.medicationsList || 'Yes (no details provided)'}
                          </div>
                        </div>
                      )}

                      {!selectedClient.reasonForReachingOut && !selectedClient.conditions?.length && !selectedClient.medicationsCurrent && (
                        <div className="text-gray-500 text-center py-8 text-sm">
                          No clinical information on file
                        </div>
                      )}
                    </section>
                  )}

                  {/* ── Therapy Notes ── */}
                  {activeTab === 'notes' && (
                    <section>
                      {/* Client summary banner */}
                      <div className="mb-6 p-4 bg-blue-50 rounded-lg border-l-4 border-blue-400">
                        <h4 className="text-sm font-semibold text-blue-800 mb-2">Client Summary</h4>
                        <div className="grid grid-cols-2 gap-4 text-sm">
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
                          <div>
                            <span className="text-blue-600 font-medium">Assigned Therapist:</span>
                            <div className="text-gray-800">{selectedClient.assignedTherapistName || 'Unassigned'}</div>
                          </div>
                        </div>
                      </div>

                      {canPerform('create_notes') && (
                        <div className="flex justify-between items-center mb-4">
                          <h4 className="text-md font-medium">Progress Notes</h4>
                          <button
                            onClick={() => setShowNoteForm(!showNoteForm)}
                            className={`px-4 py-2 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                              showNoteForm
                                ? 'bg-gray-500 text-white hover:bg-gray-600'
                                : 'bg-indigo-600 text-white hover:bg-indigo-700'
                            }`}
                          >
                            {showNoteForm ? 'Cancel' : 'New Therapy Note'}
                          </button>
                        </div>
                      )}

                      {showNoteForm && canPerform('create_notes') && (
                        <div className="mb-6 p-4 bg-gray-50 rounded-lg border">
                          <TherapyNoteForm
                            clinicalId={selectedClient.clinicalId}
                            clientName={`${selectedClient.firstName} ${selectedClient.lastName}`}
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

                      {canPerform('view_notes') ? (
                        <TherapyNotesList
                          clinicalId={selectedClient.clinicalId}
                          legacyClientId={selectedClient.legacyClientId}
                          key={notesRefresh}
                        />
                      ) : (
                        <div className="text-gray-500 text-center py-8 text-sm">
                          You don't have permission to view therapy notes
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

export default Clients;
