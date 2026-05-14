import React from 'react';

const Section = ({ number, title, children }) => (
  <section className="mb-8">
    <h2 className="text-lg font-semibold text-gray-800 mb-3 pb-2 border-b border-gray-200">
      {number && <span className="text-indigo-600 mr-2">{number}.</span>}
      {title}
    </h2>
    <div className="text-sm text-gray-700 space-y-2 leading-relaxed">
      {children}
    </div>
  </section>
);

const SubItem = ({ label, children }) => (
  <div className="flex gap-2">
    <span className="font-medium text-gray-800 shrink-0">{label}</span>
    <span>{children}</span>
  </div>
);

const Bullet = ({ children }) => (
  <div className="flex gap-2">
    <span className="text-indigo-400 shrink-0">—</span>
    <span>{children}</span>
  </div>
);

const InformedConsent = () => (
  <div className="flex">
    <div className="flex-1 p-8">
      <div className="max-w-3xl mx-auto">

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Informed Consent</h1>
          <p className="text-sm text-gray-500 mt-1">
            Data Collection, Storage, and Use — Shane Bruce Mental Health &amp; Coaching
          </p>
          <p className="text-xs text-gray-400 mt-0.5">Last Updated: May 2026 · Santa Barbara, California</p>
        </div>

        {/* Purpose */}
        <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-4 mb-8 text-sm text-indigo-800">
          This document explains how Shane Bruce Mental Health &amp; Coaching collects, stores, protects,
          and uses your personal and clinical information. By signing or acknowledging this consent,
          you confirm that you have read, understood, and agreed to these practices.
        </div>

        <Section number="1" title="Who We Are">
          <p>
            Shane Bruce Mental Health &amp; Coaching is a licensed therapy and coaching practice based in
            Santa Barbara, California. We provide individual therapy, coaching, and telehealth services.
            This practice is supervised by a licensed Marriage and Family Therapist (MFT).
          </p>
        </Section>

        <Section number="2" title="What Information We Collect">
          <p className="mb-3">We collect two categories of information:</p>
          <div className="space-y-3">
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="font-medium text-gray-800 mb-1">A. Personal Information (PII)</p>
              <p>Your name, email address, phone number, date of birth, home address, emergency contact,
              insurance details, and payment preferences. Used to manage your care, communicate with you,
              and process billing.</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="font-medium text-gray-800 mb-1">B. Clinical Information</p>
              <p>The reason you are seeking therapy, your mental health history, medications, session notes
              written by your therapist, your responses to clinical assessments, and any journal entries
              or messages you submit through the client portal.</p>
            </div>
          </div>
        </Section>

        <Section number="3" title="How Your Data Is Stored">
          <p className="mb-3">
            Your information is stored on a HIPAA-compliant platform hosted by Google Firebase
            (Google Cloud Infrastructure), which maintains SOC 2 and ISO 27001 security certifications.
          </p>
          <p className="mb-3">We use a two-layer data model designed to protect your privacy:</p>
          <div className="space-y-3">
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="font-medium text-gray-800 mb-1">Layer 1 — Personal Information</p>
              <p>Your name, contact details, insurance, and other identifying information are stored in a
              secure, access-controlled database. This layer is never shared with or accessed by AI systems.</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="font-medium text-gray-800 mb-1">Layer 2 — Clinical Information</p>
              <p>Your clinical data (session notes, assessments, journal entries, chat history) is stored
              separately from your personal information, in a de-identified format. Your name and contact
              details are not attached to your clinical records in this layer.</p>
            </div>
          </div>
          <p className="mt-3 text-gray-600 italic">
            These two layers are linked by a unique identifier known only to your therapist and the system —
            a deliberate safeguard to protect your identity in the event of any unauthorized access.
          </p>
        </Section>

        <Section number="4" title="Who Has Access to Your Data">
          <div className="space-y-1">
            <Bullet>Your assigned therapist has access to your full clinical record, including session notes, assessments, and journal entries.</Bullet>
            <Bullet>Administrative staff (billing and office roles) may access your personal and insurance information for scheduling and billing purposes only. They do not have access to your clinical notes or AI-generated content.</Bullet>
            <Bullet>No one outside of Shane Bruce Mental Health &amp; Coaching will access your data without your written consent, except as required by law (see Section 7).</Bullet>
          </div>
        </Section>

        <Section number="5" title="How We Use Artificial Intelligence (AI)">
          <p className="mb-3">
            Our platform uses AI tools to <span className="font-medium">support — not replace</span> your therapist.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-green-50 border border-green-100 rounded-lg p-4">
              <p className="font-semibold text-green-800 mb-2">What AI Does</p>
              <div className="space-y-1 text-green-900">
                <Bullet>Assists your therapist in reviewing clinical notes and suggesting treatment plan components for their consideration.</Bullet>
                <Bullet>Powers a between-session support chat available through your client portal.</Bullet>
                <Bullet>Analyzes de-identified clinical assessment responses to help your therapist identify patterns.</Bullet>
              </div>
            </div>
            <div className="bg-red-50 border border-red-100 rounded-lg p-4">
              <p className="font-semibold text-red-800 mb-2">What AI Does Not Do</p>
              <div className="space-y-1 text-red-900">
                <Bullet>AI never has access to your name, email, phone number, address, or any other personally identifying information.</Bullet>
                <Bullet>AI never makes clinical decisions independently. Every AI-generated suggestion is reviewed by your therapist.</Bullet>
                <Bullet>AI is never used to replace a human therapy session without your explicit agreement.</Bullet>
              </div>
            </div>
          </div>
          <div className="mt-4 p-4 bg-gray-50 rounded-lg space-y-2">
            <p><span className="font-medium">AI Supervision:</span> All AI activity is monitored and controlled by a licensed therapist. Your therapist sets the goals, context, and boundaries for any AI interactions related to your care.</p>
            <p><span className="font-medium">Third-Party AI Providers:</span> AI features may be powered by services such as Anthropic (Claude) or OpenAI (ChatGPT). These providers process only de-identified clinical data — your personal information is never transmitted to them. We maintain a Business Associate Agreement (BAA) with any AI provider used in your care, as required under HIPAA.</p>
          </div>
        </Section>

        <Section number="6" title="How Long We Keep Your Data">
          <p>
            We retain your records in accordance with California law, which requires mental health records
            to be kept for a minimum of <span className="font-medium">7 years</span> from the date of last service,
            or 7 years after a minor client turns 18, whichever is later. After the retention period,
            records are securely and permanently deleted.
          </p>
        </Section>

        <Section number="7" title="When We May Disclose Your Information Without Consent">
          <p className="mb-3">Federal and California law require or permit disclosure in limited circumstances:</p>
          <div className="space-y-1">
            <Bullet>Immediate risk of harm to yourself or others.</Bullet>
            <Bullet>Suspected abuse or neglect of a child, elder, or dependent adult.</Bullet>
            <Bullet>A court order or valid legal subpoena.</Bullet>
            <Bullet>Coordination of care with other treating providers (with your consent).</Bullet>
          </div>
          <p className="mt-3 text-gray-600 italic">We will always notify you of any disclosure when legally permitted to do so.</p>
        </Section>

        <Section number="8" title="Your Rights">
          <p className="mb-3">You have the right to:</p>
          <div className="space-y-1">
            <Bullet>Access your personal and clinical records upon written request.</Bullet>
            <Bullet>Request corrections to information you believe is inaccurate.</Bullet>
            <Bullet>Request that your data be deleted, subject to legal retention requirements.</Bullet>
            <Bullet>Withdraw your consent to data processing at any time. Withdrawal will not affect the lawfulness of processing that occurred before withdrawal.</Bullet>
            <Bullet>Receive a copy of this notice at any time by contacting us.</Bullet>
          </div>
        </Section>

        <Section number="9" title="Data Security">
          <div className="space-y-1">
            <Bullet>All data is encrypted in transit (TLS) and at rest (AES-256).</Bullet>
            <Bullet>Access to client data requires authenticated login with email verification.</Bullet>
            <Bullet>Role-based access controls ensure that each staff member can only see the information they need to do their job.</Bullet>
            <Bullet>Clinical data is structurally separated from personal data at the database level.</Bullet>
            <Bullet>Our platform undergoes regular security reviews.</Bullet>
          </div>
        </Section>

        <Section number="10" title="Contact and Questions">
          <p>If you have any questions about how your data is handled, or to exercise any of your rights:</p>
          <div className="mt-3 p-4 bg-gray-50 rounded-lg space-y-1">
            <SubItem label="Practice:">Shane Bruce Mental Health &amp; Coaching</SubItem>
            <SubItem label="Location:">Santa Barbara, California</SubItem>
            <SubItem label="Website:">shanebruce.com</SubItem>
          </div>
        </Section>

        {/* Acknowledgment */}
        <div className="mt-8 p-6 bg-indigo-50 border border-indigo-200 rounded-lg">
          <h2 className="text-base font-semibold text-indigo-900 mb-3">Acknowledgment</h2>
          <p className="text-sm text-indigo-800 mb-4">
            By signing (or checking the acknowledgment box in the client portal), you confirm that:
          </p>
          <ol className="text-sm text-indigo-800 space-y-1 list-decimal list-inside">
            <li>You have read and understood this document.</li>
            <li>You consent to the collection, storage, and use of your information as described above, including the supervised use of AI tools.</li>
            <li>You understand that you may withdraw this consent at any time by contacting the practice directly.</li>
          </ol>
        </div>

        {/* Footer */}
        <div className="mt-8 pt-4 border-t border-gray-200 text-xs text-gray-400 text-center">
          Shane Bruce Mental Health &amp; Coaching — Confidential<br />
          This document is protected under HIPAA and the California Confidentiality of Medical Information Act (CMIA).
        </div>

      </div>
    </div>
  </div>
);

export default InformedConsent;
