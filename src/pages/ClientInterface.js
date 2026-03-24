import React, { useState } from 'react';

// --- Placeholder Data ---
const CLIENT = {
  firstName: 'Yari',
  lastName: 'Gonzalez',
  email: 'yari.gonzalez@email.com',
  phone: '(305) 842-1190',
  birthDate: 'March 14, 1993',
  therapist: 'Silvia Popa',
  memberSince: 'January 2024',
  nextSession: 'March 28, 2026 at 2:00 PM',
};

const THERAPY_NOTES = [
  {
    id: 1,
    date: 'March 18, 2026',
    therapist: 'Silvia Popa',
    content:
      'Yari demonstrated significant progress in identifying cognitive distortions related to work stress. We practiced reframing techniques and discussed boundary-setting strategies with her manager. Assigned journaling homework for the week.',
  },
  {
    id: 2,
    date: 'March 4, 2026',
    therapist: 'Silvia Popa',
    content:
      'Session focused on anxiety management. Yari reported that the breathing exercises from last session have been helpful during high-stress moments. We introduced grounding techniques (5-4-3-2-1 method) and discussed sleep hygiene improvements.',
  },
  {
    id: 3,
    date: 'February 18, 2026',
    therapist: 'Silvia Popa',
    content:
      'Initial progress review. Yari is showing strong engagement with the therapeutic process. Primary concerns remain work-life balance and managing anxiety in social situations. Goals updated to include assertiveness training.',
  },
];

const CLIENT_NOTES_INITIAL = [
  {
    id: 1,
    date: 'March 20, 2026',
    content:
      "Had a really hard week at work. My manager assigned me three new projects without asking if I had capacity. I tried using the reframing exercise Silvia taught me and it helped a little, but I still felt overwhelmed by Thursday.",
  },
  {
    id: 2,
    date: 'March 12, 2026',
    content:
      "Feeling much better this week. I actually used the 5-4-3-2-1 grounding technique during a stressful meeting and it worked. I want to talk about my relationship with my sister next session — I've been avoiding it.",
  },
];

const APPOINTMENTS = {
  upcoming: [
    { id: 1, date: 'March 28, 2026', time: '2:00 PM', therapist: 'Silvia Popa', type: 'Individual Session', duration: '50 min' },
    { id: 2, date: 'April 11, 2026', time: '2:00 PM', therapist: 'Silvia Popa', type: 'Individual Session', duration: '50 min' },
    { id: 3, date: 'April 25, 2026', time: '2:00 PM', therapist: 'Silvia Popa', type: 'Individual Session', duration: '50 min' },
  ],
  past: [
    { id: 4, date: 'March 18, 2026', time: '2:00 PM', therapist: 'Silvia Popa', type: 'Individual Session', duration: '50 min', status: 'Completed' },
    { id: 5, date: 'March 4, 2026', time: '2:00 PM', therapist: 'Silvia Popa', type: 'Individual Session', duration: '50 min', status: 'Completed' },
    { id: 6, date: 'February 18, 2026', time: '2:00 PM', therapist: 'Silvia Popa', type: 'Individual Session', duration: '50 min', status: 'Completed' },
    { id: 7, date: 'February 4, 2026', time: '2:00 PM', therapist: 'Silvia Popa', type: 'Individual Session', duration: '50 min', status: 'Completed' },
  ],
};

// --- Component ---
const ClientInterface = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [clientNotes, setClientNotes] = useState(CLIENT_NOTES_INITIAL);
  const [showNewNoteForm, setShowNewNoteForm] = useState(false);
  const [newNoteText, setNewNoteText] = useState('');
  const [noteSaved, setNoteSaved] = useState(false);

  const handleSaveNote = () => {
    if (!newNoteText.trim()) return;
    const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    const newNote = {
      id: Date.now(),
      date: today,
      content: newNoteText.trim(),
    };
    setClientNotes([newNote, ...clientNotes]);
    setNewNoteText('');
    setShowNewNoteForm(false);
    setNoteSaved(true);
    setTimeout(() => setNoteSaved(false), 3000);
  };

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'therapy-notes', label: 'Therapy Notes' },
    { id: 'my-notes', label: 'My Notes' },
    { id: 'appointments', label: 'Appointments' },
  ];

  return (
    <div className="flex-1 p-8 bg-gray-50 min-h-screen">
      {/* Demo Banner */}
      <div className="mb-6 px-4 py-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-sm font-medium">
        Demo Preview — This is how clients will see their personal portal when they log in.
      </div>

      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
        <div className="flex items-center space-x-5">
          <div className="w-16 h-16 rounded-full bg-indigo-100 flex items-center justify-center text-2xl font-bold text-indigo-600">
            {CLIENT.firstName[0]}{CLIENT.lastName[0]}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{CLIENT.firstName} {CLIENT.lastName}</h1>
            <p className="text-gray-500 text-sm mt-1">Member since {CLIENT.memberSince} &bull; Therapist: <span className="font-medium text-gray-700">{CLIENT.therapist}</span></p>
          </div>
          <div className="ml-auto text-right">
            <div className="text-xs text-gray-400 uppercase tracking-wide mb-1">Next Session</div>
            <div className="text-sm font-semibold text-indigo-600">{CLIENT.nextSession}</div>
          </div>
        </div>
      </div>

      {/* Saved notification */}
      {noteSaved && (
        <div className="mb-4 px-4 py-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm font-medium">
          Your note has been saved and shared with your therapist.
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="border-b border-gray-100">
          <nav className="flex space-x-1 px-6">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">

          {/* OVERVIEW TAB */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-gray-800 mb-4">Personal Information</h2>
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { label: 'First Name', value: CLIENT.firstName },
                    { label: 'Last Name', value: CLIENT.lastName },
                    { label: 'Email', value: CLIENT.email },
                    { label: 'Phone', value: CLIENT.phone },
                    { label: 'Date of Birth', value: CLIENT.birthDate },
                    { label: 'Assigned Therapist', value: CLIENT.therapist },
                  ].map(({ label, value }) => (
                    <div key={label} className="bg-gray-50 rounded-lg p-4">
                      <div className="text-xs text-gray-400 uppercase tracking-wide mb-1">{label}</div>
                      <div className="text-sm font-medium text-gray-800">{value}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h2 className="text-lg font-semibold text-gray-800 mb-4">Quick Summary</h2>
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-indigo-50 rounded-lg p-4 text-center">
                    <div className="text-3xl font-bold text-indigo-600">{APPOINTMENTS.past.length}</div>
                    <div className="text-sm text-indigo-500 mt-1">Sessions Completed</div>
                  </div>
                  <div className="bg-green-50 rounded-lg p-4 text-center">
                    <div className="text-3xl font-bold text-green-600">{APPOINTMENTS.upcoming.length}</div>
                    <div className="text-sm text-green-500 mt-1">Upcoming Sessions</div>
                  </div>
                  <div className="bg-purple-50 rounded-lg p-4 text-center">
                    <div className="text-3xl font-bold text-purple-600">{clientNotes.length}</div>
                    <div className="text-sm text-purple-500 mt-1">My Notes</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* THERAPY NOTES TAB */}
          {activeTab === 'therapy-notes' && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-gray-800">Therapy Notes</h2>
                <span className="text-xs text-gray-400 bg-gray-100 px-3 py-1 rounded-full">Written by your therapist</span>
              </div>
              <div className="space-y-4">
                {THERAPY_NOTES.map(note => (
                  <div key={note.id} className="border border-gray-100 rounded-xl p-5 bg-gray-50">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-semibold text-gray-700">{note.date}</span>
                      <span className="text-xs text-indigo-500 font-medium bg-indigo-50 px-3 py-1 rounded-full">{note.therapist}</span>
                    </div>
                    <p className="text-sm text-gray-600 leading-relaxed">{note.content}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* MY NOTES TAB */}
          {activeTab === 'my-notes' && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-gray-800">My Notes</h2>
                <button
                  onClick={() => setShowNewNoteForm(!showNewNoteForm)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    showNewNoteForm
                      ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      : 'bg-indigo-600 text-white hover:bg-indigo-700'
                  }`}
                >
                  {showNewNoteForm ? 'Cancel' : '+ Add Note'}
                </button>
              </div>

              {showNewNoteForm && (
                <div className="mb-6 border border-indigo-100 bg-indigo-50 rounded-xl p-5">
                  <h3 className="text-sm font-semibold text-indigo-800 mb-3">How are you feeling?</h3>
                  <textarea
                    value={newNoteText}
                    onChange={e => setNewNoteText(e.target.value)}
                    rows={5}
                    placeholder="Share how you've been feeling, what's been on your mind, or anything you'd like to bring up in your next session. Your therapist will be able to read this."
                    className="w-full px-4 py-3 rounded-lg border border-indigo-200 bg-white text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
                  />
                  <div className="flex justify-end mt-3">
                    <button
                      onClick={handleSaveNote}
                      disabled={!newNoteText.trim()}
                      className="px-5 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      Save Note
                    </button>
                  </div>
                </div>
              )}

              <div className="space-y-4">
                {clientNotes.map(note => (
                  <div key={note.id} className="border border-gray-100 rounded-xl p-5 bg-gray-50">
                    <div className="text-xs text-gray-400 mb-2 font-medium">{note.date}</div>
                    <p className="text-sm text-gray-700 leading-relaxed">{note.content}</p>
                  </div>
                ))}
                {clientNotes.length === 0 && (
                  <div className="text-center py-12 text-gray-400 text-sm">
                    No notes yet. Use the button above to add your first note.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* APPOINTMENTS TAB */}
          {activeTab === 'appointments' && (
            <div className="space-y-8">
              <div>
                <h2 className="text-lg font-semibold text-gray-800 mb-4">Upcoming Sessions</h2>
                <div className="space-y-3">
                  {APPOINTMENTS.upcoming.map(appt => (
                    <div key={appt.id} className="flex items-center justify-between border border-indigo-100 bg-indigo-50 rounded-xl px-5 py-4">
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 rounded-full bg-indigo-200 flex items-center justify-center">
                          <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-gray-800">{appt.date} &bull; {appt.time}</div>
                          <div className="text-xs text-gray-500">{appt.type} &bull; {appt.duration} &bull; {appt.therapist}</div>
                        </div>
                      </div>
                      <span className="text-xs font-medium text-indigo-600 bg-indigo-100 px-3 py-1 rounded-full">Scheduled</span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h2 className="text-lg font-semibold text-gray-800 mb-4">Past Sessions</h2>
                <div className="space-y-3">
                  {APPOINTMENTS.past.map(appt => (
                    <div key={appt.id} className="flex items-center justify-between border border-gray-100 bg-white rounded-xl px-5 py-4">
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-700">{appt.date} &bull; {appt.time}</div>
                          <div className="text-xs text-gray-400">{appt.type} &bull; {appt.duration} &bull; {appt.therapist}</div>
                        </div>
                      </div>
                      <span className="text-xs font-medium text-green-600 bg-green-50 px-3 py-1 rounded-full">{appt.status}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default ClientInterface;
