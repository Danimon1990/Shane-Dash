import React, { useState } from 'react';
import { db } from '../firebase';
import { collection, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { useSecureData } from '../hooks/useSecureData';

const TherapyNoteForm = ({ clinicalId, clientName, onClose, onSaved, clientData }) => {
  const { currentUser } = useAuth();
  const { canPerform, userRole } = useSecureData();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [note, setNote] = useState({
    content: ''
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
    
    if (!clinicalId) {
      setError('Cannot save note: this client has no clinical record linked yet. Please contact an administrator.');
      return;
    }

    if (!note.content.trim()) {
      setError('Note content is required');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const associateName = currentUser.name || currentUser.displayName || 'Unknown';
      const timestamp = new Date().getTime();
      const noteId = `${associateName}_${timestamp}`;

      const notesCollectionRef = collection(db, 'clinicalRecords', clinicalId, 'notes');
      const noteRef = doc(notesCollectionRef, noteId);

      await setDoc(noteRef, {
        ...note,
        clinicalId,
        therapistId: currentUser.uid,
        therapistName: currentUser.name,
        timestamp: serverTimestamp(),
        createdAt: new Date().toISOString()
      });
      
      // Clear form and notify parent component
      setNote({
        content: ''
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
          <label className="block text-gray-700 font-medium mb-2">Therapy Note</label>
          <textarea
            name="content"
            placeholder="Write your therapy note here... You can include session details, observations, assessments, plans, or any other relevant information in your own style."
            value={note.content}
            onChange={handleChange}
            rows={12}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-vertical"
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