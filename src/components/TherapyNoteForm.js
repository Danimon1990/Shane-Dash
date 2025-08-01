import React, { useState } from 'react';
import { db } from '../firebase';
import { collection, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { useSecureData } from '../hooks/useSecureData';

const TherapyNoteForm = ({ clientId, clientName, onClose, onSaved, clientData }) => {
  const { currentUser } = useAuth();
  const { canPerform, userRole } = useSecureData();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [note, setNote] = useState({
    subject: '',
    subjective: '',
    objective: '',
    assessment: '',
    plan: ''
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setNote(prevNote => ({
      ...prevNote,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Check permissions before allowing note creation
    if (!canPerform('create_notes')) {
      setError('Insufficient permissions to create therapy notes');
      return;
    }
    
    // Check if user is assigned to this client (for non-admin users)
    if (userRole !== 'admin' && clientData) {
      const assignedTherapist = clientData.therapist?.name;
      const currentUserName = currentUser.name || currentUser.displayName;
      
      if (assignedTherapist !== currentUserName) {
        setError('You can only create notes for clients assigned to you');
        return;
      }
    }
    
    if (!note.subject.trim()) {
      setError('Subject is required');
      return;
    }
    
    // Debug logging
    console.log('🔍 TherapyNoteForm - clientId type:', typeof clientId, 'value:', clientId);
    console.log('🔍 TherapyNoteForm - clientName:', clientName);
    console.log('🔍 TherapyNoteForm - userRole:', userRole);
    console.log('🔍 TherapyNoteForm - assignedTherapist:', clientData?.therapist?.name);
    console.log('🔍 TherapyNoteForm - currentUserName:', currentUser.name || currentUser.displayName);
    
    setIsSubmitting(true);
    setError(null);
    
    try {
      // Extract lastName from clientName
      const lastName = clientName.split(' ').pop();
      
      // Create a unique ID by combining lastName with timestamp
      const timestamp = new Date().getTime();
      const noteId = `${lastName}_${timestamp}`;
      
      // Ensure clientId is a string for Firestore
      const clientIdString = String(clientId);
      console.log('🔍 TherapyNoteForm - clientIdString:', clientIdString);
      
      // Create a reference to the notes subcollection for this client
      const notesCollectionRef = collection(db, 'clients', clientIdString, 'notes');
      
      // Create a document with the unique ID
      const noteRef = doc(notesCollectionRef, noteId);
      
      // Set the document data
      await setDoc(noteRef, {
        ...note,
        clientId: clientIdString,
        therapistId: currentUser.uid,
        therapistName: currentUser.name,
        timestamp: serverTimestamp(),
        createdAt: new Date().toISOString() // Fallback for client-side sorting
      });
      
      // Clear form and notify parent component
      setNote({
        subject: '',
        subjective: '',
        objective: '',
        assessment: '',
        plan: ''
      });
      
      setIsSubmitting(false);
      
      if (onSaved) {
        onSaved();
      }
    } catch (err) {
      console.error('Error saving therapy note:', err);
      setError('Failed to save note. Please try again.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">New Therapy Note for {clientName}</h2>
        <button 
          onClick={onClose}
          className="text-gray-500 hover:text-gray-700"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      
      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">
          {error}
        </div>
      )}
      
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label className="block text-gray-700 font-medium mb-2">Subject</label>
          <input
            type="text"
            name="subject"
            placeholder="e.g., Session 1 - Initial Intake"
            value={note.subject}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        
        <div className="mb-4">
          <label className="block text-gray-700 font-medium mb-2">Subjective (S)</label>
          <textarea
            name="subjective"
            placeholder="Client's statements, reported symptoms, thoughts, and feelings..."
            value={note.subjective}
            onChange={handleChange}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          ></textarea>
        </div>
        
        <div className="mb-4">
          <label className="block text-gray-700 font-medium mb-2">Objective (O)</label>
          <textarea
            name="objective"
            placeholder="Observable facts, measurements, behaviors..."
            value={note.objective}
            onChange={handleChange}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          ></textarea>
        </div>
        
        <div className="mb-4">
          <label className="block text-gray-700 font-medium mb-2">Assessment (A)</label>
          <textarea
            name="assessment"
            placeholder="Your clinical assessment, interpretation of the situation..."
            value={note.assessment}
            onChange={handleChange}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          ></textarea>
        </div>
        
        <div className="mb-4">
          <label className="block text-gray-700 font-medium mb-2">Plan (P)</label>
          <textarea
            name="plan"
            placeholder="Treatment plan, next steps, interventions..."
            value={note.plan}
            onChange={handleChange}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          ></textarea>
        </div>
        
        <div className="flex justify-end mt-6 space-x-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500"
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 text-white bg-indigo-600 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Saving...' : 'Save Note'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default TherapyNoteForm; 