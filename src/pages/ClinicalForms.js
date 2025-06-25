import React, { useEffect, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';

const ClinicalForms = () => {
  const [forms, setForms] = useState([]);
  const [selectedForm, setSelectedForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchForms = async () => {
      setLoading(true);
      setError('');
      try {
        const querySnapshot = await getDocs(collection(db, 'form_submissions'));
        const formsList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setForms(formsList);
      } catch (err) {
        setError('Failed to fetch forms');
      }
      setLoading(false);
    };
    fetchForms();
  }, []);

  return (
    <div className="container mx-auto px-4">
      <h1 className="text-2xl font-bold mb-6">Clinical Forms</h1>
      {loading && <div>Loading...</div>}
      {error && <div className="text-red-500">{error}</div>}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Forms List */}
        <div className="md:col-span-1 bg-white rounded-lg shadow p-4">
          <h2 className="text-xl font-semibold mb-4">Forms</h2>
          <div className="space-y-2">
            {forms.map(form => (
              <div
                key={form.id}
                className={`p-3 rounded cursor-pointer ${selectedForm?.id === form.id ? 'bg-indigo-100' : 'hover:bg-gray-100'}`}
                onClick={() => setSelectedForm(form)}
              >
                <div className="font-medium">{form.firstName} {form.lastName}</div>
                <div className="text-sm text-gray-500">Email: {form.email}</div>
                <div className="text-sm text-gray-500">Age: {form.age}</div>
                <div className="text-sm text-gray-500 truncate">
                  <span className="font-semibold">Summary:</span> {form.aiAnalysis?.summary || form.result || 'No summary'}
                </div>
                <div className="text-sm text-gray-500">Analysis: {form.analysisTimestamp ? (form.analysisTimestamp.toDate ? form.analysisTimestamp.toDate().toLocaleString() : form.analysisTimestamp) : 'N/A'}</div>
              </div>
            ))}
            {forms.length === 0 && !loading && <div className="text-gray-500">No forms found.</div>}
          </div>
        </div>

        {/* Form Details */}
        {selectedForm && (
          <div className="md:col-span-2 bg-white rounded-lg shadow p-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Form Details</h2>
              <button className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50" onClick={() => setSelectedForm(null)}>
                Close
              </button>
            </div>
            <div className="space-y-6">
              {/* Main Details */}
              <section>
                <h3 className="text-lg font-medium mb-2 border-b pb-2">Patient Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-gray-500">Name</label>
                    <p className="font-semibold">{selectedForm.firstName} {selectedForm.lastName}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-500">Age</label>
                    <p>{selectedForm.age}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-500">Email</label>
                    <p>{selectedForm.email}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-500">Analysis Date</label>
                    <p>{selectedForm.analysisTimestamp?.toDate ? selectedForm.analysisTimestamp.toDate().toLocaleString() : 'N/A'}</p>
                  </div>
                </div>
              </section>
              
              {/* AI Analysis Result */}
              <section>
                <h3 className="text-lg font-medium mb-2 border-b pb-2">AI Analysis</h3>
                {selectedForm.aiAnalysis ? (
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm text-gray-500 font-semibold">Summary</label>
                      <div className="bg-blue-50 p-3 rounded-lg mt-1">
                        <p className="whitespace-pre-wrap">{selectedForm.aiAnalysis.summary || 'No summary available.'}</p>
                      </div>
                    </div>
                    <div>
                      <label className="text-sm text-gray-500 font-semibold">Suggested Plan</label>
                      <div className="bg-blue-50 p-3 rounded-lg mt-1">
                        <p className="whitespace-pre-wrap">{selectedForm.aiAnalysis.suggestedPlan || 'No suggested plan available.'}</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-gray-50 p-4 rounded-lg">
                     {/* Fallback to 'result' if 'aiAnalysis' is missing */}
                    <p className="whitespace-pre-wrap">{selectedForm.result || 'No AI analysis data found.'}</p>
                  </div>
                )}
              </section>

              {/* Other Information */}
              <section>
                <h3 className="text-lg font-medium mb-2 border-b pb-2">Additional Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-gray-500">Marital Status</label>
                    <p>{selectedForm.maritalStatus || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-500">Medical Condition</label>
                    <p>{selectedForm.medicalCondition || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-500">Previous Diagnosis</label>
                    <p>{selectedForm.previousDiagnosis || 'N/A'}</p>
                  </div>
                </div>
                {selectedForm.additionalInfo && (
                  <div className="mt-4">
                    <label className="text-sm text-gray-500">Additional Info from Patient</label>
                    <p className="bg-gray-50 p-2 rounded mt-1">{selectedForm.additionalInfo}</p>
                  </div>
                )}
              </section>

              {/* Symptoms Checklist */}
              {selectedForm.selectedCheckboxes && (
                <section>
                  <h3 className="text-lg font-medium mb-2 border-b pb-2">Symptoms Checklist</h3>
                  <div className="space-y-4">
                    {Object.entries(selectedForm.selectedCheckboxes).map(([category, symptoms]) => (
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
          </div>
        )}
      </div>
    </div>
  );
};

export default ClinicalForms;
