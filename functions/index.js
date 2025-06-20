const functions = require("firebase-functions");
const { google } = require("googleapis");
const cors = require("cors")({
  origin: [
    'http://localhost:3000',
    'https://therapist-online.web.app',
    'https://therapist-online.firebaseapp.com'
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: true,
});

// --- Configuration (Consider moving to environment variables later) ---
const SHEET_ID = '1kGRG-BDGbSQNPwQVBQWIc1WvRrAmW-4I9V1FhUI3ez4';
const SHEET_NAME = 'Form Responses 1';
const LAST_COLUMN_LETTER = 'BE'; // Updated to include all columns
const RANGE = `${SHEET_NAME}!A2:${LAST_COLUMN_LETTER}`;
// --- End Configuration ---

exports.getSheetData = functions.https.onRequest(async (req, res) => {
  cors(req, res, async () => {
    functions.logger.log('getSheetData function called with method:', req.method);

    try {
      functions.logger.log('Initializing Google Auth for Application Default Credentials...');
      const auth = new google.auth.GoogleAuth({
        scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
      });

      functions.logger.log('Getting sheets client...');
      const sheets = google.sheets({ version: 'v4', auth });
      
      functions.logger.log(`Fetching data from sheet ID: ${SHEET_ID}, range: ${RANGE}`);
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: SHEET_ID,
        range: RANGE,
      });

      functions.logger.log('Sheet data received, status:', response.status);
      const rows = response.data.values;
      
      if (rows && rows.length) {
        functions.logger.log(`Processing ${rows.length} rows.`);
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
        functions.logger.log('Sending formatted clients.');
        res.status(200).json(formattedClients);
      } else {
        functions.logger.log('No rows found in sheet');
        res.status(200).json([]);
      }
    } catch (error) {
      functions.logger.error("Error in getSheetData:", error.message, error.stack);
      if (error.response && error.response.data && error.response.data.error) {
        functions.logger.error("Google API Error details:", error.response.data.error);
      }
      res.status(500).json({ 
        error: "Failed to fetch sheet data from function.", 
        details: error.message 
      });
    }
  });
});

exports.updateClientTherapist = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    if (req.method !== 'POST') {
      return res.status(405).send('Method Not Allowed');
    }

    try {
      functions.logger.log('Received request body:', req.body);
      const { clientId, therapist } = req.body;
      
      if (!clientId) {
        functions.logger.error('No clientId provided');
        res.status(400).send('Client ID is required');
        return;
      }

      functions.logger.log(`Updating therapist for client ${clientId} to ${therapist}`);
      
      // Get the Google Sheets API client
      const auth = new google.auth.GoogleAuth({
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
      });
      const sheets = google.sheets({ version: 'v4', auth });

      functions.logger.log('Fetching client data from sheet');
      // Find the row for this client by email (column B)
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: SHEET_ID,
        range: `${SHEET_NAME}!B:B`, // Column B contains email addresses
      });

      const rows = response.data.values;
      functions.logger.log(`Found ${rows.length} rows in sheet`);
      
      // Skip header row (index 0) and find the client
      const rowIndex = rows.slice(1).findIndex(row => row[0] === clientId);
      functions.logger.log(`Client found at row index: ${rowIndex}`);

      if (rowIndex === -1) {
        functions.logger.error(`Client with email ${clientId} not found`);
        res.status(404).send('Client not found');
        return;
      }

      // Add 2 to account for 0-based index and header row
      const sheetRow = rowIndex + 2;
      functions.logger.log(`Updating therapist in column BD at row ${sheetRow}`);
      
      // Update the therapist in column BD (column index 55)
      await sheets.spreadsheets.values.update({
        spreadsheetId: SHEET_ID,
        range: `${SHEET_NAME}!BD${sheetRow}`,
        valueInputOption: 'RAW',
        resource: {
          values: [[therapist]],
        },
      });

      functions.logger.log('Therapist updated successfully');
      res.status(200).send('Therapist updated successfully');
    } catch (error) {
      functions.logger.error('Error updating therapist:', error);
      functions.logger.error('Error stack:', error.stack);
      if (error.response) {
        functions.logger.error('Google API Error:', error.response.data);
      }
      res.status(500).send('Error updating therapist');
    }
  });
});

exports.updateClientStatus = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    if (req.method !== 'POST') {
      return res.status(405).send('Method Not Allowed');
    }

    try {
      functions.logger.log('Received request body:', req.body);
      const { clientId, status } = req.body;
      
      if (!clientId) {
        functions.logger.error('No clientId provided');
        res.status(400).send('Client ID is required');
        return;
      }

      functions.logger.log(`Updating status for client ${clientId} to ${status}`);
      
      // Get the Google Sheets API client
      const auth = new google.auth.GoogleAuth({
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
      });
      const sheets = google.sheets({ version: 'v4', auth });

      functions.logger.log('Fetching client data from sheet');
      // Find the row for this client by email (column B)
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: SHEET_ID,
        range: `${SHEET_NAME}!B:B`, // Column B contains email addresses
      });

      const rows = response.data.values;
      functions.logger.log(`Found ${rows.length} rows in sheet`);
      
      // Skip header row (index 0) and find the client
      const rowIndex = rows.slice(1).findIndex(row => row[0] === clientId);
      functions.logger.log(`Client found at row index: ${rowIndex}`);

      if (rowIndex === -1) {
        functions.logger.error(`Client with email ${clientId} not found`);
        res.status(404).send('Client not found');
        return;
      }

      // Add 2 to account for 0-based index and header row
      const sheetRow = rowIndex + 2;
      functions.logger.log(`Updating status in column BE at row ${sheetRow}`);
      
      // Update the status in column BE (column index 56)
      await sheets.spreadsheets.values.update({
        spreadsheetId: SHEET_ID,
        range: `${SHEET_NAME}!BE${sheetRow}`,
        valueInputOption: 'RAW',
        resource: {
          values: [[status ? 'Active' : 'Inactive']], // Convert boolean to 'Active'/'Inactive'
        },
      });

      functions.logger.log('Status updated successfully');
      res.status(200).send('Status updated successfully');
    } catch (error) {
      functions.logger.error('Error updating status:', error);
      functions.logger.error('Error stack:', error.stack);
      if (error.response) {
        functions.logger.error('Google API Error:', error.response.data);
      }
      res.status(500).send('Error updating status');
    }
  });
});