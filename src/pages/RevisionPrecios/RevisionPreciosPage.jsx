import { useState, useMemo } from 'react';
import { useProducts } from '../../hooks/useProducts';
import { useCategories } from '../../hooks/useCatalog';
import { useAuth } from '../../context/AuthContext';
import { formatCurrency, formatDate } from '../../utils/formatters';
import {
  getProductAging,
  getLastSaleInfo,
  calculateProfitability,
  calculateSuggestedPrice,
  DEFAULT_AGE_THRESHOLDS,
  AGE_STATUS,
} from '../../utils/pricingUtils';
import { ProductDetailModal } from '../Productos/ProductDetailModal';
import { EditPriceModal } from './EditPriceModal';
import { PriceExplanationModal } from './PriceExplanationModal';
import { BatchPriceUpdateModal } from './BatchPriceUpdateModal';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { exportToExcel } from '../../utils/exportUtils';
import {
  DollarSign,
  Clock,
  AlertTriangle,
  Lightbulb,
  Search,
  Filter,
  ArrowUpDown,
  CheckSquare,
  Square,
  Edit,
  Eye,
  SlidersHorizontal,
  TrendingDown,
  TrendingUp,
  Download,
  Boxes,
  HelpCircle,
  History,
  AlertCircle,
  Tag,
} from 'lucide-react';
import { toast } from 'sonner';

export default function RevisionPreciosPage() {
  const {
    products,
    loading,
    priceHistories,
    costHistories,
    updateProductPrice,
    batchUpdatePrices,
  } = useProducts();
  const { categories } = useCategories();
  const { can, isAdmin } = useAuth();
  const canViewCosts = isAdmin || can('costs.view');

  // Filters & State
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [activeFilter, setActiveFilter] = useState('ALL'); 
  // 'ALL' | 'RECENT' | 'OLD' | 'VERY_OLD' | 'STAGNANT' | 'NEEDS_REVIEW' | 'NO_SALES' | 'NO_COST' | 'NO_HISTORY' | 'LOW_STOCK' | 'OUT_OF_STOCK'
  const [sortBy, setSortBy] = useState('AGING_DESC'); 
  // 'AGING_DESC' | 'AGING_ASC' | 'PRICE_DESC' | 'PRICE_ASC' | 'COST_DESC' | 'COST_ASC' | 'STOCK_DESC' | 'MARGIN_DESC' | 'MARGIN_ASC' | 'LAST_SALE_DESC'

  // Selected Products for batch action
  const [selectedIds, setSelectedIds] = useState(new Set());

  // Modals
  const [detailProduct, setDetailProduct] = useState(null);
  const [editPriceProduct, setEditPriceProduct] = useState(null);
  const [explainProduct, setExplainProduct] = useState(null);
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);

  // Pre-calculate metrics for all products
  const analyzedProducts = useMemo(() => {
    return products.map((p) => {
      const currentPrice = Number(p.salePrice ?? p.price ?? 0);
      const currentCost = Number(p.costPrice ?? p.cost ?? 0);
      const aging = getProductAging(p);
      const saleInfo = getLastSaleInfo(p);
      const profit = calculateProfitability(currentCost, currentPrice);
      const suggestion = calculateSuggestedPrice(p);
      const productPriceHistory = priceHistories.filter((h) => h.productId === p.id);
      const productCostHistory = costHistories.filter((h) => h.productId === p.id);

      return {
        ...p,
        currentPrice,
        currentCost,
        aging,
        saleInfo,
        profit,
        suggestion,
        hasPriceHistory: productPriceHistory.length > 0,
        hasCostHistory: productCostHistory.length > 0,
        hasCost: currentCost > 0,
        hasPrice: currentPrice > 0,
        priceHistoryCount: productPriceHistory.length,
      };
    });
  }, [products, priceHistories, costHistories]);

  // Overall KPIs
  const kpis = useMemo(() => {
    let stagnantCount = 0;
    let oldStockCount = 0;
    let needsReviewCount = 0;
    let noCostCount = 0;
    let noHistoryCount = 0;
    let noSalesCount = 0;
    let stagnantStockUnits = 0;

    analyzedProducts.forEach((p) => {
      if (p.aging.isStagnant) {
        stagnantCount++;
        stagnantStockUnits += Number(p.stock) || 0;
      }
      if (p.aging.status.key === 'ANTIGUO' || p.aging.status.key === 'MUY_ANTIGUO') {
        oldStockCount++;
      }
      if (p.suggestion.needsReview) {
        needsReviewCount++;
      }
      if (!p.hasCost) {
        noCostCount++;
      }
      if (!p.hasPriceHistory) {
        noHistoryCount++;
      }
      if (!p.saleInfo.hasSales) {
        noSalesCount++;
      }
    });

    return {
      stagnantCount,
      oldStockCount,
      needsReviewCount,
      noCostCount,
      noHistoryCount,
      noSalesCount,
      stagnantStockUnits,
    };
  }, [analyzedProducts]);

  // Filtered & Sorted products
  const filteredProducts = useMemo(() => {
    return analyzedProducts
      .filter((p) => {
        // Search Term: Name, SKU, Barcode, Category
        if (searchTerm.trim()) {
          const term = searchTerm.toLowerCase();
          const matchName = p.name?.toLowerCase().includes(term);
          const matchSku = p.sku?.toLowerCase().includes(term);
          const matchBarcode = p.barcode?.toLowerCase().includes(term);
          const matchCat = p.categoryName?.toLowerCase().includes(term);
          if (!matchName && !matchSku && !matchBarcode && !matchCat) return false;
        }

        // Category Filter
        if (selectedCategory !== 'ALL') {
          if (p.categoryId !== selectedCategory && p.categoryName !== selectedCategory) {
            return false;
          }
        }

        // Quick filter
        switch (activeFilter) {
          case 'RECENT':
            return p.aging.status.key === 'RECIENTE';
          case 'OLD':
            return p.aging.status.key === 'ANTIGUO';
          case 'VERY_OLD':
            return p.aging.status.key === 'MUY_ANTIGUO';
          case 'STAGNANT':
            return p.aging.isStagnant;
          case 'NEEDS_REVIEW':
            return p.suggestion.needsReview;
          case 'NO_SALES':
            return !p.saleInfo.hasSales;
          case 'NO_COST':
            return !p.hasCost;
          case 'NO_HISTORY':
            return !p.hasPriceHistory;
          case 'LOW_STOCK':
            return (Number(p.stock) || 0) > 0 && (Number(p.stock) || 0) <= (Number(p.stockMin) || 5);
          case 'OUT_OF_STOCK':
            return (Number(p.stock) || 0) <= 0;
          default:
            return true;
        }
      })
      .sort((a, b) => {
        switch (sortBy) {
          case 'AGING_DESC':
            return (b.aging.daysInStock ?? -1) - (a.aging.daysInStock ?? -1);
          case 'AGING_ASC':
            return (a.aging.daysInStock ?? 9999) - (b.aging.daysInStock ?? 9999);
          case 'PRICE_DESC':
            return b.currentPrice - a.currentPrice;
          case 'PRICE_ASC':
            return a.currentPrice - b.currentPrice;
          case 'COST_DESC':
            return b.currentCost - a.currentCost;
          case 'COST_ASC':
            return a.currentCost - b.currentCost;
          case 'STOCK_DESC':
            return (Number(b.stock) || 0) - (Number(a.stock) || 0);
          case 'MARGIN_DESC':
            return (b.profit.marginOnSales || 0) - (a.profit.marginOnSales || 0);
          case 'MARGIN_ASC':
            return (a.profit.marginOnSales || 0) - (b.profit.marginOnSales || 0);
          case 'LAST_SALE_DESC': {
            const timeA = a.saleInfo.lastSaleDate ? new Date(a.saleInfo.lastSaleDate).getTime() : 0;
            const timeB = b.saleInfo.lastSaleDate ? new Date(b.saleInfo.lastSaleDate).getTime() : 0;
            return timeB - timeA;
          }
          default:
            return 0;
        }
      });
  }, [analyzedProducts, searchTerm, selectedCategory, activeFilter, sortBy]);

  // Selection handlers
  const handleToggleSelect = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAllFiltered = () => {
    if (selectedIds.size === filteredProducts.length && filteredProducts.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredProducts.map((p) => p.id)));
    }
  };

  const selectedProductsList = useMemo(() => {
    return products.filter((p) => selectedIds.has(p.id));
  }, [products, selectedIds]);

  // Quick Action: Apply suggested price directly
  const handleApplySuggestedPrice = async (product, suggestedVal, reason) => {
    try {
      await updateProductPrice(
        product.id,
        suggestedVal,
        reason || 'Aplicación directa de precio sugerido'
      );
    } catch (err) {
      console.error(err);
    }
  };

  // Quick Action: Apply percent discount
  const handleQuickDiscount = async (product, percent) => {
    const currentPrice = Number(product.salePrice ?? product.price ?? 0);
    if (!currentPrice || currentPrice <= 0) {
      toast.error('La prenda no tiene un precio base fijado');
      return;
    }
    const newPrice = Math.round((currentPrice * (1 - percent / 100)) / 100) * 100;
    try {
      await updateProductPrice(
        product.id,
        newPrice,
        `Descuento promocional del ${percent}%`
      );
    } catch (err) {
      console.error(err);
    }
  };

  // Export to Excel
  const handleExport = () => {
    const data = filteredProducts.map((p) => ({
      Prenda: p.name,
      SKU: p.sku || '-',
      CódigoBarras: p.barcode || '-',
      Categoría: p.categoryName || '-',
      StockTotal: p.stock || 0,
      PrecioActual: p.currentPrice,
      CostoUnitario: p.currentCost,
      MargenVentaPorc: p.profit.isValid ? `${p.profit.marginOnSales}%` : 'Sin costo',
      GananciaUnitaria: p.profit.isValid ? p.profit.profit : 'Sin costo',
      DíasEnStock: p.aging.daysInStock ?? 'No registrada',
      EstadoAntigüedad: p.aging.status.label,
      FechaIngreso: p.aging.entryDate ? formatDate(p.aging.entryDate, 'short') : 'No registrada',
      ÚltimaVenta: p.saleInfo.hasSales ? formatDate(p.saleInfo.lastSaleDate, 'short') : 'Sin ventas',
      DíasSinVender: p.saleInfo.daysWithoutSales ?? 'Sin ventas',
      PrecioSugerido: p.suggestion.suggestedPrice || 'No disponible',
      AccionRecomendada: p.suggestion.actionLabel,
      MotivoRevisión: p.suggestion.reviewReason,
    }));

    exportToExcel(data, 'Revision_Precios_Indumentaria.xlsx', 'RevisionPrecios');
    toast.success('Reporte exportado exitosamente');
  };

  return (
    <div className="space-y-6 pb-12">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-neutral-900 tracking-tight flex items-center gap-2">
            <DollarSign className="w-6 h-6 text-neutral-800" />
            Revisión de Precios & Rotación
          </h1>
          <p className="text-xs sm:text-sm text-neutral-500 mt-1">
            Auditoría de márgenes, prendas estancadas, sugerencias de precios y actualización masiva
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {selectedIds.size > 0 && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsBatchModalOpen(true)}
              className="bg-neutral-900 hover:bg-neutral-800"
            >
              <SlidersHorizontal className="w-4 h-4 mr-1.5" />
              Actualización Masiva ({selectedIds.size})
            </Button>
          )}

          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="w-4 h-4 mr-1.5" />
            Exportar Excel
          </Button>
        </div>
      </div>

      {/* KPI SUMMARY CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <button
          type="button"
          onClick={() => setActiveFilter('STAGNANT')}
          className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
            activeFilter === 'STAGNANT'
              ? 'bg-rose-50 border-rose-300 ring-2 ring-rose-400'
              : 'bg-white border-neutral-200 hover:border-neutral-300 shadow-2xs'
          }`}
        >
          <div className="flex items-center justify-between text-rose-700 mb-1">
            <span className="text-[10px] uppercase font-bold tracking-wider">Estancados</span>
            <AlertTriangle className="w-3.5 h-3.5" />
          </div>
          <p className="text-xl font-black text-rose-950">{kpis.stagnantCount}</p>
          <p className="text-[10px] text-rose-700 mt-0.5">&gt; 365 días en stock</p>
        </button>

        <button
          type="button"
          onClick={() => setActiveFilter('OLD')}
          className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
            activeFilter === 'OLD'
              ? 'bg-amber-50 border-amber-300 ring-2 ring-amber-400'
              : 'bg-white border-neutral-200 hover:border-neutral-300 shadow-2xs'
          }`}
        >
          <div className="flex items-center justify-between text-amber-700 mb-1">
            <span className="text-[10px] uppercase font-bold tracking-wider">Stock Antiguo</span>
            <Clock className="w-3.5 h-3.5" />
          </div>
          <p className="text-xl font-black text-amber-950">{kpis.oldStockCount}</p>
          <p className="text-[10px] text-amber-700 mt-0.5">91 a 365 días</p>
        </button>

        <button
          type="button"
          onClick={() => setActiveFilter('NEEDS_REVIEW')}
          className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
            activeFilter === 'NEEDS_REVIEW'
              ? 'bg-purple-50 border-purple-300 ring-2 ring-purple-400'
              : 'bg-white border-neutral-200 hover:border-neutral-300 shadow-2xs'
          }`}
        >
          <div className="flex items-center justify-between text-purple-700 mb-1">
            <span className="text-[10px] uppercase font-bold tracking-wider">Para Revisar</span>
            <AlertCircle className="w-3.5 h-3.5" />
          </div>
          <p className="text-xl font-black text-purple-950">{kpis.needsReviewCount}</p>
          <p className="text-[10px] text-purple-700 mt-0.5">Margen o precio alerta</p>
        </button>

        <button
          type="button"
          onClick={() => setActiveFilter('NO_COST')}
          className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
            activeFilter === 'NO_COST'
              ? 'bg-neutral-100 border-neutral-300 ring-2 ring-neutral-400'
              : 'bg-white border-neutral-200 hover:border-neutral-300 shadow-2xs'
          }`}
        >
          <div className="flex items-center justify-between text-neutral-600 mb-1">
            <span className="text-[10px] uppercase font-bold tracking-wider">Sin Costo</span>
            <HelpCircle className="w-3.5 h-3.5" />
          </div>
          <p className="text-xl font-black text-neutral-900">{kpis.noCostCount}</p>
          <p className="text-[10px] text-neutral-500 mt-0.5">Falta costo unitario</p>
        </button>

        <button
          type="button"
          onClick={() => setActiveFilter('NO_HISTORY')}
          className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
            activeFilter === 'NO_HISTORY'
              ? 'bg-blue-50 border-blue-300 ring-2 ring-blue-400'
              : 'bg-white border-neutral-200 hover:border-neutral-300 shadow-2xs'
          }`}
        >
          <div className="flex items-center justify-between text-blue-700 mb-1">
            <span className="text-[10px] uppercase font-bold tracking-wider">Sin Historial</span>
            <History className="w-3.5 h-3.5" />
          </div>
          <p className="text-xl font-black text-blue-950">{kpis.noHistoryCount}</p>
          <p className="text-[10px] text-blue-700 mt-0.5">Sin cambios previos</p>
        </button>

        <button
          type="button"
          onClick={() => setActiveFilter('NO_SALES')}
          className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
            activeFilter === 'NO_SALES'
              ? 'bg-indigo-50 border-indigo-300 ring-2 ring-indigo-400'
              : 'bg-white border-neutral-200 hover:border-neutral-300 shadow-2xs'
          }`}
        >
          <div className="flex items-center justify-between text-indigo-700 mb-1">
            <span className="text-[10px] uppercase font-bold tracking-wider">Sin Ventas</span>
            <Boxes className="w-3.5 h-3.5" />
          </div>
          <p className="text-xl font-black text-indigo-950">{kpis.noSalesCount}</p>
          <p className="text-[10px] text-indigo-700 mt-0.5">Prendas sin rotar</p>
        </button>
      </div>

      {/* ALERT FOR STAGNANT PRODUCTS */}
      {kpis.stagnantCount > 0 && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-rose-100 text-rose-700 shrink-0 mt-0.5">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs sm:text-sm font-black text-rose-950">
                Atención: Detectamos {kpis.stagnantCount} productos estancados ({kpis.stagnantStockUnits} prendas acumuladas)
              </h4>
              <p className="text-xs text-rose-800 mt-0.5">
                Prendas con más de 365 días en inventario. Se recomienda aplicar promociones, liquidaciones o precios sugeridos para recuperar capital inmovilizado.
              </p>
            </div>
          </div>
          <Button
            size="xs"
            variant="outline"
            onClick={() => setActiveFilter('STAGNANT')}
            className="border-rose-300 text-rose-900 bg-white hover:bg-rose-100 shrink-0 font-bold"
          >
            Filtrar Estancados
          </Button>
        </div>
      )}

      {/* SEARCH, CATEGORY, SORT & FILTERS BAR */}
      <div className="space-y-3 bg-white p-4 rounded-2xl border border-neutral-200 shadow-2xs">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          {/* Search */}
          <div className="sm:col-span-2 relative">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por prenda, SKU, código de barras..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-neutral-50 border border-neutral-200 text-neutral-900 placeholder:text-neutral-400 focus:outline-hidden focus:ring-2 focus:ring-neutral-900 focus:bg-white"
            />
          </div>

          {/* Category */}
          <div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3 py-2 text-xs font-semibold rounded-xl bg-neutral-50 border border-neutral-200 text-neutral-800 focus:outline-hidden focus:ring-2 focus:ring-neutral-900"
            >
              <option value="ALL">Todas las Categorías</option>
              {categories.map((c) => (
                <option key={c.id} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Sort By */}
          <div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full px-3 py-2 text-xs font-semibold rounded-xl bg-neutral-50 border border-neutral-200 text-neutral-800 focus:outline-hidden focus:ring-2 focus:ring-neutral-900"
            >
              <option value="AGING_DESC">Antigüedad (Mayor a Menor)</option>
              <option value="AGING_ASC">Antigüedad (Menor a Mayor)</option>
              <option value="PRICE_DESC">Precio Actual (Mayor)</option>
              <option value="PRICE_ASC">Precio Actual (Menor)</option>
              <option value="COST_DESC">Costo Unitario (Mayor)</option>
              <option value="COST_ASC">Costo Unitario (Menor)</option>
              <option value="MARGIN_DESC">Margen % (Mayor)</option>
              <option value="MARGIN_ASC">Margen % (Menor)</option>
              <option value="STOCK_DESC">Stock en Depósito</option>
              <option value="LAST_SALE_DESC">Última Venta (Reciente)</option>
            </select>
          </div>
        </div>

        {/* Quick Filter Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider shrink-0 mr-1">
            Filtros:
          </span>

          {[
            { id: 'ALL', label: `Todos (${products.length})` },
            { id: 'RECENT', label: 'Recientes (0-90d)' },
            { id: 'OLD', label: 'Antiguos (91-180d)' },
            { id: 'VERY_OLD', label: 'Muy Antiguos (181-365d)' },
            { id: 'STAGNANT', label: `Estancados (${kpis.stagnantCount})` },
            { id: 'NEEDS_REVIEW', label: `Para Revisar (${kpis.needsReviewCount})` },
            { id: 'NO_SALES', label: 'Sin Ventas' },
            { id: 'NO_COST', label: 'Sin Costo' },
            { id: 'NO_HISTORY', label: 'Sin Historial' },
            { id: 'LOW_STOCK', label: 'Stock Bajo' },
            { id: 'OUT_OF_STOCK', label: 'Agotados' },
          ].map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setActiveFilter(f.id)}
              className={`px-2.5 py-1 rounded-lg font-bold text-[11px] whitespace-nowrap transition-all cursor-pointer ${
                activeFilter === f.id
                  ? 'bg-neutral-900 text-white shadow-xs'
                  : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-700'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* TABLE / LIST OF PRODUCTS */}
      <div className="border border-neutral-200 rounded-2xl bg-white shadow-2xs overflow-hidden">
        {/* Table top action bar */}
        <div className="p-3.5 bg-neutral-50/80 border-b border-neutral-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSelectAllFiltered}
              className="p-1 rounded text-neutral-600 hover:text-neutral-900 hover:bg-neutral-200 cursor-pointer flex items-center gap-1.5 text-xs font-semibold"
            >
              {selectedIds.size > 0 && selectedIds.size === filteredProducts.length ? (
                <CheckSquare className="w-4 h-4 text-neutral-900" />
              ) : (
                <Square className="w-4 h-4 text-neutral-400" />
              )}
              <span>
                {selectedIds.size === filteredProducts.length && filteredProducts.length > 0
                  ? 'Deseleccionar todos'
                  : 'Seleccionar todos'}
              </span>
            </button>
            <span className="text-xs text-neutral-500">
              ({filteredProducts.length} prendas listadas)
            </span>
          </div>

          {selectedIds.size > 0 && (
            <div className="flex items-center gap-2 text-xs">
              <span className="font-bold text-neutral-800">
                {selectedIds.size} seleccionados
              </span>
              <Button
                size="xs"
                variant="primary"
                onClick={() => setIsBatchModalOpen(true)}
              >
                Actualizar Precios
              </Button>
            </div>
          )}
        </div>

        {/* Responsive Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-neutral-100/70 text-neutral-600 font-bold border-b border-neutral-200">
              <tr>
                <th className="p-3 w-10 text-center">#</th>
                <th className="p-3">Prenda</th>
                <th className="p-3">Ingreso & Antigüedad</th>
                <th className="p-3">Última Venta</th>
                <th className="p-3 text-right">Costo</th>
                <th className="p-3 text-right">Precio Actual</th>
                <th className="p-3 text-right">Margen Actual</th>
                <th className="p-3">Sugerencia & Estado</th>
                <th className="p-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {filteredProducts.map((p) => {
                const isSelected = selectedIds.has(p.id);
                const isStagnant = p.aging.isStagnant;

                return (
                  <tr
                    key={p.id}
                    className={`hover:bg-neutral-50/80 transition-colors ${
                      isSelected ? 'bg-amber-50/40' : isStagnant ? 'bg-rose-50/20' : ''
                    }`}
                  >
                    {/* Checkbox */}
                    <td className="p-3 text-center">
                      <button
                        type="button"
                        onClick={() => handleToggleSelect(p.id)}
                        className="cursor-pointer text-neutral-500 hover:text-neutral-900"
                      >
                        {isSelected ? (
                          <CheckSquare className="w-4 h-4 text-neutral-900" />
                        ) : (
                          <Square className="w-4 h-4 text-neutral-300" />
                        )}
                      </button>
                    </td>

                    {/* Product Basic Info */}
                    <td className="p-3">
                      <div className="flex items-center gap-2.5">
                        {p.images?.[0] ? (
                          <img
                            src={p.images[0]}
                            alt={p.name}
                            className="w-10 h-10 rounded-lg object-cover border border-neutral-200 bg-neutral-100 shrink-0"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-neutral-100 border border-neutral-200 flex items-center justify-center shrink-0 text-neutral-400">
                            <Tag className="w-4 h-4" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <button
                            type="button"
                            onClick={() => setDetailProduct(p)}
                            className="font-bold text-neutral-900 hover:underline text-left block truncate max-w-[200px]"
                          >
                            {p.name}
                          </button>
                          <div className="flex items-center gap-1.5 text-[10px] text-neutral-500 mt-0.5">
                            <span className="font-mono">{p.sku || '-'}</span>
                            <span>•</span>
                            <span>{p.categoryName || 'General'}</span>
                            <span>•</span>
                            <span className="font-bold text-neutral-700">Stock: {p.stock || 0}</span>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Stock Entry & Aging */}
                    <td className="p-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`inline-block w-2 h-2 rounded-full ${p.aging.status.dotClass}`}
                          />
                          <span className="font-bold text-neutral-900 text-xs">
                            {p.aging.status.label}
                          </span>
                        </div>
                        <p className="text-[11px] text-neutral-600 font-medium">
                          {p.aging.daysInStock !== null ? `${p.aging.daysInStock} días` : 'Sin fecha'}
                        </p>
                        <p className="text-[10px] text-neutral-400">
                          {p.aging.entryDate ? formatDate(p.aging.entryDate, 'short') : '-'}
                        </p>
                      </div>
                    </td>

                    {/* Last Sale */}
                    <td className="p-3">
                      <div className="space-y-0.5">
                        <span className="font-bold text-neutral-800 block text-xs">
                          {p.saleInfo.hasSales ? p.saleInfo.formatted : 'Sin ventas'}
                        </span>
                        <span className="text-[10px] text-neutral-400 block">
                          {p.saleInfo.hasSales ? formatDate(p.saleInfo.lastSaleDate, 'short') : '-'}
                        </span>
                      </div>
                    </td>

                    {/* Unit Cost */}
                    <td className="p-3 text-right">
                      {!canViewCosts ? (
                        <span className="text-[11px] text-neutral-400 italic">Restringido</span>
                      ) : p.hasCost ? (
                        <div>
                          <span className="font-black text-neutral-900 block text-xs">
                            {formatCurrency(p.currentCost)}
                          </span>
                          {p.hasCostHistory && (
                            <span className="text-[10px] text-neutral-400 font-mono">
                              Historial act.
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-[11px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">
                          Sin costo
                        </span>
                      )}
                    </td>

                    {/* Sale Price */}
                    <td className="p-3 text-right">
                      {p.hasPrice ? (
                        <div>
                          <span className="font-black text-neutral-900 text-sm block">
                            {formatCurrency(p.currentPrice)}
                          </span>
                          <span className="text-[10px] text-neutral-400 block">
                            {p.priceLastUpdatedAt ? formatDate(p.priceLastUpdatedAt, 'short') : 'Sin cambio'}
                          </span>
                        </div>
                      ) : (
                        <span className="text-[11px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded">
                          Sin precio
                        </span>
                      )}
                    </td>

                    {/* Profitability Margin */}
                    <td className="p-3 text-right">
                      {!canViewCosts ? (
                        <span className="text-[11px] text-neutral-400 italic">Restringido</span>
                      ) : p.profit.isValid ? (
                        <div className="space-y-0.5">
                          <span
                            className={`font-black text-xs block ${
                              p.profit.isLoss
                                ? 'text-rose-600'
                                : p.profit.marginOnSales < 30
                                ? 'text-amber-600'
                                : 'text-emerald-700'
                            }`}
                          >
                            {p.profit.marginOnSales}%
                          </span>
                          <span className="text-[10px] text-neutral-500 font-semibold block">
                            +{formatCurrency(p.profit.profit)}
                          </span>
                        </div>
                      ) : (
                        <span className="text-[10px] text-neutral-400">-</span>
                      )}
                    </td>

                    {/* Suggestion & Status */}
                    <td className="p-3">
                      <div className="space-y-1">
                        <button
                          type="button"
                          onClick={() => setExplainProduct(p)}
                          className="text-left group cursor-pointer"
                        >
                          <div className="flex items-center gap-1">
                            <span
                              className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md border ${
                                p.suggestion.action === 'LIQUIDAR'
                                  ? 'bg-rose-100 text-rose-800 border-rose-200'
                                  : p.suggestion.action === 'APLICAR_DESCUENTO'
                                  ? 'bg-amber-100 text-amber-800 border-amber-200'
                                  : p.suggestion.action === 'AUMENTAR'
                                  ? 'bg-blue-100 text-blue-800 border-blue-200'
                                  : 'bg-neutral-100 text-neutral-800 border-neutral-200'
                              }`}
                            >
                              {p.suggestion.actionLabel}
                            </span>
                          </div>

                          {p.suggestion.suggestedPrice ? (
                            <p className="text-xs font-black text-neutral-900 group-hover:text-amber-700 mt-0.5">
                              Sugerido: {formatCurrency(p.suggestion.suggestedPrice)}
                            </p>
                          ) : (
                            <p className="text-[10px] text-neutral-400 mt-0.5">
                              {p.suggestion.missingInfo}
                            </p>
                          )}
                        </button>
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {/* View Details */}
                        <button
                          type="button"
                          title="Ver detalle del producto e historial"
                          onClick={() => setDetailProduct(p)}
                          className="p-1.5 rounded-lg text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 cursor-pointer"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        {/* View Suggestion Breakdown */}
                        <button
                          type="button"
                          title="Ver cálculo de sugerencia"
                          onClick={() => setExplainProduct(p)}
                          className="p-1.5 rounded-lg text-amber-700 hover:bg-amber-50 cursor-pointer"
                        >
                          <HelpCircle className="w-4 h-4" />
                        </button>

                        {/* Edit Price Modal */}
                        <button
                          type="button"
                          title="Modificar precio"
                          onClick={() => setEditPriceProduct(p)}
                          className="p-1.5 rounded-lg text-neutral-800 hover:bg-neutral-100 cursor-pointer"
                        >
                          <Edit className="w-4 h-4" />
                        </button>

                        {/* Quick Suggestion Application */}
                        {p.suggestion.canCalculate && p.suggestion.suggestedPrice && (
                          <button
                            type="button"
                            title={`Aplicar sugerido (${formatCurrency(p.suggestion.suggestedPrice)})`}
                            onClick={() => handleApplySuggestedPrice(p, p.suggestion.suggestedPrice)}
                            className="p-1.5 rounded-lg text-emerald-700 hover:bg-emerald-50 cursor-pointer"
                          >
                            <Lightbulb className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredProducts.length === 0 && (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-xs text-neutral-500">
                    No se encontraron prendas con los filtros aplicados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* DETAIL MODAL WITH PRICE & COST HISTORIES */}
      {detailProduct && (
        <ProductDetailModal
          isOpen={!!detailProduct}
          onClose={() => setDetailProduct(null)}
          product={detailProduct}
          onEdit={() => {
            setEditPriceProduct(detailProduct);
            setDetailProduct(null);
          }}
        />
      )}

      {/* EDIT PRICE MODAL */}
      {editPriceProduct && (
        <EditPriceModal
          isOpen={!!editPriceProduct}
          onClose={() => setEditPriceProduct(null)}
          product={editPriceProduct}
          onSave={updateProductPrice}
        />
      )}

      {/* PRICE SUGGESTION EXPLANATION MODAL */}
      {explainProduct && (
        <PriceExplanationModal
          isOpen={!!explainProduct}
          onClose={() => setExplainProduct(null)}
          product={explainProduct}
          onApplySuggestion={(p, val, r) => handleApplySuggestedPrice(p, val, r)}
        />
      )}

      {/* BATCH PRICE UPDATE MODAL */}
      {isBatchModalOpen && (
        <BatchPriceUpdateModal
          isOpen={isBatchModalOpen}
          onClose={() => {
            setIsBatchModalOpen(false);
            setSelectedIds(new Set());
          }}
          selectedProducts={selectedProductsList}
          onApplyBatch={batchUpdatePrices}
        />
      )}
    </div>
  );
}
