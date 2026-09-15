import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Filter, Shirt, Edit2, Trash2, Eye, Boxes, Download, RotateCcw, ChevronLeft, ChevronRight, TrendingUp } from 'lucide-react';
import { useProducts } from '../../hooks/useProducts';
import { useCategories, useBrands } from '../../hooks/useCatalog';
import { ProductFormModal } from './ProductFormModal';
import { ProductDetailModal } from './ProductDetailModal';
import { InventoryAdvancedFilters } from './InventoryAdvancedFilters';
import { ProductVisualBadge, GarmentSpecsPills } from '../../components/common/ProductVisualBadge';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { TableSkeleton } from '../../components/ui/Skeleton';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { formatCurrency } from '../../utils/formatters';
import { exportToExcel } from '../../utils/exportUtils';
import { toast } from 'sonner';

const DEFAULT_FILTERS = {
  searchTerm: '',
  category: 'ALL',
  size: 'ALL',
  color: 'ALL',
  minPrice: '',
  maxPrice: '',
  brand: 'ALL',
  stockStatus: 'ALL',
};

export function ProductosPage() {
  const navigate = useNavigate();
  const { can } = useAuth();
  const { products, loading, createProduct, editProduct, removeProduct, clearProducts } = useProducts();
  const { categories } = useCategories();
  const { brands } = useBrands();

  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [viewingProduct, setViewingProduct] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  const handleFilterChange = (updates) => {
    setFilters((prev) => ({ ...prev, ...updates }));
    setCurrentPage(1);
  };

  const handleResetFilters = () => {
    setFilters(DEFAULT_FILTERS);
    setCurrentPage(1);
  };

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      // 1. Search Query (name, sku, barcode, description, or variant codes)
      if (filters.searchTerm?.trim()) {
        const query = filters.searchTerm.trim().toLowerCase();
        const matchName = p.name?.toLowerCase().includes(query);
        const matchSku = p.sku?.toLowerCase().includes(query);
        const matchBarcode = p.barcode?.includes(query);
        const matchDesc = p.description?.toLowerCase().includes(query);
        const matchVariant = p.variants?.some(
          (v) =>
            v.sku?.toLowerCase().includes(query) ||
            v.barcode?.includes(query) ||
            v.color?.toLowerCase().includes(query) ||
            v.size?.toLowerCase().includes(query)
        );
        if (!matchName && !matchSku && !matchBarcode && !matchDesc && !matchVariant) {
          return false;
        }
      }

      // 2. Category Filter
      if (filters.category && filters.category !== 'ALL') {
        const matchCat =
          p.categoryId === filters.category || p.categoryName === filters.category;
        if (!matchCat) return false;
      }

      // 3. Size Filter (Talle)
      if (filters.size && filters.size !== 'ALL') {
        const targetSize = filters.size.trim().toLowerCase();
        const hasSize = p.variants?.some(
          (v) => v.size?.trim().toLowerCase() === targetSize
        );
        if (!hasSize) return false;
      }

      // 4. Color Filter
      if (filters.color && filters.color !== 'ALL') {
        const targetColor = filters.color.trim().toLowerCase();
        const hasColor = p.variants?.some(
          (v) =>
            v.color?.trim().toLowerCase().includes(targetColor) ||
            targetColor.includes(v.color?.trim().toLowerCase())
        );
        if (!hasColor) return false;
      }

      // 5. Brand Filter
      if (filters.brand && filters.brand !== 'ALL') {
        const matchBrand =
          p.brandId === filters.brand || p.brandName === filters.brand;
        if (!matchBrand) return false;
      }

      // 6. Price Range Filter (Rango de Precios)
      const salePrice = Number(p.salePrice) || 0;
      if (filters.minPrice !== '' && filters.minPrice !== undefined) {
        const min = Number(filters.minPrice);
        if (!isNaN(min) && salePrice < min) return false;
      }
      if (filters.maxPrice !== '' && filters.maxPrice !== undefined) {
        const max = Number(filters.maxPrice);
        if (!isNaN(max) && salePrice > max) return false;
      }

      // 7. Stock Status Filter
      const stock = Number(p.stock) || 0;
      const stockMin = Number(p.stockMin) || 5;
      if (filters.stockStatus === 'IN_STOCK' && stock <= 0) return false;
      if (filters.stockStatus === 'LOW_STOCK' && (stock > stockMin || stock <= 0)) return false;
      if (filters.stockStatus === 'OUT_OF_STOCK' && stock !== 0) return false;

      return true;
    });
  }, [products, filters]);

  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / pageSize));
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedProducts = useMemo(() => {
    return filteredProducts.slice(startIndex, startIndex + pageSize);
  }, [filteredProducts, startIndex, pageSize]);

  const handleOpenCreate = () => {
    setEditingProduct(null);
    setModalOpen(true);
  };

  const handleOpenEdit = (product) => {
    setEditingProduct(product);
    setModalOpen(true);
  };

  const handleSave = async (formData) => {
    if (editingProduct) {
      await editProduct(editingProduct.id, formData);
    } else {
      await createProduct(formData);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingId) return;
    setIsDeleting(true);
    try {
      await removeProduct(deletingId);
      setDeletingId(null);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleExportExcel = () => {
    const data = filteredProducts.map((p) => {
      const row = {
        Nombre: p.name,
        SKU: p.sku,
        CódigoBarras: p.barcode,
        Categoría: p.categoryName,
        Marca: p.brandName,
      };
      if (can('costs.view')) {
        row['PrecioCosto'] = p.costPrice;
      }
      row['PrecioVenta'] = p.salePrice;
      row['StockTotal'] = p.stock;
      row['StockMinimo'] = p.stockMin;
      row['VariantesCount'] = p.variants?.length || 0;
      return row;
    });
    exportToExcel(data, 'Catalogo_Productos.xlsx', 'Productos');
    toast.success('Catálogo exportado a Excel');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-center sm:text-left">
        <div>
          <h1 className="text-2xl font-black text-neutral-900 tracking-tight">
            Catálogo de Productos
          </h1>
          <p className="text-xs text-neutral-500 mt-0.5 font-medium">
            Gestión completa de prendas, talles, colores y precios
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-center sm:justify-end gap-2 w-full sm:w-auto">
          {products.length > 0 && can('products.clear') && (
            <Button
              variant="outline"
              size="sm"
              leftIcon={Trash2}
              onClick={() => setConfirmClearOpen(true)}
              className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-neutral-200 text-xs h-10 sm:h-9"
            >
              Vaciar Prendas
            </Button>
          )}
          <Button variant="outline" size="sm" leftIcon={Download} onClick={handleExportExcel} className="text-xs h-10 sm:h-9">
            Exportar Excel
          </Button>
          {can('pricing.manage') && (
            <Button
              variant="outline"
              size="sm"
              leftIcon={TrendingUp}
              onClick={() => navigate('/revision-precios')}
              className="border-neutral-300 text-neutral-800 hover:bg-neutral-50 text-xs h-10 sm:h-9"
            >
              Revisión de Precios
            </Button>
          )}
          {can('products.create') && (
            <Button
              variant="primary"
              size="sm"
              leftIcon={Plus}
              onClick={handleOpenCreate}
              className="w-full sm:w-auto h-11 sm:h-9 text-xs font-black justify-center shadow-xs"
            >
              + Nueva Prenda
            </Button>
          )}
        </div>
      </div>

      {/* Advanced Filters & Search Toolbar */}
      <InventoryAdvancedFilters
        products={products}
        categories={categories}
        brands={brands}
        filters={filters}
        onFilterChange={handleFilterChange}
        onResetFilters={handleResetFilters}
        totalProductsCount={products.length}
        filteredCount={filteredProducts.length}
      />

      {/* Table & Mobile Cards */}
      <div className="card-panel bg-white rounded-2xl border border-neutral-200 overflow-hidden shadow-xs">
        {loading ? (
          <div className="p-6">
            <TableSkeleton rows={6} cols={6} />
          </div>
        ) : (
          <>
            {/* Mobile View: Clean Touch-Friendly Cards */}
            <div className="md:hidden divide-y divide-neutral-200">
              {paginatedProducts.map((p, pIdx) => (
                <div key={p.id ? `${p.id}-${pIdx}` : `prod-${pIdx}`} className="p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <ProductVisualBadge product={p} size="lg" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-1">
                        <p className="font-bold text-sm text-neutral-900 truncate">{p.name}</p>
                        <Badge
                          size="sm"
                          variant={p.stock === 0 ? 'danger' : p.stock <= (p.stockMin || 5) ? 'warning' : 'success'}
                        >
                          {p.stock === 0 ? 'Agotado' : `${p.stock} u.`}
                        </Badge>
                      </div>
                      <p className="text-[11px] text-neutral-500 font-medium">{p.categoryName} • {p.brandName}</p>
                      <p className="text-xs font-black text-neutral-900 mt-1">{formatCurrency(p.salePrice)}</p>
                    </div>
                  </div>

                  {/* Garment specs (Location & Fabric) */}
                  <GarmentSpecsPills product={p} />

                  {/* Variants Pills */}
                  {(() => {
                    const validVariants = (p.variants || []).filter((v) => {
                      if (!v) return false;
                      if (typeof v === 'string') return v.trim().length > 0;
                      return v.color || v.size || v.sku || typeof v.stock === 'number';
                    });
                    if (validVariants.length === 0) return null;

                    return (
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {validVariants.slice(0, 4).map((v, i) => {
                          const colorPart = typeof v === 'object' && v?.color ? String(v.color).slice(0, 3) : '';
                          const sizePart = typeof v === 'object' ? (v?.size || '') : '';
                          const label = [colorPart, sizePart].filter(Boolean).join('/') || (typeof v === 'string' ? v.slice(0, 5) : 'Var');
                          const stockCount = typeof v === 'object' ? (v?.stock ?? 0) : 0;
                          return (
                            <span
                              key={i}
                              className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-neutral-100 border border-neutral-200 text-neutral-800"
                            >
                              {label} ({stockCount})
                            </span>
                          );
                        })}
                        {validVariants.length > 4 && (
                          <span className="text-[10px] text-neutral-500 font-bold">
                            +{validVariants.length - 4} más
                          </span>
                        )}
                      </div>
                    );
                  })()}

                  {/* Card Actions */}
                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-100">
                    <button
                      onClick={() => setViewingProduct(p)}
                      className="min-h-[40px] flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-neutral-700 bg-neutral-100 hover:bg-neutral-200 transition-colors cursor-pointer"
                    >
                      <Eye className="w-4 h-4" />
                      <span>Ver</span>
                    </button>
                    {can('products.edit') && (
                      <button
                        onClick={() => handleOpenEdit(p)}
                        className="min-h-[40px] flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-neutral-700 bg-neutral-100 hover:bg-neutral-200 transition-colors cursor-pointer"
                      >
                        <Edit2 className="w-4 h-4" />
                        <span>Editar</span>
                      </button>
                    )}
                    {can('products.delete') && (
                      <button
                        onClick={() => setDeletingId(p.id)}
                        className="min-h-[40px] flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                        <span>Eliminar</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {filteredProducts.length === 0 && (
                <div className="p-8 text-center text-xs text-neutral-500">
                  No se encontraron prendas con los filtros aplicados.
                </div>
              )}
            </div>

            {/* Desktop View: Table */}
            <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-white text-neutral-800 font-bold border-b border-neutral-200">
                <tr>
                  <th className="p-4">Prenda / Ficha</th>
                  <th className="p-4">Categoría / Marca</th>
                  <th className="p-4">Precio Venta</th>
                  <th className="p-4">Variantes</th>
                  <th className="p-4 text-center">Stock Total</th>
                  <th className="p-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {paginatedProducts.map((p, pIdx) => (
                  <tr key={p.id ? `${p.id}-${pIdx}` : `prod-${pIdx}`} className="hover:bg-neutral-50/80 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <ProductVisualBadge product={p} size="sm" />
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <p className="font-bold text-neutral-900">{p.name}</p>
                            {!p.images?.[0] && (
                              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-neutral-100 text-neutral-500 border border-neutral-200">
                                Sin foto
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-[10px] text-neutral-500 font-medium flex-wrap mt-0.5">
                            <span className="font-mono">SKU: {p.sku}</span>
                            {p.location && (
                              <span className="text-neutral-700 bg-neutral-100 px-1.5 py-0.5 rounded font-semibold">
                                📍 {p.location}
                              </span>
                            )}
                            {p.fabric && (
                              <span className="text-neutral-600">
                                🧵 {p.fabric}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <p className="font-semibold text-neutral-800">{p.categoryName}</p>
                      <p className="text-[10px] text-neutral-500">{p.brandName}</p>
                    </td>
                    <td className="p-4 font-black text-neutral-900">
                      {formatCurrency(p.salePrice)}
                    </td>
                    <td className="p-4">
                      {(() => {
                        const validVariants = (p.variants || []).filter((v) => {
                          if (!v) return false;
                          if (typeof v === 'string') return v.trim().length > 0;
                          return v.color || v.size || v.sku || typeof v.stock === 'number';
                        });
                        if (validVariants.length === 0) {
                          return <span className="text-xs text-neutral-400 italic">Sin variantes</span>;
                        }

                        return (
                          <div className="flex items-center gap-1 flex-wrap max-w-xs">
                            {validVariants.slice(0, 4).map((v, i) => {
                              const colorPart = typeof v === 'object' && v?.color ? String(v.color).slice(0, 3) : '';
                              const sizePart = typeof v === 'object' ? (v?.size || '') : '';
                              const label = [colorPart, sizePart].filter(Boolean).join('/') || (typeof v === 'string' ? v.slice(0, 5) : 'Var');
                              const stockCount = typeof v === 'object' ? (v?.stock ?? 0) : 0;
                              return (
                                <span
                                  key={i}
                                  className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-white border border-neutral-200 text-neutral-800"
                                >
                                  {label} ({stockCount})
                                </span>
                              );
                            })}
                            {validVariants.length > 4 && (
                              <span className="text-[10px] text-neutral-500 font-bold">
                                +{validVariants.length - 4} más
                              </span>
                            )}
                          </div>
                        );
                      })()}
                    </td>
                    <td className="p-4 text-center">
                      <Badge
                        size="sm"
                        variant={p.stock === 0 ? 'danger' : p.stock <= (p.stockMin || 5) ? 'warning' : 'success'}
                      >
                        {p.stock === 0 ? 'Agotado' : `${p.stock} u.`}
                      </Badge>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setViewingProduct(p)}
                          className="p-1.5 rounded-lg text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 transition-colors cursor-pointer"
                          title="Ver detalle de prenda"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {can('products.edit') && (
                          <button
                            onClick={() => handleOpenEdit(p)}
                            className="p-1.5 rounded-lg text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 transition-colors cursor-pointer"
                            title="Editar prenda"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        )}
                        {can('products.delete') && (
                          <button
                            onClick={() => setDeletingId(p.id)}
                            className="p-1.5 rounded-lg text-neutral-500 hover:text-rose-600 hover:bg-neutral-100 transition-colors cursor-pointer"
                            title="Eliminar prenda"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredProducts.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-12 text-center text-neutral-500">
                      {products.length === 0 ? (
                        <div className="flex flex-col items-center justify-center max-w-sm mx-auto space-y-3">
                          <div className="w-12 h-12 rounded-2xl bg-neutral-100 flex items-center justify-center text-neutral-400">
                            <Shirt className="w-6 h-6" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-neutral-900">No hay prendas registradas</p>
                            <p className="text-xs text-neutral-500 mt-1">
                              El sistema está nuevo y listo para usar. Comienza cargando tu primera prenda con sus talles, colores y precios.
                            </p>
                          </div>
                          {can('products.create') && (
                            <Button
                              variant="primary"
                              size="sm"
                              leftIcon={Plus}
                              onClick={() => {
                                setEditingProduct(null);
                                setModalOpen(true);
                              }}
                            >
                              Nueva Prenda
                            </Button>
                          )}
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center max-w-sm mx-auto space-y-3">
                          <div className="w-12 h-12 rounded-2xl bg-neutral-100 flex items-center justify-center text-neutral-400">
                            <Filter className="w-6 h-6" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-neutral-900">No se encontraron prendas</p>
                            <p className="text-xs text-neutral-500 mt-1">
                              Ningún producto coincide con los filtros seleccionados (categoría, talle, color o rango de precios).
                            </p>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            leftIcon={RotateCcw}
                            onClick={handleResetFilters}
                          >
                            Restablecer Filtros
                          </Button>
                        </div>
                      )}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          </>
        )}

        {/* Pagination Bar */}
        {!loading && filteredProducts.length > 0 && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-3.5 bg-neutral-50/70 border-t border-neutral-200 text-xs">
            <div className="flex items-center gap-3 text-neutral-600">
              <span>
                Mostrando <strong className="text-neutral-900">{startIndex + 1}</strong> -{' '}
                <strong className="text-neutral-900">
                  {Math.min(startIndex + pageSize, filteredProducts.length)}
                </strong>{' '}
                de <strong className="text-neutral-900">{filteredProducts.length}</strong> prendas
              </span>
              <span className="text-neutral-300">•</span>
              <div className="flex items-center gap-1.5">
                <span className="text-neutral-500">Por página:</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="bg-white border border-neutral-300 rounded-lg px-2 py-1 text-xs font-semibold text-neutral-800 focus:outline-none focus:ring-1 focus:ring-neutral-900 cursor-pointer"
                >
                  <option value={15}>15</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-1.5 self-end sm:self-auto">
              <span className="text-neutral-500 mr-1">
                Pág. <strong className="text-neutral-900">{currentPage}</strong> de {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg border border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-100 disabled:opacity-40 disabled:pointer-events-none transition-colors cursor-pointer"
                title="Página anterior"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
                className="p-1.5 rounded-lg border border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-100 disabled:opacity-40 disabled:pointer-events-none transition-colors cursor-pointer"
                title="Página siguiente"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Product Form Modal */}
      <ProductFormModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
        initialProduct={editingProduct}
        categories={categories}
        brands={brands}
      />

      {/* Product Detail Modal */}
      <ProductDetailModal
        isOpen={!!viewingProduct}
        onClose={() => setViewingProduct(null)}
        product={viewingProduct}
        onEdit={handleOpenEdit}
      />

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        isOpen={!!deletingId}
        onClose={() => setDeletingId(null)}
        onConfirm={handleConfirmDelete}
        title="¿Eliminar producto?"
        description="Se eliminará la prenda y todas sus variantes de talle/color del sistema."
        isLoading={isDeleting}
      />

      {/* Confirm Clear All Products Dialog */}
      <ConfirmDialog
        isOpen={confirmClearOpen}
        onClose={() => setConfirmClearOpen(false)}
        onConfirm={async () => {
          setIsClearing(true);
          try {
            await clearProducts();
            setConfirmClearOpen(false);
          } finally {
            setIsClearing(false);
          }
        }}
        title="¿Vaciar todo el catálogo de prendas?"
        description="Esta acción eliminará todas las prendas y variantes registradas en el sistema para dejar la base de datos completamente limpia. No se puede deshacer."
        confirmText="Sí, vaciar catálogo"
        variant="danger"
        isLoading={isClearing}
      />
    </div>
  );
}
