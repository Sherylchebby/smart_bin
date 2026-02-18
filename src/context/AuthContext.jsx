import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
  updateProfile,
  sendEmailVerification as firebaseSendEmailVerification,
  signInWithPhoneNumber,
  RecaptchaVerifier,
  PhoneAuthProvider,
  signInWithCredential,
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signInWithEmailLink,
  sendPasswordResetEmail // Added this import
} from 'firebase/auth';
import { auth } from '../firebase/config';
import { isRfidAvailable, dbService } from '../services/firebaseService'; // Removed unused imports
import { ref, set, get, remove, runTransaction } from 'firebase/database'; // Removed unused imports
import { database } from '../firebase/config';

const AuthContext = createContext();

export const useAuth = () => {
  return useContext(AuthContext);
};

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState(null);
  const [error, setError] = useState('');
  const [verificationMethod, setVerificationMethod] = useState(null); // 'email' or 'phone'
  const [verificationPending, setVerificationPending] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState('');
  const [confirmationResult, setConfirmationResult] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        await fetchUserData(user.uid);
      } else {
        setUserData(null);
      }
      setLoading(false);
    });

    // Handle email link authentication if the URL contains a sign-in link
    if (isSignInWithEmailLink(auth, window.location.href)) {
      handleEmailLinkSignIn();
    }

    return unsubscribe;
  }, []);

  const fetchUserData = async (userId) => {
    try {
      const data = await dbService.getUser(userId);
      setUserData(data);
      return data;
    } catch (error) {
      console.error('Error fetching user data:', error);
      setError('Failed to fetch user data');
      throw error;
    }
  };

  const startEmailVerification = async (email) => {
    try {
      setLoading(true);
      setError('');
      const actionCodeSettings = {
        url: `${window.location.origin}/verify-email`,
        handleCodeInApp: true,
      };
      await firebaseSendEmailVerification(auth.currentUser, actionCodeSettings);
      setVerificationEmail(email);
      setVerificationMethod('email');
      setVerificationPending(true);
      return true;
    } catch (error) {
      console.error("Email verification error:", error);
      setError('Failed to send verification email');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const resendVerificationEmail = async () => {
      return startEmailVerification(verificationEmail);
  };

  const resetPassword = async (email) => {
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (error) {
      throw error;
    }
  };

  const startPhoneVerification = async (phoneNumber) => {
    try {
      setLoading(true);
      setError('');
      const recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
        size: 'invisible',
      });
      const confirmation = await signInWithPhoneNumber(
        auth,
        phoneNumber,
        recaptchaVerifier
      );
      setConfirmationResult(confirmation);
      setVerificationMethod('phone');
      setVerificationPending(true);
      return confirmation;
    } catch (error) {
      console.error("Phone verification error:", error);
      setError('Failed to send verification code');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const verifyOTP = async (code) => {
    try {
      setLoading(true);
      setError('');
      const credential = PhoneAuthProvider.credential(confirmationResult.verificationId, code);
      const userCredential = await signInWithCredential(auth, credential);
      setCurrentUser(userCredential.user);
      setVerificationPending(false);
      await fetchUserData(userCredential.user.uid);
      return userCredential;
    } catch (error) {
      console.error("OTP verification error:", error);
      setError('Invalid verification code');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const handleEmailLinkSignIn = async () => {
    try {
      setLoading(true);
      setError('');
      
      // Check if we have the email in localStorage or prompt user
      let email = window.localStorage.getItem('emailForSignIn');
      if (!email) {
        email = window.prompt('Please provide your email for confirmation');
      }
      
      if (email) {
        const result = await signInWithEmailLink(auth, email, window.location.href);
        setCurrentUser(result.user);
        setVerificationPending(false);
        window.localStorage.removeItem('emailForSignIn');
        window.history.replaceState({}, document.title, "/");
        return result;
      }
      return null;
    } catch (error) {
      console.error("Email link sign-in error:", error);
      setError('Failed to verify email');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const sendEmailSignInLink = async (email) => {
    try {
      setLoading(true);
      setError('');
      const actionCodeSettings = {
        url: `${window.location.origin}/login`,
        handleCodeInApp: true,
      };
      await sendSignInLinkToEmail(auth, email, actionCodeSettings);
      window.localStorage.setItem('emailForSignIn', email);
      return true;
    } catch (error) {
      console.error("Error sending sign-in link:", error);
      setError('Failed to send sign-in link');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const setupRecaptcha = (containerId) => {
    try {
      return new RecaptchaVerifier(auth, containerId, {
        size: 'invisible',
      });
    } catch (error) {
      console.error("Recaptcha setup error:", error);
      setError('Failed to setup recaptcha');
      throw error;
    }
  };

  const updateUserProfile = async (updates) => {
    if (!currentUser) {
      setError("No user logged in");
      return { error: "No user logged in" };
    }
    try {
      await dbService.updateUser(currentUser.uid, updates);
      return await fetchUserData(currentUser.uid);
    } catch (error) {
      console.error("Error updating user profile:", error);
      setError('Failed to update profile');
      throw error;
    }
  };

  const loginWithPhone = async (phone, password) => {
    try {
      setLoading(true);
      setError('');
      
      const normalizedPhone = phone.startsWith('+') 
        ? phone 
        : `+${phone.replace(/\D/g, '')}`;
      
      const userWithPhone = await dbService.getUserByPhone(normalizedPhone);
      
      if (!userWithPhone) {
        setError('No account found with this phone number');
        throw new Error('No account found with this phone number');
      }
      
      if (!userWithPhone.basicInfo?.email) {
        setError('Account not properly configured');
        throw new Error('Account not properly configured');
      }
      
      const userCredential = await signInWithEmailAndPassword(
        auth,
        userWithPhone.basicInfo.email,
        password
      );
      
      await fetchUserData(userCredential.user.uid);
      return userCredential;
    } catch (error) {
      console.error('Phone login failed:', error);
      setError(error.message || 'Login failed. Check phone number and password.');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const loginWithEmail = async (email, password) => {
    try {
      setLoading(true);
      setError('');
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      await fetchUserData(userCredential.user.uid);
      return userCredential.user;
    } catch (error) {
      console.error('Email login failed:', error);
      setError(error.message || 'Login failed. Check your credentials.');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const register = async ({ email, password, name, rfid, phone }) => {
    try {
      setLoading(true);
      setError('');
      
      if (!rfid || !/^[a-f0-9]{8}$/i.test(rfid)) {
        throw new Error('Invalid RFID format');
      }

      const normalizedRfid = rfid.toLowerCase();
      const { available, message } = await isRfidAvailable(normalizedRfid);
      if (!available) {
        throw new Error(message);
      }

      // 1. Create auth user (will generate UID)
      const userCredential = await createUserWithEmailAndPassword(
        auth, 
        email, 
        password
      );
      const user = userCredential.user;
      
      // 2. Save user data DIRECTLY to users/{uid}
      await set(ref(database, `users/${user.uid}`), {
        basicInfo: {
          name,
          email,
          phone: phone ? (phone.startsWith('+') ? phone : `+${phone.replace(/\D/g, '')}`) : null,
          createdAt: Date.now(),
          verified: false
        },
        userData: {
          rfid: normalizedRfid,
          points: 0,
          joinedAt: Date.now(),
          isAdmin: false,
          isVendor: false,
          status: 'unverified'
        }
      });

      // 3. Update RFID registry
      await set(ref(database, `rfidRegistry/${normalizedRfid}`), user.uid);

      // 4. Send verification email
      const actionCodeSettings = {
        url: window.location.hostname === 'localhost' 
          ? `http://${window.location.host}/verify-email`
          : `https://${window.location.host}/verify-email`,
        handleCodeInApp: true
      };
      
      await firebaseSendEmailVerification(user, actionCodeSettings);

      return { userId: user.uid, email };
      
    } catch (error) {
      // Rollback: Delete auth user if DB operations failed
      if (auth.currentUser?.uid) {
        await auth.currentUser.delete().catch(console.warn);
      }
      
      let errorMessage = error.message;
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'Email already in use';
      }
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const completeRegistration = async (tempUserId) => {
    try {
      setLoading(true);
      
      // 1. Get the temporary user data
      const tempUserRef = ref(database, `tempUsers/${tempUserId}`);
      const tempUserSnapshot = await get(tempUserRef);
      
      if (!tempUserSnapshot.exists()) {
        throw new Error('Registration link expired or invalid');
      }
      
      const tempUserData = tempUserSnapshot.val();
      
      // 2. Verify current authenticated user
      const user = auth.currentUser;
      if (!user) {
        throw new Error('User authentication failed');
      }
      
      // 3. Ensure email is verified
      await user.reload();
      if (!user.emailVerified) {
        throw new Error('Please verify your email first');
      }

      // 4. Use transaction to safely move data
      await runTransaction(ref(database), async (currentData) => {
        // Create main user entry
        if (!currentData.users) currentData.users = {};
        currentData.users[user.uid] = {
          basicInfo: {
            name: tempUserData.name,
            email: tempUserData.email,
            phone: tempUserData.phone || null,
            createdAt: Date.now()
          },
          userData: {
            rfid: tempUserData.rfid,
            points: 0,
            joinedAt: Date.now(),
            isAdmin: false,
            isVendor: false,
            status: 'active'
          }
        };

        // Update RFID registry
        if (!currentData.rfidRegistry) currentData.rfidRegistry = {};
        currentData.rfidRegistry[tempUserData.rfid] = user.uid;

        // Remove from unregistered RFIDs if exists
        if (currentData.unregisteredRfids) {
          Object.keys(currentData.unregisteredRfids).forEach(key => {
            if (currentData.unregisteredRfids[key].uid === tempUserData.rfid) {
              delete currentData.unregisteredRfids[key];
            }
          });
        }

        return currentData;
      });

      // 5. Delete temp user data after successful transfer
      await remove(tempUserRef);

      // 6. Update local state
      await fetchUserData(user.uid);
      
      return user;
    } catch (error) {
      console.error('Registration completion failed:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      setCurrentUser(null);
      setUserData(null);
      setError('');
      setVerificationPending(false);
    } catch (error) {
      console.error('Logout failed:', error);
      setError('Failed to logout');
      throw error;
    }
  };

  const value = {
    currentUser,
    userData,
    loading,
    error,
    verificationMethod,
    verificationPending,
    verificationEmail,
    confirmationResult,
    clearError: () => setError(''),
    loginWithEmail,
    loginWithPhone,
    register,
    completeRegistration,
    logout,
    startEmailVerification,
    resendVerificationEmail,
    startPhoneVerification,
    verifyOTP,
    sendEmailSignInLink,
    handleEmailLinkSignIn,
    setupRecaptcha,
    updateUserProfile,
    fetchUserData,
    resetPassword
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}