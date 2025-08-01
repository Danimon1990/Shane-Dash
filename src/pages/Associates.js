import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useSecureData } from '../hooks/useSecureData';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import TherapyNoteForm from '../components/TherapyNoteForm';
import TherapyNotesList from '../components/TherapyNotesList';

const Associates = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { 
    isAuthenticated, 
    userRole, 
    secureClientOperations,
    canPerform 
  } = useSecureData();
  
  const [associates, setAssociates] = useState([]);
  const [selectedAssociate, setSelectedAssociate] = useState(null);
  const [selectedClientDetails, setSelectedClientDetails] = useState(null);
  const [showNoteForm, setShowNoteForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notesRefresh, setNotesRefresh] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');

  // Define the list of therapists to match Clients.js
  const therapistList = [
    'Shane Bruce',
    'Silvia Popa',
    'Dahkotahv Beckham',
    'Avery Williams',
    'Nicole Mosher'
  ];

  const isAdmin = currentUser?.role === 'admin';
  const isTherapist = currentUser?.role === 'therapist';
  const isBilling = currentUser?.role === 'therapist'; // Billing users use therapist role

  // Helper function to check if user name matches therapist name
  const namesMatch = (userName, therapistName) => {
    if (!userName || !therapistName) return false;
    
    // Convert both names to lowercase and remove extra spaces
    const normalizedUserName = userName.toLowerCase().trim().replace(/\s+/g, ' ');
    const normalizedTherapistName = therapistName.toLowerCase().trim().replace(/\s+/g, ' ');
    
    // Check for exact match
    if (normalizedUserName === normalizedTherapistName) return true;
    
    // Check if user name contains therapist name or vice versa
    if (normalizedUserName.includes(normalizedTherapistName) || 
        normalizedTherapistName.includes(normalizedUserName)) return true;
    
    // Check for partial matches (e.g., "Shane Bruce" matches "Shane")
    const userNameParts = normalizedUserName.split(' ');
    const therapistNameParts = normalizedTherapistName.split(' ');
    
    return userNameParts.some(part => therapistNameParts.includes(part)) ||
           therapistNameParts.some(part => userNameParts.includes(part));
  };

  // Get the therapist name that matches the current user
  const getUserTherapistName = () => {
    if (!currentUser?.name) return null;
    
    const matchingTherapist = therapistList.find(therapistName => 
      namesMatch(currentUser.name, therapistName)
    );
    
    return matchingTherapist || null;
  };

  const userTherapistName = getUserTherapistName();

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
        
        // Use secure API client to fetch data
        const data = await secureClientOperations.getAllClients();
        console.log('🔍 Raw client data:', data);
        const therapistNamesFound = Array.from(new Set(data.map(client => client.therapist?.name || 'Unassigned')));
        console.log('🔍 Therapist names found in data:', therapistNamesFound);
        
        // The data is now pre-filtered by the cloud function. 
        // We just need to group it by therapist.
        const therapistMap = new Map();
        therapistList.forEach(name => {
          therapistMap.set(name, {
            id: name,
            name: name,
            clients: []
          });
        });
        if (isAdmin) {
          therapistMap.set('Unassigned', {
            id: 'Unassigned',
            name: 'Unassigned',
            clients: []
          });
        }

        data.forEach(client => {
          const therapistName = client.therapist?.name || 'Unassigned';
          if (therapistMap.has(therapistName)) {
            therapistMap.get(therapistName).clients.push({
              id: client.id,
              name: `${client.data.firstName} ${client.data.lastName}`,
              active: client.therapist?.status === 'Active',
              clientData: client
            });
          }
        });
        
        const therapists = Array.from(therapistMap.values())
            .filter(t => isAdmin || t.name === userTherapistName) // Only show relevant therapists
            .sort((a, b) => {
              if (a.name === 'Unassigned') return 1;
              if (b.name === 'Unassigned') return -1;
              return a.name.localeCompare(b.name);
            });
            
        setAssociates(therapists);
        if (isTherapist && !isAdmin && therapists.length === 1) {
            setSelectedAssociate(therapists[0]);
        }
      } catch (err) {
        console.error('Error fetching data:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [isAuthenticated, canPerform, secureClientOperations, isAdmin, isTherapist, userTherapistName]);

  const handleClientClick = async (client) => {
    // For therapist users, show client details in a modal since they can't access Clients page
    if (isTherapist && !isAdmin) {
      console.log('Therapist clicked on client:', client);
      console.log('Client data structure:', client.clientData);
      
      // Ensure the client exists in Firestore for therapy notes
      const success = await ensureClientInFirestore(client.clientData);
      
      if (success) {
        setSelectedClientDetails({
          ...client.clientData,
          id: String(client.clientData.id) // Ensure ID is a string
        });
      } else {
        console.error('Failed to ensure client in Firestore');
      }
    } else {
      // Admin users can navigate to clients page
      navigate('/clients', { 
        state: { 
          selectedClient: client.clientData,
          scrollToClient: true
        }
      });
    }
  };

  const closeClientModal = () => {
    setSelectedClientDetails(null);
    setShowNoteForm(false);
  };

  const handleAddNote = () => {
    setShowNoteForm(true);
  };

  const handleNoteCancel = () => {
    setShowNoteForm(false);
  };

  const handleNoteSaved = () => {
    setShowNoteForm(false);
    setNotesRefresh(prev => prev + 1); // Trigger refresh of notes list
  };

  // Check if client record exists in Firestore before saving notes
  const ensureClientInFirestore = async (client) => {
    if (!client || !client.data?.lastName || !client.data?.firstName) {
      console.error('Invalid client data:', client);
      return false;
    }
    
    try {
      // Use lastName_firstName as the client document ID
      const clientDocId = `${client.data.lastName}_${client.data.firstName}`.replace(/\s+/g, '');
      const clientRef = doc(db, 'clients', clientDocId);
      
      // Save minimal client data if it doesn't exist yet
      await setDoc(clientRef, {
        firstName: client.data?.firstName || '',
        lastName: client.data?.lastName || '',
        email: client.data?.email || '',
        phone: client.data?.phone || '',
        therapistId: client.therapist?.name || 'Unassigned',
        status: client.therapist?.status || 'Inactive',
        createdAt: new Date().toISOString()
      }, { merge: true });
      
      return true;
    } catch (err) {
      console.error('Error ensuring client in Firestore:', err);
      return false;
    }
  };

  // Helper function to safely render field values
  const safeRender = (value) => {
    if (value === null || value === undefined) return 'N/A';
    if (typeof value === 'object') {
      // If it's an object, try to convert to a readable string
      if (Array.isArray(value)) {
        return value.join(', ') || 'N/A';
      }
      return JSON.stringify(value) || 'N/A';
    }
    return String(value) || 'N/A';
  };

  // Filter associates based on search term
  const filteredAssociates = associates.filter(associate => 
    associate.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Get active clients count for an associate
  const getActiveClientsCount = (associate) => {
    return associate.clients.filter(client => client.active).length;
  };

  // Get total clients count for an associate
  const getTotalClientsCount = (associate) => {
    return associate.clients.length;
  };

  // Add console log for selected associate
  useEffect(() => {
    console.log('Selected associate changed:', selectedAssociate);
  }, [selectedAssociate]);

  if (loading) {
    return (
      <div className="flex">
        <div className="flex-1 p-8">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex">
        <div className="flex-1 p-8">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="flex">
      <div className="flex-1 p-8">
        <div className="container mx-auto">
          {/* Debug Info - Remove this in production */}
          {process.env.NODE_ENV === 'development' && (
            <div className="mb-4 p-3 bg-yellow-100 border border-yellow-300 rounded text-xs">
              <strong>Debug Info:</strong><br/>
              User: "{currentUser?.name}" | Role: {currentUser?.role} | 
              Is Therapist: {isTherapist ? 'Yes' : 'No'} | Is Admin: {isAdmin ? 'Yes' : 'No'}<br/>
              User Therapist Name: "{userTherapistName}" | 
              Therapist List: {JSON.stringify(therapistList)}<br/>
              Associates Count: {associates.length} | 
              Selected Associate: {selectedAssociate?.name} | 
              Selected Associate Clients: {selectedAssociate?.clients?.length || 0}<br/>
              User Email: {currentUser?.email} | 
              User UID: {currentUser?.uid}
            </div>
          )}
          
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold">
              {isTherapist && !isAdmin ? 'My Clients' : 'Therapists'}
            </h1>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Therapists List */}
            <div className="md:col-span-1 bg-white rounded-lg shadow p-4">
              <h2 className="text-xl font-semibold mb-4">
                {isTherapist && !isAdmin ? 'My Profile' : 'Therapists List'}
              </h2>
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
                <h2 className="text-xl font-semibold mb-4">
                  {isTherapist && !isAdmin ? 'My Details & Clients' : 'Therapist Details'}
                </h2>
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

        {/* Client Details Modal for Therapists */}
        {selectedClientDetails && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center p-6 border-b">
                <h2 className="text-2xl font-semibold">Client Details</h2>
                <button
                  onClick={closeClientModal}
                  className="text-gray-400 hover:text-gray-600 focus:outline-none"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="p-6 space-y-6">
                {/* Basic Information */}
                <section>
                  <h3 className="text-lg font-medium mb-4 text-indigo-600">Basic Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm text-gray-500">First Name</label>
                      <div className="font-medium">{safeRender(selectedClientDetails.data?.firstName)}</div>
                    </div>
                    <div>
                      <label className="text-sm text-gray-500">Last Name</label>
                      <div className="font-medium">{safeRender(selectedClientDetails.data?.lastName)}</div>
                    </div>
                    <div>
                      <label className="text-sm text-gray-500">Email</label>
                      <div className="font-medium">{safeRender(selectedClientDetails.data?.email)}</div>
                    </div>
                    <div>
                      <label className="text-sm text-gray-500">Phone</label>
                      <div className="font-medium">{safeRender(selectedClientDetails.data?.phone)}</div>
                    </div>
                    <div>
                      <label className="text-sm text-gray-500">Birth Date</label>
                      <div className="font-medium">{safeRender(selectedClientDetails.data?.birthDate)}</div>
                    </div>
                    <div>
                      <label className="text-sm text-gray-500">Age</label>
                      <div className="font-medium">{safeRender(selectedClientDetails.data?.age)}</div>
                    </div>
                  </div>
                </section>

                {/* Contact Information */}
                <section>
                  <h3 className="text-lg font-medium mb-4 text-indigo-600">Contact Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm text-gray-500">Address</label>
                      <div className="font-medium">
                        {safeRender(selectedClientDetails.data?.address)}
                      </div>
                    </div>
                    <div>
                      <label className="text-sm text-gray-500">City</label>
                      <div className="font-medium">
                        {safeRender(selectedClientDetails.data?.address?.city)}
                      </div>
                    </div>
                    <div>
                      <label className="text-sm text-gray-500">State</label>
                      <div className="font-medium">
                        {safeRender(selectedClientDetails.data?.address?.state)}
                      </div>
                    </div>
                    <div>
                      <label className="text-sm text-gray-500">ZIP Code</label>
                      <div className="font-medium">
                        {safeRender(selectedClientDetails.data?.address?.zipCode)}
                      </div>
                    </div>
                  </div>
                </section>

                {/* Insurance Information */}
                <section>
                  <h3 className="text-lg font-medium mb-4 text-indigo-600">Insurance Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm text-gray-500">Provider</label>
                      <div className="font-medium">{safeRender(selectedClientDetails.insurance?.provider)}</div>
                    </div>
                    <div>
                      <label className="text-sm text-gray-500">Policy Number</label>
                      <div className="font-medium">{safeRender(selectedClientDetails.insurance?.policyNumber)}</div>
                    </div>
                    <div>
                      <label className="text-sm text-gray-500">Group Number</label>
                      <div className="font-medium">{safeRender(selectedClientDetails.insurance?.groupNumber)}</div>
                    </div>
                    <div>
                      <label className="text-sm text-gray-500">Coverage Type</label>
                      <div className="font-medium">{safeRender(selectedClientDetails.insurance?.coverageType)}</div>
                    </div>
                  </div>
                </section>

                {/* Therapist Information */}
                <section>
                  <h3 className="text-lg font-medium mb-4 text-indigo-600">Assignment Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm text-gray-500">Assigned Therapist</label>
                      <div className="font-medium">{safeRender(selectedClientDetails.therapist?.name)}</div>
                    </div>
                    <div>
                      <label className="text-sm text-gray-500">Status</label>
                      <div className={`font-medium ${
                        selectedClientDetails.therapist?.status === 'Active' 
                          ? 'text-green-600' 
                          : 'text-red-600'
                      }`}>
                        {safeRender(selectedClientDetails.therapist?.status)}
                      </div>
                    </div>
                  </div>
                </section>

                {/* Notes Section */}
                {/* Simple Notes Section (legacy) */}
                {selectedClientDetails.data?.notes && (
                  <section>
                    <h3 className="text-lg font-medium mb-4 text-indigo-600">General Notes</h3>
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <div className="whitespace-pre-wrap">{safeRender(selectedClientDetails.data.notes)}</div>
                    </div>
                  </section>
                )}

                {/* SOAP Therapy Notes Section */}
                <section>
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-medium mb-4 text-indigo-600">Therapy Notes</h3>
                    {!showNoteForm && (
                      <button 
                        onClick={handleAddNote}
                        className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        New Therapy Note
                      </button>
                    )}
                  </div>

                  {/* Form for adding new notes */}
                  {showNoteForm ? (
                    <TherapyNoteForm 
                      clientId={selectedClientDetails.id}
                      clientName={`${selectedClientDetails.data?.firstName || ''} ${selectedClientDetails.data?.lastName || ''}`.trim()}
                      clientData={selectedClientDetails}
                      onClose={handleNoteCancel}
                      onSaved={handleNoteSaved}
                    />
                  ) : (
                    <TherapyNotesList clientId={selectedClientDetails.id} key={notesRefresh} />
                  )}
                </section>
              </div>

              <div className="p-6 border-t bg-gray-50 flex justify-end">
                <button
                  onClick={closeClientModal}
                  className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Associates;
