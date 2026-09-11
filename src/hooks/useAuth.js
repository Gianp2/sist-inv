import { useContext, useMemo } from 'react';
import { AuthContext } from '../context/AuthContext';
import { ROLES, ROLE_LABELS, ROLE_PERMISSIONS, hasPermission } from '../constants/roles';

/**
 * Base Authentication & Permissions Hook
 * 
 * Manages user persistence, session loading states, role validation,
 * and verifies whether the current logged-in user is the SINGLE authorized administrator.
 */
export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  const {
    user,
    loading,
    isInitializing,
    isActionLoading,
    error,
    clearError,
    login,
    register,
    logout,
    resetPassword,
    refreshUser,
    activeAdminUser,
  } = context;

  // Compute role flags and unique administrator validation
  const authDetails = useMemo(() => {
    const isAuthenticated = !!user && user.active !== false;
    const role = user?.role || ROLES.EMPLEADO;

    // Check if the current user is specifically the UNIQUE authorized Administrator
    const isMasterAdminRole = role === ROLES.ADMIN;
    const isMatchingSystemAdmin = activeAdminUser
      ? (activeAdminUser.uid === user?.uid || activeAdminUser.id === user?.uid || activeAdminUser.email === user?.email)
      : isMasterAdminRole;

    const isUniqueAdmin = Boolean(isAuthenticated && isMasterAdminRole && isMatchingSystemAdmin);

    const isAdmin = role === ROLES.ADMIN;
    const isSupervisor = role === ROLES.SUPERVISOR;
    const isCajero = role === ROLES.CAJERO;
    const isEmpleado = role === ROLES.EMPLEADO;

    const roleLabel = ROLE_LABELS[role] || 'Usuario';

    // Granular permission check methods
    const can = (permission) => {
      if (!isAuthenticated) return false;
      if (isUniqueAdmin || isAdmin) return true;
      return hasPermission(role, permission);
    };

    const canAny = (permissions = []) => {
      if (!isAuthenticated) return false;
      if (isUniqueAdmin || isAdmin) return true;
      return permissions.some((perm) => hasPermission(role, perm));
    };

    const canAll = (permissions = []) => {
      if (!isAuthenticated) return false;
      if (isUniqueAdmin || isAdmin) return true;
      return permissions.every((perm) => hasPermission(role, perm));
    };

    const hasRole = (...allowedRoles) => {
      if (!isAuthenticated) return false;
      return allowedRoles.includes(role);
    };

    return {
      isAuthenticated,
      role,
      roleLabel,
      isUniqueAdmin,
      isAdmin,
      isSupervisor,
      isCajero,
      isEmpleado,
      can,
      canAny,
      canAll,
      hasRole,
      adminInfo: {
        isSoleAdmin: isUniqueAdmin,
        adminEmail: activeAdminUser?.email || (isUniqueAdmin ? user?.email : 'admin@sistema.com'),
        adminName: activeAdminUser?.displayName || (isUniqueAdmin ? user?.displayName : 'Administrador'),
      },
    };
  }, [user, activeAdminUser]);

  return {
    user,
    loading,
    isInitializing,
    isActionLoading,
    error,
    clearError,
    login,
    register,
    logout,
    resetPassword,
    refreshUser,
    ...authDetails,
  };
}

export default useAuth;
