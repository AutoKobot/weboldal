import { initializeApp } from "firebase/app";
import { getAuth, signInWithRedirect, GoogleAuthProvider, getRedirectResult } from "firebase/auth";

// Check if Firebase config is available
const isFirebaseConfigured = !!(
  import.meta.env.VITE_FIREBASE_API_KEY &&
  import.meta.env.VITE_FIREBASE_PROJECT_ID &&
  import.meta.env.VITE_FIREBASE_APP_ID
);

let auth: any = null;
let googleProvider: any = null;

if (isFirebaseConfigured) {
  const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: `${import.meta.env.VITE_FIREBASE_PROJECT_ID}.firebaseapp.com`,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: `${import.meta.env.VITE_FIREBASE_PROJECT_ID}.firebasestorage.app`,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
  };

  const app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  googleProvider = new GoogleAuthProvider();
}

export { auth, googleProvider };

// Check if Firebase is configured
export function isFirebaseEnabled() {
  return isFirebaseConfigured;
}

// Google sign-in function
export function signInWithGoogle() {
  if (!isFirebaseConfigured || !auth || !googleProvider) {
    throw new Error('Firebase nincs konfigurálva');
  }
  return signInWithRedirect(auth, googleProvider);
}

// Handle redirect result after Google sign-in
export async function handleGoogleRedirect() {
  if (!isFirebaseConfigured || !auth) {
    return null;
  }
  
  try {
    const result = await getRedirectResult(auth);
    if (result) {
      const user = result.user;
      const credential = GoogleAuthProvider.credentialFromResult(result);
      return {
        user,
        token: credential?.accessToken,
      };
    }
    return null;
  } catch (error) {
    console.error('Google sign-in error:', error);
    throw error;
  }
}