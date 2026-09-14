import { useState } from 'react';
import { Plus, Edit2, Trash2, Users, Search, Phone, Mail, FileSpreadsheet } from 'lucide-react';
import { useCustomers } from '../../hooks/useContacts';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { TableSkeleton } from '../../components/ui/Skeleton';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { exportToExcel } from '../../utils/exportUtils';
import { toast } from 'sonner';

export function ClientesPage() {
  const { can } = useAuth();
  const { customers, loading, createCustomer, editCustomer, removeCustomer } = useCustomers();
  const [searchTerm, setSearchTerm] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    dni: '',
    phone: '',
    email: '',
    address: '',
    city: '',
    notes: '',
  });
  const [deletingId, setDeletingId] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const filtered = customers.filter(
    (c) =>
      c.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.dni?.includes(searchTerm) ||
      c.phone?.includes(searchTerm)
  );

  const handleOpenCreate = () => {
    setEditingCustomer(null);
    setFormData({ name: '', dni: '', phone: '', email: '', address: '', city: '', notes: '' });
    setModalOpen(true);
  };

  const handleOpenEdit = (cust) => {
    setEditingCustomer(cust);
    setFormData({
      name: cust.name || '',
      dni: cust.dni || '',
      phone: cust.phone || '',
      email: cust.email || '',
      address: cust.address || '',
      city: cust.city || '',
      notes: cust.notes || '',
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editingCustomer) {
        await editCustomer(editingCustomer.id, formData);
      } else {
        await createCustomer(formData);
      }
      setModalOpen(false);
    } finally {
      setSubmitting(false);
    }
  };

  const handleExportExcel = () => {
    const data = filtered.map((c) => ({
      Nombre: c.name,
      DNI_CUIT: c.dni,
      Teléfono: c.phone,
      Email: c.email,
      Dirección: c.address,
      Ciudad: c.city,
      TotalCompras: c.totalPurchases || 0,
      CantidadCompras: c.purchaseCount || 0,
    }));
    exportToExcel(data, 'Clientes.xlsx', 'Clientes');
    toast.success('Clientes exportados a Excel');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-center sm:text-left">
        <div>
          <h1 className="text-2xl font-black text-neutral-900 tracking-tight">
            Clientes
          </h1>
          <p className="text-xs text-neutral-500 mt-0.5 font-medium">
            Gestión de clientes y fidelización para el local
          </p>
        </div>
        <div className="flex items-center justify-center sm:justify-end gap-2 w-full sm:w-auto">
          <Button variant="outline" size="sm" leftIcon={FileSpreadsheet} onClick={handleExportExcel} className="w-full sm:w-auto justify-center">
            Exportar
          </Button>
          {can('customers.create') && (
            <Button variant="primary" size="sm" leftIcon={Plus} onClick={handleOpenCreate} className="w-full sm:w-auto justify-center">
              Nuevo Cliente
            </Button>
          )}
        </div>
      </div>

      <div className="card-panel bg-white rounded-2xl border border-neutral-200 p-4 shadow-xs">
        <div className="relative max-w-md mb-4 mx-auto sm:mx-0">
          <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Buscar por nombre, DNI o teléfono..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-neutral-300 bg-white text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900"
          />
        </div>

        {loading ? (
          <TableSkeleton rows={5} cols={5} />
        ) : (
          <>
            {/* Mobile View: Client Cards */}
            <div className="md:hidden divide-y divide-neutral-200">
              {filtered.map((c) => (
                <div key={c.id} className="py-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-full bg-neutral-100 text-neutral-900 flex items-center justify-center text-sm font-black border border-neutral-200">
                        {c.name?.charAt(0) || 'C'}
                      </div>
                      <div>
                        <p className="font-bold text-sm text-neutral-900">{c.name || 'Cliente'}</p>
                        <p className="text-[11px] text-neutral-500 font-medium font-mono">DNI: {c.dni || 'Sin DNI'}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-black text-neutral-900">{formatCurrency(c.totalPurchases || 0)}</p>
                      <p className="text-[10px] text-neutral-500">{c.purchaseCount || 0} compras</p>
                    </div>
                  </div>

                  {(c.phone || c.email) && (
                    <div className="text-xs text-neutral-600 flex items-center gap-3">
                      {c.phone && <span>Tel: {c.phone}</span>}
                      {c.city && <span>• {c.city}</span>}
                    </div>
                  )}

                  {(can('customers.edit') || can('customers.delete')) && (
                    <div className="flex items-center justify-end gap-2 pt-1 border-t border-neutral-100">
                      {can('customers.edit') && (
                        <button
                          onClick={() => handleOpenEdit(c)}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold text-neutral-700 bg-neutral-100 hover:bg-neutral-200 transition-colors"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          <span>Editar</span>
                        </button>
                      )}
                      {can('customers.delete') && (
                        <button
                          onClick={() => setDeletingId(c.id)}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Eliminar</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}
              {filtered.length === 0 && (
                <div className="p-8 text-center text-neutral-400 text-xs">
                  No se encontraron clientes registrados
                </div>
              )}
            </div>

            {/* Desktop View: Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-white text-neutral-800 font-bold border-b border-neutral-200">
                  <tr>
                    <th className="p-3">Cliente</th>
                    <th className="p-3">DNI / CUIT</th>
                    <th className="p-3">Contacto</th>
                    <th className="p-3">Total Comprado</th>
                    <th className="p-3">Compras</th>
                    {(can('customers.edit') || can('customers.delete')) && (
                      <th className="p-3 text-right">Acciones</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200">
                  {filtered.map((c) => (
                    <tr key={c.id} className="hover:bg-neutral-50/80 transition-colors">
                      <td className="p-3 font-bold text-neutral-900 flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-neutral-200 text-neutral-800 flex items-center justify-center text-xs font-black">
                          {c.name?.charAt(0) || 'C'}
                        </div>
                        <div>
                          <p>{c.name || 'Cliente'}</p>
                          <p className="text-[10px] text-neutral-500 font-medium">{c.city || 'Local'}</p>
                        </div>
                      </td>
                      <td className="p-3 font-mono text-neutral-700 font-medium">{c.dni || '-'}</td>
                      <td className="p-3">
                        <p className="text-neutral-900 font-medium">{c.phone || '-'}</p>
                        <p className="text-[10px] text-neutral-500 font-medium">{c.email || ''}</p>
                      </td>
                      <td className="p-3 font-black text-neutral-900">
                        {formatCurrency(c.totalPurchases || 0)}
                      </td>
                      <td className="p-3 font-semibold text-neutral-800">{c.purchaseCount || 0} compras</td>
                      {(can('customers.edit') || can('customers.delete')) && (
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            {can('customers.edit') && (
                              <button
                                onClick={() => handleOpenEdit(c)}
                                className="p-1.5 rounded-lg text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 transition-colors cursor-pointer"
                                title="Editar"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                            )}
                            {can('customers.delete') && (
                              <button
                                onClick={() => setDeletingId(c.id)}
                                className="p-1.5 rounded-lg text-neutral-500 hover:text-rose-600 hover:bg-neutral-100 transition-colors cursor-pointer"
                                title="Eliminar"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-neutral-400 text-xs">
                        No se encontraron clientes registrados
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Form Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingCustomer ? 'Editar Cliente' : 'Nuevo Cliente'}
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Nombre y Apellido *"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="DNI / CUIT"
              value={formData.dni}
              onChange={(e) => setFormData({ ...formData, dni: e.target.value })}
            />
            <Input
              label="Teléfono / WhatsApp"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
            <Input
              label="Ciudad"
              value={formData.city}
              onChange={(e) => setFormData({ ...formData, city: e.target.value })}
            />
          </div>
          <Input
            label="Dirección"
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
          />
          <div className="flex justify-end gap-2 pt-3 border-t border-neutral-200">
            <Button type="button" variant="outline" size="sm" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary" size="sm" isLoading={submitting}>
              {editingCustomer ? 'Guardar Cambios' : 'Registrar Cliente'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Confirm Delete */}
      <ConfirmDialog
        isOpen={!!deletingId}
        onClose={() => setDeletingId(null)}
        onConfirm={async () => {
          await removeCustomer(deletingId);
          setDeletingId(null);
        }}
        title="¿Eliminar cliente?"
        description="Se quitará el cliente del directorio."
      />
    </div>
  );
}
