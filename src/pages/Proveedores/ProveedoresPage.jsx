import { useState } from 'react';
import { Plus, Edit2, Trash2, Truck, Search, Phone, Mail } from 'lucide-react';
import { useSuppliers } from '../../hooks/useContacts';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { TableSkeleton } from '../../components/ui/Skeleton';

export function ProveedoresPage() {
  const { can } = useAuth();
  const { suppliers, loading, createSupplier, editSupplier, removeSupplier } = useSuppliers();
  const [searchTerm, setSearchTerm] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    contactName: '',
    cuit: '',
    phone: '',
    email: '',
    address: '',
  });
  const [deletingId, setDeletingId] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const filtered = suppliers.filter(
    (s) =>
      s.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.contactName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.cuit?.includes(searchTerm)
  );

  const handleOpenCreate = () => {
    setEditingSupplier(null);
    setFormData({ name: '', contactName: '', cuit: '', phone: '', email: '', address: '' });
    setModalOpen(true);
  };

  const handleOpenEdit = (sup) => {
    setEditingSupplier(sup);
    setFormData({
      name: sup.name || '',
      contactName: sup.contactName || '',
      cuit: sup.cuit || '',
      phone: sup.phone || '',
      email: sup.email || '',
      address: sup.address || '',
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editingSupplier) {
        await editSupplier(editingSupplier.id, formData);
      } else {
        await createSupplier(formData);
      }
      setModalOpen(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-neutral-900 tracking-tight">
            Proveedores de Ropa
          </h1>
          <p className="text-xs text-neutral-500 mt-0.5 font-medium">
            Talleres, fabricantes y distribuidores mayoristas
          </p>
        </div>
        {can('suppliers.create') && (
          <Button variant="primary" size="sm" leftIcon={Plus} onClick={handleOpenCreate}>
            Nuevo Proveedor
          </Button>
        )}
      </div>

      <div className="card-panel bg-white rounded-2xl border border-neutral-200 p-4 shadow-xs">
        <div className="relative max-w-md mb-4">
          <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Buscar proveedor..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-neutral-300 bg-white text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900"
          />
        </div>

        {loading ? (
          <TableSkeleton rows={4} cols={4} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-white text-neutral-800 font-bold border-b border-neutral-200">
                <tr>
                  <th className="p-3">Razón Social / Empresa</th>
                  <th className="p-3">Contacto</th>
                  <th className="p-3">CUIT / RUT</th>
                  <th className="p-3">Teléfono / Email</th>
                  {(can('suppliers.edit') || can('suppliers.delete')) && (
                    <th className="p-3 text-right">Acciones</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {filtered.map((s) => (
                  <tr key={s.id} className="hover:bg-neutral-50/80 transition-colors">
                    <td className="p-3 font-bold text-neutral-900 flex items-center gap-2">
                      <Truck className="w-4 h-4 text-neutral-400" />
                      {s.name}
                    </td>
                    <td className="p-3 font-medium text-neutral-800">
                      {s.contactName || '-'}
                    </td>
                    <td className="p-3 font-mono text-neutral-700">{s.cuit || '-'}</td>
                    <td className="p-3">
                      <p className="text-neutral-900 font-medium">{s.phone || '-'}</p>
                      <p className="text-[10px] text-neutral-500 font-medium">{s.email || ''}</p>
                    </td>
                    {(can('suppliers.edit') || can('suppliers.delete')) && (
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {can('suppliers.edit') && (
                            <button
                              onClick={() => handleOpenEdit(s)}
                              className="p-1.5 rounded-lg text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 transition-colors cursor-pointer"
                              title="Editar"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                          )}
                          {can('suppliers.delete') && (
                            <button
                              onClick={() => setDeletingId(s.id)}
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
                    <td colSpan={5} className="p-8 text-center text-neutral-400 text-xs">
                      No se encontraron proveedores registrados
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Form Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingSupplier ? 'Editar Proveedor' : 'Nuevo Proveedor'}
        maxWidth="max-w-md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Razón Social / Nombre *"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />
          <Input
            label="Persona de Contacto"
            value={formData.contactName}
            onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
          />
          <Input
            label="CUIT / RUT"
            value={formData.cuit}
            onChange={(e) => setFormData({ ...formData, cuit: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-2">
            <Input
              label="Teléfono"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            />
            <Input
              label="Email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
          </div>
          <Input
            label="Dirección / Localidad"
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
          />
          <div className="flex justify-end gap-2 pt-3 border-t border-neutral-200">
            <Button type="button" variant="outline" size="sm" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary" size="sm" isLoading={submitting}>
              {editingSupplier ? 'Actualizar' : 'Crear'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Confirm Delete */}
      <ConfirmDialog
        isOpen={!!deletingId}
        onClose={() => setDeletingId(null)}
        onConfirm={async () => {
          await removeSupplier(deletingId);
          setDeletingId(null);
        }}
        title="¿Eliminar proveedor?"
        description="Se quitará el proveedor del listado."
      />
    </div>
  );
}
