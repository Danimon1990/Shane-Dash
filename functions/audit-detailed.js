const admin = require('firebase-admin');
const path = require('path');

// Initialize Firebase Admin with service account
const serviceAccount = require(path.join(__dirname, 'service-account.json'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function detailedAudit() {
  console.log('🔍 Detailed Firebase Audit\n');
  console.log('='.repeat(60));

  const clientsRef = db.collection('clients');
  const clientsSnapshot = await clientsRef.get();

  console.log(`Found ${clientsSnapshot.size} clients in "clients" collection\n`);

  let totalNotes = 0;

  for (const clientDoc of clientsSnapshot.docs) {
    const clientId = clientDoc.id;
    const clientData = clientDoc.data();

    // Get notes subcollection
    const notesRef = clientDoc.ref.collection('notes');
    const notesSnapshot = await notesRef.get();

    console.log(`\n📁 Client ID: ${clientId}`);
    console.log(`   Document data keys: ${Object.keys(clientData).join(', ') || '(empty document)'}`);

    if (clientData.name) {
      console.log(`   Name field: ${clientData.name}`);
    }
    if (clientData.data?.firstName || clientData.data?.lastName) {
      console.log(`   data.firstName/lastName: ${clientData.data?.firstName} ${clientData.data?.lastName}`);
    }

    console.log(`   Notes count: ${notesSnapshot.size}`);

    if (!notesSnapshot.empty) {
      totalNotes += notesSnapshot.size;
      console.log('   Notes:');

      notesSnapshot.forEach(noteDoc => {
        const noteData = noteDoc.data();
        console.log(`      - ID: ${noteDoc.id}`);
        console.log(`        therapistName: ${noteData.therapistName || 'N/A'}`);
        console.log(`        clientId in note: ${noteData.clientId || 'N/A'}`);
        console.log(`        createdAt: ${noteData.createdAt || 'N/A'}`);
        console.log(`        content preview: ${(noteData.content || '').substring(0, 40)}...`);
      });
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log(`📊 TOTAL: ${clientsSnapshot.size} clients, ${totalNotes} notes`);
  console.log('='.repeat(60));

  process.exit(0);
}

detailedAudit().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
