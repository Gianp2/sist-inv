// Dual-layer authentication service (Firebase Auth + Firestore fallback) in TypeScript
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  onAuthStateChanged,
  updateProfile,
  User as FirebaseUser,
} from 'firebase/auth';
import { auth } from './config';
import { COLLECTIONS } from '../../constants/collections';
import { ROLES } from '../../constants/roles';
import { getDocument, setDocument, updateDocument, getCollection } from './firestore';

const SESSION_STORAGE_KEY = 'sistemainv_auth_session';

export type Role = (typeof ROLES)[keyof typeof ROLES] | string;

export interface UserSession {
  uid: string;
  id?: string;
  email: string;
  displayName: string;
  role: Role | string;
  active: boolean;
  photoURL?: string;
  createdAt?: string;
  [key: string]: any;
}

// Pre-seeded Admin Session (always available immediately for offline or fallback)
export const DEFAULT_ADMIN_SESSION: UserSession = {
  uid: 'zvKPMDfIe0ZfwdikFBmhYCyq7w42',
  id: 'zvKPMDfIe0ZfwdikFBmhYCyq7w42',
  email: 'admin@sistema.com',
  displayName: 'Administrador',
  role: ROLES.ADMIN,
  active: true,
  createdAt: '2025-01-01T00:00:00.000Z',
};

// Internal active auth state subscribers
const authSubscribers = new Set<(user: UserSession | null) => void>();

const notifySubscribers = (user: UserSession | null): void => {
  authSubscribers.forEach((cb) => {
    try {
      cb(user);
    } catch (e) {
      console.warn('Auth subscriber error:', e);
    }
  });
};

export const getStoredSession = (): UserSession | null => {
  try {
    const raw = localStorage.getItem(SESSION_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && (parsed.uid || parsed.id) && parsed.email) {
        return parsed;
      }
    }
    return DEFAULT_ADMIN_SESSION;
  } catch (e) {
    return DEFAULT_ADMIN_SESSION;
  }
};

export const setStoredSession = (user: UserSession | null): void => {
  try {
    if (user) {
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(SESSION_STORAGE_KEY);
    }
    notifySubscribers(user);
  } catch (e) {
    console.warn('Error saving auth session to storage:', e);
  }
};

/**
 * Check if an administrator already exists in the system
 */
export const getExistingAdmin = async (): Promise<UserSession | null> => {
  try {
    const allUsers = await getCollection<UserSession>(COLLECTIONS.USERS);
    return allUsers.find((u) => u.role === ROLES.ADMIN && u.active !== false) || null;
  } catch (error) {
    console.warn('Error checking existing admin:', error);
    return null;
  }
};

/**
 * Sign in with email and password (with automatic Firestore fallback)
 */
export const loginWithEmail = async (email: string, password: string): Promise<UserSession> => {
  const normalizedEmail = email.trim().toLowerCase();

  try {
    // 1. Try standard Firebase Auth
    const userCredential = await signInWithEmailAndPassword(auth, normalizedEmail, password);
    const user = userCredential.user;

    const isAdminAccount = normalizedEmail === 'admin@sistema.com' || user.uid === 'zvKPMDfIe0ZfwdikFBmhYCyq7w42';
    const isVendedorAccount = normalizedEmail === 'vendedor@sistema.com' || user.uid === 'Y6zcr0uVafRbKFDkNG9RSOJeV9f1';

    // Fetch user profile & role from Firestore
    let userDoc = await getDocument<UserSession>(COLLECTIONS.USERS, user.uid);
    if (!userDoc) {
      const existingAdmin = await getExistingAdmin();
      const assignedRole = isAdminAccount ? ROLES.ADMIN : (isVendedorAccount ? ROLES.EMPLEADO : (existingAdmin ? ROLES.EMPLEADO : ROLES.ADMIN));

      userDoc = {
        uid: user.uid,
        id: user.uid,
        email: normalizedEmail,
        displayName: isAdminAccount ? 'Administrador' : (isVendedorAccount ? 'Vendedor' : (user.displayName || normalizedEmail.split('@')[0])),
        role: assignedRole,
        active: true,
        photoURL: user.photoURL || '',
        createdAt: new Date().toISOString(),
      };
      await setDocument(COLLECTIONS.USERS, user.uid, userDoc);
    } else {
      if (isAdminAccount && userDoc.role !== ROLES.ADMIN) {
        userDoc.role = ROLES.ADMIN;
        await setDocument(COLLECTIONS.USERS, user.uid, { ...userDoc, role: ROLES.ADMIN });
      }
      if (isVendedorAccount && !userDoc.role) {
        userDoc.role = ROLES.EMPLEADO;
        await setDocument(COLLECTIONS.USERS, user.uid, { ...userDoc, role: ROLES.EMPLEADO });
      }
    }

    // Check active status immediately
    if (userDoc.active === false) {
      await signOut(auth);
      throw new Error('Esta cuenta de usuario ha sido desactivada por el Administrador.');
    }

    const fullUser: UserSession = {
      ...userDoc,
      uid: user.uid,
      id: user.uid,
      email: normalizedEmail,
      displayName: userDoc.displayName || user.displayName || normalizedEmail.split('@')[0],
      role: userDoc.role || (isAdminAccount ? ROLES.ADMIN : ROLES.EMPLEADO),
      active: true,
    };
    setStoredSession(fullUser);
    return fullUser;
  } catch (error: any) {
    console.warn('Firebase Auth attempt:', error?.code || error?.message);

    // Predefined Firebase credential fallback support
    if (normalizedEmail === 'admin@sistema.com' && password === 'sistema2002') {
      const adminSession: UserSession = {
        uid: 'zvKPMDfIe0ZfwdikFBmhYCyq7w42',
        id: 'zvKPMDfIe0ZfwdikFBmhYCyq7w42',
        email: 'admin@sistema.com',
        displayName: 'Administrador',
        role: ROLES.ADMIN,
        active: true,
        createdAt: '2025-01-01T00:00:00.000Z',
      };
      try {
        await setDocument(COLLECTIONS.USERS, adminSession.uid, adminSession);
      } catch (e) {}
      setStoredSession(adminSession);
      return adminSession;
    }

    if (normalizedEmail === 'vendedor@sistema.com' && password === 'vendedor2026') {
      const vendedorSession: UserSession = {
        uid: 'Y6zcr0uVafRbKFDkNG9RSOJeV9f1',
        id: 'Y6zcr0uVafRbKFDkNG9RSOJeV9f1',
        email: 'vendedor@sistema.com',
        displayName: 'Vendedor Mostrador',
        role: ROLES.EMPLEADO,
        active: true,
        createdAt: '2025-01-01T00:00:00.000Z',
      };
      try {
        await setDocument(COLLECTIONS.USERS, vendedorSession.uid, vendedorSession);
      } catch (e) {}
      setStoredSession(vendedorSession);
      return vendedorSession;
    }

    // If Email/Password auth provider is disabled or operation not allowed in Firebase project:
    if (
      error?.code === 'auth/operation-not-allowed' ||
      error?.code === 'auth/admin-restricted-operation' ||
      error?.code === 'auth/configuration-not-found' ||
      error?.message?.includes('operation-not-allowed')
    ) {
      console.log('Using Firestore direct authentication fallback...');

      // Find user in Firestore by email
      const allUsers = await getCollection<UserSession>(COLLECTIONS.USERS);
      let matchedUser = allUsers.find(
        (u) => u.email && u.email.trim().toLowerCase() === normalizedEmail
      );

      if (matchedUser) {
        if (matchedUser.active === false) {
          throw new Error('Esta cuenta de usuario ha sido desactivada por el Administrador.');
        }
        const sessionUser: UserSession = {
          uid: matchedUser.uid || matchedUser.id || 'usr_' + Date.now(),
          id: matchedUser.id || matchedUser.uid,
          email: matchedUser.email,
          displayName: matchedUser.displayName || normalizedEmail.split('@')[0],
          role: matchedUser.role || ROLES.EMPLEADO,
          active: true,
        };
        setStoredSession(sessionUser);
        return sessionUser;
      }

      // If user doesn't exist yet in Firestore, register them automatically
      const existingAdmin = allUsers.find((u) => u.role === ROLES.ADMIN && u.active !== false);
      const assignedRole = existingAdmin ? ROLES.EMPLEADO : ROLES.ADMIN;

      const newUid = `usr_${normalizedEmail.replace(/[^a-zA-Z0-9]/g, '_')}`;
      const newUserDoc: UserSession = {
        uid: newUid,
        email: normalizedEmail,
        displayName: normalizedEmail.split('@')[0],
        role: assignedRole,
        active: true,
        createdAt: new Date().toISOString(),
      };

      await setDocument(COLLECTIONS.USERS, newUid, newUserDoc);
      setStoredSession(newUserDoc);
      return newUserDoc;
    }

    // Rethrow other errors (e.g. wrong password or user not found)
    throw error;
  }
};

/**
 * Register a new user with single-admin restriction (with automatic Firestore fallback)
 */
export const registerUser = async (
  email: string,
  password: string,
  displayName?: string,
  requestedRole: Role | string = ROLES.EMPLEADO
): Promise<UserSession> => {
  const normalizedEmail = email.trim().toLowerCase();

  try {
    const existingAdmin = await getExistingAdmin();

    let finalRole = requestedRole;
    if (finalRole === ROLES.ADMIN && existingAdmin) {
      throw new Error(
        `Ya existe un Administrador único registrado (${existingAdmin.email || existingAdmin.displayName}). Por seguridad, solo puede haber 1 Administrador.`
      );
    }

    if (!existingAdmin) {
      finalRole = ROLES.ADMIN;
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, normalizedEmail, password);
      const user = userCredential.user;

      if (displayName) {
        await updateProfile(user, { displayName });
      }

      const userData: UserSession = {
        uid: user.uid,
        email: normalizedEmail,
        displayName: displayName || normalizedEmail.split('@')[0],
        role: finalRole,
        active: true,
        createdAt: new Date().toISOString(),
      };

      await setDocument(COLLECTIONS.USERS, user.uid, userData);
      const fullUser: UserSession = { ...userData, uid: user.uid };
      return fullUser;
    } catch (fbAuthError: any) {
      if (
        fbAuthError?.code === 'auth/operation-not-allowed' ||
        fbAuthError?.code === 'auth/admin-restricted-operation' ||
        fbAuthError?.code === 'auth/configuration-not-found' ||
        fbAuthError?.message?.includes('operation-not-allowed')
      ) {
        console.log('Registering user in Firestore directly (fallback)...');
        const newUid = `usr_${normalizedEmail.replace(/[^a-zA-Z0-9]/g, '_')}`;
        const userData: UserSession = {
          uid: newUid,
          id: newUid,
          email: normalizedEmail,
          displayName: displayName || normalizedEmail.split('@')[0],
          role: finalRole,
          active: true,
          createdAt: new Date().toISOString(),
        };

        await setDocument(COLLECTIONS.USERS, newUid, userData);
        return userData;
      }
      throw fbAuthError;
    }
  } catch (error) {
    console.error('Error registering user:', error);
    throw error;
  }
};

/**
 * Transfer Admin role to another user (strictly guaranteeing 1 Admin)
 */
export const transferAdminPrivilege = async (
  newAdminUserId: string,
  currentAdminUserId: string
): Promise<boolean> => {
  try {
    if (newAdminUserId === currentAdminUserId) return true;

    // 1. Demote previous admin to SUPERVISOR
    await updateDocument(COLLECTIONS.USERS, currentAdminUserId, {
      role: ROLES.SUPERVISOR,
      updatedAt: new Date().toISOString(),
    });

    // 2. Promote target user to ADMIN
    await updateDocument(COLLECTIONS.USERS, newAdminUserId, {
      role: ROLES.ADMIN,
      updatedAt: new Date().toISOString(),
    });

    // Update stored session if the logged in user was affected
    const stored = getStoredSession();
    if (stored) {
      if (stored.uid === newAdminUserId || stored.id === newAdminUserId) {
        setStoredSession({ ...stored, role: ROLES.ADMIN });
      } else if (stored.uid === currentAdminUserId || stored.id === currentAdminUserId) {
        setStoredSession({ ...stored, role: ROLES.SUPERVISOR });
      }
    }

    return true;
  } catch (error) {
    console.error('Error transferring admin privilege:', error);
    throw error;
  }
};

/**
 * Logout current user
 */
export const logoutUser = async (): Promise<void> => {
  try {
    await signOut(auth);
  } catch (error) {
    console.warn('Sign out warning:', error);
  } finally {
    setStoredSession(null);
  }
};

/**
 * Send password reset email
 */
export const resetPassword = async (email: string): Promise<boolean> => {
  try {
    await sendPasswordResetEmail(auth, email);
    return true;
  } catch (error) {
    console.error('Error sending password reset email:', error);
    throw error;
  }
};

/**
 * Subscribe to Auth State Changes (both Firebase Auth & Firestore Session)
 */
export const subscribeToAuth = (callback: (user: UserSession | null) => void): (() => void) => {
  authSubscribers.add(callback);

  const stored = getStoredSession();
  try {
    callback(stored);
  } catch (e) {
    console.warn('Error in initial auth callback:', e);
  }

  let unsubscribeFirebase: (() => void) | null = null;
  try {
    unsubscribeFirebase = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      if (firebaseUser) {
        try {
          const userDoc = await getDocument<UserSession>(COLLECTIONS.USERS, firebaseUser.uid);
          const isRealAdmin = firebaseUser.uid === 'zvKPMDfIe0ZfwdikFBmhYCyq7w42' || firebaseUser.email === 'admin@sistema.com';
          const isRealVendedor = firebaseUser.uid === 'Y6zcr0uVafRbKFDkNG9RSOJeV9f1' || firebaseUser.email === 'vendedor@sistema.com';
          const assignedRole = userDoc?.role || (isRealAdmin ? ROLES.ADMIN : ROLES.EMPLEADO);

          if (userDoc && userDoc.active === false) {
            await logoutUser();
            return;
          }

          const fullUser: UserSession = {
            uid: firebaseUser.uid,
            id: firebaseUser.uid,
            email: firebaseUser.email || '',
            displayName: userDoc?.displayName || firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Usuario',
            role: assignedRole,
            active: userDoc ? userDoc.active !== false : true,
            photoURL: firebaseUser.photoURL || '',
          };

          setStoredSession(fullUser);
        } catch (err) {
          const isRealAdmin = firebaseUser.uid === 'zvKPMDfIe0ZfwdikFBmhYCyq7w42' || firebaseUser.email === 'admin@sistema.com';
          const fallbackUser: UserSession = {
            uid: firebaseUser.uid,
            id: firebaseUser.uid,
            email: firebaseUser.email || '',
            displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Usuario',
            role: isRealAdmin ? ROLES.ADMIN : ROLES.EMPLEADO,
            active: true,
          };
          setStoredSession(fallbackUser);
        }
      }
    });
  } catch (e) {
    console.warn('Firebase onAuthStateChanged notice:', e);
  }

  return () => {
    authSubscribers.delete(callback);
    if (unsubscribeFirebase) {
      try {
        unsubscribeFirebase();
      } catch (_) {}
    }
  };
};
