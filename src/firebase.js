import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getAnalytics } from "firebase/analytics";

// Initialize Firebase
const app = initializeApp({
  // Your web app's Firebase configuration
  apiKey: "AIzaSyBqIIr2bprKAMP6QEzy0U0Q7ND9T0PYN2o",
  authDomain: "therapist-online.firebaseapp.com",
  projectId: "therapist-online",
  storageBucket: "therapist-online.firebasestorage.app",
  messagingSenderId: "383278496429",
  appId: "1:383278496429:web:c0ff8e6596ee700268e424",
  measurementId: "G-ENP8R10KF0"
});

const auth = getAuth(app);
const db = getFirestore(app);

// Connect to emulators in development
if (process.env.REACT_APP_USE_LOCAL_FUNCTIONS === 'true') {
  try {
    connectAuthEmulator(auth, 'http://127.0.0.1:9099');
    connectFirestoreEmulator(db, '127.0.0.1', 8080);
    console.log('🔧 Connected to Firebase emulators');
  } catch (error) {
    console.log('⚠️ Emulator connection failed (probably already connected):', error.message);
  }
}
// Initialize analytics but don't export it since it's not used
getAnalytics(app);

export { auth, db }; 