import React, { useEffect, useState } from 'react';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { db } from '../firebase';

const ClinicalForms = () => {
  const [activeTab, setActiveTab] = useState('clients');
  const [clientForms, setClientForms] = useState([]);
  const [publicInquiries, setPublicInquiries] = useState([]);
  const [selectedForm, setSelectedForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchAllForms = async () => {
      setLoading(true);
      setError('');
      try {
        // Fetch client forms (form_submissions)
        const clientSnapshot = await getDocs(
          query(collection(db, 'form_submissions'), orderBy('timestamp', 'desc'))
        );
        const clientList = clientSnapshot.docs.map(doc => ({
          id: doc.id,
          type: 'client',
          ...doc.data()
        }));
        setClientForms(clientList);

        // Fetch public inquiries
        const publicSnapshot = await getDocs(
          query(collection(db, 'public_inquiries'), orderBy('timestamp', 'desc'))
        );
        const publicList = publicSnapshot.docs.map(doc => ({
          id: doc.id,
          type: 'public',
          ...doc.data()
        }));
        setPublicInquiries(publicList);
      } catch (err) {
        console.error('Error fetching forms:', err);
        setError('Failed to fetch forms');
      }
      setLoading(false);
    };
    fetchAllForms();
  }, []);

  const currentForms = activeTab === 'clients' ? clientForms : publicInquiries;

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setSelectedForm(null);
  };

  // Render details for client forms (form_submissions)
  const renderClientDetails = (form) => (
    <div className="space-y-6">
      {/* Main Details */}
      <section>
        <h3 className="text-lg font-medium mb-2 border-b pb-2">Patient Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-gray-500">Name</label>
            <p className="font-semibold">{form.firstName} {form.lastName}</p>
          </div>
          <div>
            <label className="text-sm text-gray-500">Age</label>
            <p>{form.age || 'N/A'}</p>
          </div>
          <div>
            <label className="text-sm text-gray-500">Email</label>
            <p>{form.email}</p>
          </div>
          <div>
            <label className="text-sm text-gray-500">Analysis Date</label>
            <p>{form.analysisTimestamp?.toDate ? form.analysisTimestamp.toDate().toLocaleString() : 'N/A'}</p>
          </div>
        </div>
      </section>

      {/* AI Analysis Result */}
      <section>
        <h3 className="text-lg font-medium mb-2 border-b pb-2">AI Analysis</h3>
        {form.aiAnalysis ? (
          <div className="space-y-4">
            <div>
              <label className="text-sm text-gray-500 font-semibold">Summary</label>
              <div className="bg-blue-50 p-3 rounded-lg mt-1">
                <p className="whitespace-pre-wrap">{form.aiAnalysis.summary || 'No summary available.'}</p>
              </div>
            </div>
            <div>
              <label className="text-sm text-gray-500 font-semibold">Suggested Plan</label>
              <div className="bg-blue-50 p-3 rounded-lg mt-1">
                <p className="whitespace-pre-wrap">{form.aiAnalysis.suggestedPlan || 'No suggested plan available.'}</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="whitespace-pre-wrap">{form.result || 'No AI analysis data found.'}</p>
          </div>
        )}
      </section>

      {/* Other Information */}
      <section>
        <h3 className="text-lg font-medium mb-2 border-b pb-2">Additional Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-gray-500">Marital Status</label>
            <p>{form.maritalStatus || 'N/A'}</p>
          </div>
          <div>
            <label className="text-sm text-gray-500">Medical Condition</label>
            <p>{form.medicalCondition || 'N/A'}</p>
          </div>
          <div>
            <label className="text-sm text-gray-500">Previous Diagnosis</label>
            <p>{form.previousDiagnosis || 'N/A'}</p>
          </div>
        </div>
        {form.additionalInfo && (
          <div className="mt-4">
            <label className="text-sm text-gray-500">Additional Info from Patient</label>
            <p className="bg-gray-50 p-2 rounded mt-1">{form.additionalInfo}</p>
          </div>
        )}
      </section>

      {/* Symptoms Checklist */}
      {form.selectedCheckboxes && (
        <section>
          <h3 className="text-lg font-medium mb-2 border-b pb-2">Symptoms Checklist</h3>
          <div className="space-y-4">
            {Object.entries(form.selectedCheckboxes).map(([category, symptoms]) => (
              <div key={category}>
                <h4 className="font-semibold capitalize">{category}</h4>
                <ul className="list-disc list-inside mt-1 space-y-1 text-gray-700">
                  {Object.entries(symptoms).map(([group, responses]) => (
                    Array.isArray(responses) && responses.map((response, index) => (
                      <li key={`${group}-${index}`}>{response}</li>
                    ))
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );

  // Render details for public inquiries
  const renderPublicInquiryDetails = (form) => (
    <div className="space-y-6">
      {/* Visitor Information */}
      <section>
        <h3 className="text-lg font-medium mb-2 border-b pb-2">Visitor Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-gray-500">Name</label>
            <p className="font-semibold">{form.firstName} {form.lastName || ''}</p>
          </div>
          <div>
            <label className="text-sm text-gray-500">Age</label>
            <p>{form.age || 'N/A'}</p>
          </div>
          <div>
            <label className="text-sm text-gray-500">Email</label>
            <p>{form.email}</p>
          </div>
          <div>
            <label className="text-sm text-gray-500">Phone</label>
            <p>{form.phone || 'N/A'}</p>
          </div>
          <div>
            <label className="text-sm text-gray-500">Gender</label>
            <p className="capitalize">{form.gender || 'N/A'}</p>
          </div>
          <div>
            <label className="text-sm text-gray-500">Submitted</label>
            <p>{form.timestamp?.toDate ? form.timestamp.toDate().toLocaleString() : 'N/A'}</p>
          </div>
        </div>
      </section>

      {/* Identified Conditions */}
      <section>
        <h3 className="text-lg font-medium mb-2 border-b pb-2">Assessment Results</h3>
        <div className="mb-4">
          <label className="text-sm text-gray-500">Meets Criteria For</label>
          {form.identifiedConditions && form.identifiedConditions.length > 0 ? (
            <div className="flex flex-wrap gap-2 mt-1">
              {form.identifiedConditions.map((condition, index) => (
                <span key={index} className="px-3 py-1 bg-amber-100 text-amber-800 rounded-full text-sm font-medium">
                  {condition}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-gray-600 mt-1">No specific conditions identified</p>
          )}
        </div>
        {form.situation && (
          <div>
            <label className="text-sm text-gray-500">Their Description</label>
            <p className="bg-gray-50 p-3 rounded mt-1 italic">"{form.situation}"</p>
          </div>
        )}
      </section>

      {/* AI Analysis */}
      <section>
        <h3 className="text-lg font-medium mb-2 border-b pb-2">AI Guidance Generated</h3>
        {form.aiAnalysis ? (
          <div className="space-y-4">
            {form.aiAnalysis.urgencyLevel && (
              <div>
                <label className="text-sm text-gray-500">Urgency Level</label>
                <span className={`ml-2 px-3 py-1 rounded-full text-sm font-medium ${
                  form.aiAnalysis.urgencyLevel === 'high' ? 'bg-red-100 text-red-800' :
                  form.aiAnalysis.urgencyLevel === 'moderate' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-green-100 text-green-800'
                }`}>
                  {form.aiAnalysis.urgencyLevel.charAt(0).toUpperCase() + form.aiAnalysis.urgencyLevel.slice(1)}
                </span>
              </div>
            )}
            <div>
              <label className="text-sm text-gray-500 font-semibold">Summary Provided</label>
              <div className="bg-blue-50 p-3 rounded-lg mt-1">
                <p className="whitespace-pre-wrap">{form.aiAnalysis.summary || 'No summary available.'}</p>
              </div>
            </div>
            {form.aiAnalysis.recommendations && form.aiAnalysis.recommendations.length > 0 && (
              <div>
                <label className="text-sm text-gray-500 font-semibold">Recommendations Given</label>
                <ul className="list-disc list-inside mt-1 space-y-1 bg-green-50 p-3 rounded-lg">
                  {form.aiAnalysis.recommendations.map((rec, index) => (
                    <li key={index} className="text-gray-700">{rec}</li>
                  ))}
                </ul>
              </div>
            )}
            {form.aiAnalysis.selfCareStrategies && form.aiAnalysis.selfCareStrategies.length > 0 && (
              <div>
                <label className="text-sm text-gray-500 font-semibold">Self-Care Strategies</label>
                <ul className="list-disc list-inside mt-1 space-y-1 bg-purple-50 p-3 rounded-lg">
                  {form.aiAnalysis.selfCareStrategies.map((strategy, index) => (
                    <li key={index} className="text-gray-700">{strategy}</li>
                  ))}
                </ul>
              </div>
            )}
            {form.aiAnalysis.encouragement && (
              <div>
                <label className="text-sm text-gray-500 font-semibold">Encouragement</label>
                <div className="bg-indigo-50 p-3 rounded-lg mt-1">
                  <p className="italic">{form.aiAnalysis.encouragement}</p>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-yellow-50 p-4 rounded-lg">
            <p className="text-yellow-800">
              {form.analyzed === false ? 'AI analysis pending...' : 'No AI analysis available.'}
            </p>
          </div>
        )}
      </section>

      {/* Scores */}
      {form.scores && (
        <section>
          <h3 className="text-lg font-medium mb-2 border-b pb-2">Assessment Scores</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {form.scores.anxiety && (
              <div className="bg-gray-50 p-3 rounded">
                <label className="text-sm text-gray-500">Anxiety</label>
                <p className="text-lg font-semibold">{form.scores.anxiety.total || 0}</p>
              </div>
            )}
            {form.scores.panic && (
              <div className="bg-gray-50 p-3 rounded">
                <label className="text-sm text-gray-500">Panic</label>
                <p className="text-lg font-semibold">{form.scores.panic.total || 0}</p>
              </div>
            )}
            {form.scores.depression && (
              <div className="bg-gray-50 p-3 rounded">
                <label className="text-sm text-gray-500">Depression</label>
                <p className="text-lg font-semibold">{(form.scores.depression.core || 0) + (form.scores.depression.additional || 0)}</p>
              </div>
            )}
            {form.scores.adhd && (
              <div className="bg-gray-50 p-3 rounded">
                <label className="text-sm text-gray-500">ADHD</label>
                <p className="text-lg font-semibold">{(form.scores.adhd.inattention || 0) + (form.scores.adhd.hyperactivity || 0)}</p>
              </div>
            )}
            {form.scores.adjustment !== undefined && (
              <div className="bg-gray-50 p-3 rounded">
                <label className="text-sm text-gray-500">Adjustment</label>
                <p className="text-lg font-semibold">{form.scores.adjustment}</p>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Symptoms Checklist */}
      {form.selectedCheckboxes && (
        <section>
          <h3 className="text-lg font-medium mb-2 border-b pb-2">Symptoms Reported</h3>
          <div className="space-y-4">
            {Object.entries(form.selectedCheckboxes).map(([category, symptoms]) => {
              const hasSymptoms = Object.values(symptoms).some(arr => Array.isArray(arr) && arr.length > 0);
              if (!hasSymptoms) return null;
              return (
                <div key={category}>
                  <h4 className="font-semibold capitalize">{category}</h4>
                  <ul className="list-disc list-inside mt-1 space-y-1 text-gray-700">
                    {Object.entries(symptoms).map(([group, responses]) => (
                      Array.isArray(responses) && responses.map((response, index) => (
                        <li key={`${group}-${index}`}>{response}</li>
                      ))
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );

  return (
    <div className="container mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold mb-6">Clinical Forms</h1>

      {/* Tabs */}
      <div className="flex border-b mb-6">
        <button
          className={`px-6 py-3 font-medium text-sm focus:outline-none ${
            activeTab === 'clients'
              ? 'border-b-2 border-indigo-500 text-indigo-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => handleTabChange('clients')}
        >
          Client Forms
          {clientForms.length > 0 && (
            <span className="ml-2 px-2 py-0.5 text-xs bg-gray-200 rounded-full">{clientForms.length}</span>
          )}
        </button>
        <button
          className={`px-6 py-3 font-medium text-sm focus:outline-none ${
            activeTab === 'public'
              ? 'border-b-2 border-indigo-500 text-indigo-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => handleTabChange('public')}
        >
          Public Inquiries
          {publicInquiries.length > 0 && (
            <span className="ml-2 px-2 py-0.5 text-xs bg-green-200 text-green-800 rounded-full">{publicInquiries.length}</span>
          )}
        </button>
      </div>

      {loading && <div className="text-center py-8">Loading...</div>}
      {error && <div className="text-red-500 mb-4">{error}</div>}

      {!loading && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Forms List */}
          <div className="md:col-span-1 bg-white rounded-lg shadow p-4 max-h-[calc(100vh-220px)] overflow-y-auto">
            <h2 className="text-lg font-semibold mb-4 sticky top-0 bg-white pb-2">
              {activeTab === 'clients' ? 'Client Submissions' : 'Public Submissions'}
            </h2>
            <div className="space-y-2">
              {currentForms.map(form => (
                <div
                  key={form.id}
                  className={`p-3 rounded cursor-pointer border transition-colors ${
                    selectedForm?.id === form.id
                      ? 'bg-indigo-50 border-indigo-300'
                      : 'hover:bg-gray-50 border-transparent'
                  }`}
                  onClick={() => setSelectedForm(form)}
                >
                  <div className="font-medium">{form.firstName} {form.lastName || ''}</div>
                  <div className="text-sm text-gray-500">{form.email}</div>
                  {form.age && <div className="text-sm text-gray-500">Age: {form.age}</div>}
                  {activeTab === 'public' && form.identifiedConditions && form.identifiedConditions.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {form.identifiedConditions.slice(0, 2).map((condition, idx) => (
                        <span key={idx} className="text-xs px-2 py-0.5 bg-amber-100 text-amber-700 rounded">
                          {condition}
                        </span>
                      ))}
                      {form.identifiedConditions.length > 2 && (
                        <span className="text-xs text-gray-500">+{form.identifiedConditions.length - 2} more</span>
                      )}
                    </div>
                  )}
                  <div className="text-xs text-gray-400 mt-1">
                    {form.timestamp?.toDate ? form.timestamp.toDate().toLocaleDateString() :
                     form.analysisTimestamp?.toDate ? form.analysisTimestamp.toDate().toLocaleDateString() : 'N/A'}
                  </div>
                </div>
              ))}
              {currentForms.length === 0 && !loading && (
                <div className="text-gray-500 text-center py-4">
                  No {activeTab === 'clients' ? 'client forms' : 'public inquiries'} found.
                </div>
              )}
            </div>
          </div>

          {/* Form Details */}
          {selectedForm ? (
            <div className="md:col-span-2 bg-white rounded-lg shadow p-4 max-h-[calc(100vh-220px)] overflow-y-auto">
              <div className="flex justify-between items-center mb-4 sticky top-0 bg-white pb-2">
                <h2 className="text-xl font-semibold">
                  {selectedForm.type === 'client' ? 'Client Details' : 'Inquiry Details'}
                </h2>
                <button
                  className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50"
                  onClick={() => setSelectedForm(null)}
                >
                  Close
                </button>
              </div>
              {selectedForm.type === 'client'
                ? renderClientDetails(selectedForm)
                : renderPublicInquiryDetails(selectedForm)
              }
            </div>
          ) : (
            <div className="md:col-span-2 bg-white rounded-lg shadow p-8 flex items-center justify-center text-gray-400">
              Select a form to view details
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ClinicalForms;
