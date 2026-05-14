/**
 * fix-missing-clinical-ids.js
 *
 * Finds all users with role === 'client' but no clinicalId, then:
 *   1. Generates a new UUID as the clinicalId
 *   2. Writes it back to users/{uid}
 *   3. Creates the matching clinicalRecords/{clinicalId} document
 *
 * This is exactly what the onClientUserCreated trigger does at signup —
 * this script is for accounts that slipped through before the trigger fired.
 *
 * Usage:
 *   node fix-missing-clinical-ids.js           # dry run — shows what would happen
 *   node fix-missing-clinical-ids.js --execute  # writes to Firestore
 */

const admin = require('firebase-admin');
const { randomUUID } = require('crypto');
const path = require('path');

const serviceAccount = require(path.join(__dirname, 'service-account.json'));
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

const DRY_RUN = !process.argv.includes('--execute');

async function fixMissingClinicalIds() {
  console.log('='.repeat(60));
  if (DRY_RUN) {
    console.log('🔍 DRY RUN — nothing will be written');
    console.log('   Run with --execute to apply changes');
  } else {
    console.log('✏️  EXECUTE MODE — writing to Firestore');
  }
  console.log('='.repeat(60));

  // Find all client accounts with no clinicalId
  const snapshot = await db.collection('users')
    .where('role', '==', 'client')
    .get();

  const broken = snapshot.docs.filter(d => !d.data().clinicalId);

  if (broken.length === 0) {
    console.log('✅ No broken client accounts found — nothing to do.');
    process.exit(0);
  }

  console.log(`\nFound ${broken.length} client(s) missing a clinicalId:\n`);

  for (const userDoc of broken) {
    const uid = userDoc.id;
    const data = userDoc.data();
    const clinicalId = randomUUID();

    console.log(`  👤 ${data.firstName || ''} ${data.lastName || ''} (${data.email})`);
    console.log(`     uid:        ${uid}`);
    console.log(`     clinicalId: ${clinicalId} (new)`);

    if (!DRY_RUN) {
      const batch = db.batch();

      // Write clinicalId back to the user document
      batch.update(db.collection('users').doc(uid), { clinicalId });

      // Create the matching clinical record (Bucket B)
      batch.set(db.collection('clinicalRecords').doc(clinicalId), {
        assignedTherapistId: '',
        assignedTherapistName: '',
        status: 'pending',
        intakeDate: null,
        insuranceType: '',
        conditions: [],
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      await batch.commit();
      console.log(`     ✅ Fixed`);
    } else {
      console.log(`     ⏭️  (dry run — skipped)`);
    }

    console.log();
  }

  if (DRY_RUN) {
    console.log('Run with --execute to apply the changes above.');
  } else {
    console.log(`✅ Done — fixed ${broken.length} account(s).`);
  }
}

fixMissingClinicalIds().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
