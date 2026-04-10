import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

// Dedicated signup page for new clients.
// Role is hardcoded to 'client' — clients never see the role selector.

const ClientSignUp = () => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'client', // always client — not shown to user
  });
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);
  const { signup }            = useAuth();
  const navigate              = useNavigate();

  const handle = e => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async e => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      return setError('Passwords do not match.');
    }
    if (formData.password.length < 6) {
      return setError('Password must be at least 6 characters.');
    }
    try {
      setError('');
      setLoading(true);
      await signup(formData);
      navigate('/verify-email');
    } catch (err) {
      setError(err.message || 'Failed to create an account. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    'w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:border-transparent';

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#f0f4f6' }}>

      {/* Nav */}
      <nav className="flex items-center justify-between px-8 py-5"
           style={{ backgroundColor: '#3c5c6c' }}>
        <Link to="/" className="text-white font-bold text-lg tracking-wide">
          Shane Bruce Mental Health &amp; Coaching
        </Link>
        <Link to="/login"
              className="text-sm font-medium px-4 py-2 rounded-lg border border-white text-white hover:bg-white hover:text-teal-800 transition-colors">
          Sign In
        </Link>
      </nav>

      {/* Form card */}
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="bg-white rounded-2xl shadow-md w-full max-w-md p-8">

          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold mb-1" style={{ color: '#3c5c6c' }}>
              Create Your Client Account
            </h1>
            <p className="text-sm text-gray-500">
              Already have an account?{' '}
              <Link to="/login" className="font-medium hover:underline" style={{ color: '#3c5c6c' }}>
                Sign in
              </Link>
            </p>
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
                <input
                  name="firstName" type="text" required
                  placeholder="Maria"
                  value={formData.firstName} onChange={handle}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Last Name <span className="text-red-500">*</span>
                </label>
                <input
                  name="lastName" type="text" required
                  placeholder="Lopez"
                  value={formData.lastName} onChange={handle}
                  className={inputClass}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Email Address <span className="text-red-500">*</span>
              </label>
              <input
                name="email" type="email" required
                placeholder="you@email.com"
                value={formData.email} onChange={handle}
                className={inputClass}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Password <span className="text-red-500">*</span>
              </label>
              <input
                name="password" type="password" required
                placeholder="At least 6 characters"
                value={formData.password} onChange={handle}
                className={inputClass}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Confirm Password <span className="text-red-500">*</span>
              </label>
              <input
                name="confirmPassword" type="password" required
                placeholder="Repeat your password"
                value={formData.confirmPassword} onChange={handle}
                className={inputClass}
              />
            </div>

            <button
              type="submit" disabled={loading}
              className="w-full py-3 rounded-xl text-white font-semibold text-sm mt-2 hover:opacity-90 transition-opacity disabled:opacity-60"
              style={{ backgroundColor: '#3c5c6c' }}
            >
              {loading ? 'Creating your account…' : 'Create Account →'}
            </button>
          </form>

          <p className="text-xs text-gray-400 text-center mt-6 leading-relaxed">
            By creating an account you agree to our privacy practices.
            Your information is protected under HIPAA and stored securely.
          </p>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center pb-8 px-4">
        <p className="text-xs text-gray-400">
          For more information visit{' '}
          <a href="https://shanebruce.com" target="_blank" rel="noreferrer"
             className="hover:underline" style={{ color: '#8ca0aa' }}>
            shanebruce.com
          </a>
        </p>
      </div>

    </div>
  );
};

export default ClientSignUp;
