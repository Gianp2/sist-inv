import { useState, useEffect, useMemo, useCallback } from 'react';
import { COLLECTIONS } from '../constants/collections';
import {
  updateDocument,
  deleteDocument,
  subscribeCollection,
  getCachedCollection,
} from '../services/firebase/firestore';
import { ROLES } from '../constants/roles';
import { transferAdminPrivilege } from '../services/firebase/auth';
import { toast } from 'sonner';

export { useSettings } from '../context/SettingsContext';

export function useUsers() {
  const [users, setUsers] = useState(() => getCachedCollection(COLLECTIONS.USERS) || []);
  const [loading, setLoading] = useState(() => !getCachedCollection(COLLECTIONS.USERS));

  useEffect(() => {
    const unsubscribe = subscribeCollection(
      COLLECTIONS.USERS,
      [],
      (data) => {
        setUsers(data || []);
        setLoading(false);
      },
      () => setLoading(false)
    );
    return () => unsubscribe();
  }, []);

  // Detect the unique administrator
  const adminUser = useMemo(() => {
    return users.find((u) => u.role === ROLES.ADMIN) || null;
  }, [users]);

  const hasAdmin = !!adminUser;

  // Change user role with strict single-admin enforcement
  const changeUserRole = useCallback(async (userId, newRole) => {
    try {
      const targetUser = users.find((u) => (u.id || u.uid) === userId);
      if (!targetUser) throw new Error('Usuario no encontrado');

      // If promoting to ADMIN
      if (newRole === ROLES.ADMIN) {
        if (adminUser && (adminUser.id || adminUser.uid) !== userId) {
          // Transfer admin role safely from previous admin to this user
          await transferAdminPrivilege(userId, adminUser.id || adminUser.uid);
          toast.success(`Rol de Administrador único transferido a ${targetUser.displayName || targetUser.email}`);
          return;
        }
      }

      // If demoting the current admin to something else without assigning a new one
      if (targetUser.role === ROLES.ADMIN && newRole !== ROLES.ADMIN) {
        const otherAdmins = users.filter((u) => u.role === ROLES.ADMIN && (u.id || u.uid) !== userId);
        if (otherAdmins.length === 0) {
          toast.error('Debe existir siempre exactamente un (1) Administrador en el sistema. Transfiere el rol a otro usuario primero.');
          return;
        }
      }

      await updateDocument(COLLECTIONS.USERS, userId, {
        role: newRole,
        updatedAt: new Date().toISOString(),
      });
      toast.success('Rol actualizado con éxito');
    } catch (error) {
      console.error('Error changing role:', error);
      toast.error(error.message || 'Error al modificar rol');
      throw error;
    }
  }, [users, adminUser]);

  // Toggle active state (prevents disabling the only admin)
  const toggleUserStatus = useCallback(async (userId, newStatus) => {
    try {
      const targetUser = users.find((u) => (u.id || u.uid) === userId);
      if (targetUser?.role === ROLES.ADMIN && newStatus === false) {
        toast.error('No es posible desactivar al único Administrador del sistema.');
        return;
      }

      await updateDocument(COLLECTIONS.USERS, userId, {
        active: newStatus,
        updatedAt: new Date().toISOString(),
      });
      toast.success(newStatus ? 'Usuario activado' : 'Usuario desactivado');
    } catch (error) {
      toast.error('Error al actualizar estado del usuario');
      throw error;
    }
  }, [users]);

  // Delete user (prevents deleting the admin)
  const removeUser = useCallback(async (userId) => {
    try {
      const targetUser = users.find((u) => (u.id || u.uid) === userId);
      if (targetUser?.role === ROLES.ADMIN) {
        toast.error('No puedes eliminar la cuenta del Administrador único.');
        return;
      }

      await deleteDocument(COLLECTIONS.USERS, userId);
      toast.success('Usuario eliminado');
    } catch (error) {
      toast.error('Error al eliminar usuario');
      throw error;
    }
  }, [users]);

  // Update individual employee permissions
  const updateUserPermissions = useCallback(async (userId, permissions) => {
    try {
      const targetUser = users.find((u) => (u.id || u.uid) === userId);
      if (targetUser?.role === ROLES.ADMIN) {
        toast.info('El Administrador posee acceso total irrestricto por definición.');
        return;
      }

      await updateDocument(COLLECTIONS.USERS, userId, {
        permissions,
        updatedAt: new Date().toISOString(),
      });
      toast.success('Permisos actualizados con éxito');
    } catch (error) {
      console.error('Error updating user permissions:', error);
      toast.error(error.message || 'Error al actualizar permisos del usuario');
      throw error;
    }
  }, [users]);

  return {
    users,
    loading,
    adminUser,
    hasAdmin,
    changeUserRole,
    toggleUserStatus,
    updateUserPermissions,
    removeUser,
  };
}

