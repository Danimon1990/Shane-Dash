import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useSecureData } from '../hooks/useSecureData';
import TherapyNoteForm from '../components/TherapyNoteForm';
import TherapyNotesList from '../components/TherapyNotesList';
import TreatmentPlanList from '../components/TreatmentPlanList';
import secureApiClient from '../utils/secureApiClient';
import { db } from '../firebase';
import { collection, query, orderBy, getDocs } from 'firebase/firestore';

const MyClients = () => {
  const location = useLocation();
  const { isAuthenticated, canPerform } = useSecureData();

  const [clients, setClients] = useState([]);
  const [therapistList, setTherapistList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedClient, setSelectedClient] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('data');
  const [activeNotesTab, setActiveNotesTab] = useState('progress');
  const [showActiveOnly, setShowActiveOnly] = useState(true);
  const [notification, setNotification] = useState(null);
  const [showNoteForm, setShowNoteForm] = useState(false);
  const [notesRefresh, setNotesRefresh] = useState(0);
  const [assigning, setAssigning] = useState(null);
  const [inviting, setInviting] = useState(null);
  const [assessments, setAssessments] = useState([]);
  const [assessmentsLoading, setAssessmentsLoading] = useState(false);
  const [expandedAssessment, setExpandedAssessment] = useState(null);

  // Auto-hide notification after 5 seconds
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const showNotification = (message, type = 'success') => setNotification({ message, type });

  // Fetch all clients from Firestore
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

  // Handle pre-selected client from navigation state
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
    // Optimistic update
    const prevClients = clients;
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
      const name = c ? `${c.firstName} ${c.lastName}` : 'Client';
      showNotification(`${name} status updated to ${status}`, 'success');
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
      const updates = { assignedTherapistId: therapistUid, assignedTherapistName: therapist?.name || '', status: 'active' };
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

  const handleInvite = async (client) => {
    setInviting(client.clinicalId);
    try {
      const data = await secureApiClient.makeSecureRequest(
        secureApiClient.baseURLs.cloudFunctions.inviteClient,
        { method: 'POST', body: JSON.stringify({ clinicalId: client.clinicalId, email: client.email }) }
      );
      await navigator.clipboard.writeText(data.signupUrl);
      showNotification(`Invitation ready — signup link copied to clipboard for ${client.firstName}`, 'success');
    } catch (err) {
      showNotification('Failed to create invitation', 'error');
    } finally {
      setInviting(null);
    }
  };

  // Load assessments when the assessments tab is active
  useEffect(() => {
    if (activeTab !== 'assessments' || !selectedClient?.clinicalId) {
      setAssessments([]);
      return;
    }
    setAssessmentsLoading(true);
    getDocs(query(
      collection(db, 'clinicalRecords', selectedClient.clinicalId, 'assessments'),
      orderBy('submittedAt', 'desc')
    ))
      .then(snap => {
        setAssessments(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      })
      .catch(() => setAssessments([]))
      .finally(() => setAssessmentsLoading(false));
  }, [activeTab, selectedClient?.clinicalId]);

  const filteredClients = clients.filter(c => {
    const fullName = `${c.firstName} ${c.lastName}`.toLowerCase();
    const matchesSearch = fullName.includes(searchTerm.toLowerCase());
    const isActive = c.status === 'active';
    return matchesSearch && (showActiveOnly ? isActive : !isActive);
  });

  if (loading) return <div className="flex"><div className="flex-1 p-8">Loading clients…</div></div>;
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
              <h1 className="text-2xl font-bold">My Clients</h1>
              <p className="text-gray-600 mt-1">
                {filteredClients.length} {showActiveOnly ? 'active' : 'inactive'} clients
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <input
                type="text"
                placeholder="Search clients…"
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
                Client List
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
                      onClick={() => { setSelectedClient(c); setActiveTab('data'); setShowNoteForm(false); setAssessments([]); }}
                    >
                      <div className="font-medium">{c.firstName} {c.lastName}</div>
                      <div className="text-sm text-gray-500">
                        {c.insuranceProvider || c.insuranceType || 'No insurance on file'}
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

                    {/* Therapist assignment — admin/billing only */}
                    {canPerform('edit_clients') && (
                      <div className="flex items-center gap-2">
                        <label className="text-sm text-gray-600 font-medium">Assign:</label>
                        <select
                          value={selectedClient.assignedTherapistId || ''}
                          disabled={assigning === selectedClient.clinicalId}
                          onChange={e => {
                            const uid = e.target.value;
                            if (!uid) return;
                            handleAssignTherapist(selectedClient.clinicalId, uid);
                          }}
                          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2"
                          style={{ '--tw-ring-color': '#3c5c6c' }}
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

                  {/* Invite to Portal — only for migrated clients without a verified account */}
                  {selectedClient.migratedFromSheet && !selectedClient.emailVerified && canPerform('edit_clients') && (
                    <div className="mt-3 pt-3 border-t border-amber-200 bg-amber-50 rounded-lg px-3 py-2 flex items-center justify-between">
                      <div className="text-sm text-amber-800">
                        <span className="font-medium">Not on portal yet.</span> Send this client the signup link.
                      </div>
                      <button
                        onClick={() => handleInvite(selectedClient)}
                        disabled={inviting === selectedClient.clinicalId}
                        className="ml-4 px-3 py-1.5 text-sm font-medium bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-amber-500 whitespace-nowrap"
                      >
                        {inviting === selectedClient.clinicalId ? 'Creating…' : 'Invite to Portal'}
                      </button>
                    </div>
                  )}
                </div>

                {/* Tabs */}
                <div className="border-b border-gray-200 mb-6">
                  <nav className="-mb-px flex space-x-8">
                    {[
                      { key: 'data',        label: 'Client Information' },
                      { key: 'insurance',   label: 'Insurance & Billing' },
                      { key: 'clinical',    label: 'Clinical Information' },
                      { key: 'notes',       label: 'Therapy Notes' },
                      { key: 'assessments', label: 'Assessments' },
                    ].map(tab => (
                      <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key)}
                        className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                          activeTab === tab.key
                            ? 'border-indigo-500 text-indigo-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                      >
                        {tab.label}
                      </button>
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
                          <label className="text-sm text-gray-500">Street</label>
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
                          <label className="text-sm text-gray-500">Zip</label>
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
                          <label className="text-sm text-gray-500">Member ID</label>
                          <div>{selectedClient.insuranceMemberId || '—'}</div>
                        </div>
                        <div>
                          <label className="text-sm text-gray-500">Group ID</label>
                          <div>{selectedClient.insuranceGroupId || '—'}</div>
                        </div>
                      </div>
                    </section>
                  )}

                  {/* ── Clinical Information ── */}
                  {activeTab === 'clinical' && (
                    <section>
                      {selectedClient.conditions?.length > 0 && (
                        <div>
                          <h3 className="text-lg font-medium mb-2">Reported Concerns</h3>
                          <div className="flex flex-wrap gap-2 mb-4">
                            {selectedClient.conditions.map((c, i) => (
                              <span key={i} className="inline-block bg-blue-100 rounded-full px-3 py-1 text-sm font-semibold text-blue-700">
                                {c}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {selectedClient.reasonForReachingOut && (
                        <div className="mb-4">
                          <h3 className="text-lg font-medium mb-2">Reason for Reaching Out</h3>
                          <div className="p-4 bg-blue-50 rounded-lg border-l-4 border-blue-400 text-sm whitespace-pre-wrap">
                            {selectedClient.reasonForReachingOut}
                          </div>
                        </div>
                      )}

                      {selectedClient.medicationsCurrent && (
                        <div className="mb-4">
                          <h3 className="text-lg font-medium mb-2">Current Medications</h3>
                          <div className="p-3 bg-gray-50 rounded-lg text-sm">
                            {selectedClient.medicationsList || 'Yes (no details provided)'}
                          </div>
                        </div>
                      )}

                      {selectedClient.referralSource && (
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="text-sm text-gray-500">Referral Source</label>
                            <div>{selectedClient.referralSource}</div>
                          </div>
                        </div>
                      )}

                      {!selectedClient.conditions?.length && !selectedClient.reasonForReachingOut && !selectedClient.medicationsCurrent && !selectedClient.referralSource && (
                        <div className="text-gray-500 text-center py-8 text-sm">No clinical information on file</div>
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

                      {/* Notes sub-tabs */}
                      <div className="border-b border-gray-200 mb-6">
                        <nav className="-mb-px flex space-x-8">
                          <button
                            onClick={() => setActiveNotesTab('progress')}
                            className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm ${
                              activeNotesTab === 'progress'
                                ? 'border-indigo-500 text-indigo-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                          >
                            Progress Notes
                          </button>
                          <button
                            onClick={() => setActiveNotesTab('treatment')}
                            className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm ${
                              activeNotesTab === 'treatment'
                                ? 'border-green-500 text-green-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                          >
                            Treatment Plan
                          </button>
                        </nav>
                      </div>

                      {/* Progress Notes */}
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
                                  showNotification('Progress note saved successfully');
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
                              You don't have permission to view progress notes
                            </div>
                          )}
                        </div>
                      )}

                      {/* Treatment Plans */}
                      {activeNotesTab === 'treatment' && (
                        <div>
                          {canPerform('view_notes') ? (
                            <TreatmentPlanList
                              clinicalId={selectedClient.clinicalId}
                              clientName={`${selectedClient.firstName} ${selectedClient.lastName}`}
                              clientData={selectedClient}
                            />
                          ) : (
                            <div className="text-gray-500 text-center py-8 text-sm">
                              You don't have permission to view treatment plans
                            </div>
                          )}
                        </div>
                      )}
                    </section>
                  )}

                  {/* ── Assessments ── */}
                  {activeTab === 'assessments' && (
                    <section>
                      <h3 className="text-lg font-medium mb-4">Client Assessments</h3>
                      {assessmentsLoading ? (
                        <div className="text-center text-gray-500 py-8">Loading assessments…</div>
                      ) : assessments.length === 0 ? (
                        <div className="text-center text-gray-500 py-8 text-sm">No assessments on file</div>
                      ) : (
                        <div className="space-y-4">
                          {assessments.map(a => {
                            const date = a.submittedAt?.toDate
                              ? a.submittedAt.toDate().toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                              : a.submittedAt
                              ? new Date(a.submittedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                              : 'Unknown date';
                            const isExpanded = expandedAssessment === a.id;
                            const checkboxes = a.selectedCheckboxes || {};
                            const checkedItems = Object.entries(checkboxes)
                              .filter(([, v]) => v === true || v === 'true')
                              .map(([k]) => k);

                            return (
                              <div key={a.id} className="border rounded-lg overflow-hidden">
                                <div
                                  className="bg-gray-50 p-4 flex justify-between items-center cursor-pointer hover:bg-gray-100"
                                  onClick={() => setExpandedAssessment(isExpanded ? null : a.id)}
                                >
                                  <div>
                                    <div className="font-medium text-gray-800">Assessment — {date}</div>
                                    <div className="text-sm text-gray-500 mt-0.5">
                                      {checkedItems.length > 0
                                        ? `${checkedItems.length} reported symptom${checkedItems.length !== 1 ? 's' : ''}`
                                        : 'No symptoms selected'}
                                      {a.aiAnalysis && <span className="ml-2 text-green-600 font-medium">· AI analysis available</span>}
                                    </div>
                                  </div>
                                  <svg
                                    className={`w-5 h-5 text-gray-400 transform transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                                    fill="none" stroke="currentColor" viewBox="0 0 24 24"
                                  >
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                  </svg>
                                </div>

                                {isExpanded && (
                                  <div className="p-4 border-t space-y-5">
                                    {/* Basic info */}
                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                      {a.age && <div><span className="text-gray-500">Age:</span> <span>{a.age}</span></div>}
                                      {a.maritalStatus && <div><span className="text-gray-500">Marital Status:</span> <span>{a.maritalStatus}</span></div>}
                                      {a.previousDiagnosis && <div className="col-span-2"><span className="text-gray-500">Previous Diagnosis:</span> <span>{a.previousDiagnosis}</span></div>}
                                      {a.medicalCondition && <div className="col-span-2"><span className="text-gray-500">Medical Conditions:</span> <span>{a.medicalCondition}</span></div>}
                                    </div>

                                    {/* Reported symptoms */}
                                    {checkedItems.length > 0 && (
                                      <div>
                                        <h5 className="text-sm font-semibold text-gray-700 mb-2">Reported Symptoms</h5>
                                        <div className="flex flex-wrap gap-2">
                                          {checkedItems.map(item => (
                                            <span key={item} className="bg-blue-100 text-blue-700 text-xs font-medium px-2.5 py-1 rounded-full">
                                              {item}
                                            </span>
                                          ))}
                                        </div>
                                      </div>
                                    )}

                                    {/* Additional info */}
                                    {a.additionalInfo && (
                                      <div>
                                        <h5 className="text-sm font-semibold text-gray-700 mb-1">Additional Information</h5>
                                        <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded whitespace-pre-wrap">{a.additionalInfo}</p>
                                      </div>
                                    )}

                                    {/* AI Analysis */}
                                    {a.aiAnalysis && (
                                      <div className="border-t pt-4">
                                        <h5 className="text-sm font-semibold text-indigo-700 mb-3">AI Clinical Analysis</h5>
                                        {a.aiAnalysis.summary && a.aiAnalysis.summary !== 'Analysis unavailable' && (
                                          <div className="mb-4">
                                            <h6 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Clinical Summary</h6>
                                            <p className="text-sm text-gray-700 bg-indigo-50 p-3 rounded whitespace-pre-wrap">{a.aiAnalysis.summary}</p>
                                          </div>
                                        )}
                                        {a.aiAnalysis.suggestedPlan && a.aiAnalysis.suggestedPlan !== 'Analysis unavailable' && (
                                          <div>
                                            <h6 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Suggested Treatment Plan</h6>
                                            <p className="text-sm text-gray-700 bg-green-50 p-3 rounded whitespace-pre-wrap">{a.aiAnalysis.suggestedPlan}</p>
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}
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
