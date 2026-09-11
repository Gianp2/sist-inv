import { useState, useMemo } from 'react';
import { useProducts } from '../../hooks/useProducts';
import { useSettings } from '../../hooks/useSettingsAndUsers';
import { Boxes, AlertTriangle, Search, Check, Save, Shirt, Filter, ChevronLeft, ChevronRight, FileText, Download } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Alert } from '../../components/ui/Alert';
import { toast } from 'sonner';
import { TableSkeleton } from '../../components/ui/Skeleton';
import { formatCurrency } from '../../utils/formatters';
import { generateMonthlyReportPDF } from '../../utils/exportUtils';

export function StockPage() {
  const { products, loading, adjustVariantStock } = useProducts();
  const { settings } = useSettings();
  const [filterType, setFilterType] = useState('ALL'); // ALL, LOW, OUT
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [editingStocks, setEditingStocks] = useState({});

  const lowStockProducts = products.filter(
    (p) => (p.stock || 0) <= (p.stockMin || 5) && (p.stock || 0) > 0
  );
  const outOfStockProducts = products.filter((p) => (p.stock || 0) === 0);

  const filtered = useMemo(() => {
    return products.filter((p) => {
      const matchSearch =
        p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.sku?.toLowerCase().includes(searchTerm.toLowerCase());

      if (!matchSearch) return false;
      if (filterType === 'LOW') return (p.stock || 0) <= (p.stockMin || 5) && (p.stock || 0) > 0;
      if (filterType === 'OUT') return (p.stock || 0) === 0;
      return true;
    });
  }, [products, searchTerm, filterType]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedProducts = useMemo(() => {
    return filtered.slice(startIndex, startIndex + pageSize);
  }, [filtered, startIndex, pageSize]);

  const handleStockInputChange = (variantKey, val) => {
    setEditingStocks((prev) => ({ ...prev, [variantKey]: val }));
  };

  const handleSaveVariantStock = async (productId, variantId, currentVal) => {
    const key = `${productId}_${variantId}`;
    const newStock = editingStocks[key] !== undefined ? editingStocks[key] : currentVal;
    await adjustVariantStock(productId, variantId, newStock, 'Ajuste manual desde control de stock');
    const updated = { ...editingStocks };
    delete updated[key];
    setEditingStocks(updated);
    toast.success(`Stock actualizado: ${newStock} unidades`);
  };

  const handleExportStockPDF = () => {
    try {
      const now = new Date();
      generateMonthlyReportPDF({
        month: now.getMonth(),
        year: now.getFullYear(),
        products,
        businessInfo: settings,
        reportType: 'STOCK_ONLY',
      });
      toast.success('Reporte de stock crítico generado en PDF');
    } catch (err) {
      console.error(err);
      toast.error('Error al generar reporte en PDF');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-neutral-900 tracking-tight">
            Control de Stock y Talles
          </h1>
          <p className="text-xs text-neutral-500 mt-0.5 font-medium">
            Monitoreo en tiempo real y ajuste rápido de inventario por variante
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Quick Filter Tabs */}
          <div className="card-panel flex items-center gap-1.5 p-1 rounded-xl bg-white border border-neutral-200 shadow-2xs">
            <button
              onClick={() => {
                setFilterType('ALL');
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                filterType === 'ALL'
                  ? 'bg-neutral-900 text-white shadow-xs'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              Todos ({products.length})
            </button>
            <button
              onClick={() => {
                setFilterType('LOW');
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                filterType === 'LOW'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-neutral-600 hover:text-amber-700'
              }`}
            >
              Bajo Stock ({products.filter((p) => (p.stock || 0) <= (p.stockMin || 5) && (p.stock || 0) > 0).length})
            </button>
            <button
              onClick={() => {
                setFilterType('OUT');
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                filterType === 'OUT'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'text-neutral-600 hover:text-rose-700'
              }`}
            >
              Agotados ({products.filter((p) => (p.stock || 0) === 0).length})
            </button>
          </div>

          <Button
            size="sm"
            variant="outline"
            leftIcon={FileText}
            onClick={handleExportStockPDF}
            className="cursor-pointer font-bold text-xs"
          >
            PDF Stock Crítico
          </Button>
        </div>
      </div>

      {/* Stock Alerts Banner */}
      {(lowStockProducts.length > 0 || outOfStockProducts.length > 0) && (
        <Alert
          variant={outOfStockProducts.length > 0 ? 'error' : 'warning'}
          title={
            outOfStockProducts.length > 0
              ? `Atención Crítica: ${outOfStockProducts.length} prenda(s) sin inventario y ${lowStockProducts.length} con stock bajo`
              : `Aviso de Inventario: ${lowStockProducts.length} prenda(s) por debajo del stock mínimo`
          }
          action={
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                size="xs"
                variant="outline"
                onClick={() => setFilterType(outOfStockProducts.length > 0 ? 'OUT' : 'LOW')}
                className="cursor-pointer gap-1.5 font-bold"
              >
                <Filter className="w-3.5 h-3.5" />
                {outOfStockProducts.length > 0 ? 'Ver Solo Agotados' : 'Ver Solo Bajo Stock'}
              </Button>
              <Button
                size="xs"
                variant="default"
                onClick={handleExportStockPDF}
                className="cursor-pointer gap-1.5 font-bold bg-neutral-900 text-white"
              >
                <FileText className="w-3.5 h-3.5" />
                Exportar Informe PDF
              </Button>
            </div>
          }
        >
          Es recomendable revisar el stock disponible y emitir compras a proveedores antes del próximo turno de ventas.
        </Alert>
      )}

      {/* Search toolbar */}
      <div className="relative flex items-center max-w-md">
        <Search className="w-4 h-4 text-neutral-400 absolute left-3" />
        <input
          type="text"
          placeholder="Buscar prenda por nombre o SKU..."
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setCurrentPage(1);
          }}
          className="w-full pl-9 pr-3.5 py-2 text-xs rounded-xl border border-neutral-300 bg-white text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900"
        />
      </div>

      {/* Stock Cards by Product */}
      <div className="space-y-4">
        {loading ? (
          <TableSkeleton rows={5} cols={4} />
        ) : (
          paginatedProducts.map((product) => (
            <div
              key={product.id}
              className="card-panel p-5 rounded-2xl bg-white border border-neutral-200 shadow-xs space-y-4"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-neutral-200 pb-3">
                <div className="flex items-center gap-3">
                  <img
                    src={product.images?.[0] || 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=100&q=80'}
                    alt={product.name}
                    className="w-11 h-11 rounded-xl object-cover bg-neutral-100 border border-neutral-200"
                  />
                  <div>
                    <h3 className="text-sm font-bold text-neutral-900">
                      {product.name}
                    </h3>
                    <p className="text-[11px] text-neutral-500 font-medium">
                      SKU: {product.sku} • {product.categoryName} • Mínimo alerta: {product.stockMin || 5} u.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-neutral-600">Stock Total:</span>
                  <Badge
                    size="md"
                    variant={product.stock === 0 ? 'danger' : product.stock <= (product.stockMin || 5) ? 'warning' : 'success'}
                  >
                    {product.stock} unidades
                  </Badge>
                </div>
              </div>

              {/* Variants inline editor */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {product.variants?.map((v) => {
                  const key = `${product.id}_${v.id}`;
                  const currentVal = editingStocks[key] !== undefined ? editingStocks[key] : v.stock;
                  const hasChanged = editingStocks[key] !== undefined && Number(editingStocks[key]) !== v.stock;

                  return (
                    <div
                      key={v.id}
                      className="flex items-center justify-between p-3 rounded-xl bg-white border border-neutral-200 shadow-2xs"
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className="w-3.5 h-3.5 rounded-full border border-neutral-300"
                          style={{ background: v.colorHex || '#111827' }}
                        />
                        <div>
                          <p className="text-xs font-bold text-neutral-900">
                            {v.color} - <span className="font-extrabold">{v.size}</span>
                          </p>
                          <p className="text-[10px] text-neutral-500 font-mono">{v.sku || '-'}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          min="0"
                          value={currentVal}
                          onChange={(e) => handleStockInputChange(key, Number(e.target.value))}
                          className="w-16 h-8 text-center text-xs font-bold rounded-lg border border-neutral-300 bg-white text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900 hover:border-neutral-400"
                        />
                        {hasChanged && (
                          <button
                            onClick={() => handleSaveVariantStock(product.id, v.id, v.stock)}
                            className="p-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors cursor-pointer"
                            title="Guardar ajuste"
                          >
                            <Save className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}

        {!loading && products.length === 0 && (
          <div className="card-panel p-12 text-center bg-white rounded-2xl border border-neutral-200 shadow-xs space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-neutral-100 flex items-center justify-center text-neutral-400 mx-auto">
              <Shirt className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-bold text-neutral-900">Catálogo limpio y listo para usar (Stock en 0)</p>
              <p className="text-xs text-neutral-500 mt-1 max-w-sm mx-auto">
                No hay prendas cargadas en el sistema. Puedes agregar nuevos productos desde el Catálogo de Productos para comenzar el control de stock por talle y color.
              </p>
            </div>
          </div>
        )}

        {!loading && products.length > 0 && filtered.length === 0 && (
          <div className="card-panel p-12 text-center bg-white rounded-2xl border border-neutral-200 text-xs text-neutral-400">
            No se encontraron prendas con los filtros seleccionados
          </div>
        )}

        {/* Pagination Bar */}
        {!loading && filtered.length > 0 && (
          <div className="card-panel flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-white border border-neutral-200 shadow-xs text-xs">
            <div className="flex items-center gap-3 text-neutral-600">
              <span>
                Mostrando <strong className="text-neutral-900">{startIndex + 1}</strong> -{' '}
                <strong className="text-neutral-900">
                  {Math.min(startIndex + pageSize, filtered.length)}
                </strong>{' '}
                de <strong className="text-neutral-900">{filtered.length}</strong> prendas
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
                  <option value={10}>10</option>
                  <option value={15}>15</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
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
    </div>
  );
}
