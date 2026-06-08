import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import secureApiClient from '../utils/secureApiClient';
import { ROLE_DISPLAY_NAMES } from '../config/roles';

const STAFF_ROLES = ['admin', 'therapist', 'associate', 'billing', 'viewer'];

const AdminPanel = () => {
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState('account');

  // Staff list
  const [staffList, setStaffList] = useState([]);
  const [staffLoading, setStaffLoading] = useState(true);

  // Invite form
  const [inviteForm, setInviteForm] = useState({ name: '', email: '', role: 'therapist' });
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteLink, setInviteLink] = useState(null);
  const [inviteError, setInviteError] = useState('');
  const [copied, setCopied] = useState(false);

  // Load staff on mount
  useEffect(() => {
    const fetchStaff = async () => {
      try {
        const snap = await getDocs(
          query(collection(db, 'users'), where('role', 'in', STAFF_ROLES))
        );
        const list = snap.docs.map(d => ({ uid: d.id, ...d.data() }));
        list.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        setStaffList(list);
      } catch (err) {
        console.error('Failed to load staff:', err);
      } finally {
        setStaffLoading(false);
      }
    };
    fetchStaff();
  }, []);

  const handleInvite = async e => {
    e.preventDefault();
    setInviteError('');
    setInviteLink(null);
    setInviteLoading(true);
    try {
      const data = await secureApiClient.makeSecureRequest(
        secureApiClient.baseURLs.cloudFunctions.inviteStaff,
        { method: 'POST', body: JSON.stringify(inviteForm) }
      );
      setInviteLink(data.signupUrl);
      setInviteForm({ name: '', email: '', role: 'therapist' });
    } catch (err) {
      setInviteError(err.message || 'Failed to create invitation.');
    } finally {
      setInviteLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const tabClass = active =>
    `whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
      active
        ? 'border-indigo-500 text-indigo-600'
        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
    }`;

  const roleColor = role => {
    const map = {
      admin:     'bg-purple-100 text-purple-700',
      therapist: 'bg-blue-100 text-blue-700',
      associate: 'bg-teal-100 text-teal-700',
      billing:   'bg-amber-100 text-amber-700',
      viewer:    'bg-gray-100 text-gray-600',
    };
    return map[role] || 'bg-gray-100 text-gray-600';
  };

  return (
    <div className="flex">
      <div className="flex-1 p-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold mb-6">Admin Panel</h1>

          {/* Tabs */}
          <div className="border-b border-gray-200 mb-6">
            <nav className="-mb-px flex space-x-8">
              <button onClick={() => setActiveTab('account')} className={tabClass(activeTab === 'account')}>
                My Account
              </button>
              <button onClick={() => setActiveTab('staff')} className={tabClass(activeTab === 'staff')}>
                Staff
              </button>
              <button onClick={() => setActiveTab('invite')} className={tabClass(activeTab === 'invite')}>
                Invite Staff
              </button>
            </nav>
          </div>

          {/* ── My Account ── */}
          {activeTab === 'account' && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-6">My Account</h2>
              <div className="flex items-center gap-5 mb-8">
                <div className="w-16 h-16 rounded-full flex items-center justify-center text-white text-2xl font-bold"
                  style={{ backgroundColor: '#3c5c6c' }}>
                  {(currentUser?.firstName?.[0] || currentUser?.name?.[0] || '?').toUpperCase()}
                </div>
                <div>
                  <div className="text-xl font-semibold text-gray-900">
                    {currentUser?.name || `${currentUser?.firstName || ''} ${currentUser?.lastName || ''}`.trim() || '—'}
                  </div>
                  <div className="text-sm text-gray-500">{currentUser?.email}</div>
                  <span className={`inline-block mt-1 text-xs font-medium px-2 py-0.5 rounded-full ${roleColor(currentUser?.role)}`}>
                    {ROLE_DISPLAY_NAMES[currentUser?.role] || currentUser?.role}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">First Name</label>
                  <div className="mt-1 text-sm font-medium text-gray-800">
                    {currentUser?.firstName || currentUser?.name?.split(' ')[0] || '—'}
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Last Name</label>
                  <div className="mt-1 text-sm font-medium text-gray-800">
                    {currentUser?.lastName || currentUser?.name?.split(' ').slice(1).join(' ') || '—'}
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Email</label>
                  <div className="mt-1 text-sm font-medium text-gray-800">{currentUser?.email || '—'}</div>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Role</label>
                  <div className="mt-1 text-sm font-medium text-gray-800">
                    {ROLE_DISPLAY_NAMES[currentUser?.role] || currentUser?.role || '—'}
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Email Verified</label>
                  <div className={`mt-1 text-sm font-medium ${currentUser?.emailVerified ? 'text-green-600' : 'text-amber-600'}`}>
                    {currentUser?.emailVerified ? 'Verified' : 'Not verified'}
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">User ID</label>
                  <div className="mt-1 text-xs text-gray-400 font-mono">{currentUser?.uid || '—'}</div>
                </div>
              </div>
            </div>
          )}

          {/* ── Staff ── */}
          {activeTab === 'staff' && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4">
                Staff Members
                <span className="text-sm font-normal text-gray-500 ml-2">({staffList.length})</span>
              </h2>
              {staffLoading ? (
                <div className="text-gray-400 text-sm py-8 text-center">Loading staff…</div>
              ) : staffList.length === 0 ? (
                <div className="text-gray-400 text-sm py-8 text-center">No staff accounts found.</div>
              ) : (
                <div className="space-y-3">
                  {staffList.map(member => (
                    <div key={member.uid} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold"
                          style={{ backgroundColor: '#3c5c6c' }}>
                          {(member.firstName?.[0] || member.name?.[0] || '?').toUpperCase()}
                        </div>
                        <div>
                          <div className="font-medium text-gray-900 text-sm">
                            {member.name || `${member.firstName || ''} ${member.lastName || ''}`.trim() || '—'}
                          </div>
                          <div className="text-xs text-gray-500">{member.email || '—'}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${roleColor(member.role)}`}>
                          {ROLE_DISPLAY_NAMES[member.role] || member.role}
                        </span>
                        {member.uid === currentUser?.uid && (
                          <span className="text-xs text-gray-400">(you)</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Invite Staff ── */}
          {activeTab === 'invite' && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-2">Invite a New Staff Member</h2>
              <p className="text-sm text-gray-500 mb-6">
                This generates a private, one-time signup link valid for 48 hours.
                The new staff member cannot change their assigned role.
              </p>

              <form onSubmit={handleInvite} className="space-y-4 max-w-md">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                  <input
                    type="text" required placeholder="e.g. Nicole Mosher"
                    value={inviteForm.name}
                    onChange={e => setInviteForm(f => ({ ...f, name: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                  <input
                    type="email" required placeholder="name@integritymhc.com"
                    value={inviteForm.email}
                    onChange={e => setInviteForm(f => ({ ...f, email: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                  <select
                    value={inviteForm.role}
                    onChange={e => setInviteForm(f => ({ ...f, role: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  >
                    <option value="therapist">Therapist</option>
                    <option value="associate">Associate</option>
                    <option value="billing">Billing</option>
                    <option value="viewer">Viewer</option>
                  </select>
                </div>

                {inviteError && (
                  <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
                    {inviteError}
                  </div>
                )}

                <button type="submit" disabled={inviteLoading}
                  className="px-6 py-2.5 rounded-lg text-white text-sm font-semibold hover:opacity-90 disabled:opacity-60 transition-opacity"
                  style={{ backgroundColor: '#3c5c6c' }}>
                  {inviteLoading ? 'Generating…' : 'Generate Invite Link'}
                </button>
              </form>

              {/* Generated link */}
              {inviteLink && (
                <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg max-w-md">
                  <p className="text-sm font-semibold text-green-800 mb-2">Invitation link ready</p>
                  <p className="text-xs text-green-700 mb-3">
                    Copy and send this link directly to the new staff member. It expires in 48 hours and can only be used once.
                  </p>
                  <div className="flex items-center gap-2">
                    <input
                      readOnly value={inviteLink}
                      className="flex-1 text-xs bg-white border border-green-300 rounded px-3 py-2 font-mono text-gray-700 focus:outline-none"
                    />
                    <button onClick={handleCopy}
                      className={`px-3 py-2 rounded text-xs font-semibold text-white transition-colors ${copied ? 'bg-green-600' : 'bg-indigo-600 hover:bg-indigo-700'}`}>
                      {copied ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;
