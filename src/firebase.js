import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getAnalytics } from "firebase/analytics";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBqIIr2bprKAMP6QEzy0U0Q7ND9T0PYN2o",
  authDomain: "therapist-online.firebaseapp.com",
  projectId: "therapist-online",
  storageBucket: "therapist-online.firebasestorage.app",
  messagingSenderId: "383278496429",
  appId: "1:383278496429:web:c0ff8e6596ee700268e424",
  measurementId: "G-ENP8R10KF0"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const analytics = getAnalytics(app);

export { auth, db }; 