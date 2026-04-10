import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ROLES } from '../config/roles';

// Public landing page — visible to everyone, authenticated or not.
// Authenticated users are redirected to their dashboard automatically.

const Home = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  // If already logged in, send to the right place
  React.useEffect(() => {
    if (!currentUser) return;
    switch (currentUser.role) {
      case ROLES.CLIENT:    navigate('/client-interface', { replace: true }); break;
      case ROLES.BILLING:   navigate('/billing',     { replace: true }); break;
      case ROLES.THERAPIST: navigate('/my-clients',  { replace: true }); break;
      case ROLES.ASSOCIATE: navigate('/associates',  { replace: true }); break;
      case ROLES.ADMIN:     navigate('/my-clients',  { replace: true }); break;
      default:              navigate('/my-clients',  { replace: true }); break;
    }
  }, [currentUser, navigate]);

  // Still show the page while the redirect fires (avoids flash)
  return (
    <div className="min-h-screen" style={{ backgroundColor: '#f0f4f6' }}>

      {/* ── Nav bar ──────────────────────────────────────────────── */}
      <nav className="flex items-center justify-between px-8 py-5"
           style={{ backgroundColor: '#3c5c6c' }}>
        <span className="text-white font-bold text-xl tracking-wide">
          Shane Bruce Mental Health &amp; Coaching
        </span>
        <Link
          to="/login"
          className="text-sm font-medium px-4 py-2 rounded-lg border border-white text-white hover:bg-white hover:text-teal-800 transition-colors"
        >
          Sign In
        </Link>
      </nav>

      {/* ── Hero ─────────────────────────────────────────────────── */}
      <section className="max-w-4xl mx-auto px-6 pt-20 pb-16 text-center">
        <h1 className="text-4xl font-extrabold leading-tight mb-5"
            style={{ color: '#3c5c6c' }}>
          Where Human Wellness Meets<br />the Power of Technology
        </h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto mb-10 leading-relaxed">
          At Shane Bruce Mental Health &amp; Coaching, we stand at the intersection of
          compassionate care and innovative tools — helping you understand yourself
          more deeply and move forward with confidence.
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            to="/client-signup"
            className="px-8 py-4 rounded-xl text-white font-semibold text-base shadow-md hover:opacity-90 transition-opacity"
            style={{ backgroundColor: '#3c5c6c' }}
          >
            New Client? Get Started →
          </Link>
          <Link
            to="/login"
            className="px-8 py-4 rounded-xl font-semibold text-base border-2 hover:bg-gray-50 transition-colors"
            style={{ borderColor: '#3c5c6c', color: '#3c5c6c' }}
          >
            Sign In to Your Account
          </Link>
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────────────── */}
      <section className="max-w-4xl mx-auto px-6 pb-20">
        <h2 className="text-2xl font-bold text-center mb-10"
            style={{ color: '#3c5c6c' }}>
          Your Journey Starts Here
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {[
            {
              step: '1',
              title: 'Create Your Account',
              body: 'Sign up in under a minute. Just your name, email, and a password — that\'s all we need to get started.',
            },
            {
              step: '2',
              title: 'Complete Your Intake Form',
              body: 'Fill out your personal and clinical background at your own pace. Your data is protected under HIPAA and stored securely.',
            },
            {
              step: '3',
              title: 'Meet Your Therapist',
              body: 'Our team reviews your intake and matches you with the right therapist. We\'ll reach out to schedule your first session.',
            },
          ].map(({ step, title, body }) => (
            <div key={step}
                 className="bg-white rounded-2xl shadow-sm p-6 text-center border border-gray-100">
              <div className="w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-4 text-white font-bold text-lg"
                   style={{ backgroundColor: '#8ca0aa' }}>
                {step}
              </div>
              <h3 className="font-semibold text-base mb-2" style={{ color: '#434344' }}>
                {title}
              </h3>
              <p className="text-sm text-gray-500 leading-relaxed">{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Privacy note ─────────────────────────────────────────── */}
      <section className="text-center pb-16 px-6">
        <p className="text-xs text-gray-400 max-w-xl mx-auto">
          Your privacy matters. All personal information is stored securely and protected under HIPAA.
          Your data is never shared with AI systems in identifiable form.
          <br />
          <span className="font-medium" style={{ color: '#8ca0aa' }}>
            Shane Bruce Mental Health &amp; Coaching · Santa Barbara, CA
          </span>
          <br />
          <a href="https://shanebruce.com" target="_blank" rel="noreferrer"
             className="hover:underline" style={{ color: '#8ca0aa' }}>
            shanebruce.com
          </a>
        </p>
      </section>

    </div>
  );
};

export default Home;
