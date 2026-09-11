// Re-export of Firebase instance and database services
export {
  app as default,
  app,
  auth,
  db,
  storage,
  googleProvider,
  firebaseConfig,
} from './services/firebase/config';

export * from './services/firebase/firestore';
export * from './services/firebase/auth';
