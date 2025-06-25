import React, { useEffect, useState } from 'react';
import { db } from '../firebase';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';

const TherapyNotesList = ({ clientId }) => {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedNote, setSelectedNote] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!clientId) {
      setNotes([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Ensure clientId is a string
      const stringClientId = String(clientId);
      
      // Create a query for the client's notes, ordered by timestamp descending (newest first)
      const notesRef = collection(db, 'clients', stringClientId, 'notes');
      const notesQuery = query(notesRef, orderBy('timestamp', 'desc'));

      // Subscribe to real-time updates
      const unsubscribe = onSnapshot(
        notesQuery,
        (snapshot) => {
          const notesList = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            timestamp: doc.data().timestamp?.toDate() || new Date(doc.data().createdAt)
          }));
          setNotes(notesList);
          setLoading(false);
        },
        (err) => {
          console.error('Error getting therapy notes:', err);
          setError('Failed to load therapy notes');
          setLoading(false);
        }
      );

      // Cleanup subscription on unmount
      return () => unsubscribe();
    } catch (err) {
      console.error('Error setting up notes listener:', err);
      setError('Failed to load therapy notes');
      setLoading(false);
    }
  }, [clientId]);

  const formatDate = (date) => {
    if (!date) return 'Unknown date';
    return new Date(date).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  const toggleNoteDetails = (note) => {
    setSelectedNote(selectedNote && selectedNote.id === note.id ? null : note);
  };

  if (loading) {
    return <div className="p-4 text-center text-gray-500">Loading notes...</div>;
  }

  if (error) {
    return <div className="p-4 text-center text-red-500">{error}</div>;
  }

  if (notes.length === 0) {
    return <div className="p-4 text-center text-gray-500">No therapy notes yet</div>;
  }

  return (
    <div className="mt-4">
      <h3 className="text-lg font-medium mb-3">Therapy Notes</h3>
      <div className="space-y-3">
        {notes.map(note => (
          <div key={note.id} className="border rounded-md overflow-hidden">
            <div 
              className="bg-gray-50 p-3 flex justify-between items-center cursor-pointer hover:bg-gray-100"
              onClick={() => toggleNoteDetails(note)}
            >
              <div className="flex-1">
                <h4 className="font-medium">{note.subject}</h4>
                <div className="text-sm text-gray-500">
                  {formatDate(note.timestamp)} by {note.therapistName || 'Unknown'}
                </div>
              </div>
              <svg 
                className={`w-5 h-5 text-gray-500 transform transition-transform ${selectedNote && selectedNote.id === note.id ? 'rotate-180' : ''}`} 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
            
            {selectedNote && selectedNote.id === note.id && (
              <div className="p-4 border-t">
                {note.subjective && (
                  <div className="mb-3">
                    <h5 className="font-bold text-sm text-indigo-700 mb-1">Subjective</h5>
                    <p className="text-gray-700 whitespace-pre-line">{note.subjective}</p>
                  </div>
                )}
                
                {note.objective && (
                  <div className="mb-3">
                    <h5 className="font-bold text-sm text-indigo-700 mb-1">Objective</h5>
                    <p className="text-gray-700 whitespace-pre-line">{note.objective}</p>
                  </div>
                )}
                
                {note.assessment && (
                  <div className="mb-3">
                    <h5 className="font-bold text-sm text-indigo-700 mb-1">Assessment</h5>
                    <p className="text-gray-700 whitespace-pre-line">{note.assessment}</p>
                  </div>
                )}
                
                {note.plan && (
                  <div className="mb-3">
                    <h5 className="font-bold text-sm text-indigo-700 mb-1">Plan</h5>
                    <p className="text-gray-700 whitespace-pre-line">{note.plan}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default TherapyNotesList; 