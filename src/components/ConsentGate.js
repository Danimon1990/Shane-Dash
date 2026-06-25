import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

// Shown once to existing clients who signed up before informed consent
// acknowledgement was required. Saves consentAcknowledgedAt to Firestore
// and never appears again.
const ConsentGate = () => {
  const { acknowledgeConsent, logout, currentUser } = useAuth();
  const [checked, setChecked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async e => {
    e.preventDefault();
    if (!checked) return;
    try {
      setLoading(true);
      setError('');
      await acknowledgeConsent();
    } catch (err) {
      setError('Something went wrong. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#f0f4f6' }}>

      {/* Nav */}
      <nav className="flex items-center justify-between px-8 py-5"
           style={{ backgroundColor: '#3c5c6c' }}>
        <span className="text-white font-bold text-lg tracking-wide">
          Shane Bruce Mental Health &amp; Coaching
        </span>
        <button
          onClick={logout}
          className="text-sm font-medium px-4 py-2 rounded-lg border border-white text-white hover:bg-white hover:text-teal-800 transition-colors"
        >
          Sign Out
        </button>
      </nav>

      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="bg-white rounded-2xl shadow-md w-full max-w-lg p-8">

          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full mb-4"
                 style={{ backgroundColor: '#e8f0f3' }}>
              <svg className="w-7 h-7" style={{ color: '#3c5c6c' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold mb-2" style={{ color: '#3c5c6c' }}>
              One Quick Step
            </h1>
            <p className="text-sm text-gray-500">
              Hi {currentUser?.firstName || 'there'} — we've updated our informed consent process
              and need your acknowledgement before you continue.
            </p>
          </div>

          <div className="bg-gray-50 rounded-xl p-4 mb-6 text-sm text-gray-600 leading-relaxed">
            <p>
              Our{' '}
              <Link
                to="/informed-consent"
                target="_blank"
                rel="noreferrer"
                className="font-medium underline"
                style={{ color: '#3c5c6c' }}
              >
                Informed Consent document
              </Link>
              {' '}covers your rights as a client, the nature of therapy services,
              confidentiality, limits of confidentiality, and our policies.
              Please read it before checking the box below.
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="flex items-start gap-3 mb-6">
              <input
                id="consent"
                type="checkbox"
                checked={checked}
                onChange={e => setChecked(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-gray-300 cursor-pointer"
                style={{ accentColor: '#3c5c6c' }}
              />
              <label htmlFor="consent" className="text-sm text-gray-700 leading-snug cursor-pointer">
                I have read and agree to the{' '}
                <Link
                  to="/informed-consent"
                  target="_blank"
                  rel="noreferrer"
                  className="font-medium underline"
                  style={{ color: '#3c5c6c' }}
                >
                  Informed Consent
                </Link>
              </label>
            </div>

            <button
              type="submit"
              disabled={loading || !checked}
              className="w-full py-3 rounded-xl text-white font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
              style={{ backgroundColor: '#3c5c6c' }}
            >
              {loading ? 'Saving…' : 'Continue to Portal →'}
            </button>
          </form>

          <p className="text-xs text-gray-400 text-center mt-6">
            Your information is protected under HIPAA and stored securely.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ConsentGate;
