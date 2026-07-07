import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyAAa_-PwzGWJkYwZh46HxfePPqbKbVEkQ4",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "good-for-you-test-engine.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "good-for-you-test-engine",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "good-for-you-test-engine.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "818411947971",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:818411947971:web:c3b848142b25a333ac1f76",
};

export const firebaseApp = initializeApp(firebaseConfig);
export const firebaseAuth = getAuth(firebaseApp);
export const firestore = getFirestore(firebaseApp);

