import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import secureApiClient from '../utils/secureApiClient';

// ─── Brand colours ────────────────────────────────────────────────────────────
// dark-teal: #3c5c6c   muted-blue: #8ca0aa   dark-gray: #434344
// ─────────────────────────────────────────────────────────────────────────────

const STEPS = [
  'Personal Info',
  'Emergency Contact',
  'Insurance',
  'Clinical Background',
  'Consents',
];

const INSURANCE_PROVIDERS = [
  'Cigna Healthcare',
  'CenCal',
  'Beacon Health Value Options',
  'Beacon Health Strategies (GOLD COAST)',
  'Beacon Health Strategies (LA Care)',
  'Private Pay',
  'Other',
];

const initialForm = {
  // Step 1 — Personal Info (Bucket A)
  preferredName: '',
  phone: '',
  dateOfBirth: '',
  street: '',
  city: '',
  state: '',
  zip: '',
  employerOrSchool: '',
  paymentPreference: '',

  // Step 2 — Emergency Contact (Bucket A)
  emergencyContactName: '',
  emergencyContactPhone: '',

  // Step 3 — Insurance (Bucket A + Bucket B category)
  insuranceProvider: '',
  insurancePlanName: '',
  insuranceMemberId: '',
  insuranceGroupId: '',
  insurancePhone: '',
  deductible: '',
  copay: '',
  oopMax: '',
  insuranceType: '',        // Bucket B — category only

  // Step 4 — Clinical Background (Bucket B)
  maritalStatus: '',
  gender: '',
  employmentStatus: '',
  referralSource: '',
  reasonForReachingOut: '',
  medicationsCurrent: false,
  medicationsList: '',

  // Step 5 — Consents (Bucket A)
  consentInformedConsent: false,
  consentCancellationPolicy: false,
  consentTelehealth: false,
};

// ─── Shared helpers — defined OUTSIDE component to keep stable references ─────

const Label = ({ children, required }) => (
  <label className="block text-sm font-medium mb-1" style={{ color: '#434344' }}>
    {children}{required && <span className="text-red-500 ml-1">*</span>}
  </label>
);

const Field = ({ label, required, children }) => (
  <div className="mb-4">
    <Label required={required}>{label}</Label>
    {children}
  </div>
);

// Input and Select receive value+onChange explicitly so they can live outside
const Input = ({ name, type = 'text', placeholder, value, onChange, ...rest }) => (
  <input
    name={name} type={type} placeholder={placeholder}
    value={value} onChange={onChange}
    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2"
    style={{ '--tw-ring-color': '#3c5c6c' }}
    {...rest}
  />
);

const Select = ({ name, value, onChange, children }) => (
  <select
    name={name} value={value} onChange={onChange}
    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 bg-white"
  >
    {children}
  </select>
);

const Progress = ({ step }) => (
  <div className="mb-8">
    <div className="flex justify-between mb-1">
      {STEPS.map((label, i) => (
        <span key={label}
          className="text-xs font-medium"
          style={{ color: i <= step ? '#3c5c6c' : '#8ca0aa' }}>
          {label}
        </span>
      ))}
    </div>
    <div className="w-full bg-gray-200 rounded-full h-2">
      <div
        className="h-2 rounded-full transition-all duration-300"
        style={{ width: `${((step + 1) / STEPS.length) * 100}%`, backgroundColor: '#3c5c6c' }}
      />
    </div>
  </div>
);

const ConsentBlock = ({ name, title, body, checked, onChange }) => (
  <div className="mb-6 border border-gray-200 rounded-lg p-4">
    <h4 className="font-semibold text-sm mb-2" style={{ color: '#3c5c6c' }}>{title}</h4>
    <p className="text-xs text-gray-500 mb-3 leading-relaxed">{body}</p>
    <label className="flex items-start gap-2 cursor-pointer">
      <input
        type="checkbox" name={name}
        checked={checked} onChange={onChange}
        className="mt-0.5 w-4 h-4 accent-teal-700 flex-shrink-0"
      />
      <span className="text-sm font-medium" style={{ color: '#434344' }}>
        I have read and agree to the above.
      </span>
    </label>
  </div>
);

// ─── Step panels — defined outside, receive form+handle as props ──────────────

const StepPersonal = ({ form, handle, currentUser }) => (
  <>
    <p className="text-xs text-gray-400 mb-6">
      Your name and email are already on file. Fill in the remaining details below.
    </p>

    <div className="grid grid-cols-2 gap-4 mb-4">
      <div>
        <Label>First Name</Label>
        <div className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-500">
          {currentUser?.firstName || '—'}
        </div>
      </div>
      <div>
        <Label>Last Name</Label>
        <div className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-500">
          {currentUser?.lastName || '—'}
        </div>
      </div>
    </div>

    <Field label="Preferred Name">
      <Input name="preferredName" placeholder="What would you like to be called?"
        value={form.preferredName} onChange={handle} />
    </Field>

    <div className="grid grid-cols-2 gap-4">
      <Field label="Phone" required>
        <Input name="phone" type="tel" placeholder="(805) 555-0100"
          value={form.phone} onChange={handle} />
      </Field>
      <Field label="Date of Birth" required>
        <Input name="dateOfBirth" type="date"
          value={form.dateOfBirth} onChange={handle} />
      </Field>
    </div>

    <Field label="Street Address" required>
      <Input name="street" placeholder="123 Main St"
        value={form.street} onChange={handle} />
    </Field>

    <div className="grid grid-cols-3 gap-4">
      <Field label="City" required>
        <Input name="city" placeholder="Santa Barbara"
          value={form.city} onChange={handle} />
      </Field>
      <Field label="State" required>
        <Input name="state" placeholder="CA" maxLength={2}
          value={form.state} onChange={handle} />
      </Field>
      <Field label="Zip" required>
        <Input name="zip" placeholder="93101" maxLength={10}
          value={form.zip} onChange={handle} />
      </Field>
    </div>

    <Field label="Employer / School">
      <Input name="employerOrSchool" placeholder="Where do you work or study?"
        value={form.employerOrSchool} onChange={handle} />
    </Field>

    <Field label="Payment Preference">
      <Select name="paymentPreference" value={form.paymentPreference} onChange={handle}>
        <option value="">Select…</option>
        <option value="insurance">Insurance Benefits</option>
        <option value="private_pay">Private Pay</option>
      </Select>
    </Field>
  </>
);

const StepEmergency = ({ form, handle }) => (
  <>
    <p className="text-xs text-gray-400 mb-6">
      This person will be contacted only in the case of an emergency.
    </p>
    <Field label="Emergency Contact Name" required>
      <Input name="emergencyContactName" placeholder="Full name"
        value={form.emergencyContactName} onChange={handle} />
    </Field>
    <Field label="Emergency Contact Phone" required>
      <Input name="emergencyContactPhone" type="tel" placeholder="(805) 555-0200"
        value={form.emergencyContactPhone} onChange={handle} />
    </Field>
  </>
);

const StepInsurance = ({ form, handle }) => (
  <>
    <Field label="Insurance Category" required>
      <Select name="insuranceType" value={form.insuranceType} onChange={handle}>
        <option value="">Select…</option>
        <option value="medicaid">Medicaid / MediCal</option>
        <option value="private">Private Insurance</option>
        <option value="self-pay">Self-Pay</option>
        <option value="other">Other</option>
      </Select>
    </Field>

    {(form.insuranceType === 'private' || form.insuranceType === 'medicaid') && (
      <>
        <Field label="Insurance Provider">
          <Select name="insuranceProvider" value={form.insuranceProvider} onChange={handle}>
            <option value="">Select…</option>
            {INSURANCE_PROVIDERS.map(p => (
              <option key={p} value={p}>{p}</option>
            ))}
          </Select>
        </Field>
        <Field label="Insurance Plan Name">
          <Input name="insurancePlanName" placeholder="Plan name"
            value={form.insurancePlanName} onChange={handle} />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Member ID / Policy #">
            <Input name="insuranceMemberId" placeholder="Member ID"
              value={form.insuranceMemberId} onChange={handle} />
          </Field>
          <Field label="Group Number">
            <Input name="insuranceGroupId" placeholder="Group #"
              value={form.insuranceGroupId} onChange={handle} />
          </Field>
        </div>
        <Field label="Insurance Phone">
          <Input name="insurancePhone" type="tel" placeholder="(800) 555-0000"
            value={form.insurancePhone} onChange={handle} />
        </Field>
        <div className="grid grid-cols-3 gap-4">
          <Field label="Deductible">
            <Input name="deductible" placeholder="$0"
              value={form.deductible} onChange={handle} />
          </Field>
          <Field label="Copay">
            <Input name="copay" placeholder="$0"
              value={form.copay} onChange={handle} />
          </Field>
          <Field label="Out-of-Pocket Max">
            <Input name="oopMax" placeholder="$0"
              value={form.oopMax} onChange={handle} />
          </Field>
        </div>
      </>
    )}

    <div className="mt-4 p-3 rounded-lg text-xs text-gray-500" style={{ backgroundColor: '#e8eff3' }}>
      <strong>Note:</strong> Payment card information is collected separately and securely through our payment processor. Card numbers are never stored in our system.
    </div>
  </>
);

const StepClinical = ({ form, handle }) => (
  <>
    <div className="grid grid-cols-2 gap-4">
      <Field label="Marital Status">
        <Select name="maritalStatus" value={form.maritalStatus} onChange={handle}>
          <option value="">Select…</option>
          {['Married', 'Single', 'Divorced', 'Separated', 'Widowed', 'Other'].map(o => (
            <option key={o} value={o}>{o}</option>
          ))}
        </Select>
      </Field>
      <Field label="Gender / Pronouns">
        <Select name="gender" value={form.gender} onChange={handle}>
          <option value="">Select…</option>
          {['He/Him', 'She/Her', 'They/Them', 'Other'].map(o => (
            <option key={o} value={o}>{o}</option>
          ))}
        </Select>
      </Field>
    </div>

    <div className="grid grid-cols-2 gap-4">
      <Field label="Employment Status">
        <Select name="employmentStatus" value={form.employmentStatus} onChange={handle}>
          <option value="">Select…</option>
          {['Full Time', 'Part Time', 'Unemployed', 'Self-Employed', 'Attending School', 'Other'].map(o => (
            <option key={o} value={o}>{o}</option>
          ))}
        </Select>
      </Field>
      <Field label="How did you hear about us?">
        <Select name="referralSource" value={form.referralSource} onChange={handle}>
          <option value="">Select…</option>
          {['Insurance Website', 'Psychology Today', 'Personal Referral', 'shanebruce.com', 'Other'].map(o => (
            <option key={o} value={o}>{o}</option>
          ))}
        </Select>
      </Field>
    </div>

    <Field label="What brings you to therapy?" required>
      <textarea
        name="reasonForReachingOut"
        value={form.reasonForReachingOut}
        onChange={handle}
        rows={4}
        placeholder="Please describe what's been going on and what you're hoping to work on…"
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 resize-none"
      />
      <p className="text-xs text-gray-400 mt-1">
        Please do not include your name in this field.
      </p>
    </Field>

    <Field label="Are you currently taking any medications?">
      <label className="flex items-center gap-2 cursor-pointer mb-2">
        <input
          type="checkbox" name="medicationsCurrent"
          checked={form.medicationsCurrent} onChange={handle}
          className="w-4 h-4"
        />
        <span className="text-sm text-gray-700">Yes, I am currently taking medications</span>
      </label>
    </Field>

    {form.medicationsCurrent && (
      <Field label="Please list your medications">
        <textarea
          name="medicationsList"
          value={form.medicationsList}
          onChange={handle}
          rows={3}
          placeholder="Medication name, dosage, frequency…"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 resize-none"
        />
      </Field>
    )}
  </>
);

const StepConsents = ({ form, handle }) => (
  <>
    <p className="text-xs text-gray-400 mb-6">
      Please read and acknowledge each policy below before submitting.
    </p>

    <ConsentBlock
      name="consentInformedConsent"
      title="Informed Consent for Therapy"
      body="I understand that therapy involves discussing personal and sensitive matters. Shane Bruce Mental Health & Coaching provides services in marriage and family therapy. Sessions are 50 minutes and a minimum commitment of 6 weekly sessions is expected. Confidentiality will be maintained except as required by law (e.g., abuse reporting, danger to self or others). I have the right to terminate treatment at any time."
      checked={form.consentInformedConsent}
      onChange={handle}
    />

    <ConsentBlock
      name="consentCancellationPolicy"
      title="Cancellation & Late Cancellation Policy"
      body="I agree to provide at least 48 hours notice to cancel or reschedule an appointment. If I cancel with less than 48 hours notice or do not show up, I will be charged the full contracted session rate. This fee is not covered by insurance."
      checked={form.consentCancellationPolicy}
      onChange={handle}
    />

    <ConsentBlock
      name="consentTelehealth"
      title="Informed Consent for Telehealth Services"
      body="I understand that my therapy sessions may be conducted via telehealth (video or phone). I consent to the use of telehealth technology for my treatment. I understand that telehealth has the same confidentiality protections as in-person sessions. I acknowledge that technology failures may occasionally disrupt sessions and agree to a backup communication plan with my therapist."
      checked={form.consentTelehealth}
      onChange={handle}
    />
  </>
);

// ─── Main component ───────────────────────────────────────────────────────────

export default function ClientIntakeForm() {
  const { currentUser } = useAuth();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handle = e => {
    const { name, value, type, checked } = e.target;
    setForm(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  // ─── Per-step validation ────────────────────────────────────────────────────
  const validate = () => {
    if (step === 0) {
      if (!form.phone) return 'Phone number is required.';
      if (!form.dateOfBirth) return 'Date of birth is required.';
      if (!form.street || !form.city || !form.state || !form.zip)
        return 'Full address is required.';
    }
    if (step === 1) {
      if (!form.emergencyContactName) return 'Emergency contact name is required.';
      if (!form.emergencyContactPhone) return 'Emergency contact phone is required.';
    }
    if (step === 2) {
      if (!form.insuranceType) return 'Please select an insurance category.';
    }
    if (step === 3) {
      if (!form.reasonForReachingOut) return 'Please describe why you are reaching out.';
    }
    if (step === 4) {
      if (!form.consentInformedConsent)    return 'You must acknowledge the informed consent policy.';
      if (!form.consentCancellationPolicy) return 'You must acknowledge the cancellation policy.';
      if (!form.consentTelehealth)         return 'You must acknowledge the telehealth consent.';
    }
    return '';
  };

  const next = () => {
    const err = validate();
    if (err) { setError(err); return; }
    setError('');
    setStep(s => s + 1);
  };

  const back = () => { setError(''); setStep(s => s - 1); };

  const submit = async () => {
    const err = validate();
    if (err) { setError(err); return; }
    setError('');
    setSubmitting(true);
    try {
      await secureApiClient.makeSecureRequest(
        secureApiClient.baseURLs.cloudFunctions.submitClientIntake,
        { method: 'POST', body: JSON.stringify(form) }
      );
      setSubmitted(true);
    } catch (e) {
      setError(e.message || 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Success screen ─────────────────────────────────────────────────────────
  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="bg-white rounded-2xl shadow-lg p-10 max-w-md w-full text-center">
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
               style={{ backgroundColor: '#3c5c6c' }}>
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold mb-2" style={{ color: '#3c5c6c' }}>
            Thank you, {currentUser?.firstName || 'there'}!
          </h2>
          <p className="text-gray-600 mb-6">
            Your intake information has been saved securely. Your care team will review it and reach out to you shortly.
          </p>
          <p className="text-sm text-gray-400">
            You can update this information at any time by returning to this page.
          </p>
        </div>
      </div>
    );
  }

  const stepProps = { form, handle };

  const stepPanels = [
    <StepPersonal key="personal" {...stepProps} currentUser={currentUser} />,
    <StepEmergency key="emergency" {...stepProps} />,
    <StepInsurance key="insurance" {...stepProps} />,
    <StepClinical key="clinical" {...stepProps} />,
    <StepConsents key="consents" {...stepProps} />,
  ];

  // ─── Layout ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-2xl mx-auto">

        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold" style={{ color: '#3c5c6c' }}>
            Client Intake Form
          </h1>
          <p className="text-gray-500 mt-1 text-sm">
            Your information is stored securely and never shared with AI systems in identifiable form.
          </p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-md p-8">
          <Progress step={step} />

          {/* Step title */}
          <h2 className="text-xl font-semibold mb-6" style={{ color: '#3c5c6c' }}>
            {STEPS[step]}
          </h2>

          {/* Step content */}
          {stepPanels[step]}

          {/* Error */}
          {error && (
            <div className="mt-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* Navigation */}
          <div className="flex justify-between mt-8">
            <button
              onClick={back}
              disabled={step === 0}
              className="px-5 py-2 rounded-lg text-sm font-medium border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Back
            </button>

            {step < STEPS.length - 1 ? (
              <button
                onClick={next}
                className="px-6 py-2 rounded-lg text-sm font-medium text-white"
                style={{ backgroundColor: '#3c5c6c' }}
              >
                Continue →
              </button>
            ) : (
              <button
                onClick={submit}
                disabled={submitting}
                className="px-6 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-60"
                style={{ backgroundColor: '#3c5c6c' }}
              >
                {submitting ? 'Saving…' : 'Submit Intake'}
              </button>
            )}
          </div>
        </div>

        {/* Footer note */}
        <p className="text-center text-xs text-gray-400 mt-6">
          Your data is protected under HIPAA. PII is stored separately from clinical information and is never sent to AI systems.
        </p>
      </div>
    </div>
  );
}
