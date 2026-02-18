import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";
import { getAuth, 
  sendEmailVerification,
  PhoneAuthProvider,
  signInWithCredential,
  RecaptchaVerifier,
  isSignInWithEmailLink,
  signInWithEmailLink
} from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyCOJ43uYDQpsUv9QpE6pDuPWkjgjGS2EU4",
  authDomain: "smart-bin-32996.firebaseapp.com",
  databaseURL: "https://smart-bin-32996-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "smart-bin-32996",
  storageBucket: "smart-bin-32996.firebasestorage.app",
  messagingSenderId: "640397545402",
  appId: "1:640397545402:web:ee590dd47aace417485783",
  measurementId: "G-PFN1CSZRN8"
};

const app = initializeApp(firebaseConfig);
const database = getDatabase(app);
const auth = getAuth(app);

export { database, auth, sendEmailVerification,
  PhoneAuthProvider,
  signInWithCredential,
  RecaptchaVerifier,
  isSignInWithEmailLink,
  signInWithEmailLink 
};