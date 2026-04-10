const admin = require('firebase-admin');
const path = require('path');

// Initialize Firebase Admin with service account
const serviceAccount = require(path.join(__dirname, 'service-account.json'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function auditNotes() {
  console.log('🔍 Starting notes audit...\n');

  const issues = [];
  const clientsRef = db.collection('clients');
  const clientsSnapshot = await clientsRef.get();

  console.log(`Found ${clientsSnapshot.size} clients in Firestore\n`);

  for (const clientDoc of clientsSnapshot.docs) {
    const clientId = clientDoc.id;
    const clientData = clientDoc.data();
    const clientName = clientData.name || `${clientData.data?.firstName || ''} ${clientData.data?.lastName || ''}`.trim();

    // Get all notes for this client
    const notesRef = clientDoc.ref.collection('notes');
    const notesSnapshot = await notesRef.get();

    if (notesSnapshot.empty) continue;

    console.log(`📁 Client "${clientName}" (ID: ${clientId}) - ${notesSnapshot.size} notes`);

    for (const noteDoc of notesSnapshot.docs) {
      const noteId = noteDoc.id;
      const noteData = noteDoc.data();

      // Check 1: Does the note's clientId match the collection path?
      const noteClientId = noteData.clientId;
      if (noteClientId && String(noteClientId) !== String(clientId)) {
        issues.push({
          type: 'CLIENT_ID_MISMATCH',
          clientId,
          clientName,
          noteId,
          noteClientId,
          therapistName: noteData.therapistName,
          createdAt: noteData.createdAt,
          contentPreview: noteData.content?.substring(0, 50) + '...'
        });
        console.log(`   ⚠️  Note "${noteId}" has clientId="${noteClientId}" but is stored under client "${clientId}"`);
      }

      // Check 2: Does the client name in noteId match the actual client?
      // NoteId format: "therapistName_clientFirstName_clientLastName_timestamp"
      const noteIdParts = noteId.split('_');
      if (noteIdParts.length >= 4) {
        const noteClientFirstName = noteIdParts[1];
        const noteClientLastName = noteIdParts[2];
        const noteClientNameFromId = `${noteClientFirstName} ${noteClientLastName}`.toLowerCase();
        const actualClientName = clientName.toLowerCase();

        // Check if the names match (allowing for some flexibility)
        if (!actualClientName.includes(noteClientFirstName.toLowerCase()) &&
            !actualClientName.includes(noteClientLastName.toLowerCase())) {
          issues.push({
            type: 'NAME_MISMATCH',
            clientId,
            clientName,
            noteId,
            noteClientNameFromId: `${noteClientFirstName} ${noteClientLastName}`,
            therapistName: noteData.therapistName,
            createdAt: noteData.createdAt,
            contentPreview: noteData.content?.substring(0, 50) + '...'
          });
          console.log(`   ⚠️  Note "${noteId}" appears to be for "${noteClientFirstName} ${noteClientLastName}" but is under "${clientName}"`);
        }
      }
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('📊 AUDIT SUMMARY');
  console.log('='.repeat(60));

  if (issues.length === 0) {
    console.log('✅ No issues found! All notes appear to be in the correct location.');
  } else {
    console.log(`\n⚠️  Found ${issues.length} potential issues:\n`);

    issues.forEach((issue, index) => {
      console.log(`${index + 1}. ${issue.type}`);
      console.log(`   Current location: clients/${issue.clientId} (${issue.clientName})`);
      console.log(`   Note ID: ${issue.noteId}`);
      if (issue.noteClientId) {
        console.log(`   Note's clientId field: ${issue.noteClientId}`);
      }
      if (issue.noteClientNameFromId) {
        console.log(`   Name in note ID: ${issue.noteClientNameFromId}`);
      }
      console.log(`   Therapist: ${issue.therapistName}`);
      console.log(`   Created: ${issue.createdAt}`);
      console.log(`   Content: ${issue.contentPreview}`);
      console.log('');
    });

    // Save issues to a JSON file for reference
    const fs = require('fs');
    const outputPath = path.join(__dirname, 'audit-results.json');
    fs.writeFileSync(outputPath, JSON.stringify(issues, null, 2));
    console.log(`📄 Full results saved to: ${outputPath}`);
  }

  console.log('\n✅ Audit complete!');
  process.exit(0);
}

auditNotes().catch(err => {
  console.error('Error running audit:', err);
  process.exit(1);
});
