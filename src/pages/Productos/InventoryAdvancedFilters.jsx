import { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  X,
  RotateCcw,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  Tag,
  Palette,
  Ruler,
  DollarSign,
  Boxes,
} from 'lucide-react';
import { CLOTHING_SIZES, CLOTHING_COLORS } from '../../constants/clothingConstants';
import { formatCurrency } from '../../utils/formatters';
import { sanitizeNumericValue, handleNumericFocus } from '../../utils/numericUtils';

const PRICE_PRESETS = [
  { label: 'Hasta $5.000', min: '', max: '5000' },
  { label: '$5.000 - $15.000', min: '5000', max: '15000' },
  { label: '$15.000 - $30.000', min: '15000', max: '30000' },
  { label: 'Más de $30.000', min: '30000', max: '' },
];

export function InventoryAdvancedFilters({
  products = [],
  categories = [],
  brands = [],
  filters,
  onFilterChange,
  onResetFilters,
  totalProductsCount = 0,
  filteredCount = 0,
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Dynamic extract of unique sizes found in products + standard sizes
  const availableSizes = useMemo(() => {
    const sizeSet = new Set();
    products.forEach((p) => {
      p.variants?.forEach((v) => {
        if (v.size?.trim()) sizeSet.add(v.size.trim());
      });
    });
    // Add common clothing sizes to ensure they are available for selection
    CLOTHING_SIZES.forEach((s) => sizeSet.add(s));
    return Array.from(sizeSet);
  }, [products]);

  // Dynamic extract of unique colors found in products + standard colors
  const availableColors = useMemo(() => {
    const colorMap = new Map();
    // Default palette
    CLOTHING_COLORS.forEach((c) => {
      colorMap.set(c.name.toLowerCase(), { name: c.name, hex: c.hex });
    });
    // Custom colors from products
    products.forEach((p) => {
      p.variants?.forEach((v) => {
        if (v.color?.trim()) {
          const lower = v.color.trim().toLowerCase();
          if (!colorMap.has(lower)) {
            colorMap.set(lower, { name: v.color.trim(), hex: v.colorHex || '#94a3b8' });
          }
        }
      });
    });
    return Array.from(colorMap.values());
  }, [products]);

  // Count active filters (excluding default values)
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filters.searchTerm?.trim()) count++;
    if (filters.category && filters.category !== 'ALL') count++;
    if (filters.size && filters.size !== 'ALL') count++;
    if (filters.color && filters.color !== 'ALL') count++;
    if (filters.minPrice !== '' && filters.minPrice !== undefined) count++;
    if (filters.maxPrice !== '' && filters.maxPrice !== undefined) count++;
    if (filters.brand && filters.brand !== 'ALL') count++;
    if (filters.stockStatus && filters.stockStatus !== 'ALL') count++;
    return count;
  }, [filters]);

  const handlePricePreset = (min, max) => {
    if (filters.minPrice === min && filters.maxPrice === max) {
      // Toggle off
      onFilterChange({ minPrice: '', maxPrice: '' });
    } else {
      onFilterChange({ minPrice: min, maxPrice: max });
    }
  };

  return (
    <div className="card-panel bg-white rounded-2xl border border-neutral-200 shadow-xs p-4 space-y-3.5 transition-all">
      {/* Top Main Bar: Search + Category + Toggle Button */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2.5">
        {/* Search Bar */}
        <div className="relative flex-1 flex items-center">
          <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 pointer-events-none" />
          <input
            id="inventory-search-input"
            type="text"
            placeholder="Buscar por prenda, SKU, código de barras o variante..."
            value={filters.searchTerm || ''}
            onChange={(e) => onFilterChange({ searchTerm: e.target.value })}
            className="w-full pl-9 pr-9 py-2.5 text-xs rounded-xl border border-neutral-300 bg-white text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900 hover:border-neutral-400 transition-colors shadow-2xs"
          />
          {filters.searchTerm && (
            <button
              onClick={() => onFilterChange({ searchTerm: '' })}
              className="absolute right-2.5 p-1 text-neutral-400 hover:text-neutral-700 rounded-lg hover:bg-neutral-100 transition-colors cursor-pointer"
              title="Limpiar búsqueda"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Quick Category Dropdown */}
        <div className="w-full md:w-56 shrink-0 relative">
          <select
            id="inventory-category-select"
            value={filters.category || 'ALL'}
            onChange={(e) => onFilterChange({ category: e.target.value })}
            className="w-full text-xs rounded-xl border border-neutral-300 bg-white text-neutral-900 px-3 py-2.5 cursor-pointer focus:outline-none focus:ring-2 focus:ring-neutral-900 hover:border-neutral-400 transition-colors shadow-2xs font-medium"
          >
            <option value="ALL">Todas las Categorías</option>
            {categories.map((c) => (
              <option key={c.id || c.name} value={c.name}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* Advanced Filters Toggle Button */}
        <button
          type="button"
          id="toggle-advanced-filters-btn"
          onClick={() => setIsExpanded((prev) => !prev)}
          className={`flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer border shrink-0 ${
            isExpanded || activeFiltersCount > (filters.searchTerm || filters.category !== 'ALL' ? 1 : 0)
              ? 'bg-neutral-900 text-white border-neutral-900 shadow-xs'
              : 'bg-white text-neutral-700 border-neutral-300 hover:bg-neutral-50 hover:border-neutral-400 shadow-2xs'
          }`}
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
          <span>Filtros Avanzados</span>
          {activeFiltersCount > 0 && (
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                isExpanded
                  ? 'bg-white text-neutral-950'
                  : 'bg-neutral-900 text-white'
              }`}
            >
              {activeFiltersCount}
            </span>
          )}
          {isExpanded ? (
            <ChevronUp className="w-3.5 h-3.5 opacity-70 ml-0.5" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5 opacity-70 ml-0.5" />
          )}
        </button>

        {/* Reset Filters (Only visible if filters active) */}
        {activeFiltersCount > 0 && (
          <button
            type="button"
            id="reset-inventory-filters-btn"
            onClick={onResetFilters}
            className="flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 border border-rose-200 rounded-xl transition-colors cursor-pointer shrink-0"
            title="Restablecer todos los filtros"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden lg:inline">Limpiar</span>
          </button>
        )}
      </div>

      {/* Advanced Filters Collapsible Section */}
      {isExpanded && (
        <div className="pt-3.5 border-t border-neutral-200/80 space-y-3.5 animate-in fade-in slide-in-from-top-1 duration-150">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Filter by Size (Talle) */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-neutral-700 uppercase tracking-wider flex items-center gap-1.5">
                <Ruler className="w-3.5 h-3.5 text-neutral-500" />
                Talle de Prenda
              </label>
              <select
                id="filter-size-select"
                value={filters.size || 'ALL'}
                onChange={(e) => onFilterChange({ size: e.target.value })}
                className="w-full text-xs rounded-xl border border-neutral-300 bg-white text-neutral-900 px-3 py-2 cursor-pointer focus:outline-none focus:ring-2 focus:ring-neutral-900 hover:border-neutral-400 font-medium"
              >
                <option value="ALL">Cualquier Talle</option>
                {availableSizes.map((size) => (
                  <option key={size} value={size}>
                    Talle {size}
                  </option>
                ))}
              </select>
            </div>

            {/* Filter by Color */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-neutral-700 uppercase tracking-wider flex items-center gap-1.5">
                <Palette className="w-3.5 h-3.5 text-neutral-500" />
                Color
              </label>
              <select
                id="filter-color-select"
                value={filters.color || 'ALL'}
                onChange={(e) => onFilterChange({ color: e.target.value })}
                className="w-full text-xs rounded-xl border border-neutral-300 bg-white text-neutral-900 px-3 py-2 cursor-pointer focus:outline-none focus:ring-2 focus:ring-neutral-900 hover:border-neutral-400 font-medium"
              >
                <option value="ALL">Cualquier Color</option>
                {availableColors.map((color) => (
                  <option key={color.name} value={color.name}>
                    {color.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Filter by Brand (Marca) */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-neutral-700 uppercase tracking-wider flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-neutral-500" />
                Marca
              </label>
              <select
                id="filter-brand-select"
                value={filters.brand || 'ALL'}
                onChange={(e) => onFilterChange({ brand: e.target.value })}
                className="w-full text-xs rounded-xl border border-neutral-300 bg-white text-neutral-900 px-3 py-2 cursor-pointer focus:outline-none focus:ring-2 focus:ring-neutral-900 hover:border-neutral-400 font-medium"
              >
                <option value="ALL">Todas las Marcas</option>
                {brands.map((b) => (
                  <option key={b.id || b.name} value={b.name}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Filter by Stock Status */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-neutral-700 uppercase tracking-wider flex items-center gap-1.5">
                <Boxes className="w-3.5 h-3.5 text-neutral-500" />
                Disponibilidad de Stock
              </label>
              <select
                id="filter-stock-status-select"
                value={filters.stockStatus || 'ALL'}
                onChange={(e) => onFilterChange({ stockStatus: e.target.value })}
                className="w-full text-xs rounded-xl border border-neutral-300 bg-white text-neutral-900 px-3 py-2 cursor-pointer focus:outline-none focus:ring-2 focus:ring-neutral-900 hover:border-neutral-400 font-medium"
              >
                <option value="ALL">Todo el Stock</option>
                <option value="IN_STOCK">Con Stock Disponible (&gt; 0)</option>
                <option value="LOW_STOCK">Stock Bajo (≤ Mínimo)</option>
                <option value="OUT_OF_STOCK">Agotados (0 u.)</option>
              </select>
            </div>
          </div>

          {/* Rango de Precios */}
          <div className="pt-2 border-t border-neutral-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2.5">
              <span className="text-[11px] font-bold text-neutral-700 uppercase tracking-wider flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5 text-neutral-500" />
                Rango de Precio Venta:
              </span>
              <div className="flex items-center gap-2">
                <div className="relative flex items-center w-28">
                  <span className="absolute left-2.5 text-xs text-neutral-400 font-bold">$</span>
                  <input
                    id="filter-min-price-input"
                    type="number"
                    min="0"
                    placeholder="Mínimo"
                    value={filters.minPrice ?? ''}
                    onFocus={handleNumericFocus}
                    onChange={(e) => onFilterChange({ minPrice: sanitizeNumericValue(e.target.value) })}
                    className="w-full pl-6 pr-2 py-1.5 text-xs rounded-lg border border-neutral-300 bg-white text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900 font-mono"
                  />
                </div>
                <span className="text-neutral-400 text-xs font-bold">—</span>
                <div className="relative flex items-center w-28">
                  <span className="absolute left-2.5 text-xs text-neutral-400 font-bold">$</span>
                  <input
                    id="filter-max-price-input"
                    type="number"
                    min="0"
                    placeholder="Máximo"
                    value={filters.maxPrice ?? ''}
                    onFocus={handleNumericFocus}
                    onChange={(e) => onFilterChange({ maxPrice: sanitizeNumericValue(e.target.value) })}
                    className="w-full pl-6 pr-2 py-1.5 text-xs rounded-lg border border-neutral-300 bg-white text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900 font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Quick Presets */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] uppercase font-bold text-neutral-400 mr-1 hidden sm:inline">
                Rápido:
              </span>
              {PRICE_PRESETS.map((p) => {
                const isActive = filters.minPrice === p.min && filters.maxPrice === p.max;
                return (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => handlePricePreset(p.min, p.max)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-colors cursor-pointer ${
                      isActive
                        ? 'bg-neutral-900 text-white border-neutral-900'
                        : 'bg-neutral-50 text-neutral-600 border-neutral-200 hover:bg-neutral-100 hover:text-neutral-900'
                    }`}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Active Filter Chips & Results Count Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[11px] font-semibold text-neutral-500 mr-1">
            {totalProductsCount > 0 ? (
              <>
                Mostrando <strong className="text-neutral-900">{filteredCount}</strong> de{' '}
                <strong className="text-neutral-900">{totalProductsCount}</strong> prendas
              </>
            ) : (
              '0 prendas'
            )}
          </span>

          {/* Active Chips */}
          {filters.searchTerm && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-neutral-100 text-neutral-800 border border-neutral-200">
              Búsqueda: <span className="font-bold">"{filters.searchTerm}"</span>
              <button
                onClick={() => onFilterChange({ searchTerm: '' })}
                className="hover:text-rose-600 cursor-pointer ml-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {filters.category && filters.category !== 'ALL' && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-neutral-100 text-neutral-800 border border-neutral-200">
              Categoría: <span className="font-bold">{filters.category}</span>
              <button
                onClick={() => onFilterChange({ category: 'ALL' })}
                className="hover:text-rose-600 cursor-pointer ml-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {filters.size && filters.size !== 'ALL' && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-neutral-100 text-neutral-800 border border-neutral-200">
              Talle: <span className="font-bold">{filters.size}</span>
              <button
                onClick={() => onFilterChange({ size: 'ALL' })}
                className="hover:text-rose-600 cursor-pointer ml-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {filters.color && filters.color !== 'ALL' && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-neutral-100 text-neutral-800 border border-neutral-200">
              Color: <span className="font-bold">{filters.color}</span>
              <button
                onClick={() => onFilterChange({ color: 'ALL' })}
                className="hover:text-rose-600 cursor-pointer ml-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {filters.brand && filters.brand !== 'ALL' && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-neutral-100 text-neutral-800 border border-neutral-200">
              Marca: <span className="font-bold">{filters.brand}</span>
              <button
                onClick={() => onFilterChange({ brand: 'ALL' })}
                className="hover:text-rose-600 cursor-pointer ml-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {(filters.minPrice !== '' || filters.maxPrice !== '') && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-neutral-100 text-neutral-800 border border-neutral-200">
              Precio:
              <span className="font-bold">
                {filters.minPrice ? `$${filters.minPrice}` : '$0'} —{' '}
                {filters.maxPrice ? `$${filters.maxPrice}` : 'sin límite'}
              </span>
              <button
                onClick={() => onFilterChange({ minPrice: '', maxPrice: '' })}
                className="hover:text-rose-600 cursor-pointer ml-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {filters.stockStatus && filters.stockStatus !== 'ALL' && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-neutral-100 text-neutral-800 border border-neutral-200">
              Stock:{' '}
              <span className="font-bold">
                {filters.stockStatus === 'IN_STOCK'
                  ? 'Con stock'
                  : filters.stockStatus === 'LOW_STOCK'
                  ? 'Bajo stock'
                  : 'Agotados'}
              </span>
              <button
                onClick={() => onFilterChange({ stockStatus: 'ALL' })}
                className="hover:text-rose-600 cursor-pointer ml-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
        </div>

        {activeFiltersCount > 0 && (
          <button
            type="button"
            onClick={onResetFilters}
            className="text-[11px] font-bold text-neutral-500 hover:text-neutral-900 underline transition-colors cursor-pointer"
          >
            Limpiar todos los filtros
          </button>
        )}
      </div>
    </div>
  );
}
