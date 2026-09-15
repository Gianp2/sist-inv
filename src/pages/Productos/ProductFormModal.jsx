import { useState, useEffect, useMemo } from 'react';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { ImageUpload } from '../../components/common/ImageUpload';
import { ProductVariantManager } from './ProductVariantManager';
import { generateSKU, generateBarcode } from '../../utils/calculations';
import {
  CLOTHING_FABRICS,
  CLOTHING_LOCATIONS,
  CLOTHING_SEASONS,
  CLOTHING_CUTS,
  CLOTHING_SIZES,
} from '../../constants/clothingConstants';
import {
  Shirt,
  Sparkles,
  Tag,
  ChevronDown,
  ChevronUp,
  Check,
  Plus,
  Zap,
  Info,
} from 'lucide-react';
import { toast } from 'sonner';

// Quick popular garment sizes for 1-tap selection
const QUICK_SIZES = ['S', 'M', 'L', 'XL', 'XXL', '1', '2', '3', '4', '5', 'Único'];

export function ProductFormModal({
  isOpen,
  onClose,
  onSave,
  initialProduct = null,
  categories = [],
  brands = [],
}) {
  // Form State
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    barcode: '',
    categoryId: '',
    categoryName: '',
    brandId: '',
    brandName: '',
    description: '',
    costPrice: 0,
    salePrice: '',
    wholesalePrice: 0,
    discount: 0,
    stockMin: 5,
    entryDate: '',
    fabric: '',
    location: '',
    season: 'Atemporal (Todo el año)',
    cutStyle: '',
    distinctiveDetails: '',
    images: [],
    variants: [],
    active: true,
  });

  // Rapid entry state: Quick sizes & custom size input
  const [selectedSizes, setSelectedSizes] = useState([]);
  const [customSizeInput, setCustomSizeInput] = useState('');
  const [quickStock, setQuickStock] = useState(1);
  const [isCustomBrand, setIsCustomBrand] = useState(false);
  const [customBrandName, setCustomBrandName] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [loading, setLoading] = useState(false);

  // Initialize or Reset Form
  useEffect(() => {
    if (initialProduct) {
      let formattedEntryDate = '';
      if (initialProduct.entryDate) {
        try {
          const d = new Date(initialProduct.entryDate);
          if (!isNaN(d.getTime())) formattedEntryDate = d.toISOString().split('T')[0];
        } catch (_) {}
      }

      // Extract existing sizes from variants
      const existingSizes = Array.from(
        new Set(
          (initialProduct.variants || [])
            .map((v) => v.size)
            .filter((s) => s && String(s).trim().length > 0)
        )
      );

      // Check if brand matches an existing brand or is custom
      const matchedBrand = brands.find(
        (b) => b.id === initialProduct.brandId || b.name?.toLowerCase() === initialProduct.brandName?.toLowerCase()
      );

      setFormData({
        ...initialProduct,
        categoryId: initialProduct.categoryId || categories.find((c) => c.name === initialProduct.categoryName)?.id || '',
        categoryName: initialProduct.categoryName || categories.find((c) => c.id === initialProduct.categoryId)?.name || '',
        brandId: matchedBrand ? matchedBrand.id : '',
        brandName: initialProduct.brandName || matchedBrand?.name || '',
        entryDate: formattedEntryDate,
        fabric: initialProduct.fabric || '',
        location: initialProduct.location || '',
        season: initialProduct.season || 'Atemporal (Todo el año)',
        cutStyle: initialProduct.cutStyle || '',
        distinctiveDetails: initialProduct.distinctiveDetails || '',
        variants: initialProduct.variants || [],
        images: initialProduct.images || [],
        salePrice: initialProduct.salePrice !== undefined && initialProduct.salePrice !== null ? initialProduct.salePrice : '',
        costPrice: initialProduct.costPrice || 0,
      });

      setSelectedSizes(existingSizes.length > 0 ? existingSizes : ['Único']);
      setIsCustomBrand(!matchedBrand && !!initialProduct.brandName);
      setCustomBrandName(!matchedBrand ? (initialProduct.brandName || '') : '');
      setShowAdvanced(true); // show advanced if editing existing product
    } else {
      const firstCat = categories[0];
      const firstBrand = brands[0];
      const defaultSku = generateSKU(firstCat?.name || 'Prenda', firstBrand?.name || 'Marca');

      setFormData({
        name: '',
        sku: defaultSku,
        barcode: generateBarcode(),
        categoryId: firstCat?.id || '',
        categoryName: firstCat?.name || 'General',
        brandId: firstBrand?.id || '',
        brandName: firstBrand?.name || '',
        description: '',
        costPrice: '',
        salePrice: '',
        wholesalePrice: '',
        discount: 0,
        stockMin: 5,
        entryDate: new Date().toISOString().split('T')[0],
        fabric: '',
        location: '',
        season: 'Atemporal (Todo el año)',
        cutStyle: '',
        distinctiveDetails: '',
        images: [],
        variants: [],
        active: true,
      });

      setSelectedSizes([]);
      setCustomSizeInput('');
      setQuickStock(1);
      setIsCustomBrand(brands.length === 0);
      setCustomBrandName('');
      setShowAdvanced(false); // keep closed for fast creation
    }
  }, [initialProduct, isOpen, categories, brands]);

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // Toggle quick size selection
  const handleToggleSize = (size) => {
    setSelectedSizes((prev) => {
      const exists = prev.includes(size);
      const next = exists ? prev.filter((s) => s !== size) : [...prev, size];
      syncVariantsWithSizes(next, quickStock);
      return next;
    });
  };

  // Add custom size (e.g. 38, 40, etc.)
  const handleAddCustomSize = (e) => {
    e?.preventDefault();
    const clean = customSizeInput.trim().toUpperCase();
    if (!clean) return;
    if (!selectedSizes.includes(clean)) {
      const next = [...selectedSizes, clean];
      setSelectedSizes(next);
      syncVariantsWithSizes(next, quickStock);
    }
    setCustomSizeInput('');
  };

  // Sync variants when selected sizes change
  const syncVariantsWithSizes = (sizes, stockVal = 1) => {
    setFormData((prev) => {
      const currentVars = prev.variants || [];
      const updatedVars = [];

      // For every selected size, keep existing variant or create a fresh one
      sizes.forEach((sz) => {
        const existingForSize = currentVars.filter((v) => v.size === sz);
        if (existingForSize.length > 0) {
          updatedVars.push(...existingForSize);
        } else {
          updatedVars.push({
            id: `v_${Date.now()}_${Math.random().toString(36).substring(7)}`,
            size: sz,
            color: 'Único',
            colorHex: '#64748b',
            stock: Number(stockVal) >= 0 ? Number(stockVal) : 1,
            sku: prev.sku ? `${prev.sku}-${sz}` : '',
          });
        }
      });

      return {
        ...prev,
        variants: updatedVars,
      };
    });
  };

  // Handle Brand changes
  const handleBrandSelect = (e) => {
    const val = e.target.value;
    if (val === '__NEW_BRAND__') {
      setIsCustomBrand(true);
      setFormData((prev) => ({ ...prev, brandId: '', brandName: customBrandName }));
    } else {
      setIsCustomBrand(false);
      const found = brands.find((b) => b.id === val);
      setFormData((prev) => ({
        ...prev,
        brandId: val,
        brandName: found ? found.name : '',
      }));
    }
  };

  const handleCustomBrandChange = (e) => {
    const val = e.target.value;
    setCustomBrandName(val);
    setFormData((prev) => ({
      ...prev,
      brandId: '',
      brandName: val,
    }));
  };

  // Submission validation: ONLY Prenda/producto, Marca, and Talle are mandatory!
  const handleSubmit = async (e) => {
    e.preventDefault();

    // 1. Mandatory Prenda / Producto validation
    if (!formData.name?.trim()) {
      toast.error('La prenda o nombre del producto es obligatorio');
      return;
    }

    // 2. Mandatory Marca validation
    const effectiveBrandName = isCustomBrand
      ? customBrandName.trim()
      : (formData.brandName?.trim() || brands.find((b) => b.id === formData.brandId)?.name?.trim() || '');

    if (!effectiveBrandName && !formData.brandId) {
      toast.error('La marca es obligatoria');
      return;
    }

    // 3. Mandatory Talle validation
    const hasSelectedSize = selectedSizes.length > 0;
    const hasVariantSize = (formData.variants || []).some((v) => v.size && String(v.size).trim().length > 0);

    if (!hasSelectedSize && !hasVariantSize) {
      toast.error('El talle es obligatorio. Selecciona al menos un talle.');
      return;
    }

    setLoading(true);
    try {
      // Ensure variants exist if user selected quick sizes
      let finalVariants = formData.variants || [];
      if (finalVariants.length === 0 && selectedSizes.length > 0) {
        finalVariants = selectedSizes.map((sz) => ({
          id: `v_${Date.now()}_${Math.random().toString(36).substring(7)}`,
          size: sz,
          color: 'Único',
          colorHex: '#64748b',
          stock: Number(quickStock) >= 0 ? Number(quickStock) : 1,
          sku: formData.sku ? `${formData.sku}-${sz}` : '',
        }));
      }

      // Safe defaults for optional fields
      const effectiveSku = formData.sku?.trim() || generateSKU(formData.categoryName || 'Prenda', effectiveBrandName);
      const effectiveBarcode = formData.barcode?.trim() || generateBarcode();
      const effectiveCatId = formData.categoryId || categories[0]?.id || '';
      const effectiveCatName = formData.categoryName || categories.find((c) => c.id === effectiveCatId)?.name || 'General';

      const payload = {
        ...formData,
        name: formData.name.trim(),
        brandId: isCustomBrand ? '' : (formData.brandId || ''),
        brandName: effectiveBrandName,
        categoryId: effectiveCatId,
        categoryName: effectiveCatName,
        sku: effectiveSku,
        barcode: effectiveBarcode,
        // All optional numbers default cleanly to 0
        salePrice: Number(formData.salePrice) || 0,
        costPrice: Number(formData.costPrice) || 0,
        wholesalePrice: Number(formData.wholesalePrice) || 0,
        discount: Number(formData.discount) || 0,
        stockMin: Number(formData.stockMin) || 5,
        variants: finalVariants.map((v) => ({
          ...v,
          stock: Number(v.stock) >= 0 ? Number(v.stock) : 0,
        })),
      };

      await onSave(payload);
      onClose();
    } catch (error) {
      console.error(error);
      toast.error('Error al guardar la prenda');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialProduct ? 'Editar Prenda' : 'Nueva Prenda de Ropa'}
      subtitle="Carga rápida: completa Prenda, Marca y Talle para guardar inmediatamente"
      maxWidth="max-w-2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-neutral-900">
        {/* Banner de Carga Rápida */}
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs">
          <Zap className="w-4 h-4 text-amber-600 shrink-0" />
          <p className="font-semibold">
            Solo son obligatorios: <strong>Prenda</strong>, <strong>Marca</strong> y <strong>Talle</strong>. El resto de datos es opcional.
          </p>
        </div>

        {/* 1. CAMPO OBLIGATORIO: PRENDA / PRODUCTO */}
        <div>
          <label className="block text-xs font-black text-neutral-900 mb-1.5 uppercase tracking-wide">
            Prenda / Producto <span className="text-rose-600">*</span>
          </label>
          <input
            type="text"
            id="product-form-name"
            placeholder="Ej: Remera Lisa Básica, Jean Mom, Buzo Hoodie..."
            value={formData.name}
            onChange={(e) => handleChange('name', e.target.value)}
            className="w-full px-3.5 py-2.5 sm:py-2 text-sm rounded-xl border border-neutral-300 bg-white text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900 shadow-2xs font-medium"
            autoFocus
          />
        </div>

        {/* 2. CAMPO OBLIGATORIO: MARCA */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-xs font-black text-neutral-900 uppercase tracking-wide">
              Marca <span className="text-rose-600">*</span>
            </label>
            <button
              type="button"
              onClick={() => {
                setIsCustomBrand(!isCustomBrand);
                if (!isCustomBrand) {
                  setCustomBrandName(formData.brandName || '');
                }
              }}
              className="text-xs text-neutral-600 hover:text-neutral-900 font-bold underline cursor-pointer"
            >
              {isCustomBrand ? 'Elegir de lista' : '+ Escribir otra marca'}
            </button>
          </div>

          {isCustomBrand || brands.length === 0 ? (
            <div className="flex gap-2">
              <input
                type="text"
                id="product-form-custom-brand"
                placeholder="Escribe el nombre de la marca (ej: Zara, Nike, Shein...)"
                value={customBrandName}
                onChange={handleCustomBrandChange}
                className="w-full px-3.5 py-2.5 sm:py-2 text-sm rounded-xl border border-neutral-300 bg-white text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900 shadow-2xs font-medium"
              />
              {brands.length > 0 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsCustomBrand(false)}
                  className="shrink-0 text-xs"
                >
                  Lista
                </Button>
              )}
            </div>
          ) : (
            <select
              id="product-form-brand-select"
              value={formData.brandId || ''}
              onChange={handleBrandSelect}
              className="w-full px-3.5 py-2.5 sm:py-2 text-sm rounded-xl border border-neutral-300 bg-white text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900 shadow-2xs font-medium cursor-pointer"
            >
              <option value="">Seleccionar marca existente...</option>
              {brands.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
              <option value="__NEW_BRAND__">+ Otra marca no listada...</option>
            </select>
          )}
        </div>

        {/* 3. CAMPO OBLIGATORIO: TALLE (Touch-friendly 1-tap chips) */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-xs font-black text-neutral-900 uppercase tracking-wide">
              Talle(s) <span className="text-rose-600">*</span>
            </label>
            {selectedSizes.length > 0 && (
              <span className="text-xs font-bold text-neutral-600">
                Seleccionado: {selectedSizes.join(', ')}
              </span>
            )}
          </div>

          {/* Quick-tap size pills */}
          <div className="flex flex-wrap gap-2 pt-1">
            {QUICK_SIZES.map((sz) => {
              const isSelected = selectedSizes.includes(sz);
              return (
                <button
                  type="button"
                  key={sz}
                  onClick={() => handleToggleSize(sz)}
                  className={`min-h-[44px] min-w-[44px] px-3.5 py-2 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer border ${
                    isSelected
                      ? 'bg-neutral-900 text-white border-neutral-900 shadow-xs ring-2 ring-neutral-900/20'
                      : 'bg-white text-neutral-800 border-neutral-300 hover:border-neutral-400 hover:bg-neutral-50 shadow-2xs'
                  }`}
                >
                  {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                  <span>{sz}</span>
                </button>
              );
            })}
          </div>

          {/* Custom Size Input */}
          <div className="flex items-center gap-2 mt-2.5">
            <input
              type="text"
              placeholder="Otro talle (ej: 38, 40, 42, 6M...)"
              value={customSizeInput}
              onChange={(e) => setCustomSizeInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddCustomSize();
                }
              }}
              className="flex-1 px-3 py-2 text-xs rounded-xl border border-neutral-300 bg-white text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900 shadow-2xs"
            />
            <button
              type="button"
              onClick={handleAddCustomSize}
              className="min-h-[38px] px-3.5 py-2 rounded-xl text-xs font-bold bg-neutral-100 hover:bg-neutral-200 text-neutral-800 border border-neutral-300 transition-colors flex items-center gap-1 cursor-pointer shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Agregar</span>
            </button>
          </div>
        </div>

        {/* 4. DATOS RÁPIDOS OPCIONALES: PRECIO DE VENTA & STOCK INICIAL */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-neutral-200">
          <div>
            <label className="block text-xs font-bold text-neutral-700 mb-1">
              Precio de Venta ($) <span className="text-neutral-400 font-normal">(Opcional)</span>
            </label>
            <input
              type="number"
              min="0"
              step="10"
              placeholder="$0 (puedes definirlo luego)"
              value={formData.salePrice}
              onChange={(e) => handleChange('salePrice', e.target.value)}
              className="w-full px-3.5 py-2.5 sm:py-2 text-sm rounded-xl border border-neutral-300 bg-white text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900 shadow-2xs font-bold"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-neutral-700 mb-1">
              Stock inicial por talle <span className="text-neutral-400 font-normal">(Opcional)</span>
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="0"
                value={quickStock}
                onChange={(e) => {
                  const val = Math.max(0, parseInt(e.target.value, 10) || 0);
                  setQuickStock(val);
                  syncVariantsWithSizes(selectedSizes, val);
                }}
                className="w-full px-3.5 py-2.5 sm:py-2 text-sm rounded-xl border border-neutral-300 bg-white text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900 shadow-2xs font-bold"
              />
              <span className="text-xs text-neutral-500 font-medium shrink-0">unidades</span>
            </div>
          </div>
        </div>

        {/* 5. SECCIÓN AVANZADA OPCIONAL (COLLAPSIBLE / ACCORDION) */}
        <div className="pt-2 border-t border-neutral-200">
          <button
            type="button"
            onClick={() => setShowAdvanced((prev) => !prev)}
            className="w-full py-2.5 px-3 rounded-xl bg-neutral-100 hover:bg-neutral-200/80 transition-colors flex items-center justify-between text-xs font-bold text-neutral-800 cursor-pointer border border-neutral-200"
          >
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-neutral-600" />
              {showAdvanced
                ? 'Ocultar detalles opcionales'
                : '+ Más detalles opcionales (Categoría, Costo, Ubicación, Fotos...)'}
            </span>
            {showAdvanced ? (
              <ChevronUp className="w-4 h-4 text-neutral-500" />
            ) : (
              <ChevronDown className="w-4 h-4 text-neutral-500" />
            )}
          </button>

          {showAdvanced && (
            <div className="mt-4 space-y-4 p-4 rounded-2xl bg-neutral-50 border border-neutral-200">
              {/* Categoría y Códigos */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">
                    Categoría (Opcional)
                  </label>
                  <select
                    value={formData.categoryId}
                    onChange={(e) => {
                      const id = e.target.value;
                      const cat = categories.find((c) => c.id === id);
                      setFormData((prev) => ({
                        ...prev,
                        categoryId: id,
                        categoryName: cat ? cat.name : prev.categoryName,
                      }));
                    }}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-neutral-300 bg-white text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900"
                  >
                    <option value="">General</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">
                    SKU (Opcional)
                  </label>
                  <input
                    type="text"
                    value={formData.sku}
                    onChange={(e) => handleChange('sku', e.target.value)}
                    placeholder="Auto-generado"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-neutral-300 bg-white text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">
                    Código de Barras (Opcional)
                  </label>
                  <input
                    type="text"
                    value={formData.barcode}
                    onChange={(e) => handleChange('barcode', e.target.value)}
                    placeholder="Auto-generado"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-neutral-300 bg-white text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900"
                  />
                </div>
              </div>

              {/* Precios Financieros Opcionales */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">
                    Precio Costo ($)
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={formData.costPrice}
                    onChange={(e) => handleChange('costPrice', e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-neutral-300 bg-white text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">
                    Precio Mayorista ($)
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={formData.wholesalePrice}
                    onChange={(e) => handleChange('wholesalePrice', e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-neutral-300 bg-white text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">
                    Alerta de Stock Mínimo
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.stockMin}
                    onChange={(e) => handleChange('stockMin', e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-neutral-300 bg-white text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900"
                  />
                </div>
              </div>

              {/* Ficha Física del Local */}
              <div className="p-3 rounded-xl bg-white border border-neutral-200 space-y-3">
                <div className="flex items-center gap-2">
                  <Shirt className="w-4 h-4 text-neutral-800" />
                  <span className="text-xs font-bold text-neutral-900 uppercase">
                    Ficha de Reconocimiento y Ubicación
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-neutral-600 mb-1">
                      Ubicación en Perchero / Local
                    </label>
                    <input
                      list="loc-options"
                      placeholder="Ej: Perchero 1, Vidriera, Mostrador..."
                      value={formData.location || ''}
                      onChange={(e) => handleChange('location', e.target.value)}
                      className="w-full px-3 py-1.5 text-xs rounded-lg border border-neutral-300 bg-white text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900"
                    />
                    <datalist id="loc-options">
                      {CLOTHING_LOCATIONS.map((loc, idx) => (
                        <option key={idx} value={loc} />
                      ))}
                    </datalist>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-neutral-600 mb-1">
                      Tela / Material
                    </label>
                    <input
                      list="fab-options"
                      placeholder="Ej: Algodón peinado, Jean, Lino..."
                      value={formData.fabric || ''}
                      onChange={(e) => handleChange('fabric', e.target.value)}
                      className="w-full px-3 py-1.5 text-xs rounded-lg border border-neutral-300 bg-white text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900"
                    />
                    <datalist id="fab-options">
                      {CLOTHING_FABRICS.map((fab, idx) => (
                        <option key={idx} value={fab} />
                      ))}
                    </datalist>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-neutral-600 mb-1">
                      Corte / Estilo
                    </label>
                    <input
                      list="cut-opt"
                      placeholder="Ej: Oversize, Clásico, Slim..."
                      value={formData.cutStyle || ''}
                      onChange={(e) => handleChange('cutStyle', e.target.value)}
                      className="w-full px-3 py-1.5 text-xs rounded-lg border border-neutral-300 bg-white text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900"
                    />
                    <datalist id="cut-opt">
                      {CLOTHING_CUTS.map((cut, idx) => (
                        <option key={idx} value={cut} />
                      ))}
                    </datalist>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-neutral-600 mb-1">
                      Temporada
                    </label>
                    <select
                      value={formData.season || 'Atemporal (Todo el año)'}
                      onChange={(e) => handleChange('season', e.target.value)}
                      className="w-full px-3 py-1.5 text-xs rounded-lg border border-neutral-300 bg-white text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900"
                    >
                      {CLOTHING_SEASONS.map((seas, idx) => (
                        <option key={idx} value={seas}>
                          {seas}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-neutral-600 mb-1">
                    Detalle Distintivo de Confección
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: Estampa en espalda, botones dorados, roturas en rodilla"
                    value={formData.distinctiveDetails || ''}
                    onChange={(e) => handleChange('distinctiveDetails', e.target.value)}
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-neutral-300 bg-white text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900"
                  />
                </div>
              </div>

              {/* Variantes Detalladas con Colores */}
              <ProductVariantManager
                variants={formData.variants}
                baseSku={formData.sku}
                onChange={(vars) => handleChange('variants', vars)}
              />

              {/* Fotos */}
              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1.5">
                  Fotos de la Prenda (Opcional)
                </label>
                <ImageUpload
                  images={formData.images}
                  onChange={(imgs) => handleChange('images', imgs)}
                  maxImages={4}
                />
              </div>
            </div>
          )}
        </div>

        {/* 6. BOTONES DE ACCIÓN (Touch-friendly, min-height 48px en móvil) */}
        <div className="flex flex-col-reverse sm:flex-row sm:items-center justify-end gap-2.5 pt-4 border-t border-neutral-200">
          <Button
            type="button"
            variant="outline"
            size="md"
            onClick={onClose}
            disabled={loading}
            className="w-full sm:w-auto h-12 sm:h-10 text-xs font-bold justify-center"
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="md"
            isLoading={loading}
            className="w-full sm:w-auto h-12 sm:h-10 text-xs font-black justify-center shadow-md"
          >
            {initialProduct ? 'Guardar Cambios' : 'Crear Prenda'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
