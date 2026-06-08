import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';
import { ROLE_DISPLAY_NAMES } from '../config/roles';

const StaffSignUp = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();
  const { signup } = useAuth();

  const [invitation, setInvitation] = useState(null);   // { email, role, name }
  const [tokenStatus, setTokenStatus] = useState('checking'); // checking | valid | invalid | expired | used
  const [formData, setFormData] = useState({ firstName: '', lastName: '', password: '', confirmPassword: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Validate token on load
  useEffect(() => {
    if (!token) { setTokenStatus('invalid'); return; }

    getDoc(doc(db, 'staffInvitations', token))
      .then(snap => {
        if (!snap.exists()) { setTokenStatus('invalid'); return; }
        const data = snap.data();
        if (data.used) { setTokenStatus('used'); return; }
        const expiresAt = data.expiresAt?.toDate ? data.expiresAt.toDate() : new Date(data.expiresAt);
        if (expiresAt < new Date()) { setTokenStatus('expired'); return; }
        setInvitation(data);
        // Pre-fill name from invitation
        const parts = (data.name || '').split(' ');
        setFormData(prev => ({
          ...prev,
          firstName: parts[0] || '',
          lastName: parts.slice(1).join(' ') || '',
        }));
        setTokenStatus('valid');
      })
      .catch(() => setTokenStatus('invalid'));
  }, [token]);

  const handle = e => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async e => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) return setError('Passwords do not match.');
    if (formData.password.length < 6) return setError('Password must be at least 6 characters.');

    try {
      setError('');
      setLoading(true);
      await signup({
        email: invitation.email,
        password: formData.password,
        firstName: formData.firstName,
        lastName: formData.lastName,
        role: invitation.role,
      });
      navigate('/verify-email');
    } catch (err) {
      setError(err.message || 'Failed to create account. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const inputClass = 'w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:border-transparent';

  // ── Token checking ──────────────────────────────────────────
  if (tokenStatus === 'checking') {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#f0f4f6' }}>
        <p className="text-gray-500 text-sm">Validating your invitation…</p>
      </div>
    );
  }

  // ── Invalid / expired / used states ────────────────────────
  if (tokenStatus !== 'valid') {
    const messages = {
      invalid: 'This invitation link is invalid or does not exist.',
      expired: 'This invitation link has expired. Please ask your admin to send a new one.',
      used:    'This invitation link has already been used.',
    };
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#f0f4f6' }}>
        <div className="bg-white rounded-2xl shadow-md w-full max-w-md p-8 text-center">
          <div className="text-4xl mb-4">🔒</div>
          <h1 className="text-xl font-bold text-gray-800 mb-2">Invalid Invitation</h1>
          <p className="text-sm text-gray-500 mb-6">{messages[tokenStatus]}</p>
          <Link to="/login" className="text-sm font-medium hover:underline" style={{ color: '#3c5c6c' }}>
            Back to Login
          </Link>
        </div>
      </div>
    );
  }

  // ── Valid token — show signup form ──────────────────────────
  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#f0f4f6' }}>

      {/* Nav */}
      <nav className="flex items-center justify-between px-8 py-5" style={{ backgroundColor: '#3c5c6c' }}>
        <span className="text-white font-bold text-lg tracking-wide">
          Integrity Mental Health &amp; Coaching
        </span>
        <Link to="/login"
          className="text-sm font-medium px-4 py-2 rounded-lg border border-white text-white hover:bg-white hover:text-teal-800 transition-colors">
          Sign In
        </Link>
      </nav>

      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="bg-white rounded-2xl shadow-md w-full max-w-md p-8">

          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold mb-1" style={{ color: '#3c5c6c' }}>
              Staff Account Setup
            </h1>
            <p className="text-sm text-gray-500">
              You've been invited as a{' '}
              <span className="font-semibold" style={{ color: '#3c5c6c' }}>
                {ROLE_DISPLAY_NAMES[invitation.role] || invitation.role}
              </span>
            </p>
          </div>

          {/* Invitation info banner */}
          <div className="mb-5 p-3 rounded-lg bg-indigo-50 border border-indigo-100 text-sm text-indigo-800">
            <span className="font-medium">Signing up as:</span> {invitation.email}
          </div>

          {error && (
            <div className="mb-5 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  First Name <span className="text-red-500">*</span>
                </label>
                <input name="firstName" type="text" required
                  value={formData.firstName} onChange={handle}
                  className={inputClass} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Last Name <span className="text-red-500">*</span>
                </label>
                <input name="lastName" type="text" required
                  value={formData.lastName} onChange={handle}
                  className={inputClass} />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Password <span className="text-red-500">*</span>
              </label>
              <input name="password" type="password" required
                placeholder="At least 6 characters"
                value={formData.password} onChange={handle}
                className={inputClass} />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Confirm Password <span className="text-red-500">*</span>
              </label>
              <input name="confirmPassword" type="password" required
                placeholder="Repeat your password"
                value={formData.confirmPassword} onChange={handle}
                className={inputClass} />
            </div>

            <button type="submit" disabled={loading}
              className="w-full py-3 rounded-xl text-white font-semibold text-sm mt-2 hover:opacity-90 transition-opacity disabled:opacity-60"
              style={{ backgroundColor: '#3c5c6c' }}>
              {loading ? 'Creating your account…' : 'Create Account →'}
            </button>
          </form>

          <p className="text-xs text-gray-400 text-center mt-6 leading-relaxed">
            This invitation is valid for 48 hours and can only be used once.
          </p>
        </div>
      </div>
    </div>
  );
};

export default StaffSignUp;
