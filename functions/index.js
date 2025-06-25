const { onRequest } = require("firebase-functions/v2/https");
const { google } = require("googleapis");
const admin = require("firebase-admin");
const cors = require("cors")({
  origin: [
    'http://localhost:3000',
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
      const formattedClients = rows.map((row, index) => ({
        id: index + 1,
        name: `${row[2] || ''} ${row[4] || ''}`.trim(), // Preferred Name + Legal Last Name
        active: true,
        data: {
          firstName: row[2] || '', // Preferred Name
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
          employment: {
            status: row[15] || 'N/A', // Employment Status
            employer: row[16] || 'N/A' // Employer/School
          },
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
          provider: row[23] || 'N/A', // Insurance Provider
          isPrimary: row[24] || 'N/A', // Are you the primary or dependent?
          planName: row[25] || 'N/A', // Insurance Plan Name
          memberId: row[26] || 'N/A', // Member ID/Policy Number
          groupNumber: row[27] || 'N/A', // Group Number
          phoneNumber: row[28] || 'N/A', // Insurance Phone Number
          deductible: row[29] || 'N/A', // Deductible Amount
          copay: row[30] || 'N/A', // Copay Amount
          outOfPocket: row[31] || 'N/A' // Out-of-pocket Amount
        },
        billing: {
          cardName: row[32] || 'N/A', // Name (as it appears on card)
          cardType: row[33] || 'N/A', // Credit Card Type
          cardNumber: row[34] || 'N/A', // Credit Card Number
          cardExpiration: row[35] || 'N/A', // Credit Card Expiration Date
          cardSecurityCode: row[36] || 'N/A', // 3-Digit Security Code
          billingZipCode: row[37] || 'N/A', // Billing Zip Code
          cardAuthorization: row[38] || 'N/A', // Credit Card Authorization
          agreedToPolicies: row[39] || 'N/A', // Agreed to policies
          agreedToCancellation: row[40] || 'N/A', // Agreed to cancellation policy
          agreedToPrivacy: row[41] || 'N/A', // Agreed to privacy policy
          agreedAmount: row[42] || 'N/A', // Agreed amount
          signature: row[43] || 'N/A', // Full name signature
          signatureDate: row[44] || 'N/A' // Today's Date
        },
        medical: {
          physicianName: row[45] || 'N/A', // Physician/Medical Professional's Name
          physicianPhone: row[46] || 'N/A', // Physician/Medical Professional's Contact Number
          physicianAddress: row[47] || 'N/A' // Physician/Medical Professional's Office Address
        },
        concerns: {
          selectedConcerns: row[48] || 'N/A', // Checked concerns
          otherConcerns: row[49] || 'N/A', // Any other issues or concerns
          primaryConcern: row[50] || 'N/A' // Most important concern
        },
        documents: {
          mergedDocId: row[51] || 'N/A', // Merged Doc ID
          mergedDocUrl: row[52] || 'N/A', // Merged Doc URL
          mergedDocLink: row[53] || 'N/A', // Link to merged Doc
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

      // Apply role-based data filtering
      const filteredClients = formattedClients.map(client => {
        // Filter sensitive data based on user role
        if (req.userRole === 'associate') {
          // Associates can't see medical or detailed billing info
          const { medical, billing, ...filteredClient } = client;
          return {
            ...filteredClient,
            billing: {
              paymentOption: billing.paymentOption,
              provider: billing.provider,
              planName: billing.planName
            }
          };
        } else if (req.userRole === 'therapist') {
          // Therapists can't see detailed financial info
          const { billing, ...filteredClient } = client;
          return {
            ...filteredClient,
            billing: {
              paymentOption: billing.paymentOption,
              provider: billing.provider,
              planName: billing.planName
            }
          };
        }
        // Admin gets full access
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
}, withAuth(getSheetDataHandler, ['admin', 'therapist', 'associate']));

exports.updateClientTherapist = onRequest({
  region: 'us-central1',
  maxInstances: 10,
  timeoutSeconds: 60,
  memory: '256MiB'
}, withAuth(updateClientTherapistHandler, ['admin', 'therapist']));

exports.updateClientStatus = onRequest({
  region: 'us-central1',
  maxInstances: 10,
  timeoutSeconds: 60,
  memory: '256MiB'
}, withAuth(updateClientStatusHandler, ['admin', 'therapist']));

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