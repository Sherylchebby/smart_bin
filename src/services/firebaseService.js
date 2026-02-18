import { 
  ref, 
  query, 
  get, 
  set, 
  remove, 
  orderByChild, 
  equalTo,
  runTransaction,
  update
} from "firebase/database";
import { auth, 
  database,
  sendEmailVerification,
  PhoneAuthProvider,
  signInWithCredential,
  RecaptchaVerifier 
} from "../firebase/config";

/**
 * Gets user ID from RFID registry (exact match)
 * @param {string} rfid
 * @returns {Promise<string|null>} - User ID or null if not found
 */
export const getUserIdFromRfid = async (rfid) => {
  if (!rfid || !/^[a-f0-9]{8}$/i.test(rfid)) {
    console.error('Invalid RFID format in getUserIdFromRfid');
    return null;
  }

  const snapshot = await get(ref(database, `rfidRegistry/${rfid.toLowerCase()}`));
  return snapshot.exists() ? snapshot.val() : null;
};

/**
 * Checks if RFID exists in unregistered list (exact uid match)
 * @param {string} rfid - 8-character hex RFID
 * @returns {Promise<boolean>}
 */
export const isRfidUnregistered = async (rfid) => {
  if (!rfid || !/^[a-f0-9]{8}$/i.test(rfid)) {
    console.error('Invalid RFID format in isRfidUnregistered');
    return false;
  }

  const queryRef = query(
    ref(database, 'unregisteredRfids'),
    orderByChild('uid'),
    equalTo(rfid.toLowerCase())
  );
  const snapshot = await get(queryRef);
  return snapshot.exists();
};

/**
 * Registers new user with RFID (atomic operation)
 * @param {string} userId - Firebase Auth user ID
 * @param {object} userData - { name, email, phone? }
 * @param {string} rfid - 8-character hex RFID
 */
export const registerUserWithRfid = async (userId, userData, rfid) => {
  if (!rfid || !/^[a-f0-9]{8}$/i.test(rfid)) {
    throw new Error('Invalid RFID format during registration');
  }

  const normalizedRfid = rfid.toLowerCase();
  const normalizedPhone = userData.phone 
    ? (userData.phone.startsWith('+') ? userData.phone : `+${userData.phone.replace(/\D/g, '')}`)
    : null;

  await runTransaction(ref(database, 'metadata'), async () => {
    // 1. Add user data with RFID in userData
    await set(ref(database, `users/${userId}`), {
      basicInfo: {
        name: userData.name,
        email: userData.email,
        ...(normalizedPhone && { phone: normalizedPhone })
      },
      userData: {
        rfid: normalizedRfid,
        points: 0,
        joinedAt: Date.now(),
        isAdmin: false
      }
    });

    // 2. Add to RFID registry
    await set(ref(database, `rfidRegistry/${normalizedRfid}`), userId);

    // 3. Remove from unregistered RFIDs
    const unregisteredQuery = query(
      ref(database, 'unregisteredRfids'),
      orderByChild('uid'),
      equalTo(normalizedRfid)
    );
    const snapshot = await get(unregisteredQuery);
    
    if (snapshot.exists()) {
      const removals = [];
      snapshot.forEach((child) => {
        removals.push(remove(ref(database, `unregisteredRfids/${child.key}`)));
      });
      await Promise.all(removals);
    }
  });
};

/**
 * Gets complete user data by ID
 * @param {string} userId 
 * @returns {Promise<object|null>} - User data or null
 */
export const getUserData = async (userId) => {
  const snapshot = await get(ref(database, `users/${userId}`));
  return snapshot.exists() ? snapshot.val() : null;
};

/**
 * Gets all unregistered RFIDs in database format
 * @returns {Promise<Array<{id: string, uid: string, timestamp: number}>>}
 */
export const getUnregisteredRfids = async () => {
  const snapshot = await get(ref(database, 'unregisteredRfids'));
  
  if (!snapshot.exists()) return [];
  
  const rfids = [];
  snapshot.forEach((child) => {
    rfids.push({
      id: child.key,
      uid: child.val().uid,
      timestamp: child.val().timestamp
    });
  });
  
  return rfids;
};

/**
 * Comprehensive RFID availability check
 * @param {string} rfid - 8-character hex RFID
 * @returns {Promise<{available: boolean, message: string}>}
 */
export const isRfidAvailable = async (rfid) => {
  try {
    if (!rfid) {
      return { available: false, message: 'RFID is required' };
    }

    // Check registry
    const registrySnapshot = await get(ref(database, `rfidRegistry/${rfid}`));
    if (registrySnapshot.exists()) {
      return { available: false, message: 'RFID already registered' };
    }

    // Check unregistered
    const unregisteredQuery = query(
      ref(database, 'unregisteredRfids'),
      orderByChild('uid'),
      equalTo(rfid)
    );
    const unregisteredSnapshot = await get(unregisteredQuery);

    return {
      available: unregisteredSnapshot.exists(),
      message: unregisteredSnapshot.exists() 
        ? 'RFID available' 
        : 'RFID not scanned yet'
    };
  } catch (error) {
    console.error('RFID check error:', error);
    return {
      available: false,
      message: 'Error checking RFID status'
    };
  }
};

// Authentication Services
export const authService = {
  // Email Verification
  sendEmailVerification: async (user) => {
    try {
      await sendEmailVerification(user);
      return { success: true };
    } catch (error) {
      return { error: error.message };
    }
  },

  // Phone OTP Verification
  verifyPhoneNumber: async (phoneNumber, recaptchaVerifier) => {
    try {
      const provider = new PhoneAuthProvider(auth);
      const verificationId = await provider.verifyPhoneNumber(
        phoneNumber, 
        recaptchaVerifier
      );
      return { verificationId };
    } catch (error) {
      return { error: error.message };
    }
  },

  // Verify OTP
  verifyOTP: async (verificationId, verificationCode) => {
    try {
      const credential = PhoneAuthProvider.credential(
        verificationId, 
        verificationCode
      );
      const userCredential = await signInWithCredential(auth, credential);
      return { user: userCredential.user };
    } catch (error) {
      return { error: error.message };
    }
  },

  // Setup Recaptcha
  setupRecaptcha: (containerId) => {
    return new RecaptchaVerifier(auth, containerId, {
      size: "invisible",
    });
  }
};

// Database Services
export const dbService = {
  // User Operations
  getUser: async (userId) => {
    const snapshot = await get(ref(database, `users/${userId}`));
    return snapshot.exists() ? snapshot.val() : null;
  },

  getUserByPhone: async (phone) => {
    try {
      // Normalize phone number format
      const normalizedPhone = phone.startsWith('+') ? phone : `+${phone.replace(/\D/g, '')}`;
      
      // Query all users and filter by phone (since Realtime Database doesn't support direct queries on nested fields)
      const snapshot = await get(ref(database, 'users'));
      if (!snapshot.exists()) return null;
      
      let foundUser = null;
      snapshot.forEach((userSnapshot) => {
        const userData = userSnapshot.val();
        if (userData.basicInfo?.phone === normalizedPhone) {
          foundUser = {
            id: userSnapshot.key,
            ...userData
          };
        }
      });
      
      return foundUser;
    } catch (error) {
      console.error('Error finding user by phone:', error);
      throw error;
    }
  },

  createUser: async (userId, userData) => {
    await set(ref(database, `users/${userId}`), userData);
  },

  updateUser: async (userId, updates) => {
    await update(ref(database, `users/${userId}`), updates);
  },

  // RFID Operations
  getRfidUser: async (rfid) => {
    const snapshot = await get(ref(database, `rfidRegistry/${rfid}`));
    return snapshot.exists() ? snapshot.val() : null;
  },

  // Transactions
  createTransaction: async (transactionData) => {
    const newTransactionRef = ref(database, 'transactions').push();
    await set(newTransactionRef, transactionData);
    return newTransactionRef.key;
  },

  getUserTransactions: async (userId) => {
    const snapshot = await get(ref(database, 'transactions'));
    const transactions = [];
    snapshot.forEach((child) => {
      if (child.val().userId === userId) {
        transactions.push({
          id: child.key,
          ...child.val()
        });
      }
    });
    return transactions;
  },

  // Test Connection (for your Arduino logs)
  getTestConnections: async () => {
    const snapshot = await get(ref(database, 'testConnection'));
    return snapshot.exists() ? snapshot.val() : null;
  }
};