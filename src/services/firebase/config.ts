// Firebase Initialization & Service Setup in TypeScript
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, Auth } from 'firebase/auth';
import { initializeFirestore, getFirestore, setLogLevel, Firestore } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';

export const firebaseConfig = {
  apiKey: "AIzaSyDrXqYLQA2Ukq6LqWqKOLW0YhfPUT-_dUE",
  authDomain: "fashion-9eb8f.firebaseapp.com",
  projectId: "fashion-9eb8f",
  storageBucket: "fashion-9eb8f.firebasestorage.app",
  messagingSenderId: "748901675669",
  appId: "1:748901675669:web:baca475e0eea52c22d619c",
  measurementId: "G-YC9Z19DP7V"
};

export const app: FirebaseApp = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Silence Firestore benign connection retry logs (e.g. unavailable retry warnings)
try {
  setLogLevel('silent');
} catch (e) {}

export const auth: Auth = getAuth(app);
export const googleProvider: GoogleAuthProvider = new GoogleAuthProvider();

// Initialize Firestore with robust auto-detect long polling and silent logging
let firestoreDb: Firestore;
try {
  firestoreDb = initializeFirestore(app, {
    experimentalAutoDetectLongPolling: true,
  });
} catch (e) {
  firestoreDb = getFirestore(app);
}

export const db: Firestore = firestoreDb;
export const storage: FirebaseStorage = getStorage(app);
export default app;
