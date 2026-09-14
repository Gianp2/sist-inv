import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/Button';
import { ROLES } from '../constants/roles';
import { ShieldAlert, ArrowLeft } from 'lucide-react';

export function RoleRoute({ allowedRoles, permission, children }) {
  const { role, can, loading, isUniqueAdmin, isAdmin } = useAuth();
  const navigate = useNavigate();

  if (loading) return null;

  // 1. ADMIN always has total access
  if (isAdmin || isUniqueAdmin || role === ROLES.ADMIN) {
    return children;
  }

  // 2. Check granular permission if defined
  if (permission) {
    if (!can(permission)) {
      return (
        <div className="min-h-[60vh] flex items-center justify-center p-6">
          <div className="max-w-md w-full p-8 text-center bg-white rounded-3xl border border-neutral-200 shadow-sm space-y-4">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600">
              <ShieldAlert className="w-7 h-7" />
            </div>
            <div className="space-y-1.5">
              <h2 className="text-lg font-bold text-neutral-900">
                Módulo Restringido
              </h2>
              <p className="text-xs text-neutral-600 leading-relaxed">
                No cuentas con los permisos requeridos para acceder a esta sección. Si consideras que deberías tener acceso, solicita al <strong>Administrador / Dueño</strong> que habilite este permiso en tu cuenta.
              </p>
            </div>
            <div className="pt-2 flex justify-center">
              <Button
                variant="outline"
                size="sm"
                leftIcon={ArrowLeft}
                onClick={() => navigate('/')}
              >
                Volver al Inicio
              </Button>
            </div>
          </div>
        </div>
      );
    }
  } else if (allowedRoles && !allowedRoles.includes(role)) {
    // 3. Fallback role check if no specific permission was defined
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-6">
        <div className="max-w-md w-full p-8 text-center bg-white rounded-3xl border border-neutral-200 shadow-sm space-y-4">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600">
            <ShieldAlert className="w-7 h-7" />
          </div>
          <div className="space-y-1.5">
            <h2 className="text-lg font-bold text-neutral-900">
              Módulo Restringido
            </h2>
            <p className="text-xs text-neutral-600 leading-relaxed">
              Esta sección requiere un rol superior autorizado. Contacta al <strong>Administrador / Dueño</strong> para más detalles.
            </p>
          </div>
          <div className="pt-2 flex justify-center">
            <Button
              variant="outline"
              size="sm"
              leftIcon={ArrowLeft}
              onClick={() => navigate('/')}
            >
              Volver al Inicio
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return children;
}


