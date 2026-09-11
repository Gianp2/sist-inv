// Re-export of Firebase services
export {
  app as default,
  app,
  auth,
  db,
  storage,
  googleProvider,
  firebaseConfig,
} from '../services/firebase/config';

export * from '../services/firebase/firestore';
export * from '../services/firebase/auth';
