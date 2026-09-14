import { useState } from 'react';
import { Plus, Trash2, Palette, Layers } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { CLOTHING_SIZES, CLOTHING_COLORS } from '../../constants/clothingConstants';
import { sanitizeNumericValue, handleNumericFocus } from '../../utils/numericUtils';

export function ProductVariantManager({ variants = [], onChange, baseSku = '' }) {
  const [selectedSizes, setSelectedSizes] = useState([]);
  const [selectedColors, setSelectedColors] = useState([]);

  // Toggle size selection for matrix generation
  const toggleSize = (size) => {
    setSelectedSizes((prev) =>
      prev.includes(size) ? prev.filter((s) => s !== size) : [...prev, size]
    );
  };

  // Toggle color selection for matrix generation
  const toggleColor = (color) => {
    setSelectedColors((prev) =>
      prev.some((c) => c.name === color.name)
        ? prev.filter((c) => c.name !== color.name)
        : [...prev, color]
    );
  };

  // Automatically generate combination matrix (e.g. Negro S, Negro M, Blanco S, Blanco M)
  const generateMatrix = () => {
    if (selectedSizes.length === 0 || selectedColors.length === 0) return;

    const newVariants = [];
    selectedColors.forEach((color) => {
      selectedSizes.forEach((size) => {
        const variantId = `v_${Date.now()}_${Math.random().toString(36).substring(7)}`;
        const colorCode = color.name.substring(0, 3).toUpperCase();
        const sku = baseSku ? `${baseSku}-${colorCode}-${size}` : '';

        // Check if combination already exists
        const exists = variants.some((v) => v.color === color.name && v.size === size);
        if (!exists) {
          newVariants.push({
            id: variantId,
            color: color.name,
            colorHex: color.hex,
            size,
            stock: 5,
            sku,
          });
        }
      });
    });

    onChange([...variants, ...newVariants]);
    setSelectedSizes([]);
    setSelectedColors([]);
  };

  const handleStockChange = (index, rawStock) => {
    const sanitized = sanitizeNumericValue(rawStock);
    const updated = [...variants];
    updated[index].stock = sanitized === '' ? '' : Math.max(0, parseInt(sanitized, 10) || 0);
    onChange(updated);
  };

  const handleSkuChange = (index, newSku) => {
    const updated = [...variants];
    updated[index].sku = newSku;
    onChange(updated);
  };

  const handleRemoveVariant = (index) => {
    const updated = variants.filter((_, idx) => idx !== index);
    onChange(updated);
  };

  const handleAddSingleVariant = () => {
    const defaultColor = CLOTHING_COLORS[0];
    const defaultSize = CLOTHING_SIZES[1]; // 'S'
    const variantId = `v_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    onChange([
      ...variants,
      {
        id: variantId,
        color: defaultColor.name,
        colorHex: defaultColor.hex,
        size: defaultSize,
        stock: 5,
        sku: baseSku ? `${baseSku}-VAR-${variants.length + 1}` : '',
      },
    ]);
  };

  return (
    <div className="space-y-4 pt-2 border-t border-neutral-200">
      <div className="flex items-center justify-between">
        <div>
          <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider">
            Variantes (Talles y Colores)
          </label>
          <p className="text-[11px] text-neutral-500 font-medium">
            Cada combinación tendrá control de stock independiente.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="xs"
          leftIcon={Plus}
          onClick={handleAddSingleVariant}
        >
          Agregar Variante
        </Button>
      </div>

      {/* Generator Box */}
      <div className="card-panel p-4 rounded-2xl bg-white border border-neutral-200 shadow-2xs space-y-3">
        <span className="text-xs font-bold text-neutral-900 flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5 text-neutral-900" />
          Generador Rápido de Combinaciones
        </span>

        {/* Colors selector */}
        <div>
          <span className="text-[11px] font-bold text-neutral-700 block mb-1.5 uppercase tracking-wider">
            1. Selecciona Colores:
          </span>
          <div className="flex flex-wrap gap-1.5">
            {CLOTHING_COLORS.map((c) => {
              const isSelected = selectedColors.some((sc) => sc.name === c.name);
              return (
                <button
                  type="button"
                  key={c.name}
                  onClick={() => toggleColor(c)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all ${
                    isSelected
                      ? 'bg-neutral-900 text-white border-neutral-900 shadow-2xs'
                      : 'bg-white text-neutral-800 border-neutral-300 hover:border-neutral-400'
                  }`}
                >
                  <span
                    className="w-3 h-3 rounded-full border border-neutral-300"
                    style={{ background: c.hex }}
                  />
                  <span>{c.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Sizes selector */}
        <div>
          <span className="text-[11px] font-bold text-neutral-700 block mb-1.5 uppercase tracking-wider">
            2. Selecciona Talles:
          </span>
          <div className="flex flex-wrap gap-1.5">
            {CLOTHING_SIZES.slice(0, 10).map((sz) => {
              const isSelected = selectedSizes.includes(sz);
              return (
                <button
                  type="button"
                  key={sz}
                  onClick={() => toggleSize(sz)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold border transition-all ${
                    isSelected
                      ? 'bg-neutral-900 text-white border-neutral-900 shadow-2xs'
                      : 'bg-white text-neutral-800 border-neutral-300 hover:border-neutral-400'
                  }`}
                >
                  {sz}
                </button>
              );
            })}
          </div>
        </div>

        {selectedSizes.length > 0 && selectedColors.length > 0 && (
          <Button
            type="button"
            variant="primary"
            size="xs"
            className="w-full"
            onClick={generateMatrix}
          >
            Generar {selectedSizes.length * selectedColors.length} Combinaciones
          </Button>
        )}
      </div>

      {/* Variants List Table */}
      {variants.length > 0 && (
        <div className="space-y-2 max-h-60 overflow-y-auto">
          {variants.map((variant, idx) => (
            <div
              key={variant.id || idx}
              className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-white border border-neutral-200 shadow-2xs"
            >
              <div className="flex items-center gap-2">
                <span
                  className="w-4 h-4 rounded-full border shrink-0"
                  style={{ background: variant.colorHex || '#111827' }}
                />
                <span className="text-xs font-bold text-neutral-900">
                  {variant.color}
                </span>
                <span className="text-xs px-2 py-0.5 rounded-md bg-neutral-50 text-neutral-800 font-bold border border-neutral-200">
                  {variant.size}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  <span className="text-[10px] text-neutral-600 font-bold uppercase">Stock:</span>
                  <input
                    type="number"
                    min="0"
                    value={variant.stock}
                    onFocus={handleNumericFocus}
                    onBlur={() => {
                      if (variant.stock === '') handleStockChange(idx, 0);
                    }}
                    onChange={(e) => handleStockChange(idx, e.target.value)}
                    className="w-16 h-8 text-center text-xs font-bold rounded-lg border border-neutral-300 bg-white text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900 hover:border-neutral-400"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveVariant(idx)}
                  className="p-1.5 text-neutral-400 hover:text-rose-600 rounded-lg transition-colors cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
