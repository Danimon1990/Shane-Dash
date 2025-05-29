import React, { useState, useEffect } from 'react';
import { google } from 'googleapis';

const GoogleSheetsData = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const SHEET_ID = '1_uU3mF9ZNplGYDbUEYsid8EG1Pfgq7tYYw6ZwBORbT8';
  const RANGE = 'Sheet1!A:Z'; // Adjust this based on your sheet's range

  useEffect(() => {
    const fetchSheetData = async () => {
      try {
        const auth = new google.auth.GoogleAuth({
          keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS,
          scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
        });

        const sheets = google.sheets({ version: 'v4', auth });
        
        const response = await sheets.spreadsheets.values.get({
          spreadsheetId: SHEET_ID,
          range: RANGE,
        });

        const rows = response.data.values;
        if (rows.length) {
          // Assuming first row contains headers
          const headers = rows[0];
          const data = rows.slice(1).map(row => {
            const obj = {};
            headers.forEach((header, index) => {
              obj[header] = row[index];
            });
            return obj;
          });
          setData(data);
        }
        setLoading(false);
      } catch (err) {
        console.error('Error fetching sheet data:', err);
        setError(err.message);
        setLoading(false);
      }
    };

    fetchSheetData();
  }, []);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4">Google Sheets Data</h2>
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border border-gray-300">
          <thead>
            <tr>
              {data.length > 0 &&
                Object.keys(data[0]).map((header) => (
                  <th
                    key={header}
                    className="px-6 py-3 border-b border-gray-300 bg-gray-100 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    {header}
                  </th>
                ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, index) => (
              <tr key={index} className={index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                {Object.values(row).map((cell, cellIndex) => (
                  <td
                    key={cellIndex}
                    className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 border-b border-gray-300"
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default GoogleSheetsData; 