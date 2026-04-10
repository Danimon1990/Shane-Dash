const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

const serviceAccount = require(path.join(__dirname, 'service-account.json'));
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

const DRY_RUN = !process.argv.includes('--execute');

// Build the same Firestore ID the dashboard now uses
function buildFirestoreId(firstName, lastName) {
  return `${lastName}_${firstName}`.replace(/\s+/g, '');
}

// Parse client name from new-format note ID: therapistName_firstName_lastName_timestamp
// The timestamp is always a 13-digit number at the end
function parseClientNameFromNoteId(noteId) {
  const parts = noteId.split('_');
  if (parts.length >= 4) {
    const lastPart = parts[parts.length - 1];
    const isTimestamp = /^\d{13}$/.test(lastPart);
    if (isTimestamp) {
      const lastName = parts[parts.length - 2];
      const firstName = parts[parts.length - 3];
      // Make sure these are actually names and not numbers
      if (firstName && lastName && !/^\d+$/.test(firstName) && !/^\d+$/.test(lastName)) {
        return { firstName, lastName };
      }
    }
  }
  return null;
}

async function migrateNotes() {
  console.log('='.repeat(60));
  if (DRY_RUN) {
    console.log('🔍 DRY RUN MODE — nothing will be written to Firestore');
    console.log('   Run with --execute to apply changes');
  } else {
    console.log('⚡ EXECUTE MODE — writing to Firestore');
  }
  console.log('='.repeat(60));

  // listDocuments() returns ALL refs including phantom (no-data) documents
  const allDocRefs = await db.collection('clients').listDocuments();

  // Only process numeric IDs
  const numericDocRefs = allDocRefs.filter(ref => /^\d+$/.test(ref.id));

  console.log(`\nTotal client documents (including phantoms): ${allDocRefs.length}`);
  console.log(`Numeric client documents to process: ${numericDocRefs.length}`);

  let totalNotes = 0;
  let migratedCount = 0;
  let skippedCount = 0;
  const report = [];

  for (const docRef of numericDocRefs) {
    const docSnap = await docRef.get();
    const docData = docSnap.data() || {};
    const isPhantom = Object.keys(docData).length === 0;

    const notesSnap = await docRef.collection('notes').get();
    if (notesSnap.empty) {
      console.log(`\n📁 Client ID: ${docRef.id} — no notes, skipping`);
      continue;
    }

    console.log(`\n📁 Client ID: ${docRef.id} (${notesSnap.size} note${notesSnap.size > 1 ? 's' : ''})`);
    if (isPhantom) {
      console.log(`   Type: phantom document (no data, only notes subcollection)`);
    } else {
      console.log(`   Type: document with data — firstName="${docData.firstName}", lastName="${docData.lastName}"`);
    }

    for (const noteDoc of notesSnap.docs) {
      totalNotes++;
      const noteData = noteDoc.data();
      const noteId = noteDoc.id;

      // Step 1: Try to get name from parent client document
      let firstName = null;
      let lastName = null;
      let nameSource = null;

      if (docData.firstName && docData.lastName) {
        firstName = docData.firstName;
        lastName = docData.lastName;
        nameSource = 'client document fields';
      }

      // Step 2: If no data on parent doc, parse the note ID
      if (!firstName || !lastName) {
        const parsed = parseClientNameFromNoteId(noteId);
        if (parsed) {
          firstName = parsed.firstName;
          lastName = parsed.lastName;
          nameSource = 'note ID parsing';
        }
      }

      // Step 3: If still unresolvable, log and skip
      if (!firstName || !lastName) {
        console.log(`   ⚠️  Note "${noteId}" — cannot determine client name, skipping`);
        console.log(`       therapistName: ${noteData.therapistName || 'N/A'}`);
        console.log(`       createdAt: ${noteData.createdAt || 'N/A'}`);
        skippedCount++;
        report.push({
          status: 'SKIPPED',
          numericClientId: docRef.id,
          noteId,
          reason: 'Cannot determine client name from document data or note ID format',
          noteData: {
            therapistName: noteData.therapistName,
            createdAt: noteData.createdAt,
            contentPreview: (noteData.content || '').substring(0, 60)
          }
        });
        continue;
      }

      const targetClientId = buildFirestoreId(firstName, lastName);
      const targetPath = `clients/${targetClientId}/notes/${noteId}`;

      console.log(`   📝 "${noteId}"`);
      console.log(`      Name source  : ${nameSource}`);
      console.log(`      Client name  : ${firstName} ${lastName}`);
      console.log(`      Target path  : ${targetPath}`);
      console.log(`      Therapist    : ${noteData.therapistName || 'N/A'}`);
      console.log(`      Created      : ${noteData.createdAt || 'N/A'}`);

      if (!DRY_RUN) {
        // Ensure the target client document exists with merged data
        const targetClientRef = db.collection('clients').doc(targetClientId);
        await targetClientRef.set({
          firstName,
          lastName,
          email: docData.email || '',
          phone: docData.phone || '',
          therapistId: docData.therapistId || '',
          status: docData.status || '',
          createdAt: docData.createdAt || new Date().toISOString(),
        }, { merge: true });

        // Copy the note to the correct path, preserving all original fields
        // and adding a migratedFrom marker so you can trace it
        const targetNoteRef = targetClientRef.collection('notes').doc(noteId);
        await targetNoteRef.set({
          ...noteData,
          clientId: targetClientId,
          migratedFrom: `clients/${docRef.id}/notes/${noteId}`,
        });

        console.log(`      ✅ Migrated`);
      } else {
        console.log(`      [DRY RUN] Would copy to ${targetPath}`);
      }

      migratedCount++;
      report.push({
        status: DRY_RUN ? 'WOULD_MIGRATE' : 'MIGRATED',
        numericClientId: docRef.id,
        noteId,
        targetClientId,
        targetPath,
        firstName,
        lastName,
        nameSource,
        therapistName: noteData.therapistName,
        createdAt: noteData.createdAt,
      });
    }
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 MIGRATION SUMMARY');
  console.log('='.repeat(60));
  console.log(`Notes found under numeric clients : ${totalNotes}`);
  console.log(`${DRY_RUN ? 'Would migrate' : 'Migrated'}             : ${migratedCount}`);
  console.log(`Skipped (unresolvable)            : ${skippedCount}`);
  console.log(`\n⚠️  Nothing was deleted. All original numeric documents are untouched.`);

  if (skippedCount > 0) {
    console.log(`\n⚠️  ${skippedCount} note(s) could not be resolved. Check migration-report.json for details.`);
  }

  if (DRY_RUN && migratedCount > 0) {
    console.log(`\n✅ Dry run complete. Run with --execute to apply the migration.`);
  } else if (!DRY_RUN) {
    console.log(`\n✅ Migration complete. Verify in Firebase, then delete numeric documents manually.`);
  }

  // Save full report to JSON
  const reportPath = path.join(__dirname, 'migration-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`📄 Full report saved to: ${reportPath}`);

  process.exit(0);
}

migrateNotes().catch(err => {
  console.error('Migration error:', err);
  process.exit(1);
});
