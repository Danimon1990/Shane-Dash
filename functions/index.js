const { onRequest } = require("firebase-functions/v2/https");
const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { google } = require("googleapis");
const admin = require("firebase-admin");
const cors = require("cors")({
  origin: [
    'http://localhost:3000',
    'http://localhost:3001',
    'https://therapist-online.web.app',
    'https://therapist-online.firebaseapp.com'
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: true,
});

// Initialize Firebase Admin SDK
admin.initializeApp();

// --- Configuration (Consider moving to environment variables later) ---
const SHEET_ID = '1kGRG-BDGbSQNPwQVBQWIc1WvRrAmW-4I9V1FhUI3ez4';
const SHEET_NAME = 'Form Responses 1';
const LAST_COLUMN_LETTER = 'BE'; // Updated to include all columns
const RANGE = `${SHEET_NAME}!A2:${LAST_COLUMN_LETTER}`;
// --- End Configuration ---

// Token validation middleware
const validateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error('No valid authorization header');
      return res.status(401).json({ error: 'No valid authorization header' });
    }

    const token = authHeader.split('Bearer ')[1];
    
    if (!token) {
      console.error('No token provided');
      return res.status(401).json({ error: 'No token provided' });
    }

    try {
      // Verify the Firebase ID token
      const decodedToken = await admin.auth().verifyIdToken(token);
      console.log('Token verified for user:', decodedToken.uid);
      
      // Add user info to request
      req.user = {
        uid: decodedToken.uid,
        email: decodedToken.email,
        emailVerified: decodedToken.email_verified
      };
      
      // Call next middleware
      if (typeof next === 'function') {
        next();
      }
    } catch (tokenError) {
      console.error('Token verification failed:', tokenError);
      return res.status(401).json({ error: 'Invalid token' });
    }
  } catch (error) {
    console.error('Token validation error:', error);
    return res.status(500).json({ error: 'Token validation failed' });
  }
};

// Role-based access control middleware
const requireRole = (requiredRoles) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      // Get user data from Firestore to check role
      const userDoc = await admin.firestore().collection('users').doc(req.user.uid).get();
      
      if (!userDoc.exists) {
        return res.status(403).json({ error: 'User profile not found' });
      }

      const userData = userDoc.data();
      const userRole = userData.role || 'therapist'; // Default to therapist

      if (!requiredRoles.includes(userRole)) {
        console.error(`User ${req.user.uid} with role ${userRole} attempted to access restricted endpoint`);
        return res.status(403).json({ error: 'Insufficient permissions' });
      }

      req.userRole = userRole;
      next();
    } catch (error) {
      console.error('Role validation error:', error);
      return res.status(500).json({ error: 'Role validation failed' });
    }
  };
};

// Helper function to handle CORS and middleware
const withAuth = (handler, requiredRoles = []) => {
  return (req, res) => {
    cors(req, res, async () => {
      try {
        // Apply authentication middleware
        await validateToken(req, res, async () => {
          // Apply role-based access control if roles specified
          if (requiredRoles.length > 0) {
            await requireRole(requiredRoles)(req, res, async () => {
              await handler(req, res);
            });
          } else {
            await handler(req, res);
          }
        });
      } catch (error) {
        console.error('Middleware error:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    });
  };
};

// Robust name matching utility
const normalizeTherapistName = (name) => {
  if (!name) return '';
  return name.toLowerCase().trim().replace(/[^\w\s]/g, '').replace(/\s+/g, ' ');
};

const isTherapistMatch = (therapistNameFromSheet, currentUserName) => {
  if (!therapistNameFromSheet || !currentUserName) return false;
  
  // Simple exact matching only - no partial matches to avoid false positives
  const normalizedSheetName = normalizeTherapistName(therapistNameFromSheet);
  const normalizedUserName = normalizeTherapistName(currentUserName);
  
  console.log(`🔍 Matching: Sheet="${therapistNameFromSheet}" -> "${normalizedSheetName}" | User="${currentUserName}" -> "${normalizedUserName}"`);
  
  // Only exact match on the 'name' field
  const isMatch = normalizedSheetName === normalizedUserName;
  
  if (isMatch) {
    console.log(`✅ EXACT MATCH FOUND`);
  } else {
    console.log(`❌ No match`);
  }
  
  return isMatch;
};

// Get sheet data function
const getSheetDataHandler = async (req, res) => {
  console.log('getSheetData function called with method:', req.method);
  console.log('Authenticated user:', req.user.uid, 'Role:', req.userRole);

  try {
    console.log('Initializing Google Auth for Application Default Credentials...');
    const auth = new google.auth.GoogleAuth({
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    console.log('Getting sheets client...');
    const sheets = google.sheets({ version: 'v4', auth });
    
    console.log(`Fetching data from sheet ID: ${SHEET_ID}, range: ${RANGE}`);
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: RANGE,
    });

    console.log('Sheet data received, status:', response.status);
    const rows = response.data.values;
    
    if (rows && rows.length) {
      console.log(`Processing ${rows.length} rows.`);
      
      // Debug: Log the first few rows to see what's in the concerns columns
      if (rows.length > 0) {
        console.log('Sample row concerns data:');
        console.log('Column AW (row[48]):', rows[0][48]);
        console.log('Column AX (row[49]):', rows[0][49]);
        console.log('Column AY (row[50]):', rows[0][50]);
      }
      
      const formattedClients = rows.map((row, index) => ({
        id: index + 1,
        name: `${row[2] || ''} ${row[4] || ''}`.trim(), // Preferred Name + Legal Last Name
        active: true,
        data: {
          firstName: row[2] || '', // Preferred Name
          preferredName: row[2] || '', // Preferred Name (same as firstName for now)
          lastName: row[4] || '', // Legal Last Name
          email: row[1] || 'N/A', // Email Address
          phone: row[5] || 'N/A', // Phone Number
          birthDate: row[6] || 'N/A', // Date of Birth
          address: {
            street: row[7] || 'N/A', // Street Address
            city: row[8] || 'N/A', // City
            state: row[9] || 'N/A', // State
            zipCode: row[10] || 'N/A' // Zip Code
          },
          emergencyContact: {
            name: row[11] || 'N/A', // Emergency Contact
            phone: row[12] || 'N/A' // Emergency Contact Phone Number
          },
          maritalStatus: row[13] || 'N/A', // Marital Status
          gender: row[14] || 'N/A', // Gender/Preferred Pronoun
          employmentStatus: row[15] || 'N/A', // Employment Status
          employer: row[16] || 'N/A', // Employer/School
          referralSource: row[17] || 'N/A', // Referral Source
          reasonForReachingOut: row[18] || 'N/A', // Reason for reaching out
          medications: {
            isOnMedications: row[19] || 'N/A', // Are you on any medications?
            list: row[20] || 'N/A' // Please list current medications
          }
        },
        insurance: {
          paymentOption: row[21] || 'N/A', // Payment Options
          privatePayRate: row[22] || 'N/A', // Private Pay Rate
          agreedAmount: row[42] || 'N/A', // Agreed amount (moved from billing)
          provider: row[23] || 'N/A', // Insurance Provider
          primaryOrDependent: row[24] || 'N/A', // Are you the primary or dependent?
          planName: row[25] || 'N/A', // Insurance Plan Name
          memberId: row[26] || 'N/A', // Member ID/Policy Number
          groupNumber: row[27] || 'N/A', // Group Number
          phone: row[28] || 'N/A', // Insurance Phone Number (fixed field name)
          deductible: row[29] || 'N/A', // Deductible Amount
          copay: row[30] || 'N/A', // Copay Amount
          outOfPocket: row[31] || 'N/A', // Out-of-pocket Amount
          // Credit card info moved here to match frontend expectations
          cardName: row[32] || 'N/A', // Name (as it appears on card)
          cardType: row[33] || 'N/A', // Credit Card Type
          cardNumber: row[34] || 'N/A', // Credit Card Number
          cardExpiration: row[35] || 'N/A', // Credit Card Expiration Date
          billingZip: row[37] || 'N/A' // Billing Zip Code
        },
        agreements: {
          policies: row[39] === 'true' || row[39] === 'Yes', // Agreed to policies
          cancellation: row[40] === 'true' || row[40] === 'Yes', // Agreed to cancellation policy
          privacy: row[41] === 'true' || row[41] === 'Yes' // Agreed to privacy policy
        },
        medical: {
          physicianName: row[45] || 'N/A', // Physician/Medical Professional's Name
          physicianPhone: row[46] || 'N/A', // Physician/Medical Professional's Contact Number
          physicianAddress: row[47] || 'N/A', // Physician/Medical Professional's Office Address
          medications: row[20] || 'N/A' // Please list current medications (moved here to match frontend)
        },
        concerns: {
          reportedConcerns: (() => {
            const rawValue = row[48];
            console.log(`Client ${index + 1} - Column AW raw value:`, rawValue);
            if (typeof rawValue !== 'string') {
              console.log(`Client ${index + 1} - No concerns found in column AW`);
              return [];
            }
            const normalized = rawValue.replace(/\u00A0/g, ' ').trim();
            if (!normalized) {
              console.log(`Client ${index + 1} - No concerns found in column AW`);
              return [];
            }
            const cleaned = normalized.replace(/^"|"$/g, '');
            const concerns = cleaned
              .split(/[\n;,]+/)
              .map(c => c.trim())
              .filter(Boolean);
            console.log(`Client ${index + 1} - Parsed concerns:`, concerns);
            return concerns;
          })(),
          otherConcerns: row[49] || 'No', // Column AX (50th) - "Any other issues or concerns?"
          primaryConcern: row[50] || 'N/A', // Column AY (51st) - "Please look back over the concerns you have checked and choose the one you would like the MOST help with. Feel free to write a short description detailing your reasoning"
          primaryDescription: row[50] || 'No description provided' // Using same field for now
        },
        documents: {
          chartId: row[51] || 'N/A', // Merged Doc ID
          chartUrl: row[52] || 'N/A', // Merged Doc URL
          mergeStatus: row[54] || 'N/A' // Document Merge Status
        },
        therapist: {
          name: row[55] || 'N/A', // Therapist
          status: row[56] || 'N/A' // Status
        },
        progressNotes: [],
        closure: {
          isActive: true,
          date: null,
          notes: ''
        }
      }));

      // Get user data for therapist filtering
      let userData = null;
      if (req.userRole === 'therapist') {
        try {
          console.log('🔍 Fetching user data for therapist UID:', req.user.uid);
          const userDoc = await admin.firestore().collection('users').doc(req.user.uid).get();
          if (userDoc.exists) {
            userData = userDoc.data();
            console.log('✅ User data found:', JSON.stringify(userData, null, 2));
          } else {
            console.log('❌ No user document found in Firestore for UID:', req.user.uid);
          }
        } catch (error) {
          console.error('❌ Error fetching user data for therapist filtering:', error);
        }
      }

      // Apply role-based data and client filtering
      let clientsToProcess = formattedClients;
      
      // For therapists, only show clients assigned to them
      // Skip filtering when scope=associates so all therapists can see all clients
      if (req.userRole === 'therapist' && req.query.scope !== 'associates') {
        console.log('🧑‍⚕️ THERAPIST ROLE DETECTED - Starting filtering process');
        
        if (!userData) {
          console.log('🚨 CRITICAL: No userData found for therapist - DENYING ALL ACCESS');
          clientsToProcess = [];
        } else if (!userData.name) {
          console.log('🚨 CRITICAL: No name field in userData for therapist - DENYING ALL ACCESS');
          console.log('Available userData fields:', Object.keys(userData));
          clientsToProcess = [];
        } else {
          const userName = userData.name.trim();
          
          console.log('🧑‍⚕️ STARTING THERAPIST FILTERING');
          console.log(`   Therapist name from Firebase: "${userName}"`);
          console.log(`   Total clients before filtering: ${formattedClients.length}`);
          
          // Count how many clients have each therapist name for debugging
          const therapistCounts = {};
          formattedClients.forEach(client => {
            const therapistName = client.therapist?.name || 'No Therapist';
            therapistCounts[therapistName] = (therapistCounts[therapistName] || 0) + 1;
          });
          console.log('📊 Therapist distribution in sheet:', JSON.stringify(therapistCounts, null, 2));
          
          clientsToProcess = formattedClients.filter((client, index) => {
            const therapistName = client.therapist?.name || '';
            const isMatch = isTherapistMatch(therapistName, userName);
            
            // Log first 10 clients for debugging
            if (index < 10) {
              console.log(`   Client ${index + 1}: "${client.name}" -> Sheet Therapist: "${therapistName}" -> Match: ${isMatch}`);
            }
            
            return isMatch;
          });
        }
        
        const displayUserName = userData?.name || 'Unknown';
        console.log(`🔽 FINAL FILTERING RESULT:`);
        console.log(`   Therapist: "${displayUserName}"`);
        console.log(`   Before: ${formattedClients.length} clients`);
        console.log(`   After: ${clientsToProcess.length} clients`);
        
        // If no clients matched, this is expected for non-matching therapists
        if (clientsToProcess.length === 0) {
          console.log('✅ NO CLIENTS MATCHED - This is correct if therapist name is not in sheet');
        }
        
        // If too many clients matched, something is wrong
        if (clientsToProcess.length > 15) {
          console.log('🚨 WARNING: Too many clients matched! This suggests filtering failed');
          console.log('First 10 matches:');
          clientsToProcess.slice(0, 10).forEach((client, index) => {
            console.log(`   ${index + 1}. "${client.name}" -> Therapist: "${client.therapist?.name}"`);
          });
        }
      }

      // Apply data sensitivity filtering based on user role
      const filteredClients = clientsToProcess.map(client => {
        // Filter sensitive data based on user role
        if (req.userRole === 'associate') {
          // Associates can't see medical or detailed billing info
          const { medical, insurance, ...filteredClient } = client;
          return {
            ...filteredClient,
            insurance: {
              paymentOption: insurance.paymentOption,
              provider: insurance.provider,
              planName: insurance.planName
            }
          };
        } else if (req.userRole === 'therapist') {
          // Therapists can't see detailed financial info
          const { insurance, ...filteredClient } = client;
          return {
            ...filteredClient,
            insurance: {
              paymentOption: insurance.paymentOption,
              provider: insurance.provider,
              planName: insurance.planName
            }
          };
        }
        // Admin and billing get full access
        return client;
      });

      console.log('Sending filtered clients based on role:', req.userRole);
      res.status(200).json(filteredClients);
    } else {
      console.log('No rows found in sheet');
      res.status(200).json([]);
    }
  } catch (error) {
    console.error("Error in getSheetData:", error.message, error.stack);
    if (error.response && error.response.data && error.response.data.error) {
      console.error("Google API Error details:", error.response.data.error);
    }
    res.status(500).json({ 
      error: "Failed to fetch sheet data from function.", 
      details: error.message 
    });
  }
};

// Update client therapist function
const updateClientTherapistHandler = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).send('Method Not Allowed');
  }

  try {
    console.log('Received request body:', req.body);
    console.log('Authenticated user:', req.user.uid, 'Role:', req.userRole);
    
    const { clientId, therapist } = req.body;
    
    if (!clientId) {
      console.error('No clientId provided');
      res.status(400).send('Client ID is required');
      return;
    }

    console.log(`Updating therapist for client ${clientId} to ${therapist}`);
    
    // Get the Google Sheets API client
    const auth = new google.auth.GoogleAuth({
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
    const sheets = google.sheets({ version: 'v4', auth });

    console.log('Fetching client data from sheet');
    // Find the row for this client by email (column B)
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: `${SHEET_NAME}!B:B`, // Column B contains email addresses
    });

    const rows = response.data.values;
    console.log(`Found ${rows.length} rows in sheet`);
    
    // Skip header row (index 0) and find the client
    const rowIndex = rows.slice(1).findIndex(row => row[0] === clientId);
    console.log(`Client found at row index: ${rowIndex}`);

    if (rowIndex === -1) {
      console.error(`Client with email ${clientId} not found`);
      res.status(404).send('Client not found');
      return;
    }

    // Add 2 to account for 0-based index and header row
    const sheetRow = rowIndex + 2;
    console.log(`Updating therapist in column BD at row ${sheetRow}`);
    
    // Update the therapist in column BD (column index 55)
    await sheets.spreadsheets.values.update({
      spreadsheetId: SHEET_ID,
      range: `${SHEET_NAME}!BD${sheetRow}`,
      valueInputOption: 'RAW',
      resource: {
        values: [[therapist]],
      },
    });

    console.log('Therapist updated successfully');
    res.status(200).send('Therapist updated successfully');
  } catch (error) {
    console.error('Error updating therapist:', error);
    console.error('Error stack:', error.stack);
    if (error.response) {
      console.error('Google API Error:', error.response.data);
    }
    res.status(500).send('Error updating therapist');
  }
};

// Update client status function
const updateClientStatusHandler = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).send('Method Not Allowed');
  }

  try {
    console.log('Received request body:', req.body);
    console.log('Authenticated user:', req.user.uid, 'Role:', req.userRole);
    
    const { clientId, status } = req.body;
    
    if (!clientId) {
      console.error('No clientId provided');
      res.status(400).send('Client ID is required');
      return;
    }

    console.log(`Updating status for client ${clientId} to ${status}`);
    
    // Get the Google Sheets API client
    const auth = new google.auth.GoogleAuth({
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
    const sheets = google.sheets({ version: 'v4', auth });

    console.log('Fetching client data from sheet');
    // Find the row for this client by email (column B)
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: `${SHEET_NAME}!B:B`, // Column B contains email addresses
    });

    const rows = response.data.values;
    console.log(`Found ${rows.length} rows in sheet`);
    
    // Skip header row (index 0) and find the client
    const rowIndex = rows.slice(1).findIndex(row => row[0] === clientId);
    console.log(`Client found at row index: ${rowIndex}`);

    if (rowIndex === -1) {
      console.error(`Client with email ${clientId} not found`);
      res.status(404).send('Client not found');
      return;
    }

    // Add 2 to account for 0-based index and header row
    const sheetRow = rowIndex + 2;
    console.log(`Updating status in column BE at row ${sheetRow}`);
    
    // Update the status in column BE (column index 56)
    await sheets.spreadsheets.values.update({
      spreadsheetId: SHEET_ID,
      range: `${SHEET_NAME}!BE${sheetRow}`,
      valueInputOption: 'RAW',
      resource: {
        values: [[status ? 'Active' : 'Inactive']], // Convert boolean to 'Active'/'Inactive'
      },
    });

    console.log('Status updated successfully');
    res.status(200).send('Status updated successfully');
  } catch (error) {
    console.error('Error updating status:', error);
    console.error('Error stack:', error.stack);
    if (error.response) {
      console.error('Google API Error:', error.response.data);
    }
    res.status(500).send('Error updating status');
  }
};

// Update user role function
const updateUserRoleHandler = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).send('Method Not Allowed');
  }

  try {
    console.log('Received request body:', req.body);
    console.log('Authenticated user:', req.user.uid, 'Role:', req.userRole);
    
    const { userId, role } = req.body;
    
    if (!userId || !role) {
      console.error('Missing userId or role');
      res.status(400).send('User ID and role are required');
      return;
    }

    // Only admins can update user roles
    if (req.userRole !== 'admin') {
      console.error('Non-admin user attempted to update role');
      res.status(403).send('Only admins can update user roles');
      return;
    }

    console.log(`Updating role for user ${userId} to ${role}`);
    
    // Update the user document in Firestore
    await admin.firestore().collection('users').doc(userId).update({
      role: role,
      updatedAt: new Date().toISOString(),
      updatedBy: req.user.uid
    });

    console.log('User role updated successfully');
    res.status(200).json({ 
      success: true, 
      message: 'User role updated successfully',
      userId: userId,
      role: role
    });
  } catch (error) {
    console.error('Error updating user role:', error);
    console.error('Error stack:', error.stack);
    res.status(500).send('Error updating user role');
  }
};

// Create user profile function (for existing users without Firestore documents)
const createUserProfileHandler = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).send('Method Not Allowed');
  }

  try {
    console.log('Received request body:', req.body);
    console.log('Authenticated user:', req.user.uid, 'Role:', req.userRole);

    const { firstName, lastName, role } = req.body;

    if (!firstName || !lastName || !role) {
      console.error('Missing required fields');
      res.status(400).send('First name, last name, and role are required');
      return;
    }

    const db = admin.firestore();
    const { randomUUID } = require('crypto');

    // -------------------------------------------------------
    // BUCKET A — users/{uid}  (PII layer, never read by AI)
    // Stage 1: minimal document at account creation.
    // Remaining fields (address, insurance, consents, etc.)
    // are added later via update() as forms are completed.
    // -------------------------------------------------------
    const userData = {
      firstName,
      lastName,
      name: `${firstName} ${lastName}`,
      email: req.user.email,
      emailVerified: req.user.emailVerified,
      role,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      createdBy: req.user.uid
      // Fields added later via update() — never overwritten by set():
      //   preferredName, phone, dateOfBirth
      //   address: { street, city, state, zip }
      //   emergencyContact: { name, phone }
      //   employerOrSchool, paymentPreference
      //   insuranceDetails: { provider, planName, memberId, groupId, phone, deductible, copay, oopMax }
      //   paymentToken  ← Stripe token only, raw card data NEVER stored here
      //   consentSigned: { informedConsent, cancellationPolicy, telehealthConsent, signedAt }
    };

    // -------------------------------------------------------
    // CLIENT ROLE: also create Bucket B — clinicalRecords/{clinicalId}
    // (de-identified, AI-safe — no name, no email, no phone)
    // -------------------------------------------------------
    if (role === 'client') {
      const clinicalId = randomUUID();
      userData.clinicalId = clinicalId;  // the only link between the two buckets

      // Stage 1: minimal clinical record at account creation.
      // Clinical fields (maritalStatus, gender, medications, conditions, etc.)
      // are added later via update() as intake forms are completed.
      const clinicalRecord = {
        assignedTherapistId: '',   // filled when a therapist is assigned
        status: 'pending',
        intakeDate: null,
        insuranceType: '',         // 'medicaid' | 'private' | 'self-pay' | 'other'
        conditions: [],
        createdAt: admin.firestore.FieldValue.serverTimestamp()
        // Fields added later via update():
        //   maritalStatus, gender, employmentStatus
        //   referralSource, reasonForReachingOut
        //   medications: { current: boolean, list: string }
      };

      const batch = db.batch();
      batch.set(db.collection('users').doc(req.user.uid), userData);
      batch.set(db.collection('clinicalRecords').doc(clinicalId), clinicalRecord);
      await batch.commit();

      console.log(`✅ Client profile created — uid: ${req.user.uid} | clinicalId: ${clinicalId}`);
      return res.status(200).json({
        success: true,
        message: 'Client profile created successfully',
        role,
        clinicalId
      });
    }

    // -------------------------------------------------------
    // STAFF ROLES (admin, therapist, billing, associate, viewer)
    // No clinical record needed — just the users/ document.
    // -------------------------------------------------------
    await db.collection('users').doc(req.user.uid).set(userData);

    console.log(`✅ Staff profile created — uid: ${req.user.uid} | role: ${role}`);
    res.status(200).json({
      success: true,
      message: 'User profile created successfully',
      role
    });
  } catch (error) {
    console.error('Error creating user profile:', error);
    console.error('Error stack:', error.stack);
    res.status(500).send('Error creating user profile');
  }
};

// ============================================================
// submitClientIntake — receives the full intake form payload,
// splits fields into the two buckets, and updates both documents.
// Uses update() so partial submissions never overwrite existing data.
// Only the authenticated client can submit their own intake.
// Admin can also submit on behalf of a client.
// ============================================================
const submitClientIntakeHandler = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).send('Method Not Allowed');
  }

  try {
    const db = admin.firestore();
    const uid = req.user.uid;

    // Fetch the user's document to get their clinicalId — resolved server-side,
    // never exposed to or supplied by the client.
    const userDoc = await db.collection('users').doc(uid).get();
    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User profile not found. Please create your account first.' });
    }

    const userRecord = userDoc.data();

    // Admin can submit on behalf of a client by passing targetUid in the body.
    // Clients can only submit for themselves.
    let targetUid = uid;
    let targetRecord = userRecord;

    if (req.userRole === 'admin' && req.body.targetUid) {
      targetUid = req.body.targetUid;
      const targetDoc = await db.collection('users').doc(targetUid).get();
      if (!targetDoc.exists) {
        return res.status(404).json({ error: 'Target user not found.' });
      }
      targetRecord = targetDoc.data();
    }

    if (targetRecord.role !== 'client') {
      return res.status(400).json({ error: 'Intake form is only for client accounts.' });
    }

    const clinicalId = targetRecord.clinicalId;
    if (!clinicalId) {
      return res.status(400).json({ error: 'No clinical record linked to this account. Please contact support.' });
    }

    const {
      // --- Bucket A fields (PII) ---
      preferredName,
      phone,
      dateOfBirth,
      // address
      street, city, state, zip,
      // emergency contact
      emergencyContactName, emergencyContactPhone,
      employerOrSchool,
      paymentPreference,
      // insurance details
      insuranceProvider, insurancePlanName, insuranceMemberId,
      insuranceGroupId, insurancePhone, deductible, copay, oopMax,
      // payment token (Stripe) — raw card data is NEVER accepted here
      paymentToken,
      // consents
      consentInformedConsent, consentCancellationPolicy, consentTelehealth,

      // --- Bucket B fields (clinical, AI-safe) ---
      maritalStatus,
      gender,
      employmentStatus,
      referralSource,
      reasonForReachingOut,
      medicationsCurrent,
      medicationsList,
      insuranceType,       // category only: 'medicaid'|'private'|'self-pay'|'other'
      conditions,
    } = req.body;

    // -------------------------------------------------------
    // BUCKET A — update users/{uid} with PII fields only.
    // Only include fields that were actually sent — undefined
    // fields are skipped so existing data is never overwritten.
    // -------------------------------------------------------
    const bucketAUpdate = {};

    if (preferredName  !== undefined) bucketAUpdate.preferredName  = preferredName;
    if (phone          !== undefined) bucketAUpdate.phone          = phone;
    if (dateOfBirth    !== undefined) bucketAUpdate.dateOfBirth    = dateOfBirth;
    if (employerOrSchool !== undefined) bucketAUpdate.employerOrSchool = employerOrSchool;
    if (paymentPreference !== undefined) bucketAUpdate.paymentPreference = paymentPreference;
    if (paymentToken   !== undefined) bucketAUpdate.paymentToken   = paymentToken;

    // Nested objects — only write if at least one subfield was sent
    if (street !== undefined || city !== undefined || state !== undefined || zip !== undefined) {
      bucketAUpdate.address = {
        ...(street !== undefined && { street }),
        ...(city   !== undefined && { city }),
        ...(state  !== undefined && { state }),
        ...(zip    !== undefined && { zip }),
      };
    }

    if (emergencyContactName !== undefined || emergencyContactPhone !== undefined) {
      bucketAUpdate.emergencyContact = {
        ...(emergencyContactName  !== undefined && { name: emergencyContactName }),
        ...(emergencyContactPhone !== undefined && { phone: emergencyContactPhone }),
      };
    }

    if (
      insuranceProvider  !== undefined || insurancePlanName !== undefined ||
      insuranceMemberId  !== undefined || insuranceGroupId  !== undefined ||
      insurancePhone     !== undefined || deductible        !== undefined ||
      copay              !== undefined || oopMax            !== undefined
    ) {
      bucketAUpdate.insuranceDetails = {
        ...(insuranceProvider  !== undefined && { provider:   insuranceProvider }),
        ...(insurancePlanName  !== undefined && { planName:   insurancePlanName }),
        ...(insuranceMemberId  !== undefined && { memberId:   insuranceMemberId }),
        ...(insuranceGroupId   !== undefined && { groupId:    insuranceGroupId }),
        ...(insurancePhone     !== undefined && { phone:      insurancePhone }),
        ...(deductible         !== undefined && { deductible: deductible }),
        ...(copay              !== undefined && { copay:      copay }),
        ...(oopMax             !== undefined && { oopMax:     oopMax }),
      };
    }

    if (
      consentInformedConsent   !== undefined ||
      consentCancellationPolicy !== undefined ||
      consentTelehealth        !== undefined
    ) {
      bucketAUpdate.consentSigned = {
        ...(consentInformedConsent    !== undefined && { informedConsent:    consentInformedConsent }),
        ...(consentCancellationPolicy !== undefined && { cancellationPolicy: consentCancellationPolicy }),
        ...(consentTelehealth         !== undefined && { telehealthConsent:  consentTelehealth }),
        signedAt: new Date().toISOString(),
      };
    }

    // -------------------------------------------------------
    // BUCKET B — update clinicalRecords/{clinicalId}.
    // No PII here — safe for AI to read.
    // -------------------------------------------------------
    const bucketBUpdate = {};

    if (maritalStatus        !== undefined) bucketBUpdate.maritalStatus        = maritalStatus;
    if (gender               !== undefined) bucketBUpdate.gender               = gender;
    if (employmentStatus     !== undefined) bucketBUpdate.employmentStatus     = employmentStatus;
    if (referralSource       !== undefined) bucketBUpdate.referralSource       = referralSource;
    if (reasonForReachingOut !== undefined) bucketBUpdate.reasonForReachingOut = reasonForReachingOut;
    if (insuranceType        !== undefined) bucketBUpdate.insuranceType        = insuranceType;
    if (conditions           !== undefined) bucketBUpdate.conditions           = conditions;

    if (medicationsCurrent !== undefined || medicationsList !== undefined) {
      bucketBUpdate.medications = {
        ...(medicationsCurrent !== undefined && { current: medicationsCurrent }),
        ...(medicationsList    !== undefined && { list:    medicationsList }),
      };
    }

    // -------------------------------------------------------
    // Write both buckets atomically — both succeed or both fail.
    // -------------------------------------------------------
    const batch = db.batch();

    if (Object.keys(bucketAUpdate).length > 0) {
      batch.update(db.collection('users').doc(targetUid), bucketAUpdate);
    }

    if (Object.keys(bucketBUpdate).length > 0) {
      batch.update(db.collection('clinicalRecords').doc(clinicalId), bucketBUpdate);
    }

    await batch.commit();

    console.log(`✅ Intake submitted — uid: ${targetUid} | clinicalId: ${clinicalId} | A fields: ${Object.keys(bucketAUpdate).length} | B fields: ${Object.keys(bucketBUpdate).length}`);

    res.status(200).json({
      success: true,
      message: 'Intake saved successfully.',
      savedToBucketA: Object.keys(bucketAUpdate),
      savedToBucketB: Object.keys(bucketBUpdate),
    });

  } catch (error) {
    console.error('Error submitting client intake:', error);
    res.status(500).json({ error: 'Failed to save intake. Please try again.' });
  }
};

// Export 2nd generation functions
exports.getSheetData = onRequest({
  region: 'us-central1',
  maxInstances: 10,
  timeoutSeconds: 60,
  memory: '256MiB'
}, withAuth(getSheetDataHandler, ['admin', 'billing', 'therapist', 'associate']));

exports.updateClientTherapist = onRequest({
  region: 'us-central1',
  maxInstances: 10,
  timeoutSeconds: 60,
  memory: '256MiB'
}, withAuth(updateClientTherapistHandler, ['admin', 'billing']));

exports.updateClientStatus = onRequest({
  region: 'us-central1',
  maxInstances: 10,
  timeoutSeconds: 60,
  memory: '256MiB'
}, withAuth(updateClientStatusHandler, ['admin', 'billing']));

exports.updateUserRole = onRequest({
  region: 'us-central1',
  maxInstances: 10,
  timeoutSeconds: 60,
  memory: '256MiB'
}, withAuth(updateUserRoleHandler, ['admin']));

exports.createUserProfile = onRequest({
  region: 'us-central1',
  maxInstances: 10,
  timeoutSeconds: 60,
  memory: '256MiB'
}, withAuth(createUserProfileHandler, [])); // No role restriction - any authenticated user can create their own profile

exports.submitClientIntake = onRequest({
  region: 'us-central1',
  maxInstances: 10,
  timeoutSeconds: 60,
  memory: '256MiB'
}, withAuth(submitClientIntakeHandler, ['client', 'admin'])); // Client submits own intake; admin can submit on behalf

// AI Analysis function - triggers when a form is submitted
const analyzeFormSubmission = async (snap, context) => {
  const formData = snap.data();
  const formId = snap.id;
  const db = admin.firestore();

  console.log(`🤖 Starting AI analysis for form submission: ${formId}`);

  try {
    // Step 1: Link by email — look up uid and clinicalId if not already present
    let uid = formData.uid || null;
    let clinicalId = formData.clinicalId || null;
    if (!uid && formData.email) {
      const userSnap = await db.collection('users').where('email', '==', formData.email).limit(1).get();
      if (!userSnap.empty) {
        uid = userSnap.docs[0].id;
        clinicalId = userSnap.docs[0].data().clinicalId || null;
        await db.collection('form_submissions').doc(formId).update({
          uid,
          clinicalId,
          linkedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        console.log(`🔗 Linked form ${formId} to uid=${uid} clinicalId=${clinicalId}`);
      } else {
        console.log(`⚠️ No user found for email in form ${formId}`);
      }
    }

    // Step 2: Extract form data for AI analysis (PII-free)
    const patientInfo = {
      // PII (name, email) deliberately excluded — never sent to AI
      age: formData.age || '',
      maritalStatus: formData.maritalStatus || '',
      previousDiagnosis: formData.previousDiagnosis || '',
      medicalCondition: formData.medicalCondition || '',
      additionalInfo: formData.additionalInfo || '',
      selectedCheckboxes: formData.selectedCheckboxes || {}
    };

    // Build prompt for AI analysis based on DSM-V and ICD-10 criteria
    const symptomsText = JSON.stringify(patientInfo.selectedCheckboxes, null, 2);

    const prompt = `You are a clinical psychologist analyzing a patient assessment form based on DSM-V and ICD-10 diagnostic criteria.

Individual Assessment (de-identified):
- Age: ${patientInfo.age}
- Marital Status: ${patientInfo.maritalStatus}
- Previous Diagnosis: ${patientInfo.previousDiagnosis || 'None reported'}
- Medical Conditions: ${patientInfo.medicalCondition || 'None reported'}
- Additional Information: ${patientInfo.additionalInfo || 'None provided'}

Symptoms and Concerns:
${symptomsText}

Please analyze this patient's assessment for the following conditions:
1. Anxiety Disorders (Generalized Anxiety Disorder, Panic Disorder)
2. Major Depressive Disorder
3. Attention-Deficit/Hyperactivity Disorder (ADHD)
4. Adjustment Disorders

Provide:
1. A comprehensive clinical summary of the patient's presentation
2. Diagnostic suggestions based on DSM-V and ICD-10 criteria
3. A suggested treatment plan

Format your response as JSON with the following structure:
{
  "summary": "A detailed clinical summary (2-3 paragraphs)",
  "suggestedPlan": "A suggested treatment plan based on the identified conditions (2-3 paragraphs)"
}

Be professional, clinical, and evidence-based in your analysis.
NOTE: This record is de-identified. Do not reference any name or personal identifier in your response.`;

    // Step 3: Run AI analysis
    const aiAnalysis = await generateAIAnalysis(prompt, patientInfo);

    // Step 4: Write AI analysis back to form_submissions
    await db.collection('form_submissions').doc(formId).update({
      aiAnalysis: {
        summary: aiAnalysis.summary,
        suggestedPlan: aiAnalysis.suggestedPlan
      },
      analysisTimestamp: admin.firestore.FieldValue.serverTimestamp(),
      analyzed: true
    });

    // Step 5: If we have a clinicalId, copy assessment to clinicalRecords (no PII)
    if (clinicalId) {
      await db.collection('clinicalRecords').doc(clinicalId).collection('assessments').doc(formId).set({
        formId,
        submittedAt: formData.submittedAt || admin.firestore.FieldValue.serverTimestamp(),
        age: patientInfo.age,
        maritalStatus: patientInfo.maritalStatus,
        previousDiagnosis: patientInfo.previousDiagnosis,
        medicalCondition: patientInfo.medicalCondition,
        additionalInfo: patientInfo.additionalInfo,
        selectedCheckboxes: patientInfo.selectedCheckboxes,
        aiAnalysis: {
          summary: aiAnalysis.summary,
          suggestedPlan: aiAnalysis.suggestedPlan
        },
        analysisTimestamp: admin.firestore.FieldValue.serverTimestamp()
      });
      console.log(`📋 Assessment copied to clinicalRecords/${clinicalId}/assessments/${formId}`);
    }

    console.log(`✅ AI analysis completed for form: ${formId}`);
  } catch (error) {
    console.error(`❌ Error analyzing form ${formId}:`, error);
    // Update document with error status
    await admin.firestore().collection('form_submissions').doc(formId).update({
      aiAnalysis: {
        error: 'Analysis failed. Please try again or contact support.',
        summary: 'Analysis unavailable',
        suggestedPlan: 'Analysis unavailable'
      },
      analysisTimestamp: admin.firestore.FieldValue.serverTimestamp(),
      analyzed: false,
      analysisError: error.message
    });
  }
};

// AI Analysis generation function
// This is a placeholder - you'll need to integrate with your preferred AI service
async function generateAIAnalysis(prompt, patientInfo) {
  // Option 1: Use OpenAI (requires OPENAI_API_KEY in Firebase config)
  // Option 2: Use Google's Vertex AI (requires GCP project setup)
  // Option 3: Use Firebase's Vertex AI extension
  
  // For now, let's check if OpenAI API key is available
  // The API key should be set in Firebase Functions config: firebase functions:config:set openai.api_key="YOUR_KEY"
  const openaiApiKey = process.env.OPENAI_API_KEY;
  
  if (openaiApiKey) {
    try {
      // Using OpenAI API - newer SDK format
      let OpenAI;
      try {
        OpenAI = require('openai');
      } catch (e) {
        console.log('OpenAI package not available, using fallback');
        return generateFallbackAnalysis(patientInfo);
      }
      
      // Use the newer OpenAI SDK format
      const openai = new OpenAI({
        apiKey: openaiApiKey,
      });
      
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are a clinical psychologist with expertise in DSM-V and ICD-10 diagnostic criteria. Provide professional, evidence-based clinical analysis."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 1500
      });
      
      const content = response.choices[0].message.content;
      
      // Try to parse JSON from response
      try {
        const parsed = JSON.parse(content);
        return {
          summary: parsed.summary || content,
          suggestedPlan: parsed.suggestedPlan || 'Please review the full analysis above.'
        };
      } catch (parseError) {
        // If not JSON, split the content
        const parts = content.split(/suggested plan|treatment plan/i);
        return {
          summary: parts[0] || content.substring(0, content.length / 2),
          suggestedPlan: parts[1] || content.substring(content.length / 2)
        };
      }
    } catch (openaiError) {
      console.error('OpenAI API error:', openaiError);
      throw openaiError;
    }
  } else {
    // Fallback: Generate a basic analysis without AI
    console.log('⚠️ No OpenAI API key found. Using fallback analysis.');
    return generateFallbackAnalysis(patientInfo);
  }
}

// Fallback analysis when AI service is not available
function generateFallbackAnalysis(patientInfo) {
  const symptoms = patientInfo.selectedCheckboxes;
  const symptomCount = Object.values(symptoms).reduce((acc, category) => {
    if (typeof category === 'object') {
      return acc + Object.values(category).filter(v => Array.isArray(v) ? v.length > 0 : v).length;
    }
    return acc;
  }, 0);
  
  let summary = `Patient Assessment Summary (Age: ${patientInfo.age})\n\n`;
  summary += `The patient has reported symptoms across multiple diagnostic categories. `;
  summary += `A total of ${symptomCount} symptom indicators have been identified. `;
  
  if (patientInfo.previousDiagnosis) {
    summary += `Previous diagnosis: ${patientInfo.previousDiagnosis}. `;
  }
  
  if (patientInfo.additionalInfo) {
    summary += `Additional context: ${patientInfo.additionalInfo.substring(0, 200)}. `;
  }
  
  summary += `\n\nA comprehensive clinical evaluation is recommended to assess for Anxiety Disorders, Major Depressive Disorder, ADHD, and Adjustment Disorders based on DSM-V and ICD-10 criteria.`;
  
  let suggestedPlan = `Suggested Treatment Plan:\n\n`;
  suggestedPlan += `1. Comprehensive Clinical Assessment: Conduct a full diagnostic interview to evaluate all reported symptoms against DSM-V criteria.\n\n`;
  suggestedPlan += `2. Differential Diagnosis: Consider Anxiety Disorders, Major Depressive Disorder, ADHD, and Adjustment Disorders based on symptom presentation.\n\n`;
  suggestedPlan += `3. Treatment Recommendations: Develop an individualized treatment plan based on confirmed diagnosis, which may include:\n`;
  suggestedPlan += `   - Psychotherapy (CBT, DBT, or other evidence-based modalities)\n`;
  suggestedPlan += `   - Medication evaluation if indicated\n`;
  suggestedPlan += `   - Psychoeducation and coping strategies\n`;
  suggestedPlan += `   - Regular monitoring and follow-up assessments\n\n`;
  suggestedPlan += `4. Next Steps: Schedule follow-up appointment for comprehensive evaluation and treatment planning.`;
  
  return {
    summary: summary,
    suggestedPlan: suggestedPlan
  };
}

// ============================================================
// onClientUserCreated — Firestore trigger
// Fires whenever a new document is created in users/{uid}.
// If role === 'client', auto-generates a clinicalId UUID,
// writes it back to users/{uid}, and creates the matching
// clinicalRecords/{clinicalId} document (Bucket B).
//
// This means the signup flow (AuthContext.signup) does NOT
// need to know about clinicalIds — it just creates the user
// document and this trigger handles the rest automatically.
// ============================================================
exports.onClientUserCreated = onDocumentCreated(
  { document: 'users/{uid}', region: 'us-central1' },
  async (event) => {
    const userData = event.data.data();
    if (userData.role !== 'client') return; // only clients need a clinical record

    const uid = event.params.uid;
    const email = (userData.email || '').toLowerCase().trim();
    const { randomUUID } = require('crypto');
    const db = admin.firestore();
    const batch = db.batch();

    // Check if an admin pre-registered an invitation for this email
    let clinicalId = null;
    let isInvitedClient = false;

    if (email) {
      const inviteDoc = await db.collection('clientInvitations').doc(email).get();
      if (inviteDoc.exists) {
        clinicalId = inviteDoc.data().clinicalId;
        isInvitedClient = true;
        console.log(`🔗 Invitation found for ${email} — linking to existing clinicalId: ${clinicalId}`);
        // Delete the invitation now that it's been consumed
        batch.delete(db.collection('clientInvitations').doc(email));
      }
    }

    if (!isInvitedClient) {
      // Brand new client — generate a fresh clinical record
      clinicalId = randomUUID();
      batch.set(db.collection('clinicalRecords').doc(clinicalId), {
        assignedTherapistId: '',
        status: 'pending',
        intakeDate: null,
        insuranceType: '',
        conditions: [],
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
      console.log(`✅ onClientUserCreated (new): uid=${uid} | clinicalId=${clinicalId}`);
    } else {
      console.log(`✅ onClientUserCreated (invited): uid=${uid} | clinicalId=${clinicalId}`);
    }

    // Write clinicalId back to the user document (Bucket A)
    batch.update(db.collection('users').doc(uid), { clinicalId });

    await batch.commit();
  }
);

// ============================================================
// getPortalClients
// Returns all Firestore-native clients (role=client) joined
// with their clinicalRecords data.
//   - admin / billing: all clients
//   - therapist / associate: only clients assigned to them
// ============================================================
const getPortalClientsHandler = async (req, res) => {
  const db = admin.firestore();
  const callerUid = req.user.uid;
  const callerRole = req.userRole;

  // Safely reads a field from a user doc that may be flat (portal signups)
  // or nested (migrated clients). Always returns a string, never an object.
  const f = (u, flatKey, ...nestedPath) => {
    const flat = u[flatKey];
    if (flat !== undefined && flat !== null && flat !== '' && typeof flat !== 'object') return String(flat);
    if (nestedPath.length === 0) return '';
    let obj = u;
    for (const key of nestedPath) {
      if (obj === null || obj === undefined || typeof obj !== 'object') return '';
      obj = obj[key];
    }
    if (obj === null || obj === undefined || typeof obj === 'object') return '';
    return String(obj);
  };

  try {
    // 1. Fetch all users with role='client'
    const usersSnap = await db.collection('users').where('role', '==', 'client').get();

    // 2. Fetch therapist list (roles that can be assigned)
    const therapistSnap = await db.collection('users')
      .where('role', 'in', ['therapist', 'admin', 'associate'])
      .get();
    const therapists = therapistSnap.docs.map(d => ({
      uid: d.id,
      name: d.data().name || `${d.data().firstName || ''} ${d.data().lastName || ''}`.trim()
    }));

    // 3. For each client, fetch their clinicalRecord
    const clients = [];
    for (const userDoc of usersSnap.docs) {
      const u = userDoc.data();
      const clinicalId = u.clinicalId;
      let clinical = {};
      if (clinicalId) {
        const clinDoc = await db.collection('clinicalRecords').doc(clinicalId).get();
        if (clinDoc.exists) clinical = clinDoc.data();
      }

      // Therapists / associates only see their own assigned clients
      if (['therapist', 'associate'].includes(callerRole)) {
        if (clinical.assignedTherapistId !== callerUid) continue;
      }

      // Resolve therapist name for display
      const assignedTherapist = therapists.find(t => t.uid === clinical.assignedTherapistId);

      const status = clinical.status || 'pending';

      clients.push({
        uid: userDoc.id,
        clinicalId: clinicalId || null,
        // Legacy path: clients/{legacyClientId}/notes — used as fallback for notes
        legacyClientId: `${u.lastName || ''}_${u.firstName || ''}`.replace(/\s+/g, '') || null,
        firstName: u.firstName || '',
        lastName: u.lastName || '',
        email: u.email || '',
        phone: u.phone || '',
        dateOfBirth: f(u, 'dateOfBirth', 'birthDate'),
        preferredName: u.preferredName || '',
        // Address — flat (portal) or nested under address.* (migrated)
        street: f(u, 'street', 'address', 'street'),
        city: f(u, 'city', 'address', 'city'),
        state: f(u, 'state', 'address', 'state'),
        zip: f(u, 'zip', 'address', 'zipCode'),
        // Emergency contact — flat or nested under emergencyContact.*
        emergencyContactName: f(u, 'emergencyContactName', 'emergencyContact', 'name'),
        emergencyContactPhone: f(u, 'emergencyContactPhone', 'emergencyContact', 'phone'),
        // Insurance — flat or nested under insurance.*
        insuranceProvider: f(u, 'insuranceProvider', 'insurance', 'provider'),
        insurancePlanName: f(u, 'insurancePlanName', 'insurance', 'planName'),
        insuranceMemberId: f(u, 'insuranceMemberId', 'insurance', 'memberId'),
        insuranceGroupId: f(u, 'insuranceGroupId', 'insurance', 'groupId'),
        copay: f(u, 'copay', 'insurance', 'copay'),
        deductible: f(u, 'deductible', 'insurance', 'deductible'),
        paymentPreference: f(u, 'paymentPreference', 'insurance', 'paymentOption'),
        createdAt: u.createdAt || null,
        intakeSubmitted: !!(u.phone || u.dateOfBirth || u.birthDate),
        migratedFromSheet: u.migratedFromSheet === true,
        emailVerified: u.emailVerified === true,
        // Clinical (Bucket B) — all fields read from clinicalRecords
        status,
        assignedTherapistId: clinical.assignedTherapistId || '',
        assignedTherapistName: assignedTherapist?.name || clinical.assignedTherapistName || '',
        maritalStatus: clinical.maritalStatus || '',
        gender: clinical.gender || '',
        employmentStatus: clinical.employmentStatus || '',
        referralSource: clinical.referralSource || '',
        reasonForReachingOut: clinical.reasonForReachingOut || '',
        medicationsCurrent: clinical.medicationsCurrent || false,
        medicationsList: clinical.medicationsList || '',
        insuranceType: clinical.insuranceType || '',
        conditions: Array.isArray(clinical.conditions) ? clinical.conditions : [],
      });
    }

    // Sort: unassigned first, then by name
    clients.sort((a, b) => {
      if (!a.assignedTherapistId && b.assignedTherapistId) return -1;
      if (a.assignedTherapistId && !b.assignedTherapistId) return 1;
      return a.lastName.localeCompare(b.lastName);
    });

    res.json({ clients, therapists });
  } catch (err) {
    console.error('getPortalClients error:', err);
    res.status(500).json({ error: err.message });
  }
};

exports.getPortalClients = onRequest({
  region: 'us-central1',
  maxInstances: 10,
  timeoutSeconds: 60,
  memory: '256MiB'
}, withAuth(getPortalClientsHandler, ['admin', 'billing', 'therapist', 'associate']));

// ============================================================
// assignPortalClientTherapist
// Admin-only. Sets assignedTherapistId + therapistName on
// clinicalRecords/{clinicalId} and flips status to 'active'.
// Body: { clinicalId, therapistUid, therapistName }
// ============================================================
const assignPortalClientTherapistHandler = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { clinicalId, therapistUid, therapistName } = req.body;
  if (!clinicalId || !therapistUid) {
    return res.status(400).json({ error: 'clinicalId and therapistUid are required' });
  }

  try {
    const db = admin.firestore();
    await db.collection('clinicalRecords').doc(clinicalId).update({
      assignedTherapistId: therapistUid,
      assignedTherapistName: therapistName || '',
      status: 'active',
      assignedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    console.log(`✅ Assigned therapist ${therapistUid} to clinicalRecord ${clinicalId}`);
    res.json({ success: true });
  } catch (err) {
    console.error('assignPortalClientTherapist error:', err);
    res.status(500).json({ error: err.message });
  }
};

exports.assignPortalClientTherapist = onRequest({
  region: 'us-central1',
  maxInstances: 10,
  timeoutSeconds: 30,
  memory: '256MiB'
}, withAuth(assignPortalClientTherapistHandler, ['admin', 'billing']));

// ============================================================
// updatePortalClientStatus
// Updates status on clinicalRecords/{clinicalId}.
// Body: { clinicalId, status }  ('active' | 'inactive')
// ============================================================
const updatePortalClientStatusHandler = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { clinicalId, status } = req.body;
  if (!clinicalId || !status) {
    return res.status(400).json({ error: 'clinicalId and status are required' });
  }
  const allowed = ['active', 'inactive'];
  if (!allowed.includes(status)) {
    return res.status(400).json({ error: `status must be one of: ${allowed.join(', ')}` });
  }

  try {
    const db = admin.firestore();
    await db.collection('clinicalRecords').doc(clinicalId).update({
      status,
      statusUpdatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    console.log(`✅ Updated status to '${status}' for clinicalRecord ${clinicalId}`);
    res.json({ success: true });
  } catch (err) {
    console.error('updatePortalClientStatus error:', err);
    res.status(500).json({ error: err.message });
  }
};

exports.updatePortalClientStatus = onRequest({
  region: 'us-central1',
  maxInstances: 10,
  timeoutSeconds: 30,
  memory: '256MiB'
}, withAuth(updatePortalClientStatusHandler, ['admin', 'billing', 'therapist', 'associate']));

// ============================================================
// inviteClient — admin creates a portal invitation for a
// migrated client. Writes clientInvitations/{email} so that
// when the client signs up, onClientUserCreated links their
// new account to the existing clinicalRecord.
// ============================================================
const inviteClientHandler = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

  const { clinicalId, email } = req.body;
  if (!clinicalId || !email) {
    return res.status(400).json({ error: 'clinicalId and email are required' });
  }

  const normalizedEmail = email.toLowerCase().trim();
  const db = admin.firestore();

  // Verify the clinicalRecord actually exists
  const clinicalDoc = await db.collection('clinicalRecords').doc(clinicalId).get();
  if (!clinicalDoc.exists) {
    return res.status(404).json({ error: 'Clinical record not found' });
  }

  // Write the invitation
  await db.collection('clientInvitations').doc(normalizedEmail).set({
    clinicalId,
    invitedAt: admin.firestore.FieldValue.serverTimestamp(),
    invitedBy: req.user.uid
  });

  console.log(`📨 Invitation created: ${normalizedEmail} → clinicalId=${clinicalId} by uid=${req.user.uid}`);
  res.json({ success: true, signupUrl: 'https://therapist-online.web.app/client-signup' });
};

exports.inviteClient = onRequest({
  region: 'us-central1',
  maxInstances: 10,
  timeoutSeconds: 30,
  memory: '256MiB'
}, withAuth(inviteClientHandler, ['admin', 'billing']));

// ============================================================
// inviteStaff — admin-only
// Creates a one-time token in staffInvitations/{token} that
// allows a new therapist/associate to sign up at /staff-signup.
// Body: { email, role, name }
// ============================================================
const inviteStaffHandler = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { email, role, name } = req.body;
  if (!email || !role || !name) {
    return res.status(400).json({ error: 'email, role, and name are required' });
  }

  const allowedRoles = ['therapist', 'associate', 'billing', 'viewer'];
  if (!allowedRoles.includes(role)) {
    return res.status(400).json({ error: `Invalid role. Must be one of: ${allowedRoles.join(', ')}` });
  }

  const { randomUUID } = require('crypto');
  const db = admin.firestore();
  const token = randomUUID();
  const normalizedEmail = email.toLowerCase().trim();
  const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48 hours

  await db.collection('staffInvitations').doc(token).set({
    email: normalizedEmail,
    role,
    name,
    used: false,
    invitedBy: req.user.uid,
    invitedAt: admin.firestore.FieldValue.serverTimestamp(),
    expiresAt: admin.firestore.Timestamp.fromDate(expiresAt),
  });

  const signupUrl = `https://therapist-online.web.app/staff-signup?token=${token}`;
  console.log(`📨 Staff invitation created: ${normalizedEmail} | role=${role} | token=${token}`);
  res.json({ success: true, signupUrl, token });
};

exports.inviteStaff = onRequest({
  region: 'us-central1',
  maxInstances: 10,
  timeoutSeconds: 30,
  memory: '256MiB'
}, withAuth(inviteStaffHandler, ['admin']));

// Export the Firestore trigger
exports.analyzeFormSubmission = onDocumentCreated(
  {
    document: "form_submissions/{formId}",
    region: 'us-central1',
    maxInstances: 10,
    timeoutSeconds: 540, // 9 minutes for AI processing
    memory: '512MiB' // More memory for AI processing
  },
  async (event) => {
    const snap = event.data;
    if (!snap) {
      console.log('No data associated with the event');
      return;
    }
    await analyzeFormSubmission(snap, event);
  }
);

// ============================================================================
// PUBLIC INQUIRIES - Mental Health Check-In Form for Non-Clients
// ============================================================================

// AI Analysis function for public inquiries
const analyzePublicInquiry = async (snap, context) => {
  const formData = snap.data();
  const formId = snap.id;

  console.log(`🤖 Starting AI analysis for public inquiry: ${formId}`);

  try {
    // Extract form data for AI analysis
    const visitorInfo = {
      // PII (name, email, phone) deliberately excluded — never sent to AI
      age: formData.age || null,
      gender: formData.gender || '',
      situation: formData.situation || '',
      identifiedConditions: formData.identifiedConditions || [],
      selectedCheckboxes: formData.selectedCheckboxes || {},
      scores: formData.scores || {}
    };

    // Build prompt for AI analysis - focused on supportive guidance for non-clients
    const symptomsText = JSON.stringify(visitorInfo.selectedCheckboxes, null, 2);
    const scoresText = JSON.stringify(visitorInfo.scores, null, 2);

    const prompt = `You are a compassionate mental health professional providing supportive guidance to someone who has completed an online mental health self-assessment. This person is NOT currently a client - they are seeking initial guidance and support.

Individual Assessment (de-identified):
- Age: ${visitorInfo.age || 'Not provided'}
- Gender: ${visitorInfo.gender || 'Not provided'}
- Their description of what's going on: ${visitorInfo.situation || 'Not provided'}
- Identified Conditions from Assessment: ${visitorInfo.identifiedConditions.join(', ') || 'None identified'}

Assessment Scores:
${scoresText}

Symptoms Reported:
${symptomsText}

Please provide:
1. A warm, supportive summary of what their responses suggest (be compassionate, not clinical)
2. Personalized recommendations for next steps they can take
3. Helpful resources and self-care strategies they can start with today
4. Encouragement to seek professional support if appropriate

IMPORTANT GUIDELINES:
- Use warm, accessible language - avoid clinical jargon
- Be supportive and validating, not diagnostic
- Emphasize that seeking help is a sign of strength
- Include practical, actionable suggestions
- If any responses indicate crisis or suicidal ideation, emphasize crisis resources

Format your response as JSON with the following structure:
{
  "personalizedGreeting": "A warm, supportive opening (do not use any name)",
  "summary": "A supportive summary of what their responses suggest (2-3 paragraphs)",
  "recommendations": ["Array of 3-5 specific, actionable recommendations"],
  "selfCareStrategies": ["Array of 3-4 self-care strategies they can start today"],
  "encouragement": "A brief encouraging message about seeking support",
  "urgencyLevel": "low|moderate|high (based on severity of symptoms)"
}
NOTE: This record is de-identified. Do not reference any name or personal identifier in your response.`;

    // Generate AI analysis
    const aiAnalysis = await generatePublicInquiryAnalysis(prompt, visitorInfo);

    // Update the document with AI analysis
    await admin.firestore().collection('public_inquiries').doc(formId).update({
      aiAnalysis: aiAnalysis,
      analysisTimestamp: admin.firestore.FieldValue.serverTimestamp(),
      analyzed: true
    });

    console.log(`✅ AI analysis completed for public inquiry: ${formId}`);

  } catch (error) {
    console.error(`❌ Error analyzing public inquiry ${formId}:`, error);
    // Update document with error status
    await admin.firestore().collection('public_inquiries').doc(formId).update({
      aiAnalysis: {
        error: 'Analysis failed. Our team will review your submission manually.',
        personalizedGreeting: `Hi there,`,
        summary: 'Thank you for completing our mental health check-in. While our automated analysis encountered an issue, please know that your responses have been received and our team will review them.',
        recommendations: [
          'Consider reaching out to a mental health professional for a personal consultation',
          'Practice self-care while waiting - even small steps like deep breathing or a short walk can help',
          'If you\'re in crisis, please contact the 988 Suicide & Crisis Lifeline'
        ],
        selfCareStrategies: [
          'Take a few deep breaths when feeling overwhelmed',
          'Try to maintain regular sleep and eating schedules',
          'Reach out to a trusted friend or family member'
        ],
        encouragement: 'Taking this assessment shows strength and self-awareness. Help is available.',
        urgencyLevel: 'moderate'
      },
      analysisTimestamp: admin.firestore.FieldValue.serverTimestamp(),
      analyzed: false,
      analysisError: error.message
    });
  }
};

// AI Analysis generation function for public inquiries
async function generatePublicInquiryAnalysis(prompt, visitorInfo) {
  const openaiApiKey = process.env.OPENAI_API_KEY;

  if (openaiApiKey) {
    try {
      let OpenAI;
      try {
        OpenAI = require('openai');
      } catch (e) {
        console.log('OpenAI package not available, using fallback');
        return generatePublicInquiryFallback(visitorInfo);
      }

      const openai = new OpenAI({
        apiKey: openaiApiKey,
      });

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are a compassionate mental health support specialist. Provide warm, supportive guidance that is accessible and non-clinical. Your goal is to help people feel heard and guide them toward appropriate resources."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 1500
      });

      const content = response.choices[0].message.content;

      try {
        return JSON.parse(content);
      } catch (parseError) {
        // If parsing fails, create a structured response from the content
        return {
          personalizedGreeting: `Hi there,`,
          summary: content,
          recommendations: ['Consider speaking with a mental health professional', 'Practice daily self-care', 'Reach out to supportive people in your life'],
          selfCareStrategies: ['Deep breathing exercises', 'Regular physical activity', 'Adequate sleep'],
          encouragement: 'Taking this step shows incredible self-awareness. You deserve support.',
          urgencyLevel: 'moderate'
        };
      }
    } catch (openaiError) {
      console.error('OpenAI API error:', openaiError);
      throw openaiError;
    }
  } else {
    console.log('⚠️ No OpenAI API key found. Using fallback analysis for public inquiry.');
    return generatePublicInquiryFallback(visitorInfo);
  }
}

// Fallback analysis for public inquiries when AI service is not available
function generatePublicInquiryFallback(visitorInfo) {
  const conditions = visitorInfo.identifiedConditions || [];
  const scores = visitorInfo.scores || {};
  const age = visitorInfo.age;
  const situation = visitorInfo.situation;

  let urgencyLevel = 'low';
  if (conditions.length >= 3 ||
      (scores.depression && scores.depression.core >= 2 && scores.depression.additional >= 4)) {
    urgencyLevel = 'high';
  } else if (conditions.length >= 1) {
    urgencyLevel = 'moderate';
  }

  const personalizedGreeting = `Hi there,`;

  let summary = `Thank you for taking the time to complete this mental health check-in. `;

  if (situation) {
    summary += `We hear you - dealing with "${situation.substring(0, 100)}${situation.length > 100 ? '...' : ''}" can be really challenging. `;
  }

  if (conditions.length === 0) {
    summary += `Based on your responses, you don't appear to be experiencing significant symptoms of the conditions we screened for. However, your mental health matters, and if you're feeling concerned about how you're doing, it's always okay to reach out to a professional.\n\n`;
    summary += `Remember that mental health exists on a spectrum, and taking proactive steps to maintain your wellbeing is always a good idea.`;
  } else {
    summary += `Your responses suggest you may be experiencing some challenges related to ${conditions.join(', ')}. Please know that what you're feeling is valid, and you're not alone - millions of people experience similar challenges.\n\n`;
    if (age && age < 25) {
      summary += `At ${age}, you're at a time in life where many people first start noticing these kinds of challenges. The good news is that getting support early can make a real difference. `;
    }
    summary += `The important thing to remember is that these conditions are treatable, and with the right support, most people see significant improvement. Taking this assessment is already a positive step toward understanding yourself better.`;
  }

  const recommendations = [];
  if (urgencyLevel === 'high') {
    recommendations.push('We strongly encourage you to speak with a mental health professional soon');
    recommendations.push('Contact the 988 Suicide & Crisis Lifeline if you\'re in immediate distress');
  }
  recommendations.push('Consider scheduling an appointment with a therapist or counselor');
  recommendations.push('Talk to your primary care doctor about how you\'re feeling');
  recommendations.push('Reach out to trusted friends or family members for support');
  if (conditions.includes('Anxiety') || conditions.includes('Panic Attacks')) {
    recommendations.push('Try breathing exercises or mindfulness apps like Headspace or Calm');
  }
  if (conditions.includes('Depression')) {
    recommendations.push('Try to maintain a routine, even when it feels difficult');
  }

  const selfCareStrategies = [
    'Practice deep breathing: breathe in for 4 counts, hold for 4, exhale for 6',
    'Try to get outside for at least 15 minutes of natural light each day',
    'Maintain a consistent sleep schedule, even on weekends',
    'Limit caffeine and alcohol, which can worsen anxiety and depression'
  ];

  const encouragement = `Taking this assessment shows real self-awareness and courage. Whatever you're going through, please know that help is available and things can get better. You deserve to feel well, and reaching out for support is a sign of strength, not weakness.`;

  return {
    personalizedGreeting,
    summary,
    recommendations,
    selfCareStrategies,
    encouragement,
    urgencyLevel
  };
}

// ============================================================
// respondToChat — Firestore trigger
// Fires when a new message is written to
// clinicalRecords/{clinicalId}/chatHistory/{messageId}
// If role === 'user', fetches clinical context (no PII),
// calls GPT-4o, and writes the assistant reply back.
// ============================================================
exports.respondToChat = onDocumentCreated(
  {
    document: 'clinicalRecords/{clinicalId}/chatHistory/{messageId}',
    region: 'us-central1',
    maxInstances: 10,
    timeoutSeconds: 60,
    memory: '256MiB'
  },
  async (event) => {
    const snap = event.data;
    if (!snap) return;

    const messageData = snap.data();
    // Only respond to user messages — ignore assistant messages to avoid loops
    if (!messageData || messageData.role !== 'user') return;

    const { clinicalId } = event.params;
    const db = admin.firestore();
    const openaiApiKey = process.env.OPENAI_API_KEY;

    if (!openaiApiKey) {
      console.error('OPENAI_API_KEY not set — cannot respond to chat');
      await db.collection('clinicalRecords').doc(clinicalId)
        .collection('chatHistory').add({
          role: 'assistant',
          content: 'The AI assistant is not configured yet. Please contact your therapist directly.',
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          isError: true
        });
      return;
    }

    try {
      // Fetch de-identified clinical context (Bucket B — no PII)
      const clinicalSnap = await db.collection('clinicalRecords').doc(clinicalId).get();
      const clinical = clinicalSnap.exists ? clinicalSnap.data() : {};

      // Fetch last 20 messages for conversation context
      const historySnap = await db.collection('clinicalRecords').doc(clinicalId)
        .collection('chatHistory')
        .orderBy('createdAt', 'asc')
        .limitToLast(20)
        .get();

      const history = historySnap.docs
        .filter(d => d.id !== snap.id) // exclude the message that triggered this
        .map(d => ({ role: d.data().role, content: d.data().content }))
        .filter(m => m.role === 'user' || m.role === 'assistant');

      // Build system prompt with clinical context — no name, no email, no PII
      const conditions = Array.isArray(clinical.conditions) && clinical.conditions.length > 0
        ? clinical.conditions.join(', ')
        : 'not specified';
      const therapistName = clinical.assignedTherapistName || 'their therapist';

      const systemPrompt = `You are a compassionate AI support assistant for a mental health practice. You provide emotional support and psychoeducation between therapy sessions.

Client context (de-identified — you do not know their name or any personal details):
- Reported concerns: ${conditions}
- Status: ${clinical.status || 'active'}
- Assigned therapist: ${therapistName}

Guidelines:
- Be warm, empathetic, and supportive
- You are NOT a replacement for therapy — remind the client to bring important topics to their therapist
- Never diagnose or prescribe
- If the client expresses immediate risk of harm to themselves or others, instruct them to call 988 (Suicide & Crisis Lifeline) or 911 immediately
- Keep responses concise (2-4 sentences) unless the client needs more detailed support
- Never reference the client's name or personal identifiers`;

      let OpenAI;
      try {
        OpenAI = require('openai');
      } catch (e) {
        throw new Error('OpenAI package not available');
      }

      const openai = new OpenAI({ apiKey: openaiApiKey });

      const completion = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          ...history,
          { role: 'user', content: messageData.content }
        ],
        max_tokens: 300,
        temperature: 0.7
      });

      const replyText = completion.choices[0]?.message?.content || 'I\'m here to support you. Could you tell me more?';

      await db.collection('clinicalRecords').doc(clinicalId)
        .collection('chatHistory').add({
          role: 'assistant',
          content: replyText,
          createdAt: admin.firestore.FieldValue.serverTimestamp()
        });

      console.log(`✅ respondToChat: replied for clinicalId=${clinicalId}`);
    } catch (err) {
      console.error('respondToChat error:', err);
      await db.collection('clinicalRecords').doc(clinicalId)
        .collection('chatHistory').add({
          role: 'assistant',
          content: 'I\'m having trouble responding right now. Please try again in a moment, or bring this up with your therapist.',
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          isError: true
        });
    }
  }
);

// Export the Firestore trigger for public inquiries
exports.analyzePublicInquiry = onDocumentCreated(
  {
    document: "public_inquiries/{inquiryId}",
    region: 'us-central1',
    maxInstances: 10,
    timeoutSeconds: 540, // 9 minutes for AI processing
    memory: '512MiB' // More memory for AI processing
  },
  async (event) => {
    const snap = event.data;
    if (!snap) {
      console.log('No data associated with the event');
      return;
    }
    await analyzePublicInquiry(snap, event);
  }
);