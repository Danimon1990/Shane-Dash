import React, { useEffect, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';

const AISummary = () => {
  const [forms, setForms] = useState([]);
  const [selectedForm, setSelectedForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fieldOrder = [
    'timestamp',
    'firstName',
    'lastName',
    'age',
    'email',
    'maritalStatus',
    'children',
    'previousDiagnosis',
    'additionalInfo',
    'result',
    'analysisTimestamp',
  ];

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
    <div className="w-full p-8">
      <h2 className="text-2xl font-bold mb-4">AI Summary - Form Submissions</h2>
      {error && <div className="text-red-600 mb-4">{error}</div>}
      {loading ? (
        <div>Loading...</div>
      ) : (
        <div className="flex flex-row gap-8">
          {/* List of forms */}
          <div className="w-1/3">
            <h3 className="text-lg font-semibold mb-2">Forms</h3>
            <ul className="divide-y divide-gray-200 border rounded">
              {forms.map(form => (
                <li
                  key={form.id}
                  className={`p-3 cursor-pointer hover:bg-gray-100 ${selectedForm && selectedForm.id === form.id ? 'bg-indigo-100' : ''}`}
                  onClick={() => setSelectedForm(form)}
                >
                  {form.clientName || form.id}
                </li>
              ))}
            </ul>
          </div>

          {/* Selected form data */}
          <div className="flex-1">
            {selectedForm ? (
              <div>
                <h3 className="text-lg font-semibold mb-2">Form Data</h3>
                <table className="min-w-full border border-gray-300 bg-white">
                  <tbody>
                    {/* Render fields in custom order first */}
                    {fieldOrder.map((key) =>
                      selectedForm[key] !== undefined && (
                        <tr key={key} className="border-b">
                          <td className="px-4 py-2 font-medium bg-gray-50 w-1/3">{key}</td>
                          <td className="px-4 py-2">
                            {typeof selectedForm[key] === 'object'
                              ? JSON.stringify(selectedForm[key], null, 2)
                              : selectedForm[key]}
                          </td>
                        </tr>
                      )
                    )}
                    {/* Render any remaining fields not in custom order */}
                    {Object.entries(selectedForm)
                      .filter(([key]) => !fieldOrder.includes(key) && key !== 'id')
                      .map(([key, value]) => (
                        <tr key={key} className="border-b">
                          <td className="px-4 py-2 font-medium bg-gray-50 w-1/3">{key}</td>
                          <td className="px-4 py-2">
                            {typeof value === 'object'
                              ? JSON.stringify(value, null, 2)
                              : value}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-gray-500">Select a form to view its data.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AISummary; 