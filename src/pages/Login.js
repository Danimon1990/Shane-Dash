import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Login = () => {
  const [email, setEmail]     = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);
  const navigate              = useNavigate();
  const { login }             = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please enter both email and password.');
      return;
    }
    try {
      setError('');
      setLoading(true);
      await login(email, password);
      navigate('/');
    } catch (err) {
      if (err.message.includes('verify your email')) {
        setError('Please verify your email before logging in. Check your inbox.');
      } else if (
        err.message.includes('invalid-credential') ||
        err.message.includes('wrong-password') ||
        err.message.includes('user-not-found')
      ) {
        setError('Invalid email or password. Please try again.');
      } else if (err.message.includes('too-many-requests')) {
        setError('Too many failed attempts. Please try again later.');
      } else {
        setError(err.message || 'Failed to sign in. Please try again.');
      }
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
        <Link
          to="/client-signup"
          className="text-sm font-medium px-4 py-2 rounded-lg border border-white text-white hover:bg-white hover:text-teal-800 transition-colors"
        >
          New Client? Sign Up
        </Link>
      </nav>

      {/* Card */}
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="bg-white rounded-2xl shadow-md w-full max-w-md p-8">

          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold mb-1" style={{ color: '#3c5c6c' }}>
              Welcome Back
            </h1>
            <p className="text-sm text-gray-500">
              New client?{' '}
              <Link to="/client-signup"
                    className="font-medium hover:underline"
                    style={{ color: '#3c5c6c' }}>
                Create your account
              </Link>
            </p>
          </div>

          {error && (
            <div className="mb-5 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
              {error}
              {error.includes('verify your email') && (
                <div className="mt-2">
                  <Link to="/verify-email"
                        className="font-medium underline"
                        style={{ color: '#3c5c6c' }}>
                    Resend verification email
                  </Link>
                </div>
              )}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Email Address
              </label>
              <input
                type="email" autoComplete="email" required
                placeholder="you@email.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className={inputClass}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Password
              </label>
              <input
                type="password" autoComplete="current-password" required
                placeholder="Your password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className={inputClass}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl text-white font-semibold text-sm mt-2 hover:opacity-90 transition-opacity disabled:opacity-60"
              style={{ backgroundColor: '#3c5c6c' }}
            >
              {loading ? 'Signing in…' : 'Sign In →'}
            </button>
          </form>

          <p className="text-xs text-gray-400 text-center mt-6">
            For more information visit{' '}
            <a href="https://shanebruce.com" target="_blank" rel="noreferrer"
               className="hover:underline" style={{ color: '#8ca0aa' }}>
              shanebruce.com
            </a>
          </p>
        </div>
      </div>

    </div>
  );
};

export default Login;
