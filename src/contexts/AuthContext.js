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

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

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
          const userProfile = {
            uid: freshUser.uid,
            email: freshUser.email,
            emailVerified: freshUser.emailVerified,
            ...userData
          };
          console.log('✅ Manual refresh: Setting current user from Firestore:', userProfile);
          setCurrentUser(userProfile);
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
      await setDoc(doc(db, 'users', user.uid), {
        email,
        firstName,
        lastName,
        role,
        name: `${firstName} ${lastName}`,
        emailVerified: false,
        createdAt: new Date().toISOString()
      });

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

      // Force refresh the current user in context
      await refreshCurrentUser();

      return true;
    } catch (error) {
      console.error('Error in login:', error);
      throw error;
    }
  }

  async function logout() {
    try {
      await signOut(auth);
      setCurrentUser(null);
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
            const userProfile = {
              uid: freshUser.uid,
              email: freshUser.email,
              emailVerified: freshUser.emailVerified,
              ...userData
            };
            console.log('✅ Setting current user from Firestore:', userProfile);
            setCurrentUser(userProfile);
          } else {
            // Fallback if no Firestore document exists
            const fallbackUser = {
              uid: freshUser.uid,
              email: freshUser.email,
              emailVerified: freshUser.emailVerified,
              name: freshUser.displayName || 'User',
              role: 'therapist'
            };
            console.log('⚠️ Setting fallback user (no Firestore doc):', fallbackUser);
            setCurrentUser(fallbackUser);
          }
        } catch (error) {
          console.error('❌ Error fetching user data:', error);
          const errorFallbackUser = {
            uid: user.uid,
            email: user.email,
            emailVerified: user.emailVerified,
            name: user.displayName || 'User',
            role: 'therapist'
          };
          console.log('🚨 Setting error fallback user:', errorFallbackUser);
          setCurrentUser(errorFallbackUser);
        }
      } else {
        console.log('❌ No user, setting currentUser to null');
        setCurrentUser(null);
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
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
} 