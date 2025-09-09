import React, { useState } from 'react';
import { db } from '../firebase';
import { collection, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { useSecureData } from '../hooks/useSecureData';

const TreatmentPlanForm = ({ clientId, clientName, onClose, onSaved, clientData, existingPlan = null }) => {
  const { currentUser } = useAuth();
  const { canPerform, userRole } = useSecureData();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [plan, setPlan] = useState({
    content: existingPlan?.content || ''
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setPlan(prevPlan => ({
      ...prevPlan,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Check permissions before allowing plan creation/update
    if (!canPerform('create_notes')) {
      setError('Insufficient permissions to create/update treatment plans');
      return;
    }
    
    // Check if user is assigned to this client (for non-admin users)
    if (userRole !== 'admin' && clientData) {
      const assignedTherapist = clientData.therapist?.name;
      const currentUserName = currentUser.name || currentUser.displayName;
      
      if (assignedTherapist !== currentUserName) {
        setError('You can only create/update treatment plans for clients assigned to you');
        return;
      }
    }
    
    if (!plan.content.trim()) {
      setError('Treatment plan content is required');
      return;
    }
    
    setIsSubmitting(true);
    setError(null);
    
    try {
      // Create a unique ID: associateName_clientName_timestamp (or use existing ID for updates)
      const associateName = currentUser.name || currentUser.displayName || 'Unknown';
      const timestamp = new Date().getTime();
      const planId = existingPlan?.id || `${associateName}_treatmentplan_${timestamp}`;
      
      // Ensure clientId is a string for Firestore
      const clientIdString = String(clientId);
      
      // Create a reference to the treatmentPlans subcollection for this client
      const plansCollectionRef = collection(db, 'clients', clientIdString, 'treatmentPlans');
      
      // Create a document with the unique ID
      const planRef = doc(plansCollectionRef, planId);
      
      // Set the document data
      await setDoc(planRef, {
        ...plan,
        clientId: clientIdString,
        therapistId: currentUser.uid,
        therapistName: currentUser.name,
        timestamp: serverTimestamp(),
        createdAt: existingPlan?.createdAt || new Date().toISOString(),
        lastModified: new Date().toISOString(),
        version: existingPlan ? (existingPlan.version || 1) + 1 : 1
      }, { merge: true });
      
      // Clear form and notify parent component
      setPlan({
        content: ''
      });
      
      setIsSubmitting(false);
      
      if (onSaved) {
        onSaved();
      }
    } catch (err) {
      console.error('Error saving treatment plan:', err);
      setError('Failed to save treatment plan. Please try again.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">
          {existingPlan ? 'Update Treatment Plan' : 'New Treatment Plan'} for {clientName}
        </h2>
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
          <label className="block text-gray-700 font-medium mb-2">Treatment Plan</label>
          <textarea
            name="content"
            placeholder="Write the treatment plan here... Include goals, interventions, timeline, expected outcomes, and any other relevant planning information."
            value={plan.content}
            onChange={handleChange}
            rows={15}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 resize-vertical"
          />
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
            className="px-4 py-2 text-white bg-green-600 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Saving...' : (existingPlan ? 'Update Plan' : 'Save Plan')}
          </button>
        </div>
      </form>
    </div>
  );
};

export default TreatmentPlanForm;