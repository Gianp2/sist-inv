import { useState, useEffect } from 'react';
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
} from '../../constants/clothingConstants';
import { Shirt, Sparkles, MapPin, Tag } from 'lucide-react';
import { toast } from 'sonner';

export function ProductFormModal({
  isOpen,
  onClose,
  onSave,
  initialProduct = null,
  categories = [],
  brands = [],
}) {
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
    salePrice: 0,
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

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (initialProduct) {
      let formattedEntryDate = '';
      if (initialProduct.entryDate) {
        try {
          const d = new Date(initialProduct.entryDate);
          if (!isNaN(d.getTime())) formattedEntryDate = d.toISOString().split('T')[0];
        } catch (_) {}
      }
      setFormData({
        ...initialProduct,
        categoryId: initialProduct.categoryId || categories.find((c) => c.name === initialProduct.categoryName)?.id || '',
        categoryName: initialProduct.categoryName || categories.find((c) => c.id === initialProduct.categoryId)?.name || '',
        brandId: initialProduct.brandId || brands.find((b) => b.name === initialProduct.brandName)?.id || '',
        brandName: initialProduct.brandName || brands.find((b) => b.id === initialProduct.brandId)?.name || '',
        entryDate: formattedEntryDate,
        fabric: initialProduct.fabric || '',
        location: initialProduct.location || '',
        season: initialProduct.season || 'Atemporal (Todo el año)',
        cutStyle: initialProduct.cutStyle || '',
        distinctiveDetails: initialProduct.distinctiveDetails || '',
        variants: initialProduct.variants || [],
        images: initialProduct.images || [],
      });
    } else {
      const firstCat = categories[0];
      const firstBrand = brands[0];
      setFormData({
        name: '',
        sku: generateSKU(firstCat?.name || 'Prenda', firstBrand?.name || 'General'),
        barcode: generateBarcode(),
        categoryId: firstCat?.id || '',
        categoryName: firstCat?.name || '',
        brandId: firstBrand?.id || '',
        brandName: firstBrand?.name || '',
        description: '',
        costPrice: 0,
        salePrice: 0,
        wholesalePrice: 0,
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
    }
  }, [initialProduct, isOpen, categories, brands]);

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleCategoryChange = (e) => {
    const selectedId = e.target.value;
    const foundCat = categories.find((c) => c.id === selectedId);
    setFormData((prev) => ({
      ...prev,
      categoryId: selectedId,
      categoryName: foundCat ? foundCat.name : prev.categoryName,
    }));
  };

  const handleBrandChange = (e) => {
    const selectedId = e.target.value;
    const foundBrand = brands.find((b) => b.id === selectedId);
    setFormData((prev) => ({
      ...prev,
      brandId: selectedId,
      brandName: foundBrand ? foundBrand.name : prev.brandName,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error('El nombre del producto es obligatorio');
      return;
    }
    if (!formData.salePrice || Number(formData.salePrice) <= 0) {
      toast.error('El precio de venta debe ser mayor a 0');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        ...formData,
        costPrice: Number(formData.costPrice) || 0,
        salePrice: Number(formData.salePrice) || 0,
        wholesalePrice: Number(formData.wholesalePrice) || 0,
        discount: Number(formData.discount) || 0,
        stockMin: Number(formData.stockMin) || 0,
        variants: (formData.variants || []).map((v) => ({
          ...v,
          stock: Number(v.stock) || 0,
        })),
      };
      await onSave(payload);
      onClose();
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialProduct ? 'Editar Prenda' : 'Nueva Prenda de Ropa'}
      subtitle="Define talles, colores, detalles de confección, ubicación en local y precios"
      maxWidth="max-w-3xl"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* 1. Datos Principales */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Nombre de la Prenda *"
            placeholder="Ej: Remera Oversize Básica"
            value={formData.name}
            onChange={(e) => handleChange('name', e.target.value)}
            required
          />
          <div className="grid grid-cols-2 gap-2">
            <Input
              label="SKU / Código"
              value={formData.sku}
              onChange={(e) => handleChange('sku', e.target.value)}
              required
            />
            <Input
              label="Código de Barras"
              value={formData.barcode}
              onChange={(e) => handleChange('barcode', e.target.value)}
            />
          </div>
        </div>

        {/* 2. Categoría & Marca */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select
            label="Categoría *"
            value={formData.categoryId}
            onChange={handleCategoryChange}
          >
            <option key="default-cat" value="">Seleccionar Categoría...</option>
            {categories.map((c, idx) => (
              <option key={c.id || `cat-${idx}`} value={c.id || ''}>
                {c.name}
              </option>
            ))}
          </Select>

          <Select
            label="Marca *"
            value={formData.brandId}
            onChange={handleBrandChange}
          >
            <option key="default-brand" value="">Seleccionar Marca...</option>
            {brands.map((b, idx) => (
              <option key={b.id || `brand-${idx}`} value={b.id || ''}>
                {b.name}
              </option>
            ))}
          </Select>
        </div>

        {/* 3. Ficha Descriptiva de la Prenda (Identificación sin foto) */}
        <div className="p-4 rounded-2xl bg-neutral-50/80 border border-neutral-200 space-y-3.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
            <div className="flex items-center gap-2">
              <Shirt className="w-4 h-4 text-neutral-800" />
              <h4 className="text-xs font-bold text-neutral-900 uppercase tracking-wider">
                Ficha de Detalle y Reconocimiento Físico
              </h4>
            </div>
            <span className="text-[11px] text-neutral-500 font-medium">
              Ideal para computadoras de mostrador
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-neutral-700 mb-1">
                Tela / Material
              </label>
              <input
                list="fabric-options"
                placeholder="Ej: Algodón peinado, Lino, Denim..."
                value={formData.fabric || ''}
                onChange={(e) => handleChange('fabric', e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-neutral-300 bg-white text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900"
              />
              <datalist id="fabric-options">
                {CLOTHING_FABRICS.map((fab, idx) => (
                  <option key={idx} value={fab} />
                ))}
              </datalist>
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-700 mb-1">
                Ubicación en el Local / Perchero
              </label>
              <input
                list="location-options"
                placeholder="Ej: Perchero 1, Mostrador, Vidriera..."
                value={formData.location || ''}
                onChange={(e) => handleChange('location', e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-neutral-300 bg-white text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900"
              />
              <datalist id="location-options">
                {CLOTHING_LOCATIONS.map((loc, idx) => (
                  <option key={idx} value={loc} />
                ))}
              </datalist>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-neutral-700 mb-1">
                Corte o Estilo
              </label>
              <input
                list="cut-options"
                placeholder="Ej: Clásico, Oversize, Slim, Tiro Alto..."
                value={formData.cutStyle || ''}
                onChange={(e) => handleChange('cutStyle', e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-neutral-300 bg-white text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900"
              />
              <datalist id="cut-options">
                {CLOTHING_CUTS.map((cut, idx) => (
                  <option key={idx} value={cut} />
                ))}
              </datalist>
            </div>

            <Select
              label="Temporada"
              value={formData.season || 'Atemporal (Todo el año)'}
              onChange={(e) => handleChange('season', e.target.value)}
            >
              {CLOTHING_SEASONS.map((seas, idx) => (
                <option key={idx} value={seas}>
                  {seas}
                </option>
              ))}
            </Select>
          </div>

          <Input
            label="Detalle Distintivo / Confección (Opcional)"
            placeholder="Ej: Estampa en espalda, botones metálicos, bolsillos laterales, cuello en V"
            value={formData.distinctiveDetails || ''}
            onChange={(e) => handleChange('distinctiveDetails', e.target.value)}
          />
        </div>

        {/* 4. Precios & Stock Alert */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Input
            label="Precio Costo ($)"
            type="number"
            min="0"
            step="10"
            value={formData.costPrice}
            onChange={(e) => handleChange('costPrice', e.target.value === '' ? '' : Number(e.target.value))}
          />
          <Input
            label="Precio Venta ($) *"
            type="number"
            min="0"
            step="10"
            value={formData.salePrice}
            onChange={(e) => handleChange('salePrice', e.target.value === '' ? '' : Number(e.target.value))}
            required
          />
          <Input
            label="Precio Mayorista ($)"
            type="number"
            min="0"
            step="10"
            value={formData.wholesalePrice}
            onChange={(e) => handleChange('wholesalePrice', e.target.value === '' ? '' : Number(e.target.value))}
          />
          <Input
            label="Stock Mínimo Alerta"
            type="number"
            min="0"
            value={formData.stockMin}
            onChange={(e) => handleChange('stockMin', e.target.value === '' ? '' : Number(e.target.value))}
          />
        </div>

        {/* 5. Fecha de Ingreso al Stock */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            label="Fecha de Ingreso al Stock"
            type="date"
            value={formData.entryDate || ''}
            onChange={(e) => handleChange('entryDate', e.target.value)}
          />
          <div className="flex items-center text-xs text-neutral-500 pt-5">
            <span>Se utiliza para calcular antigüedad en stock y sugerencias de precios.</span>
          </div>
        </div>

        {/* 6. Product Variant Manager (Sizes & Colors) */}
        <ProductVariantManager
          variants={formData.variants}
          baseSku={formData.sku}
          onChange={(vars) => handleChange('variants', vars)}
        />

        {/* 7. Images (Optional for desktop) */}
        <ImageUpload
          images={formData.images}
          onChange={(newImages) => handleChange('images', newImages)}
          maxImages={5}
        />

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 pt-4 border-t border-neutral-200">
          <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button type="submit" variant="primary" size="sm" isLoading={loading}>
            {initialProduct ? 'Guardar Cambios' : 'Crear Prenda'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

