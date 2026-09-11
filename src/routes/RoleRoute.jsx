import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { EmptyState } from '../components/ui/EmptyState';
import { ShieldAlert } from 'lucide-react';

export function RoleRoute({ allowedRoles, permission, children }) {
  const { role, can, loading } = useAuth();

  if (loading) return null;

  const hasRoleAccess = !allowedRoles || allowedRoles.includes(role);
  const hasPermAccess = !permission || can(permission);

  if (!hasRoleAccess || !hasPermAccess) {
    return (
      <div className="p-12">
        <EmptyState
          icon={ShieldAlert}
          title="Acceso Restringido"
          description="Solo el Administrador del sistema tiene acceso a este módulo."
        />
      </div>
    );
  }

  return children;
}

