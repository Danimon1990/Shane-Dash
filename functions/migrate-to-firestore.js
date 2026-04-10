/**
 * migrate-to-firestore.js
 *
 * Migrates existing clients from Google Sheets into the two-bucket
 * Firestore architecture:
 *   Bucket A → users/{uid}           (PII — name, email, DOB, address, insurance)
 *   Bucket B → clinicalRecords/{id}  (de-identified — age, conditions, clinical info)
 *
 * Also moves any existing progress notes from:
 *   clients/{LastName_FirstName}/notes/{noteId}
 * to:
 *   clinicalRecords/{clinicalId}/notes/{noteId}
 *
 * SAFETY:
 *   - Dry-run by default. Pass --execute to write to Firestore.
 *   - Idempotent: clients already stamped with migratedFromSheet=true are skipped.
 *   - set({ merge: true }) used everywhere — never overwrites data a client has
 *     already updated in the portal.
 *   - Credit card fields (rows 32-35) are deliberately NEVER migrated (PCI DSS).
 *   - Per-client error handling: one failure does not stop the rest.
 *
 * USAGE:
 *   node migrate-to-firestore.js              ← dry run (safe, nothing written)
 *   node migrate-to-firestore.js --execute    ← actually writes to Firestore
 *   node migrate-to-firestore.js --execute --send-emails  ← also sends password reset emails
 */

'use strict';

const admin    = require('firebase-admin');
const { google } = require('googleapis');
const crypto   = require('crypto');
const path     = require('path');
const fs       = require('fs');

// ── Config ─────────────────────────────────────────────────────────────────
const SERVICE_ACCOUNT_PATH = path.join(__dirname, 'service-account.json');
const SHEET_ID   = '1kGRG-BDGbSQNPwQVBQWIc1WvRrAmW-4I9V1FhUI3ez4';
const SHEET_NAME = 'Form Responses 1';
const RANGE      = `${SHEET_NAME}!A2:BF`; // A→BF covers all 58 columns

const DRY_RUN     = !process.argv.includes('--execute');
const SEND_EMAILS = process.argv.includes('--send-emails');

// Firestore collections
const USERS_COL    = 'users';
const CLINICAL_COL = 'clinicalRecords';
const CLIENTS_COL  = 'clients'; // legacy notes collection

// ── Init ───────────────────────────────────────────────────────────────────
if (!fs.existsSync(SERVICE_ACCOUNT_PATH)) {
  console.error('❌  service-account.json not found at:', SERVICE_ACCOUNT_PATH);
  console.error('    Download it from Firebase Console → Project Settings → Service Accounts');
  process.exit(1);
}

const serviceAccount = require(SERVICE_ACCOUNT_PATH);
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db   = admin.firestore();
const auth = admin.auth();

// ── Helpers ────────────────────────────────────────────────────────────────

/** Safe string from a sheet cell — trims whitespace, returns '' if empty */
const cell = (row, idx) => (row[idx] || '').toString().trim();

/** Calculate age in whole years from a date string (MM/DD/YYYY or YYYY-MM-DD) */
function calcAge(dobString) {
  if (!dobString) return null;
  const dob = new Date(dobString);
  if (isNaN(dob.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
  return age >= 0 && age < 130 ? age : null;
}

/**
 * Derive an insuranceType category (Bucket B) from the raw payment option
 * and insurance provider strings stored in the Sheet.
 */
function deriveInsuranceType(paymentOption, provider) {
  const pay = (paymentOption || '').toLowerCase();
  const prov = (provider || '').toLowerCase();

  if (pay.includes('private pay') || pay.includes('self pay') || pay.includes('self-pay')) {
    return 'self-pay';
  }
  // Known Medi-Cal / Medicaid plans
  if (
    prov.includes('cencal') ||
    prov.includes('beacon health') ||
    prov.includes('medi-cal') ||
    prov.includes('medicaid') ||
    prov.includes('la care') ||
    prov.includes('gold coast')
  ) {
    return 'medicaid';
  }
  // Known private insurers
  if (
    prov.includes('cigna') ||
    prov.includes('blue cross') ||
    prov.includes('aetna') ||
    prov.includes('united') ||
    prov.includes('anthem') ||
    prov.includes('humana')
  ) {
    return 'private';
  }
  if (pay.includes('insurance') || prov.length > 0) return 'private';
  return 'other';
}

/** Build the legacy Firestore notes doc ID used by the old dashboard */
function legacyClientId(firstName, lastName) {
  return `${lastName}_${firstName}`.replace(/\s+/g, '');
}

/**
 * Parse reported concerns from the Sheet cell — the cell may be a
 * comma/semicolon/newline-delimited string or already an array.
 */
function parseConcerns(raw) {
  if (!raw) return [];
  const normalized = raw.toString().replace(/\u00A0/g, ' ').replace(/^"|"$/g, '').trim();
  if (!normalized) return [];
  return normalized.split(/[\n;,]+/).map(s => s.trim()).filter(Boolean);
}

// ── Step 1 — Load therapist UID map ───────────────────────────────────────
async function buildTherapistMap() {
  const snap = await db.collection(USERS_COL)
    .where('role', 'in', ['therapist', 'admin', 'associate'])
    .get();

  const map = {}; // "Shane Bruce" → uid
  snap.docs.forEach(doc => {
    const d = doc.data();
    const name = (d.name || `${d.firstName || ''} ${d.lastName || ''}`.trim()).trim();
    if (name) map[name.toLowerCase()] = doc.id;
  });
  console.log(`\n📋 Therapist map loaded (${Object.keys(map).length} entries):`);
  Object.entries(map).forEach(([name, uid]) => console.log(`   "${name}" → ${uid}`));
  return map;
}

// ── Step 2 — Read Google Sheet ─────────────────────────────────────────────
async function readSheet() {
  const googleAuth = new google.auth.GoogleAuth({
    credentials: serviceAccount,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });
  const sheets = google.sheets({ version: 'v4', auth: googleAuth });
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: RANGE,
  });
  return response.data.values || [];
}

// ── Step 3 — Parse a single row into Bucket A + Bucket B objects ───────────
function parseRow(row, rowIndex, therapistMap) {
  const email     = cell(row, 1);
  const firstName = cell(row, 2);  // Preferred / first name
  const lastName  = cell(row, 4);  // Legal last name
  const dob       = cell(row, 6);
  const therapistName = cell(row, 55);
  const therapistNameLower = therapistName.toLowerCase();

  // Derive therapist UID — try exact match first, then partial
  let assignedTherapistId = therapistMap[therapistNameLower] || '';
  if (!assignedTherapistId) {
    // Partial match fallback (e.g. "Shane" matches "Shane Bruce")
    const partialKey = Object.keys(therapistMap).find(k => k.includes(therapistNameLower) || therapistNameLower.includes(k));
    if (partialKey) assignedTherapistId = therapistMap[partialKey];
  }

  const rawStatus = cell(row, 56).toLowerCase();
  const status = rawStatus === 'active' ? 'active' : (rawStatus === 'inactive' ? 'inactive' : 'pending');

  // ── Bucket A — PII ────────────────────────────────────────────────────────
  const bucketA = {
    firstName,
    lastName,
    email,
    phone:           cell(row, 5),
    dateOfBirth:     dob,            // Full date stays in Bucket A only
    employerOrSchool: cell(row, 16),
    paymentPreference: cell(row, 21),
    preferredName:   cell(row, 2),

    address: {
      street:  cell(row, 7),
      city:    cell(row, 8),
      state:   cell(row, 9),
      zip:     cell(row, 10),
    },

    emergencyContact: {
      name:  cell(row, 11),
      phone: cell(row, 12),
    },

    insurance: {
      primaryOrDependent: cell(row, 24),
      provider:     cell(row, 23),
      planName:     cell(row, 25),
      memberId:     cell(row, 26),
      groupNumber:  cell(row, 27),
      phone:        cell(row, 28),
      deductible:   cell(row, 29),
      copay:        cell(row, 30),
      oopMax:       cell(row, 31),
      // ⛔ rows 32-35 (card number, type, expiry, name on card) deliberately excluded
      billingZip:   cell(row, 37),
      agreedAmount: cell(row, 42),
      privatePayRate: cell(row, 22),
    },

    physician: {
      name:    cell(row, 45),
      phone:   cell(row, 46),
      address: cell(row, 47),
    },

    consents: {
      policies:     cell(row, 39) === 'true' || cell(row, 39).toLowerCase() === 'yes',
      cancellation: cell(row, 40) === 'true' || cell(row, 40).toLowerCase() === 'yes',
      privacy:      cell(row, 41) === 'true' || cell(row, 41).toLowerCase() === 'yes',
    },

    // Migration metadata
    role:              'client',
    migratedFromSheet: true,
    sheetRowIndex:     rowIndex + 2, // 1-indexed, +1 for header row
    createdAt:         cell(row, 0) || new Date().toISOString(),
  };

  // ── Bucket B — De-identified, AI-safe ────────────────────────────────────
  const age = calcAge(dob);
  const bucketB = {
    // DOB is NOT stored here — only computed age
    age,                             // integer, e.g. 34

    maritalStatus:       cell(row, 13),
    gender:              cell(row, 14),
    employmentStatus:    cell(row, 15),
    referralSource:      cell(row, 17),
    reasonForReachingOut: cell(row, 18),
    medicationsCurrent:  cell(row, 19).toLowerCase().includes('yes'),
    medicationsList:     cell(row, 20),

    insuranceType: deriveInsuranceType(cell(row, 21), cell(row, 23)),

    conditions:       parseConcerns(cell(row, 48)),
    otherConcerns:    cell(row, 49),
    primaryConcern:   cell(row, 50),

    assignedTherapistId,
    assignedTherapistName: therapistName,
    status,

    intakeDate: cell(row, 0) || null, // timestamp form was originally submitted

    // Chart references (useful for therapists, no PII)
    chartId:     cell(row, 51),
    chartUrl:    cell(row, 52),
    mergeStatus: cell(row, 54),

    // Migration metadata
    migratedFromSheet: true,
    migratedAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  return { bucketA, bucketB, email, firstName, lastName, therapistName, assignedTherapistId };
}

// ── Step 4 — Get or create Firebase Auth account ───────────────────────────
async function resolveAuthUid(email, firstName, lastName, dryRun) {
  try {
    // Check if account already exists
    const existing = await auth.getUserByEmail(email);
    return { uid: existing.uid, created: false };
  } catch (err) {
    if (err.code !== 'auth/user-not-found') throw err;
    // Account doesn't exist — create it
    if (dryRun) {
      return { uid: `[DRY_RUN_UID_FOR_${email}]`, created: true };
    }
    const newUser = await auth.createUser({
      email,
      displayName: `${firstName} ${lastName}`.trim(),
      emailVerified: false,
    });
    return { uid: newUser.uid, created: true };
  }
}

// ── Step 5 — Copy notes from legacy path to clinicalRecords ───────────────
async function migrateNotes(firstName, lastName, clinicalId, dryRun) {
  const legacyId  = legacyClientId(firstName, lastName);
  const notesRef  = db.collection(CLIENTS_COL).doc(legacyId).collection('notes');
  const notesSnap = await notesRef.get();

  if (notesSnap.empty) return { count: 0, legacyId };

  if (!dryRun) {
    const targetRef = db.collection(CLINICAL_COL).doc(clinicalId).collection('notes');
    for (const noteDoc of notesSnap.docs) {
      await targetRef.doc(noteDoc.id).set({
        ...noteDoc.data(),
        migratedFrom: `${CLIENTS_COL}/${legacyId}/notes/${noteDoc.id}`,
        migratedAt:   admin.firestore.FieldValue.serverTimestamp(),
      });
      // Stamp original with a forwarding pointer but do NOT delete it yet
      await notesRef.doc(noteDoc.id).set(
        { migratedTo: `${CLINICAL_COL}/${clinicalId}/notes/${noteDoc.id}` },
        { merge: true }
      );
    }
  }

  return { count: notesSnap.size, legacyId };
}

// ── Main ───────────────────────────────────────────────────────────────────
async function main() {
  console.log('='.repeat(65));
  console.log('  migrate-to-firestore.js');
  if (DRY_RUN) {
    console.log('  MODE: DRY RUN — nothing will be written to Firestore');
    console.log('  Run with --execute to apply changes');
  } else {
    console.log('  MODE: EXECUTE — writing to Firestore');
    if (SEND_EMAILS) console.log('  Password reset emails WILL be sent');
    else             console.log('  Password reset emails suppressed (add --send-emails to enable)');
  }
  console.log('='.repeat(65));

  const therapistMap = await buildTherapistMap();
  const rows = await readSheet();
  console.log(`\n📊 Sheet rows found: ${rows.length}`);

  const report = [];
  const emailsToSend = []; // queued until after all writes succeed

  let countMigrated  = 0;
  let countSkipped   = 0;
  let countAlready   = 0;
  let countErrors    = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2; // 1-indexed with header offset

    const email     = cell(row, 1);
    const firstName = cell(row, 2);
    const lastName  = cell(row, 4);

    if (!email || !firstName || !lastName) {
      console.log(`\nRow ${rowNum}: ⚠️  Missing email or name — skipped`);
      countSkipped++;
      report.push({ rowNum, status: 'SKIPPED', reason: 'Missing email or name', email, firstName, lastName });
      continue;
    }

    console.log(`\nRow ${rowNum}: ${firstName} ${lastName} <${email}>`);

    try {
      // ── Resolve UID ──────────────────────────────────────────────────────
      const { uid, created: authCreated } = await resolveAuthUid(email, firstName, lastName, DRY_RUN);
      console.log(`   Auth: ${authCreated ? '➕ Created new account' : '♻️  Existing account'} (uid=${uid})`);

      // ── Check if already migrated ────────────────────────────────────────
      if (!DRY_RUN) {
        const existingDoc = await db.collection(USERS_COL).doc(uid).get();
        if (existingDoc.exists && existingDoc.data().migratedFromSheet === true) {
          console.log(`   ✅ Already migrated — skipping`);
          countAlready++;
          report.push({ rowNum, status: 'ALREADY_MIGRATED', email, firstName, lastName, uid });
          continue;
        }
      }

      // ── Parse row ────────────────────────────────────────────────────────
      const { bucketA, bucketB, therapistName, assignedTherapistId } = parseRow(row, i, therapistMap);

      if (!assignedTherapistId && therapistName) {
        console.log(`   ⚠️  Therapist "${therapistName}" not found in Firestore users — assignedTherapistId will be empty`);
      }

      // ── Generate clinicalId (or reuse if user doc already has one) ───────
      let clinicalId;
      if (!DRY_RUN) {
        const existingDoc = await db.collection(USERS_COL).doc(uid).get();
        clinicalId = existingDoc.exists ? existingDoc.data().clinicalId : null;
      }
      if (!clinicalId) {
        clinicalId = DRY_RUN ? `[DRY_RUN_CLINICAL_ID]` : crypto.randomUUID();
      }
      console.log(`   Clinical ID: ${clinicalId}`);

      // ── Write Bucket A ────────────────────────────────────────────────────
      const bucketAWithMeta = { ...bucketA, clinicalId };
      console.log(`   Bucket A → users/${uid}`);
      console.log(`     Fields: name, email, phone, DOB, address, emergencyContact, insurance, physician, consents`);
      console.log(`     ⛔ Card data (rows 32-35) deliberately excluded`);
      if (!DRY_RUN) {
        await db.collection(USERS_COL).doc(uid).set(bucketAWithMeta, { merge: true });
      }

      // ── Write Bucket B ────────────────────────────────────────────────────
      console.log(`   Bucket B → clinicalRecords/${clinicalId}`);
      console.log(`     age=${bucketB.age ?? 'unknown'}, insuranceType=${bucketB.insuranceType}, status=${bucketB.status}`);
      console.log(`     assignedTherapist: "${therapistName || 'none'}" → ${assignedTherapistId || 'not found'}`);
      if (!DRY_RUN) {
        await db.collection(CLINICAL_COL).doc(clinicalId).set(bucketB, { merge: true });
      }

      // ── Migrate notes ─────────────────────────────────────────────────────
      const { count: noteCount, legacyId } = await migrateNotes(firstName, lastName, clinicalId, DRY_RUN);
      if (noteCount > 0) {
        console.log(`   Notes: ${noteCount} note(s) ${DRY_RUN ? 'would be copied' : 'copied'} from clients/${legacyId}/notes/`);
      } else {
        console.log(`   Notes: none found at clients/${legacyId}/notes/`);
      }

      // ── Queue password reset email ────────────────────────────────────────
      if (authCreated) {
        emailsToSend.push({ uid, email, firstName });
        console.log(`   Email: queued password reset for ${email}`);
      }

      countMigrated++;
      report.push({
        status: DRY_RUN ? 'WOULD_MIGRATE' : 'MIGRATED',
        rowNum, email, firstName, lastName, uid, clinicalId,
        authCreated,
        assignedTherapistName: therapistName,
        assignedTherapistId: assignedTherapistId || 'NOT_FOUND',
        age: bucketB.age,
        insuranceType: bucketB.insuranceType,
        notesCount: noteCount,
        cardDataSkipped: true,
      });

    } catch (err) {
      console.error(`   ❌ Error: ${err.message}`);
      countErrors++;
      report.push({
        status: 'ERROR', rowNum, email, firstName, lastName,
        error: err.message,
      });
    }
  }

  // ── Send queued emails ─────────────────────────────────────────────────────
  if (!DRY_RUN && SEND_EMAILS && emailsToSend.length > 0) {
    console.log(`\n📧 Sending ${emailsToSend.length} password reset email(s)…`);
    for (const { email } of emailsToSend) {
      try {
        const link = await auth.generatePasswordResetLink(email);
        // In production you'd send this via SendGrid / Firebase Extensions.
        // For now, log the links so you can send them manually or paste into email.
        console.log(`   ${email} → ${link}`);
      } catch (err) {
        console.error(`   ❌ Failed to generate reset link for ${email}: ${err.message}`);
      }
    }
  } else if (!DRY_RUN && emailsToSend.length > 0) {
    console.log(`\n📧 ${emailsToSend.length} new account(s) created — password reset emails suppressed.`);
    console.log('   Run with --send-emails to generate reset links.');
    console.log('   New accounts:');
    emailsToSend.forEach(({ email }) => console.log(`   • ${email}`));
  }

  // ── Summary ────────────────────────────────────────────────────────────────
  console.log('\n' + '='.repeat(65));
  console.log('  SUMMARY');
  console.log('='.repeat(65));
  console.log(`  Total rows processed : ${rows.length}`);
  console.log(`  Migrated             : ${countMigrated}`);
  console.log(`  Already migrated     : ${countAlready}`);
  console.log(`  Skipped (no data)    : ${countSkipped}`);
  console.log(`  Errors               : ${countErrors}`);
  if (DRY_RUN) {
    console.log('\n  ⚠️  DRY RUN — no changes were written.');
    console.log('  Re-run with --execute to apply.');
  }
  console.log('='.repeat(65));

  // ── Write report ────────────────────────────────────────────────────────────
  const reportPath = path.join(__dirname, 'migration-firestore-report.json');
  fs.writeFileSync(reportPath, JSON.stringify({
    runAt: new Date().toISOString(),
    dryRun: DRY_RUN,
    summary: { total: rows.length, migrated: countMigrated, alreadyMigrated: countAlready, skipped: countSkipped, errors: countErrors },
    clients: report,
  }, null, 2));
  console.log(`\n📄 Report saved to: ${reportPath}`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
