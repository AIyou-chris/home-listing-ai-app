// Your web app's Firebase configuration
export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyBW3ziRQ4k04T446RORpiEdvnu2Zo_aDuY",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "home-listing-ai.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "home-listing-ai",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "home-listing-ai.appspot.com",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "511937287032",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:511937287032:web:f4e304e233cab8a2a5ae8d",
};