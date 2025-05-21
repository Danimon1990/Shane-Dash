import React, { useState } from 'react';

const ClinicalForms = () => {
  const [selectedForm, setSelectedForm] = useState(null);
  const [forms, setForms] = useState([
    // Sample data - will be replaced with actual form data
    {
      id: 1,
      clientName: 'John Doe',
      formType: 'Intake Form',
      submissionDate: '2023-01-15',
      status: 'New',
      content: {
        personalInfo: {
          name: 'John Doe',
          dateOfBirth: '1990-01-01',
          address: '123 Main St, City, State',
          phone: '123-456-7890',
          email: 'john.doe@example.com'
        },
        medicalHistory: {
          conditions: ['Anxiety', 'Depression'],
          medications: ['Medication A', 'Medication B'],
          allergies: 'None'
        },
        concerns: 'Patient is experiencing anxiety and depression symptoms',
        goals: 'Improve mental health and develop coping strategies'
      }
    }
  ]);

  return (
    <div className="container mx-auto px-4">
      <h1 className="text-2xl font-bold mb-6">Clinical Forms</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Forms List */}
        <div className="md:col-span-1 bg-white rounded-lg shadow p-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Forms</h2>
            <div className="flex space-x-2">
              <select className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500">
                <option>All Forms</option>
                <option>Intake Forms</option>
                <option>Progress Notes</option>
                <option>Treatment Plans</option>
              </select>
              <select className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500">
                <option>All Status</option>
                <option>New</option>
                <option>In Review</option>
                <option>Completed</option>
              </select>
            </div>
          </div>
          <div className="space-y-2">
            {forms.map(form => (
              <div
                key={form.id}
                className={`p-3 rounded cursor-pointer ${
                  selectedForm?.id === form.id
                    ? 'bg-indigo-100'
                    : 'hover:bg-gray-100'
                }`}
                onClick={() => setSelectedForm(form)}
              >
                <div className="font-medium">{form.clientName}</div>
                <div className="text-sm text-gray-500">{form.formType}</div>
                <div className="text-sm text-gray-500">
                  Submitted: {form.submissionDate}
                </div>
                <div
                  className={`text-sm ${
                    form.status === 'New'
                      ? 'text-blue-600'
                      : form.status === 'In Review'
                      ? 'text-yellow-600'
                      : 'text-green-600'
                  }`}
                >
                  {form.status}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Form Details */}
        {selectedForm && (
          <div className="md:col-span-2 bg-white rounded-lg shadow p-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Form Details</h2>
              <div className="flex space-x-3">
                <button className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50">
                  Download
                </button>
                <button className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700">
                  Update Status
                </button>
              </div>
            </div>

            <div className="space-y-6">
              {/* Personal Information */}
              <section>
                <h3 className="text-lg font-medium mb-2">Personal Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-gray-500">Name</label>
                    <div>{selectedForm.content.personalInfo.name}</div>
                  </div>
                  <div>
                    <label className="text-sm text-gray-500">Date of Birth</label>
                    <div>{selectedForm.content.personalInfo.dateOfBirth}</div>
                  </div>
                  <div>
                    <label className="text-sm text-gray-500">Address</label>
                    <div>{selectedForm.content.personalInfo.address}</div>
                  </div>
                  <div>
                    <label className="text-sm text-gray-500">Phone</label>
                    <div>{selectedForm.content.personalInfo.phone}</div>
                  </div>
                  <div>
                    <label className="text-sm text-gray-500">Email</label>
                    <div>{selectedForm.content.personalInfo.email}</div>
                  </div>
                </div>
              </section>

              {/* Medical History */}
              <section>
                <h3 className="text-lg font-medium mb-2">Medical History</h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm text-gray-500">Conditions</label>
                    <div>
                      {selectedForm.content.medicalHistory.conditions.join(', ')}
                    </div>
                  </div>
                  <div>
                    <label className="text-sm text-gray-500">Medications</label>
                    <div>
                      {selectedForm.content.medicalHistory.medications.join(', ')}
                    </div>
                  </div>
                  <div>
                    <label className="text-sm text-gray-500">Allergies</label>
                    <div>{selectedForm.content.medicalHistory.allergies}</div>
                  </div>
                </div>
              </section>

              {/* Concerns */}
              <section>
                <h3 className="text-lg font-medium mb-2">Concerns</h3>
                <div className="bg-gray-50 p-4 rounded">
                  {selectedForm.content.concerns}
                </div>
              </section>

              {/* Goals */}
              <section>
                <h3 className="text-lg font-medium mb-2">Goals</h3>
                <div className="bg-gray-50 p-4 rounded">
                  {selectedForm.content.goals}
                </div>
              </section>

              {/* Status Update */}
              <section>
                <h3 className="text-lg font-medium mb-2">Update Status</h3>
                <div className="flex space-x-4">
                  <select className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500">
                    <option>New</option>
                    <option>In Review</option>
                    <option>Completed</option>
                  </select>
                  <button className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700">
                    Update
                  </button>
                </div>
              </section>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ClinicalForms;
