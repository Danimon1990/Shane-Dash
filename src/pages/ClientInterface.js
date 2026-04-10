import React, { useState, useEffect, useRef } from 'react';
import { db } from '../firebase';
import { doc, getDoc, collection, query, orderBy, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';

// ─── Brand colours ────────────────────────────────────────────────────────────
// dark-teal: #3c5c6c   muted-blue: #8ca0aa   dark-gray: #434344
// ─────────────────────────────────────────────────────────────────────────────

const TABS = [
  { id: 'overview',  label: 'Overview' },
  { id: 'notes',     label: 'Progress Notes' },
  { id: 'journal',   label: 'My Journal' },
  { id: 'chat',      label: 'AI Chat' },
];

// ─── Tab button ───────────────────────────────────────────────────────────────
const Tab = ({ id, label, active, onClick }) => (
  <button
    onClick={() => onClick(id)}
    className={`py-4 px-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
      active
        ? 'border-current'
        : 'border-transparent text-gray-400 hover:text-gray-600 hover:border-gray-300'
    }`}
    style={active ? { color: '#3c5c6c', borderColor: '#3c5c6c' } : {}}
  >
    {label}
  </button>
);

// ─── Info field ───────────────────────────────────────────────────────────────
const InfoField = ({ label, value }) => (
  <div className="rounded-xl p-4" style={{ backgroundColor: '#f0f4f6' }}>
    <div className="text-xs font-medium uppercase tracking-wide mb-1" style={{ color: '#8ca0aa' }}>
      {label}
    </div>
    <div className="text-sm font-medium" style={{ color: '#434344' }}>
      {value || <span className="text-gray-400 font-normal">Not provided</span>}
    </div>
  </div>
);

// ─── Empty state ──────────────────────────────────────────────────────────────
const Empty = ({ icon, message }) => (
  <div className="text-center py-16">
    <div className="text-5xl mb-4">{icon}</div>
    <p className="text-sm text-gray-400">{message}</p>
  </div>
);

// ─── Main component ───────────────────────────────────────────────────────────
const ClientInterface = () => {
  const { currentUser } = useAuth();
  const isClient = currentUser?.role === 'client';

  const [activeTab,    setActiveTab]    = useState('overview');
  const [userData,     setUserData]     = useState(null);
  const [clinicalData, setClinicalData] = useState(null);
  const [notes,        setNotes]        = useState([]);
  const [journal,      setJournal]      = useState([]);
  const [chatMessages, setChatMessages] = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState('');

  // Journal
  const [showJournalForm, setShowJournalForm] = useState(false);
  const [journalText,     setJournalText]     = useState('');
  const [journalSaving,   setJournalSaving]   = useState(false);
  const [journalSaved,    setJournalSaved]    = useState(false);

  // Chat
  const [chatInput,    setChatInput]    = useState('');
  const [chatSending,  setChatSending]  = useState(false);
  const chatEndRef = useRef(null);

  // ── Fetch data ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isClient) { setLoading(false); return; }

    const uid = currentUser.uid;
    let unsubNotes, unsubJournal, unsubChat;

    const fetchAll = async () => {
      try {
        // Bucket A — personal info
        const userSnap = await getDoc(doc(db, 'users', uid));
        if (!userSnap.exists()) { setError('Profile not found.'); setLoading(false); return; }
        const uData = userSnap.data();
        setUserData(uData);

        const clinicalId = uData.clinicalId;
        if (!clinicalId) { setLoading(false); return; }

        // Bucket B — clinical record header
        const clinSnap = await getDoc(doc(db, 'clinicalRecords', clinicalId));
        if (clinSnap.exists()) setClinicalData(clinSnap.data());

        // Bucket B — progress notes (written by therapist, read-only for client)
        unsubNotes = onSnapshot(
          query(collection(db, 'clinicalRecords', clinicalId, 'notes'), orderBy('createdAt', 'desc')),
          snap => setNotes(snap.docs.map(d => ({ id: d.id, ...d.data() })))
        );

        // Bucket B — client journal entries
        unsubJournal = onSnapshot(
          query(collection(db, 'clinicalRecords', clinicalId, 'journal'), orderBy('createdAt', 'desc')),
          snap => setJournal(snap.docs.map(d => ({ id: d.id, ...d.data() })))
        );

        // Bucket B — AI chat history
        unsubChat = onSnapshot(
          query(collection(db, 'clinicalRecords', clinicalId, 'chatHistory'), orderBy('createdAt', 'asc')),
          snap => setChatMessages(snap.docs.map(d => ({ id: d.id, ...d.data() })))
        );
      } catch (e) {
        setError('Failed to load your data. Please refresh.');
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
    return () => {
      unsubNotes?.();
      unsubJournal?.();
      unsubChat?.();
    };
  }, [currentUser, isClient]);

  // Scroll chat to bottom on new messages
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // ── Save journal entry ──────────────────────────────────────────────────────
  const saveJournalEntry = async () => {
    if (!journalText.trim() || !userData?.clinicalId) return;
    setJournalSaving(true);
    try {
      await addDoc(
        collection(db, 'clinicalRecords', userData.clinicalId, 'journal'),
        { content: journalText.trim(), createdAt: serverTimestamp() }
      );
      setJournalText('');
      setShowJournalForm(false);
      setJournalSaved(true);
      setTimeout(() => setJournalSaved(false), 3000);
    } catch {
      // silent — snapshot listener will show changes anyway
    } finally {
      setJournalSaving(false);
    }
  };

  // ── Send chat message ────────────────────────────────────────────────────────
  const sendChatMessage = async () => {
    if (!chatInput.trim() || !userData?.clinicalId) return;
    const text = chatInput.trim();
    setChatInput('');
    setChatSending(true);
    try {
      // Write the user message to Firestore
      await addDoc(
        collection(db, 'clinicalRecords', userData.clinicalId, 'chatHistory'),
        { role: 'user', content: text, createdAt: serverTimestamp() }
      );
      // AI response Cloud Function will be built next session.
      // For now, write a placeholder assistant message.
      await addDoc(
        collection(db, 'clinicalRecords', userData.clinicalId, 'chatHistory'),
        {
          role: 'assistant',
          content: "Thank you for sharing that. Our AI assistant is being set up and will be available very soon. In the meantime, please bring this up with your therapist in your next session.",
          createdAt: serverTimestamp(),
          isPlaceholder: true
        }
      );
    } catch {
      // silent
    } finally {
      setChatSending(false);
    }
  };

  const handleChatKey = e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChatMessage(); }
  };

  // ── Helpers ─────────────────────────────────────────────────────────────────
  const formatDate = ts => {
    if (!ts) return '';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  const initials = userData
    ? `${userData.firstName?.[0] || ''}${userData.lastName?.[0] || ''}`
    : currentUser?.name?.[0] || '?';

  // ── Demo mode (staff preview) ────────────────────────────────────────────────
  if (!isClient) {
    return (
      <div className="flex-1 p-8 min-h-screen" style={{ backgroundColor: '#f0f4f6' }}>
        <div className="mb-6 px-4 py-3 rounded-xl text-sm font-medium border"
             style={{ backgroundColor: '#fffbeb', borderColor: '#fcd34d', color: '#92400e' }}>
          Staff Preview — This is how the client portal will appear to clients when they log in.
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold text-white"
               style={{ backgroundColor: '#3c5c6c' }}>
            YG
          </div>
          <h2 className="text-xl font-bold mb-1" style={{ color: '#3c5c6c' }}>Client Portal</h2>
          <p className="text-sm text-gray-400">
            Clients will see their personal info, progress notes, journal, and AI chat here after logging in.
          </p>
        </div>
      </div>
    );
  }

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-screen" style={{ backgroundColor: '#f0f4f6' }}>
        <div className="text-sm" style={{ color: '#8ca0aa' }}>Loading your portal…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-screen" style={{ backgroundColor: '#f0f4f6' }}>
        <div className="text-sm text-red-500">{error}</div>
      </div>
    );
  }

  // ── Client portal ────────────────────────────────────────────────────────────
  return (
    <div className="flex-1 p-6 min-h-screen" style={{ backgroundColor: '#f0f4f6' }}>
      <div className="max-w-3xl mx-auto">

        {/* Header card */}
        <div className="bg-white rounded-2xl shadow-sm p-6 mb-6 flex items-center gap-5">
          <div className="w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold text-white flex-shrink-0"
               style={{ backgroundColor: '#3c5c6c' }}>
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold truncate" style={{ color: '#3c5c6c' }}>
              Welcome, {userData?.firstName || currentUser?.name || 'there'}
            </h1>
            <p className="text-sm mt-0.5" style={{ color: '#8ca0aa' }}>
              {clinicalData?.status === 'active'
                ? `Active client · Therapist: ${clinicalData?.assignedTherapistName || 'Being assigned'}`
                : 'Your intake is under review — we\'ll reach out soon.'}
            </p>
          </div>
          {!userData?.clinicalId && (
            <a href="/intake"
               className="flex-shrink-0 px-4 py-2 rounded-lg text-sm font-medium text-white"
               style={{ backgroundColor: '#3c5c6c' }}>
              Complete Intake →
            </a>
          )}
        </div>

        {/* Journal saved toast */}
        {journalSaved && (
          <div className="mb-4 px-4 py-3 rounded-xl text-sm font-medium border"
               style={{ backgroundColor: '#f0fdf4', borderColor: '#bbf7d0', color: '#15803d' }}>
            Your journal entry has been saved and shared with your therapist.
          </div>
        )}

        {/* Tabs + content */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">

          {/* Tab bar */}
          <div className="border-b border-gray-100 overflow-x-auto">
            <nav className="flex px-6">
              {TABS.map(t => (
                <Tab key={t.id} id={t.id} label={t.label}
                     active={activeTab === t.id} onClick={setActiveTab} />
              ))}
            </nav>
          </div>

          <div className="p-6">

            {/* ── OVERVIEW ──────────────────────────────────────────────── */}
            {activeTab === 'overview' && (
              <div className="space-y-8">
                {/* Personal info */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="font-semibold" style={{ color: '#434344' }}>Personal Information</h2>
                    <a href="/intake"
                       className="text-xs font-medium hover:underline"
                       style={{ color: '#3c5c6c' }}>
                      Update →
                    </a>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <InfoField label="First Name"    value={userData?.firstName} />
                    <InfoField label="Last Name"     value={userData?.lastName} />
                    <InfoField label="Email"         value={userData?.email} />
                    <InfoField label="Phone"         value={userData?.phone} />
                    <InfoField label="Date of Birth" value={userData?.dateOfBirth} />
                    <InfoField label="Address"
                      value={userData?.address
                        ? `${userData.address.street}, ${userData.address.city}, ${userData.address.state} ${userData.address.zip}`
                        : null} />
                  </div>
                </div>

                {/* Emergency contact */}
                {userData?.emergencyContact?.name && (
                  <div>
                    <h2 className="font-semibold mb-4" style={{ color: '#434344' }}>Emergency Contact</h2>
                    <div className="grid grid-cols-2 gap-3">
                      <InfoField label="Name"  value={userData.emergencyContact.name} />
                      <InfoField label="Phone" value={userData.emergencyContact.phone} />
                    </div>
                  </div>
                )}

                {/* Clinical status */}
                <div>
                  <h2 className="font-semibold mb-4" style={{ color: '#434344' }}>Care Status</h2>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="rounded-xl p-4 text-center" style={{ backgroundColor: '#e8f4f8' }}>
                      <div className="text-2xl font-bold mb-1" style={{ color: '#3c5c6c' }}>
                        {notes.length}
                      </div>
                      <div className="text-xs" style={{ color: '#8ca0aa' }}>Progress Notes</div>
                    </div>
                    <div className="rounded-xl p-4 text-center" style={{ backgroundColor: '#e8f4f8' }}>
                      <div className="text-2xl font-bold mb-1" style={{ color: '#3c5c6c' }}>
                        {journal.length}
                      </div>
                      <div className="text-xs" style={{ color: '#8ca0aa' }}>Journal Entries</div>
                    </div>
                    <div className="rounded-xl p-4 text-center" style={{ backgroundColor: '#e8f4f8' }}>
                      <div className="text-sm font-semibold capitalize mb-1" style={{ color: '#3c5c6c' }}>
                        {clinicalData?.status || 'Pending'}
                      </div>
                      <div className="text-xs" style={{ color: '#8ca0aa' }}>Account Status</div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── PROGRESS NOTES ────────────────────────────────────────── */}
            {activeTab === 'notes' && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="font-semibold" style={{ color: '#434344' }}>Progress Notes</h2>
                  <span className="text-xs px-3 py-1 rounded-full font-medium"
                        style={{ backgroundColor: '#e8f4f8', color: '#3c5c6c' }}>
                    Written by your therapist · Read only
                  </span>
                </div>

                {notes.length === 0 ? (
                  <Empty icon="📋"
                    message="No progress notes yet. Notes will appear here after your first session." />
                ) : (
                  <div className="space-y-4">
                    {notes.map(note => (
                      <div key={note.id}
                           className="border border-gray-100 rounded-xl p-5"
                           style={{ backgroundColor: '#f9fafb' }}>
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-sm font-semibold" style={{ color: '#434344' }}>
                            {formatDate(note.createdAt)}
                          </span>
                          <span className="text-xs px-3 py-1 rounded-full font-medium"
                                style={{ backgroundColor: '#e8f4f8', color: '#3c5c6c' }}>
                            Session Note
                          </span>
                        </div>
                        <p className="text-sm leading-relaxed text-gray-600">{note.content}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── JOURNAL ───────────────────────────────────────────────── */}
            {activeTab === 'journal' && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="font-semibold" style={{ color: '#434344' }}>My Journal</h2>
                  <button
                    onClick={() => setShowJournalForm(v => !v)}
                    className="px-4 py-2 rounded-lg text-sm font-medium text-white"
                    style={{ backgroundColor: showJournalForm ? '#8ca0aa' : '#3c5c6c' }}
                  >
                    {showJournalForm ? 'Cancel' : '+ New Entry'}
                  </button>
                </div>

                {showJournalForm && (
                  <div className="mb-6 rounded-xl p-5 border"
                       style={{ backgroundColor: '#f0f4f6', borderColor: '#8ca0aa' }}>
                    <p className="text-xs font-medium mb-2" style={{ color: '#3c5c6c' }}>
                      How are you feeling? Your therapist will be able to read this.
                    </p>
                    <textarea
                      value={journalText}
                      onChange={e => setJournalText(e.target.value)}
                      rows={5}
                      placeholder="Share how you've been feeling, what's on your mind, or anything you'd like to bring to your next session…"
                      className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none resize-none"
                    />
                    <div className="flex justify-end mt-3">
                      <button
                        onClick={saveJournalEntry}
                        disabled={!journalText.trim() || journalSaving}
                        className="px-5 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-50"
                        style={{ backgroundColor: '#3c5c6c' }}
                      >
                        {journalSaving ? 'Saving…' : 'Save Entry'}
                      </button>
                    </div>
                  </div>
                )}

                {journal.length === 0 && !showJournalForm ? (
                  <Empty icon="📝"
                    message="No journal entries yet. Use the button above to write your first one." />
                ) : (
                  <div className="space-y-4">
                    {journal.map(entry => (
                      <div key={entry.id}
                           className="border border-gray-100 rounded-xl p-5"
                           style={{ backgroundColor: '#f9fafb' }}>
                        <div className="text-xs font-medium mb-2" style={{ color: '#8ca0aa' }}>
                          {formatDate(entry.createdAt)}
                        </div>
                        <p className="text-sm leading-relaxed text-gray-600">{entry.content}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── AI CHAT ───────────────────────────────────────────────── */}
            {activeTab === 'chat' && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-semibold" style={{ color: '#434344' }}>AI Support Chat</h2>
                  <span className="text-xs px-3 py-1 rounded-full font-medium"
                        style={{ backgroundColor: '#fef9c3', color: '#854d0e' }}>
                    Beta — AI responses coming soon
                  </span>
                </div>

                <p className="text-sm text-gray-500 mb-5 leading-relaxed">
                  This is your private space to reflect between sessions. Your AI assistant has access
                  to your clinical context but never knows your name or personal details.
                </p>

                {/* Chat window */}
                <div className="border border-gray-200 rounded-xl overflow-hidden">
                  <div className="h-80 overflow-y-auto p-4 space-y-3"
                       style={{ backgroundColor: '#f9fafb' }}>

                    {chatMessages.length === 0 && (
                      <div className="h-full flex items-center justify-center text-center px-6">
                        <div>
                          <div className="text-4xl mb-3">💬</div>
                          <p className="text-sm text-gray-400">
                            Send a message to start a conversation.<br />
                            Your chat history is saved securely.
                          </p>
                        </div>
                      </div>
                    )}

                    {chatMessages.map(msg => (
                      <div key={msg.id}
                           className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div
                          className="max-w-xs lg:max-w-sm px-4 py-2.5 rounded-2xl text-sm leading-relaxed"
                          style={msg.role === 'user'
                            ? { backgroundColor: '#3c5c6c', color: 'white' }
                            : { backgroundColor: 'white', color: '#434344', border: '1px solid #e5e7eb' }}
                        >
                          {msg.content}
                          {msg.isPlaceholder && (
                            <p className="text-xs mt-1 opacity-60">— Placeholder response</p>
                          )}
                        </div>
                      </div>
                    ))}

                    <div ref={chatEndRef} />
                  </div>

                  {/* Input area */}
                  <div className="border-t border-gray-200 p-3 flex gap-2 bg-white">
                    <textarea
                      value={chatInput}
                      onChange={e => setChatInput(e.target.value)}
                      onKeyDown={handleChatKey}
                      rows={1}
                      placeholder="Type a message… (Enter to send)"
                      className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none resize-none"
                    />
                    <button
                      onClick={sendChatMessage}
                      disabled={!chatInput.trim() || chatSending}
                      className="px-4 py-2 rounded-lg text-white text-sm font-medium disabled:opacity-50 flex-shrink-0"
                      style={{ backgroundColor: '#3c5c6c' }}
                    >
                      {chatSending ? '…' : 'Send'}
                    </button>
                  </div>
                </div>

                <p className="text-xs text-gray-400 mt-3 text-center">
                  Your name and contact details are never shared with the AI. Conversations are stored securely.
                </p>
              </div>
            )}

          </div>
        </div>

      </div>
    </div>
  );
};

export default ClientInterface;
