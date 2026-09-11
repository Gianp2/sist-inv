import { useState } from 'react';
import { Plus, Edit2, Trash2, Tags, Search } from 'lucide-react';
import { useCategories } from '../../hooks/useCatalog';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { TableSkeleton } from '../../components/ui/Skeleton';

export function CategoriasPage() {
  const { categories, loading, createCategory, editCategory, removeCategory } = useCategories();
  const [searchTerm, setSearchTerm] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCat, setEditingCat] = useState(null);
  const [formData, setFormData] = useState({ name: '', code: '', description: '' });
  const [deletingId, setDeletingId] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const filtered = categories.filter(
    (c) =>
      c.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.code?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleOpenCreate = () => {
    setEditingCat(null);
    setFormData({ name: '', code: '', description: '' });
    setModalOpen(true);
  };

  const handleOpenEdit = (cat) => {
    setEditingCat(cat);
    setFormData({ name: cat.name || '', code: cat.code || '', description: cat.description || '' });
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editingCat) {
        await editCategory(editingCat.id, formData);
      } else {
        await createCategory(formData);
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
            Categorías de Ropa
          </h1>
          <p className="text-xs text-neutral-500 mt-0.5 font-medium">
            Clasificación de productos (Remeras, Pantalones, Camperas, etc.)
          </p>
        </div>
        <Button variant="primary" size="sm" leftIcon={Plus} onClick={handleOpenCreate}>
          Nueva Categoría
        </Button>
      </div>

      <div className="card-panel bg-white rounded-2xl border border-neutral-200 p-4 shadow-xs">
        <div className="relative max-w-md mb-4">
          <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Buscar categoría..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-neutral-300 bg-white text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900"
          />
        </div>

        {loading ? (
          <TableSkeleton rows={4} cols={3} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-white text-neutral-800 font-bold border-b border-neutral-200">
                <tr>
                  <th className="p-3">Nombre</th>
                  <th className="p-3">Código</th>
                  <th className="p-3">Descripción</th>
                  <th className="p-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {filtered.map((cat) => (
                  <tr key={cat.id} className="hover:bg-neutral-50/80 transition-colors">
                    <td className="p-3 font-bold text-neutral-900 flex items-center gap-2">
                      <Tags className="w-4 h-4 text-neutral-400" />
                      {cat.name}
                    </td>
                    <td className="p-3 font-mono font-bold text-neutral-700">
                      {cat.code || '-'}
                    </td>
                    <td className="p-3 text-neutral-600 font-medium">{cat.description || '-'}</td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleOpenEdit(cat)}
                          className="p-1.5 rounded-lg text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 transition-colors cursor-pointer"
                          title="Editar"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeletingId(cat.id)}
                          className="p-1.5 rounded-lg text-neutral-500 hover:text-rose-600 hover:bg-neutral-100 transition-colors cursor-pointer"
                          title="Eliminar"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-neutral-400 text-xs">
                      No se encontraron categorías registradas
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
        title={editingCat ? 'Editar Categoría' : 'Nueva Categoría'}
        maxWidth="max-w-md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Nombre *"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />
          <Input
            label="Código Prefijo SKU (Ej: REM, PAN)"
            value={formData.code}
            onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
            maxLength={4}
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
              {editingCat ? 'Actualizar' : 'Crear'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Confirm Delete */}
      <ConfirmDialog
        isOpen={!!deletingId}
        onClose={() => setDeletingId(null)}
        onConfirm={async () => {
          await removeCategory(deletingId);
          setDeletingId(null);
        }}
        title="¿Eliminar categoría?"
        description="Esta categoría ya no estará disponible para nuevos productos."
      />
    </div>
  );
}
