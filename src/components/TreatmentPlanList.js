import React, { useEffect, useState } from 'react';
import { db } from '../firebase';
import { collection, query, orderBy, onSnapshot, where, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { useSecureData } from '../hooks/useSecureData';
import TreatmentPlanForm from './TreatmentPlanForm';

const TreatmentPlanList = ({ clientId, clientName, clientData }) => {
  const { currentUser } = useAuth();
  const { userRole, canPerform } = useSecureData();
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [editingPlan, setEditingPlan] = useState(null);
  const [showPlanForm, setShowPlanForm] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  useEffect(() => {
    if (!clientId) {
      setPlans([]);
      setLoading(false);
      return;
    }

    // Check permissions before loading plans
    if (!canPerform('view_notes')) {
      setError('Insufficient permissions to view treatment plans');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Ensure clientId is a string
      const stringClientId = String(clientId);
      
      // Create a query for the client's treatment plans, ordered by timestamp descending (newest first)
      const plansRef = collection(db, 'clients', stringClientId, 'treatmentPlans');
      
      // Apply role-based filtering
      let plansQuery;
      
      console.log('🔍 Setting up treatment plans query for user:', currentUser.uid, 'role:', userRole);
      
      if (userRole === 'admin') {
        // Admins can see all plans - simple query without where clause
        plansQuery = query(plansRef, orderBy('createdAt', 'desc'));
        console.log('📋 Admin query: all plans ordered by createdAt');
      } else if (userRole === 'therapist' || userRole === 'associate') {
        // Therapists can only see plans they created
        // Use simple where query without orderBy to avoid composite index requirement
        plansQuery = query(plansRef, where('therapistId', '==', currentUser.uid));
        console.log('👩‍⚕️ Therapist query: therapistId ==', currentUser.uid);
      } else {
        // Other roles cannot see treatment plans for HIPAA compliance
        console.log('🚫 Access denied for role:', userRole);
        setError('Access denied: Treatment plans are restricted to authorized personnel');
        setLoading(false);
        return;
      }

      // Subscribe to real-time updates
      const unsubscribe = onSnapshot(
        plansQuery,
        (snapshot) => {
          console.log('📄 Firestore snapshot received:', snapshot.docs.length, 'documents');
          
          const plansList = snapshot.docs.map(doc => {
            const data = doc.data();
            console.log('📋 Treatment plan doc:', doc.id, 'therapistId:', data.therapistId, 'version:', data.version);
            return {
              id: doc.id,
              ...data,
              timestamp: data.timestamp?.toDate() || new Date(data.createdAt)
            };
          });
          
          // Sort by version descending (newest first) since we removed orderBy from query
          plansList.sort((a, b) => (b.version || 1) - (a.version || 1));
          
          console.log('✅ Final plans list:', plansList.length, 'plans');
          setPlans(plansList);
          setLoading(false);
          setError(null); // Clear any previous errors on successful load
        },
        (err) => {
          console.error('Error getting treatment plans:', err);
          console.log('Error code:', err.code, 'Error message:', err.message);
          
          // For most common errors, just show empty state instead of error message
          const commonErrorCodes = [
            'permission-denied',
            'not-found', 
            'failed-precondition',
            'unavailable',
            'unauthenticated'
          ];
          
          if (commonErrorCodes.includes(err.code) || !err.code) {
            console.log('Showing empty state for common error:', err.code || 'unknown');
            setPlans([]);
            setLoading(false);
            setError(null);
          } else {
            // Only show error for truly unexpected errors
            console.log('Showing error message for unexpected error:', err.code);
            setError('Failed to load treatment plans');
            setLoading(false);
          }
        }
      );

      // Cleanup subscription on unmount
      return () => unsubscribe();
    } catch (err) {
      console.error('Error setting up plans listener:', err);
      // For setup errors, just show empty state instead of blocking the UI
      console.log('Showing empty treatment plans state due to setup error');
      setPlans([]);
      setLoading(false);
      setError(null);
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

  const togglePlanDetails = (plan) => {
    setSelectedPlan(selectedPlan && selectedPlan.id === plan.id ? null : plan);
  };

  const startEditing = (plan) => {
    setEditingPlan(plan);
    setShowPlanForm(true);
  };

  const handlePlanSaved = () => {
    setShowPlanForm(false);
    setEditingPlan(null);
    setSuccessMessage('Treatment plan saved successfully!');
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const deletePlan = async (planId) => {
    if (!window.confirm('Are you sure you want to delete this treatment plan? This action cannot be undone.')) {
      return;
    }

    try {
      const stringClientId = String(clientId);
      const planRef = doc(db, 'clients', stringClientId, 'treatmentPlans', planId);
      
      await deleteDoc(planRef);
      setSuccessMessage('Treatment plan deleted successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      console.error('Error deleting treatment plan:', err);
      setError('Failed to delete treatment plan. Please try again.');
    }
  };

  if (loading) {
    return <div className="p-4 text-center text-gray-500">Loading treatment plans...</div>;
  }

  // Don't block the UI with errors - show them as dismissible notices above the content
  const showError = error && !loading;
  const showSuccess = successMessage && !loading;

  // Show form for creating new plan or editing existing plan
  if (showPlanForm) {
    return (
      <TreatmentPlanForm
        clientId={clientId}
        clientName={clientName}
        clientData={clientData}
        existingPlan={editingPlan}
        onClose={() => {
          setShowPlanForm(false);
          setEditingPlan(null);
        }}
        onSaved={handlePlanSaved}
      />
    );
  }

  return (
    <div className="mt-4">
      {/* Non-blocking error/success notifications */}
      {showError && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex justify-between items-center">
            <span className="text-red-700 text-sm">{error}</span>
            <button 
              onClick={() => setError(null)} 
              className="text-red-500 hover:text-red-700 text-sm underline ml-3"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {showSuccess && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex justify-between items-center">
            <span className="text-green-700 text-sm">{successMessage}</span>
            <button 
              onClick={() => setSuccessMessage(null)} 
              className="text-green-500 hover:text-green-700 text-sm underline ml-3"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium">Treatment Plans</h3>
        {canPerform('create_notes') && (
          <button
            onClick={() => {
              setShowPlanForm(true);
              setError(null); // Clear any errors when user starts creating
            }}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 font-medium"
          >
            {plans.length === 0 ? 'Create Treatment Plan' : 'New Update'}
          </button>
        )}
      </div>

      {plans.length === 0 ? (
        <div className="p-4 text-center text-gray-500">
          No treatment plan created yet
          {canPerform('create_notes') && (
            <div className="mt-2 text-sm">Click "Create Treatment Plan" to get started</div>
          )}
        </div>
      ) : (
        <div>
          {/* Info about updates */}
          <div className="mb-4 p-3 bg-green-50 rounded-lg border-l-4 border-green-400">
            <div className="text-sm text-green-700">
              <strong>Treatment Plan History:</strong> Each update creates a new version with a timestamp. 
              Click "New Update" above to create the next version of this treatment plan.
            </div>
          </div>
          
          <div className="space-y-3">
          {plans.map(plan => (
            <div key={plan.id} className="border rounded-md overflow-hidden">
              <div 
                className="bg-green-50 p-3 flex justify-between items-center cursor-pointer hover:bg-green-100"
                onClick={() => togglePlanDetails(plan)}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium">
                      Treatment Plan v{plan.version || 1}
                    </h4>
                    {plan.version === Math.max(...plans.map(p => p.version || 1)) && (
                      <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-700 rounded-full">
                        Latest
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-gray-500">
                    Created: {formatDate(plan.timestamp)} by {plan.therapistName || 'Unknown'}
                  </div>
                  {plan.lastModified && plan.lastModified !== plan.createdAt && (
                    <div className="text-xs text-gray-400">
                      Last updated: {formatDate(plan.lastModified)}
                    </div>
                  )}
                  <div className="text-xs text-gray-400 font-mono">
                    ID: {plan.id}
                  </div>
                </div>
                <svg 
                  className={`w-5 h-5 text-gray-500 transform transition-transform ${selectedPlan && selectedPlan.id === plan.id ? 'rotate-180' : ''}`} 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
              
              {selectedPlan && selectedPlan.id === plan.id && (
                <div className="p-4 border-t">
                  {/* Action buttons for edit/delete */}
                  {(userRole === 'admin' || (userRole === 'therapist' || userRole === 'associate')) && (
                    <div className="flex justify-end space-x-2 mb-4">
                      <button
                        onClick={() => startEditing(plan)}
                        className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
                      >
                        Edit This Version
                      </button>
                      <button
                        onClick={() => deletePlan(plan.id)}
                        className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
                      >
                        Delete
                      </button>
                    </div>
                  )}

                  {/* Plan content display */}
                  {plan.content && (
                    <div className="mb-3">
                      <h5 className="font-bold text-sm text-green-700 mb-1">Treatment Plan Content</h5>
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <p className="text-gray-700 whitespace-pre-line">{plan.content}</p>
                      </div>
                    </div>
                  )}

                  {/* Version history info */}
                  <div className="mt-4 pt-3 border-t text-xs text-gray-500">
                    <div>Version: {plan.version || 1}</div>
                    <div>Created: {formatDate(plan.createdAt)}</div>
                    {plan.lastModified && plan.lastModified !== plan.createdAt && (
                      <div>Last Modified: {formatDate(plan.lastModified)}</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default TreatmentPlanList;