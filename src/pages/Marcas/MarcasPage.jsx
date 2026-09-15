import { useState } from 'react';
import { Plus, Edit2, Trash2, Bookmark, Search } from 'lucide-react';
import { useBrands } from '../../hooks/useCatalog';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { TableSkeleton } from '../../components/ui/Skeleton';

export function MarcasPage() {
  const { can } = useAuth();
  const { brands, loading, createBrand, editBrand, removeBrand } = useBrands();
  const [searchTerm, setSearchTerm] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingBrand, setEditingBrand] = useState(null);
  const [formData, setFormData] = useState({ name: '', origin: '', description: '' });
  const [deletingId, setDeletingId] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const filtered = brands.filter(
    (b) =>
      b.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.origin?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleOpenCreate = () => {
    setEditingBrand(null);
    setFormData({ name: '', origin: '', description: '' });
    setModalOpen(true);
  };

  const handleOpenEdit = (brand) => {
    setEditingBrand(brand);
    setFormData({ name: brand.name || '', origin: brand.origin || '', description: brand.description || '' });
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editingBrand) {
        await editBrand(editingBrand.id, formData);
      } else {
        await createBrand(formData);
      }
      setModalOpen(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-center sm:text-left">
        <div>
          <h1 className="text-2xl font-black text-neutral-900 tracking-tight">
            Marcas
          </h1>
          <p className="text-xs text-neutral-500 mt-0.5 font-medium">
            Gestión de marcas y fabricantes de indumentaria
          </p>
        </div>
        {can('brands.create') && (
          <Button
            variant="primary"
            size="sm"
            leftIcon={Plus}
            onClick={handleOpenCreate}
            className="w-full sm:w-auto h-11 sm:h-9 text-xs font-bold justify-center"
          >
            Nueva Marca
          </Button>
        )}
      </div>

      <div className="card-panel bg-white rounded-2xl border border-neutral-200 p-4 shadow-xs">
        <div className="relative max-w-md mb-4 mx-auto sm:mx-0">
          <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Buscar marca..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-neutral-300 bg-white text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900"
          />
        </div>

        {loading ? (
          <TableSkeleton rows={4} cols={3} />
        ) : (
          <>
            {/* Mobile View: Cards */}
            <div className="md:hidden divide-y divide-neutral-200">
              {filtered.map((brand, idx) => (
                <div key={brand.id ? `${brand.id}-${idx}` : `brand-${idx}`} className="py-3.5 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-neutral-100 flex items-center justify-center shrink-0 border border-neutral-200">
                        <Bookmark className="w-4 h-4 text-neutral-700" />
                      </div>
                      <div>
                        <p className="font-bold text-sm text-neutral-900">{brand.name}</p>
                        <span className="text-[11px] font-medium text-neutral-500">
                          {brand.origin || 'Nacional'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {brand.description && (
                    <p className="text-xs text-neutral-600 bg-neutral-50 p-2 rounded-xl border border-neutral-100">
                      {brand.description}
                    </p>
                  )}

                  {(can('brands.edit') || can('brands.delete')) && (
                    <div className="flex items-center justify-end gap-2 pt-1 border-t border-neutral-100">
                      {can('brands.edit') && (
                        <button
                          onClick={() => handleOpenEdit(brand)}
                          className="min-h-[40px] flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-neutral-700 bg-neutral-100 hover:bg-neutral-200 transition-colors cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          <span>Editar</span>
                        </button>
                      )}
                      {can('brands.delete') && (
                        <button
                          onClick={() => setDeletingId(brand.id)}
                          className="min-h-[40px] flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 transition-colors cursor-pointer"
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
                  No se encontraron marcas registradas
                </div>
              )}
            </div>

            {/* Desktop View: Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-white text-neutral-800 font-bold border-b border-neutral-200">
                  <tr>
                    <th className="p-3">Marca</th>
                    <th className="p-3">Origen</th>
                    <th className="p-3">Descripción</th>
                    {(can('brands.edit') || can('brands.delete')) && (
                      <th className="p-3 text-right">Acciones</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200">
                  {filtered.map((brand, idx) => (
                    <tr key={brand.id ? `${brand.id}-${idx}` : `brand-${idx}`} className="hover:bg-neutral-50/80 transition-colors">
                      <td className="p-3 font-bold text-neutral-900 flex items-center gap-2">
                        <Bookmark className="w-4 h-4 text-neutral-400" />
                        {brand.name}
                      </td>
                      <td className="p-3 text-neutral-700 font-medium">
                        {brand.origin || 'Nacional'}
                      </td>
                      <td className="p-3 text-neutral-600 font-medium">{brand.description || '-'}</td>
                      {(can('brands.edit') || can('brands.delete')) && (
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            {can('brands.edit') && (
                              <button
                                onClick={() => handleOpenEdit(brand)}
                                className="p-1.5 rounded-lg text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 transition-colors cursor-pointer"
                                title="Editar"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                            )}
                            {can('brands.delete') && (
                              <button
                                onClick={() => setDeletingId(brand.id)}
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
                      <td colSpan={4} className="p-8 text-center text-neutral-400 text-xs">
                        No se encontraron marcas registradas
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
        title={editingBrand ? 'Editar Marca' : 'Nueva Marca'}
        maxWidth="max-w-md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Nombre de Marca *"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />
          <Input
            label="Origen (Ej: Nacional, Importado)"
            value={formData.origin}
            onChange={(e) => setFormData({ ...formData, origin: e.target.value })}
          />
          <Input
            label="Descripción"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          />
          <div className="flex justify-end gap-2 pt-3 border-t border-neutral-200">
            <Button type="button" variant="outline" size="sm" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary" size="sm" isLoading={submitting}>
              {editingBrand ? 'Actualizar' : 'Crear'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Confirm Delete */}
      <ConfirmDialog
        isOpen={!!deletingId}
        onClose={() => setDeletingId(null)}
        onConfirm={async () => {
          await removeBrand(deletingId);
          setDeletingId(null);
        }}
        title="¿Eliminar marca?"
        description="Esta marca ya no estará disponible para nuevos productos."
      />
    </div>
  );
}
