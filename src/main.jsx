import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './index.css';

// Filter out benign Firestore offline/connection retry messages
if (typeof window !== 'undefined') {
  const originalError = console.error;
  console.error = function (...args) {
    const first = args[0];
    if (
      typeof first === 'string' &&
      (first.includes('Could not reach Cloud Firestore backend') ||
       first.includes('@firebase/firestore: Firestore') ||
       first.includes('[code=unavailable]'))
    ) {
      // Benign connection retry / temporary offline indicator - suppress from fatal error loggers
      return;
    }
    originalError.apply(console, args);
  };
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
);
