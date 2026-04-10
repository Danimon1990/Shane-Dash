# Migration Plan: Google Forms + Sheets → Firebase / Firestore

> **Status:** Draft — under review
> **Created:** 2026-04-06
> **Author:** Claude Code (Senior Architect Analysis)
> **Purpose:** Planning document only. No code changes have been made.

---

**Names and emails may be currently being sent to OpenAI.** This is a HIPAA violation risk
that must be resolved before any new feature is built or any form goes live.

### What the code does right now

**In `analyzeFormSubmission` (functions/index.js line 722):**
```
Prompt sent to GPT-4:
  - Name: [firstName] [lastName]      ← sent verbatim
  - Age: [age]
  - Marital Status: [maritalStatus]
  - Previous Diagnosis: ...
  - Medical Conditions: ...
```

**In `analyzePublicInquiry` (functions/index.js line 945):**
```
Prompt sent to GPT-4:
  - Name: [firstName] [lastName]      ← sent verbatim
  - Email: [email]                    ← sent verbatim
  - Age, gender, situation, scores, symptoms...
```

The fallback function (no OpenAI key) also writes the full name into the generated
analysis text that gets stored back in Firestore.

**Additionally**, the current Firestore collection uses `clients/{LastName_FirstName}` as
document IDs. The client's name is therefore embedded in every Firestore path, every
Cloud Function log line that mentions that path, and every Firestore console view.
This is PII in system infrastructure, which is also a HIPAA concern.

### The fix is architectural, not a patch

Removing the name from the prompt is one line of code. But the real solution is a
**complete separation of PII from clinical data** at the database level — because even
if we strip names from the AI prompt today, a future developer could easily re-add them
without realizing the consequence. The architecture itself must make it structurally
impossible for PII to reach the AI layer.

That is what this plan proposes.

---

## Executive Summary

This system needs two things to happen in the right order:

1. **HIPAA remediation first** — redesign the Firestore data model so PII (name, email,
   phone, address, credit card, DOB) lives in a completely separate collection that AI
   functions are structurally prevented from reading. This is Phase 0 and it is a
   prerequisite for everything else.

2. **Feature build-out second** — replace the standalone HTML forms with React
   components, complete the Clinical Forms tab with AI Diagnosis assistance, and build
   the client-facing portal with a privacy-safe AI chatbot.

The end state is a system where:
- Clients log into their own portal and see their personal info, progress notes, AI
  analysis, and a chatbot
- The chatbot knows their clinical context (symptoms, conditions, session themes) but
  has zero access to their name, email, phone, address, or any other PII
- Therapists use the internal dashboard as today, with intake data surfaced alongside
  progress notes
- OpenAI never receives anything that could identify a specific person

---

## 1. Current State Audit

### What Already Exists in Firestore

| Collection | Status | Problem |
|---|---|---|
| `form_submissions` | Active | PII (name, email) stored alongside clinical data AND sent to OpenAI |
| `public_inquiries` | Active | PII (name, email, phone) stored alongside clinical data AND sent to OpenAI |
| `clients/{LastName_FirstName}/notes` | Active, CRUD complete | Client name is the document ID — PII in system paths and logs |
| `users` | Active, RBAC complete | No structural barrier preventing AI functions from reading it |

### What the Standalone HTML Forms Do

**`public-mental-health-form.html`** collects:
- firstName, lastName, email, phone, age, gender, situation (free text)
- Checkboxes: Anxiety (GAD-7), Panic (DSM-5), Depression (PHQ-9), ADHD, Adjustment
- Calculates `scores` and `identifiedConditions` locally
- **Currently NOT connected to Firestore** — not live

**`Depression anxiety form.html`** — client intake form with clinical history + symptom
inventory — **also not connected to Firestore**.

### The Google Sheet

- Sheet ID: `1kGRG-BDGbSQNPwQVBQWIc1WvRrAmW-4I9V1FhUI3ez4`
- 55+ columns: demographics, insurance, billing, assigned therapist, status
- Cloud Function `getSheetData` is the only read path to client data
- `updateClientTherapist` and `updateClientStatus` are the only write paths
- Google Forms likely appends new rows — this is the current intake mechanism

---

## 2. The HIPAA De-identification Architecture

This is the foundational decision that shapes everything else.

### The Two-Layer Data Model

All data is split into exactly two buckets. They are never mixed. The AI layer can only
ever see Bucket B.

```
┌─────────────────────────────────────────────────────────────────┐
│  BUCKET A — Identity / PII                                      │
│  Firestore collection: users/{uid}                              │
│                                                                 │
│  Fields: firstName, lastName, email, phone, address, DOB,       │
│          emergencyContact, insuranceDetails, paymentToken       │
│                                                                 │
│  Access: Admin, Billing roles + the client themselves           │
│  AI access: NEVER — Cloud Functions that call OpenAI are        │
│             structurally blocked from reading this collection   │
│                                                                 │
│  Also stored here: clinicalId  ← a random UUID that links      │
│                                   to Bucket B                   │
└─────────────────────────────────────────────────────────────────┘
                              │
                    clinicalId (UUID only)
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  BUCKET B — Clinical / De-identified                            │
│  Firestore collection: clinicalRecords/{clinicalId}             │
│                                                                 │
│  Fields: assignedTherapistId (UUID, not name), status,          │
│          intakeDate, conditions, insuranceType (category only)  │
│                                                                 │
│  Subcollections:                                                │
│    /notes/{noteId}         ← SOAP notes (no name in doc)        │
│    /assessments/{id}       ← symptoms, scores, AI analysis      │
│    /chatHistory/{chatId}   ← AI chatbot messages                │
│                                                                 │
│  Access: Therapist, Admin + the client themselves (own record)  │
│  AI access: YES — this is the only collection OpenAI ever sees  │
└─────────────────────────────────────────────────────────────────┘
```

### Why This Works

The link between a person and their clinical record is only the `clinicalId` UUID stored
in `users/{uid}`. A UUID like `a3f7c291-4b2e-4f8a-9c3d-1e2f5a6b7c8d` reveals nothing
about who the person is. If OpenAI's systems were ever compromised, or if a prompt
injection extracted data, the attacker would only see anonymous clinical profiles with no
way to link them to real people.

The join only happens inside the application layer (on the client, or in a Cloud Function
that is explicitly authorized to read both collections), and only for display purposes —
never as part of AI context.

### What OpenAI Will and Won't See

| Data | Sent to OpenAI? | Notes |
|---|---|---|
| First name, last name | **Never** | Stays in `users/` |
| Email | **Never** | Stays in `users/` |
| Phone, address, DOB | **Never** | Stays in `users/` |
| Credit card / insurance ID | **Never** | Stays in `users/` |
| Age | Yes — clinical context | Demographically useful, not identifying |
| Gender | Yes — clinical context | Needed for accurate analysis |
| Symptom checkboxes | Yes | Core clinical data |
| Scores (anxiety, depression etc.) | Yes | Core clinical data |
| Identified conditions | Yes | Core clinical data |
| Additional info (free text) | Yes, with a caveat* | See note below |
| Progress note content | Yes, with a caveat* | See note below |

> **\* Caveat on free text:** If a client writes their own name in the "Additional Info"
> field, or if a therapist writes a client's name inside a progress note, that text will
> reach OpenAI. This **cannot** be solved at the database level. It requires a policy
> decision: either (a) add a text-scanning step that strips names before sending, or (b)
> train therapists and clients not to include names in free-text fields. Recommend (b)
> as the starting policy, with (a) added later if needed.

---

## 3. Proposed Firestore Schema — Final State

### `users/{uid}` — Identity layer (PII, never read by AI)

```
firstName:          string
lastName:           string
email:              string
phone:              string
address:            string
dateOfBirth:        Timestamp
emergencyContact:   { name, phone, relationship }
insuranceDetails:   { provider, memberId, groupId }
paymentToken:       string  ← reference to Stripe/payment processor, NOT card number
role:               'client' | 'therapist' | 'admin' | 'billing' | 'associate'
clinicalId:         string  ← UUID linking to clinicalRecords/
createdAt:          Timestamp
emailVerified:      boolean
```

### `clinicalRecords/{clinicalId}` — Clinical layer (de-identified, AI-safe)

```
assignedTherapistId:  string  ← UID of assigned therapist (NOT their name)
status:               'active' | 'inactive' | 'pending'
intakeDate:           Timestamp
conditions:           string[]
insuranceType:        'medicaid' | 'private' | 'self-pay' | 'other'
```

### `clinicalRecords/{clinicalId}/notes/{noteId}`

```
content:            string  ← SOAP note text (therapist trained not to include client name)
therapistId:        string  ← UID of therapist who wrote it
createdAt:          Timestamp
lastModified:       Timestamp
modifiedBy:         string  ← therapist UID
```

### `clinicalRecords/{clinicalId}/assessments/{assessmentId}`

```
type:                 'intake' | 'public_inquiry' | 'follow_up'
selectedCheckboxes:   {}   ← symptom checklist responses
scores:               { anxiety, panic, depression, adhd, adjustment }
identifiedConditions: string[]
additionalInfo:       string
situation:            string   ← from public inquiry form
aiAnalysis:           {}       ← written back by Cloud Function after OpenAI call
timestamp:            Timestamp
analyzed:             boolean
```

### `clinicalRecords/{clinicalId}/chatHistory/{chatId}`

```
messages:   [{ role: 'user'|'assistant', content: string, timestamp: Timestamp }]
sessionDate: Timestamp
model:       string   ← e.g. 'gpt-4o'
```

### `publicLeads/{docId}` — Replacing `public_inquiries` for non-clients

For people who fill the public form but are not yet clients, PII and clinical data are
still collected in one document (they don't have a `clinicalId` yet). This collection
is a **temporary holding area** — PII stays here until staff converts them to a client.

```
firstName, lastName, email, phone, age, gender, situation:  string
selectedCheckboxes, scores, identifiedConditions:            {}
status:   'new' | 'reviewed' | 'converted' | 'declined'
reviewedBy, reviewedAt:  string, Timestamp
convertedToUserId:       string  ← set after conversion
convertedToClinicalId:   string  ← set after conversion
```

> **When the AI analyzes a public lead:** It reads ONLY `selectedCheckboxes`, `scores`,
> `identifiedConditions`, `age`, `gender`, and `situation`. It never reads
> `firstName`, `lastName`, `email`, or `phone` from this document.

---

## 4. How the AI Cloud Functions Change

### Current (broken)

```
Form submitted with PII + clinical data in one document
  → Cloud Function reads entire document
  → Sends name, email, clinical data all to OpenAI
  → Stores AI response back in same document
```

### Target (correct)

```
For existing clients (have a clinicalId):
  Form submitted → goes to clinicalRecords/{clinicalId}/assessments/{id}
    → Cloud Function reads ONLY assessments doc (no PII possible)
    → Sends clinical data to OpenAI as "an individual" — no name, no email
    → Stores AI response back in same assessments doc

For public leads (no clinicalId yet):
  Form submitted → goes to publicLeads/{docId}
    → Cloud Function reads ONLY: age, gender, situation, checkboxes, scores
    → Explicitly skips firstName, lastName, email, phone fields
    → Sends sanitized clinical data to OpenAI
    → Stores AI response back in same publicLeads doc
```

### The Prompt Template — Before vs After

**Before (current code):**
```
Patient Information:
- Name: John Smith          ← HIPAA violation
- Age: 34
- Email: john@example.com   ← HIPAA violation
- Marital Status: Single
...
```

**After (target):**
```
Individual Assessment:
- Age: 34
- Gender: Male
- Presenting situation: [situation text]
- Symptom profile: [checkboxes]
- Assessment scores: [scores]

Note: This record is de-identified. Do not reference any name or
personal identifier in your response.
```

---

## 5. Client Portal Architecture

### What the Client Sees When They Log In

Route: `/my-portal` (role: `client`, protected)

```
┌────────────────────────────────────────────────────┐
│  Welcome, [firstName]  ← pulled from users/{uid}  │
│                          NEVER sent to AI          │
├────────────────────────────────────────────────────┤
│  Tab 1: My Information                             │
│    → Reads users/{uid} (PII, display only)         │
│    → Name, contact info, insurance on file         │
│    → Edit profile / update contact info            │
│                                                    │
│  Tab 2: My Progress Notes                          │
│    → Reads clinicalRecords/{clinicalId}/notes      │
│    → Therapist's SOAP notes for this client        │
│    → Read-only for client                          │
│                                                    │
│  Tab 3: My Assessment Results                      │
│    → Reads clinicalRecords/{clinicalId}/assessments│
│    → Symptom scores, identified conditions         │
│    → AI-generated analysis summary                 │
│                                                    │
│  Tab 4: My AI Chat                                 │
│    → Chatbot powered by Cloud Function             │
│    → See chatbot section below                     │
└────────────────────────────────────────────────────┘
```

### How the Client Portal Reads Data

The client is authenticated via Firebase Auth. Their UID is known. The Firestore rules
allow them to read `users/{theirUid}` and `clinicalRecords/{theirClinicalId}`.

```
Client logs in
  → AuthContext loads users/{uid}  → gets: name (for display), clinicalId
  → ClientPortal reads clinicalRecords/{clinicalId} → clinical data
  → UI shows: "Welcome, [name from users/]"
              "Your conditions: [from clinicalRecords/]"
              "Your last session: [from clinicalRecords/notes/]"
```

The two reads are always kept separate. The `clinicalId` is just a routing key — it
is never displayed to the user, and never sent to OpenAI.

### The AI Chatbot — How It Works

The chatbot is the most privacy-sensitive feature. Here is the complete data flow:

```
1. Client types a message in the chat UI
2. Frontend calls Cloud Function `clientChat` with:
   - Firebase Auth token (for identity verification only)
   - The message text
   - (No name, no email — never sent from frontend to function)

3. Cloud Function `clientChat`:
   a. Verifies Auth token → gets uid
   b. Reads users/{uid} → gets clinicalId ONLY (does not read name/email/PII)
   c. Reads clinicalRecords/{clinicalId}:
      - Latest assessment (conditions, scores, symptom summary)
      - Last 3-5 progress notes (session themes)
      - Previous chat messages for context
   d. Builds OpenAI prompt:
      "You are a supportive mental health assistant. Here is the clinical context
       for this individual (de-identified):
       - Identified conditions: [...]
       - Recent session themes from notes: [...]
       - Self-reported symptoms: [...]
       Respond to their message compassionately and helpfully.
       Do NOT ask for or reference any personal identifying information."
   e. Sends prompt + user message to OpenAI (zero PII in transit)
   f. Receives AI response
   g. Stores exchange in clinicalRecords/{clinicalId}/chatHistory/{chatId}
   h. Returns AI response to frontend

4. Frontend displays response
   - UI may show "Hi [name]!" at the top from users/{uid}
   - But the AI itself never knew the name
```

---

## 6. Migration Phases (Updated)

---

### Phase 0 — HIPAA Remediation (Before anything else — Week 1)

**This phase is mandatory before going live with any form or AI feature.**

#### 0A. Strip PII from existing AI prompts

In `functions/index.js`:

- `analyzeFormSubmission`: Remove `firstName`, `lastName`, `email` from the `patientInfo`
  object passed to the prompt. Change "Patient Information" to "Individual Assessment".
  Replace `${patientInfo.firstName} ${patientInfo.lastName}` with "the individual".

- `analyzePublicInquiry`: Remove `firstName`, `lastName`, `email`, `phone` from the
  `visitorInfo` object passed to the prompt. The `personalizedGreeting` field that asks
  OpenAI to greet the person by name must be removed from the JSON schema returned.

- Fallback functions: Remove name references from generated text in both
  `generateFallbackAnalysis` and `generatePublicInquiryFallback`.

#### 0B. Migrate Firestore collection naming

Current: `clients/{LastName_FirstName}/notes/{noteId}`
Target: `clinicalRecords/{UUID}/notes/{noteId}`

Migration steps:
1. Write a one-time migration script (`functions/migrate-to-clinical-records.js`) that:
   - Reads every doc in `clients/`
   - Generates a UUID for each
   - Creates `clinicalRecords/{UUID}` with the clinical data
   - Copies all notes from `clients/{name}/notes/` to `clinicalRecords/{UUID}/notes/`
   - Records the mapping `{name} → {UUID}` in a temporary `_migration/` collection
2. Update `users/{uid}` for each existing user to add their `clinicalId`
3. Update all Cloud Functions and React components that reference `clients/{id}` to use
   `clinicalRecords/{clinicalId}` instead
4. After verifying everything works: delete the old `clients/` collection

> **Note:** The migration scripts `functions/migrate-notes.js` and
> `functions/audit-notes.js` already exist in the project. Review these first — they may
> already do part of this work.

#### 0C. Add Firestore Security Rules that enforce the separation

```javascript
// users/ — PII: client reads own, admin/billing reads all. AI functions cannot read.
match /users/{uid} {
  allow read, write: if request.auth.uid == uid;
  allow read: if get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role
    in ['admin', 'billing'];
}

// clinicalRecords/ — clinical: client reads own, therapist/admin reads all
match /clinicalRecords/{clinicalId} {
  allow read: if
    get(/databases/$(database)/documents/users/$(request.auth.uid)).data.clinicalId
    == clinicalId  // client reads their own
    ||
    get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role
    in ['admin', 'therapist', 'billing'];
  allow write: if
    get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role
    in ['admin', 'therapist'];

  match /notes/{noteId} {
    allow read: if
      get(/databases/$(database)/documents/users/$(request.auth.uid)).data.clinicalId
      == clinicalId
      ||
      get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role
      in ['admin', 'therapist'];
    allow write: if
      get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role
      in ['admin', 'therapist'];
  }

  match /assessments/{assessmentId} {
    allow read: if
      get(/databases/$(database)/documents/users/$(request.auth.uid)).data.clinicalId
      == clinicalId
      ||
      get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role
      in ['admin', 'therapist'];
    allow create: if true;  // public form submission (unauthenticated)
    allow update: if request.auth != null;  // Cloud Functions updating with AI analysis
  }

  match /chatHistory/{chatId} {
    allow read, write: if
      get(/databases/$(database)/documents/users/$(request.auth.uid)).data.clinicalId
      == clinicalId;
    allow write: if
      get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role
      in ['admin', 'therapist'];
  }
}

// publicLeads/ — temporary holding for non-client submissions
match /publicLeads/{docId} {
  allow create: if true;  // anyone can submit the public form
  allow read, update, delete: if
    get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role
    in ['admin', 'billing', 'therapist'];
}
```

#### 0D. Obtain a Business Associate Agreement (BAA) with OpenAI

Even with full de-identification, because this is a healthcare context, a BAA with
OpenAI is recommended. OpenAI offers BAAs for enterprise API customers. This is a
business/legal step, not a code step, but it should happen before going live.

---

### Phase 1 — React Form Components (Week 2)

**Goal:** Replace the two standalone HTML files with React components that write to the
new de-identified schema.

#### 1A. `PublicIntakeForm.jsx` — public mental health check-in

- Route: `/intake` (no auth required, publicly accessible, no sidebar)
- Collects: firstName, lastName, email, phone, age, gender, situation + symptom checkboxes
- On submit:
  1. Calculate `scores` and `identifiedConditions` locally
  2. Write to `publicLeads/{docId}` — all fields including PII (this is the temporary
     holding area for non-clients)
  3. Cloud Function `analyzePublicLead` fires automatically → reads ONLY clinical
     fields, sends de-identified data to OpenAI, writes `aiAnalysis` back
  4. Show user a warm confirmation screen with crisis resources if urgency is high
- Brand colors: `#3c5c6c`, `#8ca0aa`, `#434344` (from existing HTML file)

#### 1B. `ClientIntakeForm.jsx` — existing client intake

- Route: `/client-form?token={oneTimeToken}` (staff emails client a unique link)
- The token maps to the client's `clinicalId` — no name or PII in the URL
- Collects: age, gender, maritalStatus, previousDiagnosis, medicalCondition,
  additionalInfo + symptom checkboxes (does NOT re-collect name/email — already on file)
- On submit:
  1. Write to `clinicalRecords/{clinicalId}/assessments/{id}` — no PII in this doc
  2. Cloud Function `analyzeAssessment` fires automatically → reads clinical data only,
     sends de-identified data to OpenAI, writes `aiAnalysis` back
  3. Show client confirmation

---

### Phase 2 — ClinicalForms Dashboard Enhancements (Week 2–3)

**Goal:** Staff-facing dashboard actions on form submissions.

#### 2A. "Convert to Client" Action on Public Leads

When staff selects a public lead and decides to onboard the person:

1. "Convert to Client" button in the detail pane
2. Mini-form to confirm: verify name, assign therapist, collect any missing demographics
3. Create a Firebase Auth account for the new client (or send them a signup link)
4. Write PII to `users/{newUid}` — name, email, phone, etc.
5. Generate a UUID → write to `users/{newUid}.clinicalId` + create `clinicalRecords/{UUID}`
6. Move clinical data from `publicLeads/{docId}` to `clinicalRecords/{UUID}/assessments/{id}`
7. Optionally: write new client row to Google Sheet for billing/admin purposes
8. Update `publicLeads/{docId}`: `{ status: 'converted', convertedToUserId, convertedToClinicalId }`

#### 2B. "Link Assessment to Client" on Existing Clients

For existing clients who submit an assessment:

1. "Link to Client" button in the assessment detail pane
2. Searchable client dropdown
3. On select: move/copy assessment doc to `clinicalRecords/{clinicalId}/assessments/{id}`

#### 2C. Status Filtering

Add status filter: `All | New | Reviewed | Converted | Declined`

---

### Phase 3 — AI Diagnosis Assistance Tab (Week 3)

**Goal:** Third tab in `/forms` for clinical decision support.

#### 3A. Tab Structure

```
Tab 1: Client Assessments  (previously "Client Forms")
Tab 2: Public Leads        (previously "Public Inquiries")
Tab 3: AI Diagnosis        (new)
```

#### 3B. AI Diagnosis Tab Modes

**Mode A: Review Analyzed Assessment**
- Left: list of assessments that have `aiAnalysis`
- Right: structured clinical display
  - Urgency badge (high / moderate / low)
  - DSM criteria met
  - Score bars (Anxiety, Panic, Depression, ADHD, Adjustment)
  - AI summary
  - Clinician annotation box (therapist adds own interpretation)
  - "Create Progress Note" button → pre-populates TherapyNoteForm

**Mode B: Manual AI Consultation**
- Freetext clinical scenario box (therapist types, no client name)
- Calls Cloud Function `consultAI`
- Returns structured analysis
- Option to save as a note or discard

---

### Phase 4 — Progress Notes Integration (Week 3–4)

#### 4A. Surface Assessments in Client Views

In `Clients.js` and `Associates.js`, when a client is selected:
- Query `clinicalRecords/{clinicalId}/assessments` for that client
- If assessments exist, show "Intake Assessment" tab in the client detail panel
- Display: AI analysis summary, condition flags, scores

#### 4B. Pre-populate Progress Notes from Assessment

- "Create Progress Note from Assessment" button
- Routes to therapy notes with AI summary as initial content
- Therapist edits and saves — lands in `clinicalRecords/{clinicalId}/notes/{noteId}`

---

### Phase 5 — Client Portal (Week 4–5)

**Goal:** Give clients access to their own data and the AI chatbot.

#### 5A. New Route and Component

- Route: `/my-portal` (protected, role: `client`)
- `ClientPortal.jsx` with four tabs (see Section 5 above)
- Reads from both `users/{uid}` (for display) and `clinicalRecords/{clinicalId}` (for content)

#### 5B. New Cloud Function: `clientChat`

- HTTP endpoint, requires Firebase Auth
- Reads `clinicalId` from `users/{uid}` (PII lookup, but ONLY reads `clinicalId`)
- Reads clinical context from `clinicalRecords/{clinicalId}` ONLY
- Sends de-identified context + message to OpenAI
- Stores exchange in `clinicalRecords/{clinicalId}/chatHistory/{chatId}`
- Returns response

#### 5C. Client Onboarding Flow

When a public lead is converted to a client:
1. Client receives email with link to set up their account
2. They complete Firebase Auth (email + password)
3. First login shows a brief profile setup (verify info on file, HIPAA acknowledgment)
4. They land in `/my-portal`

---

### Phase 6 — Google Sheets Coexistence (Week 5)

The Google Sheet remains the administrative source of truth for demographics and billing.
Firestore handles all clinical data. No full Sheet migration is needed at this stage.

**New Cloud Function: `createClientInSheet`**
- Triggered when a public lead is converted to a client (Phase 2A)
- Appends a new row to the Sheet with demographics for billing/admin use
- Checks for existing email before appending to prevent duplicates

---

## 7. New Cloud Functions — Complete List

| Function Name | Trigger | PII Access | AI Call | Purpose |
|---|---|---|---|---|
| `analyzeAssessment` | Firestore create on `clinicalRecords/.../assessments/` | No | Yes | Replaces `analyzeFormSubmission`, de-identified |
| `analyzePublicLead` | Firestore create on `publicLeads/` | No (skips name/email/phone fields) | Yes | Replaces `analyzePublicInquiry`, de-identified |
| `clientChat` | HTTP POST (authenticated) | reads `clinicalId` only | Yes | Chatbot for client portal |
| `consultAI` | HTTP POST (authenticated) | No | Yes | Manual AI consultation for therapists |
| `convertLeadToClient` | HTTP POST (authenticated) | Yes | No | Creates user, clinicalRecord, moves assessment |
| `createClientInSheet` | HTTP POST (authenticated) | Yes | No | Appends new client row to Google Sheet |
| `generateIntakeToken` | HTTP POST (authenticated) | reads `clinicalId` | No | Creates one-time token for client intake link |

**Decommission after migration:**
- `analyzeFormSubmission` — replace with `analyzeAssessment`
- `analyzePublicInquiry` — replace with `analyzePublicLead`

---

## 8. New React Components / Routes

| Component | Route | Auth | Description |
|---|---|---|---|
| `PublicIntakeForm.jsx` | `/intake` | None | Public mental health check-in |
| `ClientIntakeForm.jsx` | `/client-form?token=...` | None (token-based) | Existing client symptom assessment |
| `ClientPortal.jsx` | `/my-portal` | Client role | Client-facing portal (4 tabs) |
| `ClientChatbot.jsx` | Inside `/my-portal` | Client role | AI chatbot UI |
| `LeadDetailPane.jsx` | Inside `/forms` | Staff roles | Public lead detail + actions |
| `AssessmentViewer.jsx` | Inside `/clients`, `/associates` | Staff roles | Shows assessment alongside notes |
| AI Diagnosis tab | Inside `/forms` | Staff roles | Tab 3 of ClinicalForms |
| `AIConsultBox.jsx` | Inside `/forms` tab 3 | Staff roles | Freetext → AI response |

---

## 9. Risk Assessment (Updated)

| Risk | Likelihood | Severity | Mitigation |
|---|---|---|---|
| **CURRENT: Name/email sent to OpenAI** | **Confirmed** | **Critical** | **Phase 0A — fix immediately before any go-live** |
| **CURRENT: Client name in Firestore document IDs** | **Confirmed** | **High** | **Phase 0B — migration to UUID-based IDs** |
| Free-text fields contain names despite policy | Medium | Medium | Therapist training + optional text scanning before AI submission |
| Public form submission flood | Low | Low | Firebase App Check + rate limiting in Cloud Function |
| UUID collision on `clinicalId` generation | Very Low | High | Use `crypto.randomUUID()` — collision probability is astronomically low |
| Client sees another client's clinical record | Very Low | Critical | Firestore rules enforce `clinicalId` match — tested thoroughly before portal goes live |
| One-time intake token reused or guessed | Low | Medium | Token expiration (24h) + Firestore deletion after first use |
| OpenAI API key exposed | Low | High | Already in Firebase env, never in client code — keep it there |
| Sheet row duplication on convert | Low | Low | Check email before appending row |
| AI analysis timeout on large assessments | Low | Low | Fallback analysis already exists in Cloud Functions |
| No OpenAI BAA for healthcare context | Current state | High | Obtain BAA as part of Phase 0 (business step) |

---

## 10. Questions / Decisions Needed Before Building

> Mark each with your decision before development starts.

**HIPAA / Architecture:**
- [ ] Confirm: Is the decision to fully split PII from clinical data accepted?
      This changes the Firestore schema significantly and requires a migration.
- [ ] Is there an existing relationship with a HIPAA compliance attorney or officer
      who should review this plan before implementation?
- [ ] Should OpenAI's BAA be obtained before or after the de-identification is in place?
      (Recommend: both — de-identify AND get the BAA)

**Free-text policy:**
- [ ] What is the policy on therapists writing client names inside progress note content?
      Technical solutions exist but policy is faster. Decide before portal launch.

**Client Portal:**
- [ ] Should clients be able to see their therapist's SOAP notes in full, or only a
      summary version? Some practices don't share full clinical notes with clients.
- [ ] Should the chatbot have a conversation memory across sessions, or reset each visit?
- [ ] Should the chatbot be able to discuss medication? (If so, strong disclaimers needed.)

**Forms:**
- [ ] Should the public form (`/intake`) be a standalone page with no nav, or embedded
      in the marketing site?
- [ ] Should the client intake form (`/client-form`) be accessible only via a staff-sent
      token, or can clients access it from their portal?

**Google Sheet:**
- [ ] Is a full Firestore migration (replacing the Sheet entirely) on the roadmap, or is
      the Sheet permanent for billing/admin?
- [ ] If Sheet is permanent: should new clients created via "Convert to Client" also
      appear in the Sheet? (Yes, via `createClientInSheet` — confirm this.)

**AI:**
- [ ] What OpenAI model: GPT-4 (current) or GPT-4o?
- [ ] Should manual AI consultations (Mode B) be saved to a collection for audit purposes?

---

## 11. What Is Preserved — Zero Breaking Changes to Existing Features

The Phase 0 migration changes the Firestore schema, which does touch existing code. But
the following behaviors are preserved throughout:

- Role-based access (Admin, Billing, Therapist, Associate, Viewer) — unchanged
- Therapist assignment and filtering — unchanged logic, updated collection reference
- Google Sheets read via `getSheetData` — unchanged
- `updateClientTherapist` and `updateClientStatus` — unchanged
- Auth flow, email verification, RBAC — unchanged
- Progress note CRUD — same behavior, new collection path
- `ClinicalForms.js` read logic — updated to read from new collections, same UI

---

## 12. Revised Implementation Timeline

```
Week 1 — Phase 0: HIPAA Remediation (mandatory prerequisite)
  ▶ 0A: Strip name/email from AI prompts in both Cloud Functions (quick fix)
  ▶ 0B: Plan and execute Firestore collection migration (clients → clinicalRecords)
  ▶ 0C: Write and deploy new Firestore security rules
  ▶ 0D: Initiate OpenAI BAA process (business step, runs in parallel)
  ▶ Verify: submit a test form → confirm name is NOT in OpenAI prompt logs

Week 2 — Phase 1: React Form Components
  ▶ 1A: PublicIntakeForm.jsx → writes to publicLeads/ (de-identified AI trigger)
  ▶ 1B: ClientIntakeForm.jsx → writes to clinicalRecords/.../assessments/ (via token)
  ▶ Deploy and test both forms end-to-end

Week 3 — Phase 2 + 3: Dashboard Enhancements + AI Diagnosis Tab
  ▶ 2A: "Convert to Client" action + convertLeadToClient Cloud Function
  ▶ 2B: "Link Assessment" action
  ▶ 2C: Status badges and filtering
  ▶ 3:  AI Diagnosis tab (Mode A + Mode B)

Week 4 — Phase 4 + 5A: Progress Notes Integration + Client Portal Shell
  ▶ 4A: Surface assessments in Clients.js and Associates.js
  ▶ 4B: Pre-populate progress notes from assessment
  ▶ 5A: ClientPortal.jsx with tabs 1-3 (no chatbot yet)

Week 5 — Phase 5B + 6: Chatbot + Sheet Coexistence
  ▶ 5B: clientChat Cloud Function + ClientChatbot.jsx
  ▶ 5C: Client onboarding flow
  ▶ 6:  createClientInSheet Cloud Function
  ▶ End-to-end test:
       public form → staff reviews → converts → client gets portal access →
       client views notes and assessment → client chats with AI →
       AI responds with clinical context, zero PII in transit
```

---

## 13. Files to Remove After Migration

> Do not delete until React replacements are live and tested.

- `public-mental-health-form.html` → replaced by `/intake` React route
- `Depression anxiety form.html` → replaced by `/client-form` React route
- `Mental health home page/` directory → evaluate before removing
- Old `clients/` Firestore collection → delete after migration to `clinicalRecords/`
- `form_submissions/` collection → migrate docs to `clinicalRecords/.../assessments/`
- `public_inquiries/` collection → rename/migrate to `publicLeads/`

---

## 14. Summary of HIPAA-Related Changes

| Item | Current State | Target State |
|---|---|---|
| Name in AI prompt | Yes — sent to OpenAI | Never — stripped before prompt |
| Email in AI prompt | Yes — sent to OpenAI | Never — stripped before prompt |
| Client name in Firestore document ID | Yes (`LastName_FirstName`) | Never — UUID only |
| PII and clinical data in same document | Yes | No — two separate collections |
| AI functions can access PII collection | Possible (no structural barrier) | No — structural separation via Firestore rules |
| Client can see their own data | No portal exists | Yes — `/my-portal` with scoped access |
| Client chatbot accesses PII | N/A | No — reads clinical data only, zero PII in AI context |
| OpenAI BAA | Not in place | Should be obtained before go-live |

---

*This document is a planning artifact. No code has been changed. Edit freely with
corrections, decisions, and questions before development begins.*
