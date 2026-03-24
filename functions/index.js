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

    console.log(`Creating profile for user ${req.user.uid}`);
    
    // Create the user document in Firestore
    const userData = {
      email: req.user.email,
      firstName,
      lastName,
      role,
      name: `${firstName} ${lastName}`,
      emailVerified: req.user.emailVerified,
      createdAt: new Date().toISOString(),
      createdBy: req.user.uid
    };

    await admin.firestore().collection('users').doc(req.user.uid).set(userData);

    console.log('User profile created successfully');
    res.status(200).json({ 
      success: true, 
      message: 'User profile created successfully',
      userData: userData
    });
  } catch (error) {
    console.error('Error creating user profile:', error);
    console.error('Error stack:', error.stack);
    res.status(500).send('Error creating user profile');
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

// AI Analysis function - triggers when a form is submitted
const analyzeFormSubmission = async (snap, context) => {
  const formData = snap.data();
  const formId = snap.id;
  
  console.log(`🤖 Starting AI analysis for form submission: ${formId}`);
  
  try {
    // Extract form data for AI analysis
    const patientInfo = {
      firstName: formData.firstName || '',
      lastName: formData.lastName || '',
      age: formData.age || '',
      email: formData.email || '',
      maritalStatus: formData.maritalStatus || '',
      previousDiagnosis: formData.previousDiagnosis || '',
      medicalCondition: formData.medicalCondition || '',
      additionalInfo: formData.additionalInfo || '',
      selectedCheckboxes: formData.selectedCheckboxes || {}
    };
    
    // Build prompt for AI analysis based on DSM-V and ICD-10 criteria
    const symptomsText = JSON.stringify(patientInfo.selectedCheckboxes, null, 2);
    
    const prompt = `You are a clinical psychologist analyzing a patient assessment form based on DSM-V and ICD-10 diagnostic criteria.

Patient Information:
- Name: ${patientInfo.firstName} ${patientInfo.lastName}
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

Be professional, clinical, and evidence-based in your analysis.`;

    // Use OpenAI API (you'll need to set OPENAI_API_KEY in Firebase config)
    // For now, we'll use a placeholder that you can replace with actual AI service
    const aiAnalysis = await generateAIAnalysis(prompt, patientInfo);
    
    // Update the document with AI analysis
    await admin.firestore().collection('form_submissions').doc(formId).update({
      aiAnalysis: {
        summary: aiAnalysis.summary,
        suggestedPlan: aiAnalysis.suggestedPlan
      },
      analysisTimestamp: admin.firestore.FieldValue.serverTimestamp(),
      analyzed: true
    });
    
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
        model: "gpt-4",
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
  
  let summary = `Patient Assessment Summary for ${patientInfo.firstName} ${patientInfo.lastName} (Age: ${patientInfo.age})\n\n`;
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
      firstName: formData.firstName || '',
      lastName: formData.lastName || '',
      email: formData.email || '',
      phone: formData.phone || '',
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

Visitor Information:
- Name: ${visitorInfo.firstName}${visitorInfo.lastName ? ' ' + visitorInfo.lastName : ''}
- Age: ${visitorInfo.age || 'Not provided'}
- Gender: ${visitorInfo.gender || 'Not provided'}
- Email: ${visitorInfo.email}
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
  "personalizedGreeting": "A warm, personalized greeting using their name",
  "summary": "A supportive summary of what their responses suggest (2-3 paragraphs)",
  "recommendations": ["Array of 3-5 specific, actionable recommendations"],
  "selfCareStrategies": ["Array of 3-4 self-care strategies they can start today"],
  "encouragement": "A brief encouraging message about seeking support",
  "urgencyLevel": "low|moderate|high (based on severity of symptoms)"
}`;

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
        personalizedGreeting: `Hi ${formData.firstName || 'there'},`,
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
        model: "gpt-4",
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
          personalizedGreeting: `Hi ${visitorInfo.firstName || 'there'},`,
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

  const personalizedGreeting = `Hi ${visitorInfo.firstName || 'there'},`;

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