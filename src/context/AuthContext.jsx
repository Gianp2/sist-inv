import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  subscribeToAuth,
  loginWithEmail,
  registerUser,
  logoutUser,
  resetPassword as resetPasswordService,
  getExistingAdmin,
  getStoredSession,
  quickSwitchRole,
} from '../services/firebase/auth';
import { COLLECTIONS } from '../constants/collections';
import { getDocument, subscribeCollection } from '../services/firebase/firestore';
import { ROLES, hasPermission, ROLE_LABELS } from '../constants/roles';
import { seedDatabaseIfEmpty } from '../services/api/seedData';
import { toastAlert } from '../components/ui/Toast';

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => getStoredSession());
  const [loading, setLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeAdminUser, setActiveAdminUser] = useState(null);

  // Clear any existing auth error
  const clearError = useCallback(() => setError(null), []);

  // Fetch or sync the unique administrator registered in the system
  const syncAdminStatus = useCallback(async () => {
    try {
      const admin = await getExistingAdmin();
      setActiveAdminUser(admin);
      return admin;
    } catch (err) {
      console.warn('Error syncing admin status:', err);
      return null;
    }
  }, []);

  useEffect(() => {
    // Safety failsafe: never let page be stuck in loading state
    const safetyTimer = setTimeout(() => {
      setLoading(false);
      setIsInitializing(false);
    }, 400);

    // 1. Initial check & seed catalog/default admin
    seedDatabaseIfEmpty().then(() => {
      syncAdminStatus();
    }).catch(console.warn);

    // 2. Subscribe to users collection changes to track real-time admin role updates
    const unsubscribeUsers = subscribeCollection(
      COLLECTIONS.USERS,
      [],
      (usersList) => {
        const foundAdmin = usersList.find((u) => u.role === ROLES.ADMIN && u.active !== false);
        setActiveAdminUser(foundAdmin || null);

        // If current logged-in user had their role, active status, or permissions updated in Firestore, sync state
        if (user) {
          const currentInDb = usersList.find((u) => (u.uid || u.id) === (user.uid || user.id));
          if (currentInDb) {
            if (currentInDb.active === false) {
              logoutUser();
              setUser(null);
              return;
            }
            const permissionsChanged =
              JSON.stringify(currentInDb.permissions || null) !==
              JSON.stringify(user.permissions || null);

            if (
              currentInDb.role !== user.role ||
              currentInDb.active !== user.active ||
              permissionsChanged
            ) {
              setUser((prev) => {
                const updated = prev ? { ...prev, ...currentInDb } : currentInDb;
                setStoredSession(updated);
                return updated;
              });
            }
          }
        }
      },
      (err) => console.warn('Users subscription error in AuthProvider:', err)
    );

    // 3. Subscribe to Auth session state
    const unsubscribeAuth = subscribeToAuth((currentUser) => {
      setUser(currentUser);
      setLoading(false);
      setIsInitializing(false);
    });

    return () => {
      clearTimeout(safetyTimer);
      unsubscribeAuth();
      if (typeof unsubscribeUsers === 'function') {
        unsubscribeUsers();
      }
    };
  }, [syncAdminStatus]);

  // Refresh user data manually
  const refreshUser = useCallback(async () => {
    if (!user) return null;
    try {
      const doc = await getDocument(COLLECTIONS.USERS, user.uid || user.id);
      if (doc) {
        const updated = { ...user, ...doc };
        setUser(updated);
        return updated;
      }
    } catch (err) {
      console.warn('Error refreshing user:', err);
    }
    return user;
  }, [user]);

  // Login handler
  const login = async (email, password) => {
    setIsActionLoading(true);
    setError(null);
    try {
      const loggedUser = await loginWithEmail(email, password);
      setUser(loggedUser);
      await syncAdminStatus();
      return loggedUser;
    } catch (err) {
      setError(err.message || 'Error al iniciar sesión');
      throw err;
    } finally {
      setIsActionLoading(false);
      setLoading(false);
    }
  };

  // Register handler
  const register = async (email, password, displayName, role) => {
    setIsActionLoading(true);
    setError(null);
    try {
      const newUser = await registerUser(email, password, displayName, role);
      setUser(newUser);
      await syncAdminStatus();
      return newUser;
    } catch (err) {
      setError(err.message || 'Error al registrar usuario');
      throw err;
    } finally {
      setIsActionLoading(false);
      setLoading(false);
    }
  };

  // Logout handler
  const logout = async () => {
    setIsActionLoading(true);
    try {
      sessionStorage.removeItem('sistema_startup_toast');
      await logoutUser();
      setUser(null);
      setError(null);
      toastAlert.logoutSuccess();
    } catch (err) {
      toastAlert.error('Error al salir', err.message || 'No se pudo cerrar sesión');
    } finally {
      setIsActionLoading(false);
    }
  };

  // Password reset handler
  const resetPassword = async (email) => {
    setIsActionLoading(true);
    setError(null);
    try {
      await resetPasswordService(email);
      toastAlert.success('Correo enviado', 'Revisa tu casilla para restablecer la contraseña.');
    } catch (err) {
      setError(err.message || 'Error al enviar recuperación');
      toastAlert.error('Error al recuperar', err.message || 'No se pudo enviar el correo.');
      throw err;
    } finally {
      setIsActionLoading(false);
    }
  };

  // Quick switch between Owner and Employee
  const switchAccount = async (targetRole) => {
    setIsActionLoading(true);
    setError(null);
    try {
      const switchedUser = await quickSwitchRole(targetRole);
      setUser(switchedUser);
      await syncAdminStatus();
      const roleName = targetRole === ROLES.ADMIN || targetRole === 'ADMIN' ? 'Dueña / Administradora' : 'Vendedora';
      toastAlert.accountSwitched(roleName);
      return switchedUser;
    } catch (err) {
      setError(err.message || 'Error al alternar usuario');
      toastAlert.error('Error al cambiar usuario', err.message);
      throw err;
    } finally {
      setIsActionLoading(false);
    }
  };

  // Permission helpers
  const can = (permission) => {
    if (!user || user.active === false) return false;
    if (user.role === ROLES.ADMIN) return true;
    return hasPermission(user.role || ROLES.EMPLEADO, permission, user.permissions);
  };

  const canAny = (permissions = []) => {
    if (!user || user.active === false) return false;
    if (user.role === ROLES.ADMIN) return true;
    if (!Array.isArray(permissions)) return false;
    return permissions.some((perm) => can(perm));
  };

  const canAll = (permissions = []) => {
    if (!user || user.active === false) return false;
    if (user.role === ROLES.ADMIN) return true;
    if (!Array.isArray(permissions)) return false;
    return permissions.every((perm) => can(perm));
  };

  const isRole = (...roles) => {
    if (!user) return false;
    return roles.includes(user.role);
  };

  const isUniqueAdmin = Boolean(
    user &&
    user.role === ROLES.ADMIN &&
    (!activeAdminUser || (activeAdminUser.uid || activeAdminUser.id) === (user.uid || user.id) || activeAdminUser.email === user.email)
  );

  const value = {
    user,
    role: user?.role || ROLES.EMPLEADO,
    roleLabel: ROLE_LABELS[user?.role || ROLES.EMPLEADO] || 'Vendedor',
    loading,
    isInitializing,
    isActionLoading,
    error,
    clearError,
    activeAdminUser,
    isUniqueAdmin,
    login,
    register,
    logout,
    resetPassword,
    refreshUser,
    switchAccount,
    can,
    canAny,
    canAll,
    isRole,
    isAuthenticated: !!user && user.active !== false,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
