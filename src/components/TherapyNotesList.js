import React, { useEffect, useState } from 'react';
import { db } from '../firebase';
import { collection, query, orderBy, onSnapshot, where, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { useSecureData } from '../hooks/useSecureData';

const TherapyNotesList = ({ clientId }) => {
  const { currentUser } = useAuth();
  const { userRole, canPerform } = useSecureData();
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedNote, setSelectedNote] = useState(null);
  const [editingNote, setEditingNote] = useState(null);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  useEffect(() => {
    if (!clientId) {
      setNotes([]);
      setLoading(false);
      return;
    }

    // Check permissions before loading notes
    if (!canPerform('view_notes')) {
      setError('Insufficient permissions to view therapy notes');
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
      
      // Apply role-based filtering
      let notesQuery;
      
      if (userRole === 'admin') {
        // Admins can see all notes
        notesQuery = query(notesRef, orderBy('timestamp', 'desc'));
      } else if (userRole === 'therapist' || userRole === 'associate') {
        // Therapists and associates can only see notes they created
        notesQuery = query(
          notesRef, 
          where('therapistId', '==', currentUser.uid),
          orderBy('timestamp', 'desc')
        );
      } else {
        // Other roles cannot see therapy notes for HIPAA compliance
        setError('Access denied: Therapy notes are restricted to authorized personnel');
        setLoading(false);
        return;
      }

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
  }, [clientId, userRole, currentUser, canPerform]);

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

  const startEditing = (note) => {
    setEditingNote({
      id: note.id,
      content: note.content || ''
    });
    setSelectedNote(null);
  };

  const cancelEditing = () => {
    setEditingNote(null);
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditingNote(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const saveEdit = async () => {
    if (!editingNote || !editingNote.content.trim()) {
      setError('Note content is required');
      return;
    }

    try {
      const stringClientId = String(clientId);
      const noteRef = doc(db, 'clients', stringClientId, 'notes', editingNote.id);
      
      await updateDoc(noteRef, {
        content: editingNote.content,
        lastModified: new Date().toISOString(),
        modifiedBy: currentUser.name || currentUser.displayName
      });

      setEditingNote(null);
      setSuccessMessage('Note updated successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      console.error('Error updating note:', err);
      setError('Failed to update note. Please try again.');
    }
  };

  const deleteNote = async (noteId) => {
    if (!window.confirm('Are you sure you want to delete this note? This action cannot be undone.')) {
      return;
    }

    try {
      const stringClientId = String(clientId);
      const noteRef = doc(db, 'clients', stringClientId, 'notes', noteId);
      
      await deleteDoc(noteRef);
      setSuccessMessage('Note deleted successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      console.error('Error deleting note:', err);
      setError('Failed to delete note. Please try again.');
    }
  };

  if (loading) {
    return <div className="p-4 text-center text-gray-500">Loading notes...</div>;
  }

  if (error) {
    return (
      <div className="p-4 text-center text-red-500">
        {error}
        <button 
          onClick={() => setError(null)} 
          className="ml-2 text-blue-500 hover:text-blue-700 underline"
        >
          Dismiss
        </button>
      </div>
    );
  }

  if (successMessage) {
    return (
      <div className="p-4 text-center text-green-500">
        {successMessage}
        <button 
          onClick={() => setSuccessMessage(null)} 
          className="ml-2 text-blue-500 hover:text-blue-700 underline"
        >
          Dismiss
        </button>
      </div>
    );
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
                <h4 className="font-medium">
                  {note.content ? 
                    (note.content.length > 50 ? note.content.substring(0, 50) + '...' : note.content) :
                    'Therapy Note'
                  }
                </h4>
                <div className="text-sm text-gray-500">
                  {formatDate(note.timestamp)} by {note.therapistName || 'Unknown'}
                </div>
                <div className="text-xs text-gray-400 font-mono">
                  ID: {note.id}
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
                {/* Action buttons for edit/delete */}
                {(userRole === 'admin' || (userRole === 'therapist' || userRole === 'associate')) && (
                  <div className="flex justify-end space-x-2 mb-4">
                    <button
                      onClick={() => startEditing(note)}
                      className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => deleteNote(note.id)}
                      className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
                    >
                      Delete
                    </button>
                  </div>
                )}

                {/* Note content display */}
                {note.content && (
                  <div className="mb-3">
                    <h5 className="font-bold text-sm text-indigo-700 mb-1">Therapy Note</h5>
                    <p className="text-gray-700 whitespace-pre-line">{note.content}</p>
                  </div>
                )}

                {/* Last modified info */}
                {note.lastModified && (
                  <div className="mt-4 pt-3 border-t text-xs text-gray-500">
                    Last modified: {formatDate(note.lastModified)}
                    {note.modifiedBy && ` by ${note.modifiedBy}`}
                  </div>
                )}
              </div>
            )}

            {/* Edit form */}
            {editingNote && editingNote.id === note.id && (
              <div className="p-4 border-t bg-blue-50">
                <h5 className="font-bold text-sm text-blue-700 mb-3">Editing Note</h5>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Therapy Note Content</label>
                    <textarea
                      name="content"
                      value={editingNote.content}
                      onChange={handleEditChange}
                      rows={8}
                      placeholder="Edit your therapy note content here..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm resize-vertical"
                    />
                  </div>
                  
                  <div className="flex justify-end space-x-2 pt-2">
                    <button
                      onClick={cancelEditing}
                      className="px-3 py-1 text-sm bg-gray-500 text-white rounded hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={saveEdit}
                      className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
                    >
                      Save Changes
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default TherapyNotesList; 