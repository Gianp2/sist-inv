// Firebase Initialization & Service Setup in TypeScript
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, Auth } from 'firebase/auth';
import {
  initializeFirestore,
  getFirestore,
  setLogLevel,
  Firestore,
  enableIndexedDbPersistence,
  enableMultiTabIndexedDbPersistence,
} from 'firebase/firestore';
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

// Enable local offline persistence using IndexedDB so the application remains
// fast and maintains complete data availability even when internet connectivity is unstable or offline.
export let persistencePromise: Promise<void> | null = null;

if (typeof window !== 'undefined' && typeof window.indexedDB !== 'undefined') {
  const initPersistence = async (): Promise<void> => {
    // 1. Try multi-tab IndexedDB persistence first so multiple tabs can query offline simultaneously
    if (typeof enableMultiTabIndexedDbPersistence === 'function') {
      try {
        await enableMultiTabIndexedDbPersistence(firestoreDb);
        console.info('[Firestore Persistence]: Multi-tab IndexedDB persistence active.');
        return;
      } catch (multiTabErr: any) {
        // Fall through to enableIndexedDbPersistence
      }
    }

    // 2. Fall back to standard single-tab enableIndexedDbPersistence
    try {
      await enableIndexedDbPersistence(firestoreDb);
      console.info('[Firestore Persistence]: Local IndexedDB persistence enabled successfully.');
    } catch (err: any) {
      if (err?.code === 'failed-precondition') {
        console.warn(
          '[Firestore Persistence Notice]: Multiple tabs open, offline IndexedDB persistence active in primary tab.'
        );
      } else if (err?.code === 'unimplemented') {
        console.warn(
          '[Firestore Persistence Notice]: Browser environment does not support IndexedDB persistence.'
        );
      } else {
        console.warn('[Firestore Persistence Notice]:', err?.message || err);
      }
    }
  };

  persistencePromise = initPersistence();
}

export { enableIndexedDbPersistence, enableMultiTabIndexedDbPersistence };
export const db: Firestore = firestoreDb;
export const storage: FirebaseStorage = getStorage(app);
export default app;
