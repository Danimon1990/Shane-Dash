import { config } from 'dotenv';

// Load environment variables from .env file
config();

export const GOOGLE_APPLICATION_CREDENTIALS = process.env.GOOGLE_APPLICATION_CREDENTIALS; 