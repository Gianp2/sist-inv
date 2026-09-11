import { useState } from 'react';
import { useUsers } from '../../hooks/useSettingsAndUsers';
import { ROLES, ROLE_LABELS, ROLE_PERMISSIONS } from '../../constants/roles';
import { Card, CardHeader } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Modal } from '../../components/ui/Modal';
import { TableSkeleton } from '../../components/ui/Skeleton';
import { registerUser } from '../../services/firebase/auth';
import {
  ShieldCheck,
  Crown,
  UserPlus,
  Edit2,
  Lock,
  UserCheck,
  UserX,
  AlertTriangle,
  Info,
  Check,
  X,
} from 'lucide-react';
import { toast } from 'sonner';

export function UsuariosPage() {
  const { users, loading, adminUser, changeUserRole, toggleUserStatus, removeUser } = useUsers();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [newRole, setNewRole] = useState(ROLES.EMPLEADO);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // New user form
  const [newUserForm, setNewUserForm] = useState({
    displayName: '',
    email: '',
    password: '',
    role: ROLES.EMPLEADO,
  });

  const roleList = [
    {
      role: ROLES.ADMIN,
      title: 'Administrador (Único)',
      desc: 'Acceso total y exclusivo. Solo puede haber un (1) Administrador en todo el sistema.',
      color: 'danger',
      icon: Crown,
      isUnique: true,
    },
    {
      role: ROLES.SUPERVISOR,
      title: 'Supervisor / Encargado',
      desc: 'Gestión de catálogo, compras a proveedores, stock, caja y reportes.',
      color: 'warning',
      icon: ShieldCheck,
      isUnique: false,
    },
    {
      role: ROLES.CAJERO,
      title: 'Cajero',
      desc: 'Apertura y arqueo de caja diaria, cobros y ventas en el Punto de Venta.',
      color: 'info',
      icon: ShieldCheck,
      isUnique: false,
    },
    {
      role: ROLES.EMPLEADO,
      title: 'Vendedor',
      desc: 'Emisión de ventas en mostrador, consulta de stock y registro de clientes.',
      color: 'success',
      icon: ShieldCheck,
      isUnique: false,
    },
  ];

  const handleOpenRoleModal = (user) => {
    setSelectedUser(user);
    setNewRole(user.role || ROLES.EMPLEADO);
    setIsRoleModalOpen(true);
  };

  const handleSaveRole = async () => {
    if (!selectedUser) return;
    setIsSubmitting(true);
    try {
      await changeUserRole(selectedUser.id || selectedUser.uid, newRole);
      setIsRoleModalOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    if (!newUserForm.displayName || !newUserForm.email || !newUserForm.password) {
      toast.error('Completa todos los campos obligatorios');
      return;
    }

    if (newUserForm.password.length < 6) {
      toast.error('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    setIsSubmitting(true);
    try {
      await registerUser(
        newUserForm.email,
        newUserForm.password,
        newUserForm.displayName,
        newUserForm.role
      );
      toast.success('Usuario registrado exitosamente');
      setIsAddModalOpen(false);
      setNewUserForm({
        displayName: '',
        email: '',
        password: '',
        role: ROLES.EMPLEADO,
      });
    } catch (error) {
      toast.error(error.message || 'Error al registrar usuario');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-neutral-900 tracking-tight">
            Usuarios y Control de Acceso
          </h1>
          <p className="text-xs text-neutral-500 mt-0.5 font-medium">
            Gestión de roles y personal bajo la política de <strong>Único Administrador</strong>
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          leftIcon={UserPlus}
          onClick={() => setIsAddModalOpen(true)}
        >
          Nuevo Usuario
        </Button>
      </div>

      {/* Security Rule Card */}
      <Card className="p-5 border-neutral-200 bg-white shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-neutral-100 text-neutral-800 shrink-0 border border-neutral-200">
              <Crown className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-black text-neutral-900 tracking-wide uppercase">
                  Regla de Seguridad: Solo 1 Administrador
                </h3>
                <Badge size="xs" variant="warning">
                  Estricto
                </Badge>
              </div>
              <p className="text-xs text-neutral-700 mt-1 font-medium leading-relaxed">
                El sistema garantiza que exista <strong>exactamente un único Administrador</strong> con privilegios totales. 
                Si se designa a otro miembro como Administrador, el rol se transferirá automáticamente de forma segura.
              </p>
            </div>
          </div>

          {adminUser && (
            <div className="sm:text-right bg-white p-3 rounded-xl border border-neutral-200 shadow-xs shrink-0">
              <span className="text-[10px] uppercase font-bold text-neutral-500 block">
                Administrador Actual
              </span>
              <span className="text-xs font-black text-neutral-900 block mt-0.5">
                {adminUser.displayName || 'Admin'}
              </span>
              <span className="text-[11px] font-mono text-neutral-600 block">
                {adminUser.email}
              </span>
            </div>
          )}
        </div>
      </Card>

      {/* Roles Breakdown */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {roleList.map((r) => {
          const IconComp = r.icon;
          return (
            <Card key={r.role} className="p-4 flex flex-col justify-between shadow-xs border-neutral-200 bg-white">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Badge variant={r.color} size="sm">
                    {ROLE_LABELS[r.role]}
                  </Badge>
                  <IconComp className="w-4 h-4 text-neutral-400" />
                </div>
                <h3 className="text-xs font-bold text-neutral-900">{r.title}</h3>
                <p className="text-[11px] text-neutral-600 mt-1 font-medium leading-normal">{r.desc}</p>
              </div>
              {r.isUnique && (
                <div className="mt-3 pt-2 border-t border-neutral-200 text-[10px] font-bold text-neutral-900 flex items-center gap-1">
                  <Lock className="w-3 h-3" /> Límite: 1 usuario
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {/* Users List */}
      <Card className="p-5 shadow-xs border-neutral-200 bg-white">
        <CardHeader
          title="Personal Registrado"
          subtitle={`Total: ${users.length} cuenta${users.length === 1 ? '' : 's'} en el sistema`}
        />

        {loading ? (
          <TableSkeleton rows={4} cols={4} />
        ) : (
          <div className="overflow-x-auto mt-3">
            <table className="w-full text-left text-xs">
              <thead className="bg-neutral-50 text-neutral-600 font-bold border-b border-neutral-200">
                <tr>
                  <th className="p-3">Nombre</th>
                  <th className="p-3">Email</th>
                  <th className="p-3">Rol del Sistema</th>
                  <th className="p-3 text-center">Estado</th>
                  <th className="p-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {users.map((u) => {
                  const isMasterAdmin = u.role === ROLES.ADMIN;
                  return (
                    <tr
                      key={u.id || u.uid}
                      className={`hover:bg-neutral-50/80 transition-colors ${
                        isMasterAdmin ? 'bg-amber-50/30' : ''
                      }`}
                    >
                      <td className="p-3 font-bold text-neutral-900 flex items-center gap-2">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-xs ${
                            isMasterAdmin
                              ? 'bg-neutral-900 text-white'
                              : 'bg-neutral-200 text-neutral-800'
                          }`}
                        >
                          {isMasterAdmin ? (
                            <Crown className="w-4 h-4" />
                          ) : (
                            u.displayName?.charAt(0).toUpperCase() || 'U'
                          )}
                        </div>
                        <div>
                          <span>{u.displayName || 'Usuario'}</span>
                          {isMasterAdmin && (
                            <span className="block text-[10px] text-amber-700 font-bold">
                              Administrador Principal
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-3 text-neutral-700 font-mono">
                        {u.email}
                      </td>
                      <td className="p-3">
                        <Badge
                          size="sm"
                          variant={
                            isMasterAdmin
                              ? 'danger'
                              : u.role === ROLES.SUPERVISOR
                              ? 'warning'
                              : u.role === ROLES.CAJERO
                              ? 'info'
                              : 'success'
                          }
                        >
                          {ROLE_LABELS[u.role] || u.role}
                        </Badge>
                      </td>
                      <td className="p-3 text-center">
                        <Badge size="xs" variant={u.active !== false ? 'success' : 'neutral'}>
                          {u.active !== false ? 'Activo' : 'Inactivo'}
                        </Badge>
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleOpenRoleModal(u)}
                            className="p-1.5 rounded-lg hover:bg-neutral-100 text-neutral-600 hover:text-neutral-900 transition-colors cursor-pointer"
                            title="Cambiar Rol"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          {!isMasterAdmin && (
                            <button
                              onClick={() => toggleUserStatus(u.id || u.uid, u.active === false)}
                              className="p-1.5 rounded-lg hover:bg-neutral-100 text-neutral-600 transition-colors cursor-pointer"
                              title={u.active !== false ? 'Desactivar' : 'Activar'}
                            >
                              {u.active !== false ? (
                                <UserX className="w-4 h-4 text-rose-600" />
                              ) : (
                                <UserCheck className="w-4 h-4 text-emerald-600" />
                              )}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Modal: Change Role */}
      <Modal
        isOpen={isRoleModalOpen}
        onClose={() => setIsRoleModalOpen(false)}
        title="Modificar Rol de Usuario"
        size="md"
      >
        {selectedUser && (
          <div className="space-y-4">
            <div className="p-3 rounded-xl bg-neutral-100 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-neutral-900">
                  {selectedUser.displayName}
                </p>
                <p className="text-[11px] text-neutral-500 font-mono">{selectedUser.email}</p>
              </div>
              <Badge size="sm" variant="neutral">
                Rol actual: {ROLE_LABELS[selectedUser.role] || selectedUser.role}
              </Badge>
            </div>

            <Select
              label="Seleccionar Nuevo Rol"
              value={newRole}
              onChange={(e) => setNewRole(e.target.value)}
            >
              <option value={ROLES.EMPLEADO}>Vendedor (POS y ventas)</option>
              <option value={ROLES.CAJERO}>Cajero (Caja y POS)</option>
              <option value={ROLES.SUPERVISOR}>Supervisor / Encargado (Stock, compras, caja)</option>
              <option value={ROLES.ADMIN}>Administrador (Único - Transferir rol)</option>
            </Select>

            {newRole === ROLES.ADMIN && selectedUser.role !== ROLES.ADMIN && (
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-[11px] text-amber-800 font-medium">
                  <strong>Transferencia de Administrador:</strong> Al designar a {selectedUser.displayName} como Administrador, el administrador actual pasará a ser Supervisor para mantener la política de un único Administrador.
                </p>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-3 border-t border-neutral-200">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsRoleModalOpen(false)}
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleSaveRole}
                isLoading={isSubmitting}
              >
                Confirmar Rol
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal: Create New User */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Registrar Nuevo Miembro de Personal"
        size="md"
      >
        <form onSubmit={handleCreateUser} className="space-y-4">
          <Input
            label="Nombre y Apellido *"
            placeholder="Ej: Martín Gómez"
            value={newUserForm.displayName}
            onChange={(e) => setNewUserForm({ ...newUserForm, displayName: e.target.value })}
            required
          />

          <Input
            label="Correo Electrónico *"
            type="email"
            placeholder="martin@tienda.com"
            value={newUserForm.email}
            onChange={(e) => setNewUserForm({ ...newUserForm, email: e.target.value })}
            required
          />

          <Input
            label="Contraseña Temporal *"
            type="password"
            placeholder="Mínimo 6 caracteres"
            value={newUserForm.password}
            onChange={(e) => setNewUserForm({ ...newUserForm, password: e.target.value })}
            required
          />

          <Select
            label="Rol a Asignar"
            value={newUserForm.role}
            onChange={(e) => setNewUserForm({ ...newUserForm, role: e.target.value })}
          >
            <option value={ROLES.EMPLEADO}>Vendedor (Emisión en POS)</option>
            <option value={ROLES.CAJERO}>Cajero (Caja diaria y POS)</option>
            <option value={ROLES.SUPERVISOR}>Supervisor / Encargado (Stock, compras, caja)</option>
          </Select>

          <p className="text-[11px] text-neutral-500 font-medium">
            * El rol de Administrador no se encuentra disponible para nuevos registros directos para respetar la regla de Administrador Único.
          </p>

          <div className="flex justify-end gap-2 pt-3 border-t border-neutral-200">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsAddModalOpen(false)}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={isSubmitting}
            >
              Crear Usuario
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
