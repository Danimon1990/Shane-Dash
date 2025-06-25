import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth, db } from '../firebase';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  sendEmailVerification,
  onAuthStateChanged
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import authTokenManager from '../utils/authToken.js';
import rbac from '../utils/roleBasedAccess.js';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [needsProfileSetup, setNeedsProfileSetup] = useState(false);

  // Define the list of therapists
  const therapistList = [
    'Shane Bruce',
    'Silvia Popa',
    'Dahkotahv Beckham',
    'Avery Williams',
    'Nicole Mosher'
  ];

  // Helper function to determine user role
  const determineUserRole = (userData, userName) => {
    // If role is explicitly set in Firestore, use it
    if (userData?.role) {
      return userData.role;
    }
    
    // If user name is in therapist list, they are a therapist
    if (therapistList.includes(userName)) {
      return 'therapist';
    }
    
    // Default role
    return 'therapist';
  };

  // Check if user needs profile setup
  const checkProfileSetup = (userData) => {
    // User needs profile setup if they don't have firstName, lastName, or role
    const needsSetup = !userData?.firstName || !userData?.lastName || !userData?.role;
    console.log('🔍 Checking profile setup for user:', userData);
    console.log('🔍 Needs setup:', needsSetup);
    return needsSetup;
  };

  // Initialize user with token management
  const initializeUserWithTokens = async (user, userData) => {
    try {
      const userName = userData.name || `${userData.firstName || ''} ${userData.lastName || ''}`.trim();
      const userRole = determineUserRole(userData, userName);
      
      const userProfile = {
        uid: user.uid,
        email: user.email,
        emailVerified: user.emailVerified,
        ...userData,
        name: userName,
        role: userRole
      };

      // Check if user needs profile setup
      if (checkProfileSetup(userData)) {
        console.log('⚠️ User needs profile setup');
        setNeedsProfileSetup(true);
        setCurrentUser(userProfile);
        return userProfile;
      }

      // Set user in RBAC system
      rbac.setUser(userProfile);
      
      // Generate access token
      await authTokenManager.generateAccessToken();
      
      console.log('✅ User initialized with tokens:', userProfile);
      setCurrentUser(userProfile);
      setNeedsProfileSetup(false);
      
      return userProfile;
    } catch (error) {
      console.error('❌ Error initializing user with tokens:', error);
      throw error;
    }
  };

  // Manual refresh function to force update current user
  const refreshCurrentUser = async () => {
    const user = auth.currentUser;
    if (user) {
      console.log('🔄 Manual refresh triggered');
      await user.reload();
      const freshUser = auth.currentUser;
      console.log('🔄 Manual refresh: User reloaded, emailVerified:', freshUser.emailVerified);
      
      try {
        const userDoc = await getDoc(doc(db, 'users', freshUser.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          await initializeUserWithTokens(freshUser, userData);
        } else {
          const fallbackUser = {
            uid: freshUser.uid,
            email: freshUser.email,
            emailVerified: freshUser.emailVerified,
            name: freshUser.displayName || 'User',
            role: 'therapist'
          };
          console.log('⚠️ Manual refresh: Setting fallback user:', fallbackUser);
          setCurrentUser(fallbackUser);
          setNeedsProfileSetup(true);
        }
      } catch (error) {
        console.error('❌ Manual refresh error:', error);
      }
    }
  };

  async function signup({ email, password, firstName, lastName, role }) {
    try {
      // Create user in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Send email verification
      await sendEmailVerification(user);

      // Store user info in Firestore
      const userData = {
        email,
        firstName,
        lastName,
        role,
        name: `${firstName} ${lastName}`,
        emailVerified: false,
        createdAt: new Date().toISOString()
      };

      await setDoc(doc(db, 'users', user.uid), userData);

      return true;
    } catch (error) {
      console.error('Error in signup:', error);
      throw error;
    }
  }

  async function login(email, password) {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Reload user to get the latest email verification status
      await user.reload();
      
      // Get the fresh user object after reload
      const freshUser = auth.currentUser;
      
      console.log('🔄 User reloaded, emailVerified:', freshUser.emailVerified);
      
      // Check if email is verified
      if (!freshUser.emailVerified) {
        await signOut(auth);
        throw new Error('Please verify your email before logging in.');
      }

      // Get user data from Firestore and initialize with tokens
      const userDoc = await getDoc(doc(db, 'users', freshUser.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        await initializeUserWithTokens(freshUser, userData);
      } else {
        // Fallback for users without Firestore document
        const fallbackUser = {
          uid: freshUser.uid,
          email: freshUser.email,
          emailVerified: freshUser.emailVerified,
          name: freshUser.displayName || 'User',
          role: 'therapist'
        };
        await initializeUserWithTokens(freshUser, fallbackUser);
      }

      return true;
    } catch (error) {
      console.error('Error in login:', error);
      throw error;
    }
  }

  async function logout() {
    try {
      // Clear tokens before signing out
      authTokenManager.clearTokens();
      
      await signOut(auth);
      setCurrentUser(null);
      
      // Clear RBAC user
      rbac.setUser(null);
      
      return true;
    } catch (error) {
      console.error('Error in logout:', error);
      throw error;
    }
  }

  async function resendVerificationEmail() {
    try {
      if (auth.currentUser) {
        await sendEmailVerification(auth.currentUser);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error sending verification email:', error);
      throw error;
    }
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      console.log('🔥 Auth state changed:', user ? `User: ${user.email}, emailVerified: ${user.emailVerified}` : 'No user');
      
      if (user) {
        try {
          // Reload user to get the latest email verification status
          await user.reload();
          const freshUser = auth.currentUser;
          console.log('🔄 AuthContext: User reloaded, emailVerified:', freshUser.emailVerified);
          
          // Get user data from Firestore
          const userDoc = await getDoc(doc(db, 'users', freshUser.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            await initializeUserWithTokens(freshUser, userData);
          } else {
            // Fallback if no Firestore document exists
            const fallbackUserName = freshUser.displayName || 'User';
            const fallbackUser = {
              uid: freshUser.uid,
              email: freshUser.email,
              emailVerified: freshUser.emailVerified,
              name: fallbackUserName,
              role: determineUserRole(null, fallbackUserName)
            };
            console.log('⚠️ Setting fallback user (no Firestore doc):', fallbackUser);
            await initializeUserWithTokens(freshUser, fallbackUser);
          }
        } catch (error) {
          console.error('❌ Error fetching user data:', error);
          const errorFallbackUserName = user.displayName || 'User';
          const errorFallbackUser = {
            uid: user.uid,
            email: user.email,
            emailVerified: user.emailVerified,
            name: errorFallbackUserName,
            role: determineUserRole(null, errorFallbackUserName)
          };
          console.log('🚨 Setting error fallback user:', errorFallbackUser);
          setCurrentUser(errorFallbackUser);
        }
      } else {
        console.log('❌ No user, setting currentUser to null');
        setCurrentUser(null);
        // Clear tokens and RBAC when no user
        authTokenManager.clearTokens();
        rbac.setUser(null);
      }
      console.log('⏰ Setting loading to false');
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const value = {
    currentUser,
    signup,
    login,
    logout,
    resendVerificationEmail,
    refreshCurrentUser,
    loading,
    needsProfileSetup,
    setNeedsProfileSetup,
    // Add token management functions
    getValidAccessToken: authTokenManager.getValidAccessToken,
    refreshAccessToken: authTokenManager.refreshAccessToken,
    clearTokens: authTokenManager.clearTokens,
    isAuthenticated: authTokenManager.isAuthenticated
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
} 