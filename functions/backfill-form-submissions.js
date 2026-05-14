/**
 * Backfill form_submissions with uid + clinicalId, and copy assessments to clinicalRecords.
 *
 * For each form_submission that has an email but no uid:
 *   1. Look up users collection by email
 *   2. Write uid + clinicalId back to form_submissions doc
 *   3. Copy de-identified assessment + aiAnalysis to clinicalRecords/{clinicalId}/assessments/{formId}
 *
 * Usage:
 *   node backfill-form-submissions.js           # dry run — shows what would happen
 *   node backfill-form-submissions.js --execute  # writes to Firestore
 */

const admin = require('firebase-admin');
const path = require('path');

const serviceAccount = require(path.join(__dirname, 'service-account.json'));
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

const DRY_RUN = !process.argv.includes('--execute');

async function backfillFormSubmissions() {
  console.log('='.repeat(60));
  if (DRY_RUN) {
    console.log('🔍 DRY RUN MODE — nothing will be written to Firestore');
    console.log('   Run with --execute to apply changes');
  } else {
    console.log('✏️  EXECUTE MODE — writing to Firestore');
  }
  console.log('='.repeat(60));

  // Fetch all form_submissions that have no uid yet
  const submissionsSnap = await db.collection('form_submissions').get();
  console.log(`\nFound ${submissionsSnap.size} total form submissions`);

  const toProcess = submissionsSnap.docs.filter(d => !d.data().uid);
  const alreadyLinked = submissionsSnap.size - toProcess.length;
  console.log(`  ${alreadyLinked} already have uid — skipping`);
  console.log(`  ${toProcess.length} need linking\n`);

  // Build email → { uid, clinicalId } lookup map from users collection
  console.log('Loading users collection for email lookup...');
  const usersSnap = await db.collection('users').get();
  const emailMap = {};
  usersSnap.forEach(doc => {
    const email = doc.data().email;
    if (email) {
      emailMap[email.toLowerCase().trim()] = {
        uid: doc.id,
        clinicalId: doc.data().clinicalId || null
      };
    }
  });
  console.log(`  Loaded ${Object.keys(emailMap).length} users with email addresses\n`);

  let linked = 0;
  let noMatch = 0;
  let noEmail = 0;
  let assessmentsCopied = 0;
  let errors = 0;

  for (const docSnap of toProcess) {
    const formId = docSnap.id;
    const data = docSnap.data();
    const email = data.email ? data.email.toLowerCase().trim() : null;

    if (!email) {
      console.log(`  ⚠️  [${formId}] No email — skipping`);
      noEmail++;
      continue;
    }

    const match = emailMap[email];
    if (!match) {
      console.log(`  ❌ [${formId}] No user found for email: ${email}`);
      noMatch++;
      continue;
    }

    const { uid, clinicalId } = match;
    console.log(`  ✅ [${formId}] ${email} → uid=${uid} clinicalId=${clinicalId || 'none'}`);

    if (!DRY_RUN) {
      try {
        // Step 1: Write uid + clinicalId back to form_submissions
        await db.collection('form_submissions').doc(formId).update({
          uid,
          clinicalId: clinicalId || null,
          linkedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        linked++;

        // Step 2: Copy assessment to clinicalRecords if clinicalId exists
        if (clinicalId) {
          const assessmentData = {
            formId,
            submittedAt: data.submittedAt || data.timestamp || null,
            age: data.age || '',
            maritalStatus: data.maritalStatus || '',
            previousDiagnosis: data.previousDiagnosis || '',
            medicalCondition: data.medicalCondition || '',
            additionalInfo: data.additionalInfo || '',
            selectedCheckboxes: data.selectedCheckboxes || {},
            backlfilledAt: admin.firestore.FieldValue.serverTimestamp()
          };

          // Include AI analysis if it was already run
          if (data.aiAnalysis) {
            assessmentData.aiAnalysis = data.aiAnalysis;
            assessmentData.analysisTimestamp = data.analysisTimestamp || null;
          }

          await db.collection('clinicalRecords')
            .doc(clinicalId)
            .collection('assessments')
            .doc(formId)
            .set(assessmentData);

          assessmentsCopied++;
          console.log(`     📋 Assessment copied to clinicalRecords/${clinicalId}/assessments/${formId}`);
        } else {
          console.log(`     ⚠️  No clinicalId for uid=${uid} — form linked but assessment not copied`);
        }
      } catch (err) {
        console.error(`     ❌ Error processing ${formId}:`, err.message);
        errors++;
      }
    } else {
      linked++;
      if (clinicalId) assessmentsCopied++;
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('SUMMARY');
  console.log('='.repeat(60));
  console.log(`  Total submissions:       ${submissionsSnap.size}`);
  console.log(`  Already linked:          ${alreadyLinked}`);
  console.log(`  Newly linked:            ${linked}`);
  console.log(`  No email (skipped):      ${noEmail}`);
  console.log(`  No matching user:        ${noMatch}`);
  console.log(`  Assessments copied:      ${assessmentsCopied}`);
  if (errors > 0) console.log(`  Errors:                  ${errors}`);
  if (DRY_RUN) {
    console.log('\n  ⚠️  DRY RUN — no changes written.');
    console.log('  Run with --execute to apply.');
  } else {
    console.log('\n  ✅ Done.');
  }
}

backfillFormSubmissions().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
