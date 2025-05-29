const functions = require("firebase-functions");
const { google } = require("googleapis");
const cors = require("cors")({ origin: true });

// --- Configuration (Consider moving to environment variables later) ---
const SHEET_ID = '1_uU3mF9ZNplGYDbUEYsid8EG1Pfgq7tYYw6ZwBORbT8';
const SHEET_NAME = 'Sheet1'; // Make sure this is the EXACT name of your sheet tab
const LAST_COLUMN_LETTER = 'M'; // Or 'L', or whatever your last actual data column is
const RANGE = `${SHEET_NAME}!A2:${LAST_COLUMN_LETTER}`;
// --- End Configuration ---

exports.getSheetData = functions.https.onRequest(async (req, res) => {
  // Enable CORS
  return cors(req, res, async () => {
    functions.logger.log('getSheetData function called with method:', req.method); // Use functions.logger for GCP

    // All your logic should be here, directly inside this callback
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
          name: `${row[1] || ''} ${row[0] || ''}`.trim(),
          active: true,
          data: {
            firstName: row[1] || '',
            lastName: row[0] || '',
            therapist: row[2] || 'N/A',
            phone: row[3] || 'N/A',
            email: row[4] || 'N/A',
            birthDate: row[7] || 'N/A'
          },
          insurance: {
            provider: row[5] || 'N/A',
            idNumber: row[6] || 'N/A',
            copay: row[9] || 'N/A',
            deductible: row[10] || 'N/A',
            insuranceName: row[12] || 'N/A'
          },
          medicalInfo: {
            diagnosis: row[8] || 'N/A',
            cpt: row[9] || 'N/A'
          },
          therapist: {
            name: row[2] || 'N/A',
            startDate: 'N/A'
          },
          concerns: '',
          treatmentPlan: '',
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
  }); // End of the cors callback
}); // End of exports.getSheetData