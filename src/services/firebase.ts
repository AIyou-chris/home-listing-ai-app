import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';
import { firebaseConfig } from '../config';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const functions = getFunctions(app, 'us-central1');

// Connect to functions emulator in development
if (import.meta.env.DEV) {
  const port = Number(import.meta.env.VITE_FUNCTIONS_EMULATOR_PORT || 5001);
  connectFunctionsEmulator(functions, 'localhost', port);
}

// Export initialized SDK instances (app exported to support services needing it)
export { app, auth, db, functions };