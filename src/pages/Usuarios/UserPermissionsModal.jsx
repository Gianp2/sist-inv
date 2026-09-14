import { useState, useEffect, useMemo } from 'react';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { SYSTEM_MODULES, ROLE_PERMISSIONS, ROLE_LABELS, ROLES } from '../../constants/roles';
import {
  Shield,
  ShieldCheck,
  Crown,
  RotateCcw,
  CheckSquare,
  Square,
  Search,
  AlertCircle,
  CheckCircle2,
  Lock,
} from 'lucide-react';
import { toast } from 'sonner';

export function UserPermissionsModal({
  isOpen,
  onClose,
  user,
  onSavePermissions,
}) {
  const [permissions, setPermissions] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasCustomPermissions, setHasCustomPermissions] = useState(false);

  // Initialize permissions when user changes or modal opens
  useEffect(() => {
    if (!user) return;

    if (user.permissions && typeof user.permissions === 'object' && Object.keys(user.permissions).length > 0) {
      setPermissions({ ...user.permissions });
      setHasCustomPermissions(true);
    } else {
      // Default to the role's base permissions
      const defaultRolePerms = ROLE_PERMISSIONS[user.role] || [];
      const initialMap = {};
      defaultRolePerms.forEach((p) => {
        initialMap[p] = true;
      });
      setPermissions(initialMap);
      setHasCustomPermissions(false);
    }
  }, [user, isOpen]);

  const isMasterAdmin = user?.role === ROLES.ADMIN;

  // Toggle single permission key
  const handleToggle = (permKey) => {
    if (isMasterAdmin) return;
    setPermissions((prev) => ({
      ...prev,
      [permKey]: !prev[permKey],
    }));
    setHasCustomPermissions(true);
  };

  // Toggle all actions in a module
  const handleToggleModule = (moduleId, shouldEnable) => {
    if (isMasterAdmin) return;
    const mod = SYSTEM_MODULES.find((m) => m.id === moduleId);
    if (!mod) return;

    setPermissions((prev) => {
      const updated = { ...prev };
      mod.actions.forEach((act) => {
        updated[`${moduleId}.${act}`] = shouldEnable;
      });
      if (mod.extraPermissions) {
        mod.extraPermissions.forEach((extra) => {
          updated[extra.id] = shouldEnable;
        });
      }
      return updated;
    });
    setHasCustomPermissions(true);
  };

  // Select all permissions across all modules
  const handleSelectAll = () => {
    if (isMasterAdmin) return;
    const all = {};
    SYSTEM_MODULES.forEach((mod) => {
      mod.actions.forEach((act) => {
        all[`${mod.id}.${act}`] = true;
      });
      if (mod.extraPermissions) {
        mod.extraPermissions.forEach((extra) => {
          all[extra.id] = true;
        });
      }
    });
    setPermissions(all);
    setHasCustomPermissions(true);
    toast.info('Todos los permisos habilitados');
  };

  // Deselect all permissions across all modules
  const handleDeselectAll = () => {
    if (isMasterAdmin) return;
    const none = {};
    SYSTEM_MODULES.forEach((mod) => {
      mod.actions.forEach((act) => {
        none[`${mod.id}.${act}`] = false;
      });
      if (mod.extraPermissions) {
        mod.extraPermissions.forEach((extra) => {
          none[extra.id] = false;
        });
      }
    });
    setPermissions(none);
    setHasCustomPermissions(true);
    toast.info('Todos los permisos deshabilitados');
  };

  // Reset to default role permissions
  const handleResetToRoleDefaults = () => {
    if (isMasterAdmin || !user) return;
    const defaultRolePerms = ROLE_PERMISSIONS[user.role] || [];
    const roleMap = {};
    defaultRolePerms.forEach((p) => {
      roleMap[p] = true;
    });
    setPermissions(roleMap);
    setHasCustomPermissions(true);
    toast.info(`Permisos sincronizados con el rol predeterminado: ${ROLE_LABELS[user.role] || user.role}`);
  };

  // Clear custom permissions completely to use dynamic role fallback
  const handleRevertToRoleFallback = async () => {
    if (isMasterAdmin || !user) return;
    setIsSubmitting(true);
    try {
      await onSavePermissions(user.id || user.uid, null);
      setHasCustomPermissions(false);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  // Save current custom permissions
  const handleSave = async () => {
    if (isMasterAdmin || !user) return;
    setIsSubmitting(true);
    try {
      await onSavePermissions(user.id || user.uid, permissions);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter modules based on search
  const filteredModules = useMemo(() => {
    if (!searchTerm.trim()) return SYSTEM_MODULES;
    const q = searchTerm.toLowerCase().trim();
    return SYSTEM_MODULES.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        m.description.toLowerCase().includes(q) ||
        m.id.toLowerCase().includes(q)
    );
  }, [searchTerm]);

  // Count active permissions
  const { totalPermissionsCount, activePermissionsCount } = useMemo(() => {
    let total = 0;
    let active = 0;
    SYSTEM_MODULES.forEach((mod) => {
      mod.actions.forEach((act) => {
        total++;
        if (permissions[`${mod.id}.${act}`]) active++;
      });
      if (mod.extraPermissions) {
        mod.extraPermissions.forEach((extra) => {
          total++;
          if (permissions[extra.id]) active++;
        });
      }
    });
    return { totalPermissionsCount: total, activePermissionsCount: active };
  }, [permissions]);

  if (!user) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Permisos Individuales por Empleado"
      subtitle={`Configuración granular para ${user.displayName || user.email}`}
      maxWidth="max-w-4xl"
    >
      <div className="space-y-4">
        {/* User Card Header */}
        <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className={`w-11 h-11 rounded-2xl flex items-center justify-center font-black text-sm shrink-0 ${
                isMasterAdmin
                  ? 'bg-neutral-900 text-white'
                  : 'bg-neutral-200 text-neutral-800'
              }`}
            >
              {isMasterAdmin ? (
                <Crown className="w-5 h-5 text-amber-400" />
              ) : (
                user.displayName?.charAt(0).toUpperCase() || 'U'
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-neutral-900">
                  {user.displayName || 'Empleado'}
                </h3>
                <Badge
                  size="xs"
                  variant={
                    isMasterAdmin
                      ? 'danger'
                      : user.role === ROLES.SUPERVISOR
                      ? 'warning'
                      : user.role === ROLES.CAJERO
                      ? 'info'
                      : 'success'
                  }
                >
                  {ROLE_LABELS[user.role] || user.role}
                </Badge>
              </div>
              <p className="text-xs text-neutral-500 font-mono mt-0.5">{user.email}</p>
            </div>
          </div>

          {/* Status Indicator */}
          <div className="flex items-center gap-2">
            {isMasterAdmin ? (
              <Badge variant="danger" size="sm" className="gap-1">
                <Lock className="w-3 h-3" /> Acceso Total Irrestricto
              </Badge>
            ) : hasCustomPermissions ? (
              <Badge variant="warning" size="sm" className="gap-1">
                <Shield className="w-3 h-3" /> Permisos Personalizados ({activePermissionsCount}/{totalPermissionsCount})
              </Badge>
            ) : (
              <Badge variant="neutral" size="sm" className="gap-1">
                <ShieldCheck className="w-3 h-3" /> Permisos por Defecto de Rol
              </Badge>
            )}
          </div>
        </div>

        {/* Master Admin Warning */}
        {isMasterAdmin ? (
          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-3">
            <Crown className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-sm">Administrador / Dueño Principal</p>
              <p className="mt-1 leading-relaxed text-amber-800">
                El Administrador cuenta con acceso total absoluto e incondicional a todas las funcionalidades del sistema (catálogo, stock, caja, ventas, compras, reportes y configuración). No es posible restringir permisos al Administrador.
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Quick Actions Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pb-2">
              {/* Search */}
              <div className="relative flex-1 max-w-xs">
                <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Buscar módulo..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-neutral-200 bg-white placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-1.5 flex-wrap justify-end">
                <button
                  type="button"
                  onClick={handleSelectAll}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-neutral-100 text-neutral-700 hover:bg-neutral-200 transition-colors cursor-pointer"
                  title="Habilitar todos los permisos"
                >
                  <CheckSquare className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Todos</span>
                </button>
                <button
                  type="button"
                  onClick={handleDeselectAll}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-neutral-100 text-neutral-700 hover:bg-neutral-200 transition-colors cursor-pointer"
                  title="Deshabilitar todos los permisos"
                >
                  <Square className="w-3.5 h-3.5 text-rose-500" />
                  <span>Ninguno</span>
                </button>
                <button
                  type="button"
                  onClick={handleResetToRoleDefaults}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-neutral-100 text-neutral-700 hover:bg-neutral-200 transition-colors cursor-pointer"
                  title="Copiar permisos predeterminados de este rol"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-neutral-600" />
                  <span>Cargar Rol</span>
                </button>
              </div>
            </div>

            {/* Modules List */}
            <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
              {filteredModules.map((mod) => {
                const viewKey = `${mod.id}.view`;
                const createKey = `${mod.id}.create`;
                const editKey = `${mod.id}.edit`;
                const deleteKey = `${mod.id}.delete`;

                const isViewActive = Boolean(permissions[viewKey]);
                const isCreateActive = Boolean(permissions[createKey]);
                const isEditActive = Boolean(permissions[editKey]);
                const isDeleteActive = Boolean(permissions[deleteKey]);

                const activeInModCount =
                  (isViewActive ? 1 : 0) +
                  (isCreateActive ? 1 : 0) +
                  (isEditActive ? 1 : 0) +
                  (isDeleteActive ? 1 : 0) +
                  (mod.extraPermissions
                    ? mod.extraPermissions.filter((e) => permissions[e.id]).length
                    : 0);

                const totalInModCount = 4 + (mod.extraPermissions?.length || 0);

                return (
                  <div
                    key={mod.id}
                    className="p-4 rounded-xl border border-neutral-200 bg-white hover:border-neutral-300 transition-all space-y-3 shadow-2xs"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-neutral-100 pb-2.5">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-black text-neutral-900">
                            {mod.name}
                          </h4>
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-neutral-100 text-neutral-600">
                            {activeInModCount}/{totalInModCount} activos
                          </span>
                        </div>
                        <p className="text-[11px] text-neutral-500 mt-0.5">
                          {mod.description}
                        </p>
                      </div>

                      {/* Module quick toggles */}
                      <div className="flex items-center gap-2 self-end sm:self-auto">
                        <button
                          type="button"
                          onClick={() => handleToggleModule(mod.id, true)}
                          className="text-[10px] font-bold text-emerald-700 hover:underline cursor-pointer"
                        >
                          Marcar todos
                        </button>
                        <span className="text-neutral-300">•</span>
                        <button
                          type="button"
                          onClick={() => handleToggleModule(mod.id, false)}
                          className="text-[10px] font-bold text-neutral-500 hover:underline cursor-pointer"
                        >
                          Desmarcar
                        </button>
                      </div>
                    </div>

                    {/* Standard 4 Actions Grid: Ver, Crear, Editar, Eliminar */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                      {/* Ver */}
                      <label
                        className={`flex items-center gap-2.5 p-2 rounded-lg border text-xs cursor-pointer select-none transition-all ${
                          isViewActive
                            ? 'bg-neutral-900 border-neutral-900 text-white font-bold'
                            : 'bg-neutral-50 border-neutral-200 text-neutral-700 hover:bg-neutral-100'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isViewActive}
                          onChange={() => handleToggle(viewKey)}
                          className="sr-only"
                        />
                        <div
                          className={`w-4 h-4 rounded flex items-center justify-center shrink-0 text-xs border ${
                            isViewActive
                              ? 'bg-white text-neutral-900 border-white'
                              : 'bg-white border-neutral-300'
                          }`}
                        >
                          {isViewActive && <CheckCircle2 className="w-3.5 h-3.5 text-neutral-900" />}
                        </div>
                        <span>Ver</span>
                      </label>

                      {/* Crear */}
                      <label
                        className={`flex items-center gap-2.5 p-2 rounded-lg border text-xs cursor-pointer select-none transition-all ${
                          isCreateActive
                            ? 'bg-emerald-600 border-emerald-600 text-white font-bold'
                            : 'bg-neutral-50 border-neutral-200 text-neutral-700 hover:bg-neutral-100'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isCreateActive}
                          onChange={() => handleToggle(createKey)}
                          className="sr-only"
                        />
                        <div
                          className={`w-4 h-4 rounded flex items-center justify-center shrink-0 text-xs border ${
                            isCreateActive
                              ? 'bg-white text-emerald-600 border-white'
                              : 'bg-white border-neutral-300'
                          }`}
                        >
                          {isCreateActive && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
                        </div>
                        <span>Crear</span>
                      </label>

                      {/* Editar */}
                      <label
                        className={`flex items-center gap-2.5 p-2 rounded-lg border text-xs cursor-pointer select-none transition-all ${
                          isEditActive
                            ? 'bg-blue-600 border-blue-600 text-white font-bold'
                            : 'bg-neutral-50 border-neutral-200 text-neutral-700 hover:bg-neutral-100'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isEditActive}
                          onChange={() => handleToggle(editKey)}
                          className="sr-only"
                        />
                        <div
                          className={`w-4 h-4 rounded flex items-center justify-center shrink-0 text-xs border ${
                            isEditActive
                              ? 'bg-white text-blue-600 border-white'
                              : 'bg-white border-neutral-300'
                          }`}
                        >
                          {isEditActive && <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />}
                        </div>
                        <span>Editar</span>
                      </label>

                      {/* Eliminar */}
                      <label
                        className={`flex items-center gap-2.5 p-2 rounded-lg border text-xs cursor-pointer select-none transition-all ${
                          isDeleteActive
                            ? 'bg-rose-600 border-rose-600 text-white font-bold'
                            : 'bg-neutral-50 border-neutral-200 text-neutral-700 hover:bg-neutral-100'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isDeleteActive}
                          onChange={() => handleToggle(deleteKey)}
                          className="sr-only"
                        />
                        <div
                          className={`w-4 h-4 rounded flex items-center justify-center shrink-0 text-xs border ${
                            isDeleteActive
                              ? 'bg-white text-rose-600 border-white'
                              : 'bg-white border-neutral-300'
                          }`}
                        >
                          {isDeleteActive && <CheckCircle2 className="w-3.5 h-3.5 text-rose-600" />}
                        </div>
                        <span>Eliminar</span>
                      </label>
                    </div>

                    {/* Extra module specific permissions */}
                    {mod.extraPermissions && mod.extraPermissions.length > 0 && (
                      <div className="pt-2 border-t border-neutral-100">
                        <p className="text-[10px] uppercase font-bold text-neutral-400 mb-1.5">
                          Operaciones Especiales
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {mod.extraPermissions.map((extra) => {
                            const isExtraActive = Boolean(permissions[extra.id]);
                            return (
                              <label
                                key={extra.id}
                                className={`flex items-center gap-2 p-2 rounded-lg border text-xs cursor-pointer select-none transition-all ${
                                  isExtraActive
                                    ? 'bg-amber-50 border-amber-300 text-amber-900 font-bold'
                                    : 'bg-neutral-50 border-neutral-200 text-neutral-700 hover:bg-neutral-100'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isExtraActive}
                                  onChange={() => handleToggle(extra.id)}
                                  className="sr-only"
                                />
                                <div
                                  className={`w-3.5 h-3.5 rounded flex items-center justify-center shrink-0 text-xs border ${
                                    isExtraActive
                                      ? 'bg-amber-500 text-white border-amber-500'
                                      : 'bg-white border-neutral-300'
                                  }`}
                                >
                                  {isExtraActive && <CheckCircle2 className="w-3 h-3 text-white" />}
                                </div>
                                <span className="truncate">{extra.label}</span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* Footer Actions */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-4 border-t border-neutral-200">
          <div>
            {!isMasterAdmin && hasCustomPermissions && (
              <button
                type="button"
                onClick={handleRevertToRoleFallback}
                disabled={isSubmitting}
                className="text-xs font-semibold text-rose-600 hover:text-rose-700 hover:underline cursor-pointer disabled:opacity-50"
              >
                Restablecer a permisos por defecto del rol ({ROLE_LABELS[user.role]})
              </button>
            )}
          </div>

          <div className="flex items-center justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={isSubmitting}
            >
              {isMasterAdmin ? 'Cerrar' : 'Cancelar'}
            </Button>
            {!isMasterAdmin && (
              <Button
                variant="primary"
                size="sm"
                onClick={handleSave}
                isLoading={isSubmitting}
                leftIcon={ShieldCheck}
              >
                Guardar Permisos
              </Button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}
