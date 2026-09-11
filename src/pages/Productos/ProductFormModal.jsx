import { useState, useEffect } from 'react';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { ImageUpload } from '../../components/common/ImageUpload';
import { ProductVariantManager } from './ProductVariantManager';
import { generateSKU, generateBarcode } from '../../utils/calculations';
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
      await onSave(formData);
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
      title={initialProduct ? 'Editar Producto' : 'Nuevo Producto de Ropa'}
      subtitle="Define talles, colores, precios y fotos con Cloudinary"
      maxWidth="max-w-3xl"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Images with Cloudinary */}
        <ImageUpload
          images={formData.images}
          onChange={(newImages) => handleChange('images', newImages)}
          maxImages={5}
        />

        {/* Basic Info */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Nombre de la Prenda *"
            placeholder="Ej: Remera Oversize Estampada"
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

        {/* Category & Brand */}
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

        {/* Prices & Stock Alert */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Input
            label="Precio Costo ($)"
            type="number"
            min="0"
            step="10"
            value={formData.costPrice}
            onChange={(e) => handleChange('costPrice', Number(e.target.value))}
          />
          <Input
            label="Precio Venta ($) *"
            type="number"
            min="0"
            step="10"
            value={formData.salePrice}
            onChange={(e) => handleChange('salePrice', Number(e.target.value))}
            required
          />
          <Input
            label="Precio Mayorista ($)"
            type="number"
            min="0"
            step="10"
            value={formData.wholesalePrice}
            onChange={(e) => handleChange('wholesalePrice', Number(e.target.value))}
          />
          <Input
            label="Stock Mínimo Alerta"
            type="number"
            min="0"
            value={formData.stockMin}
            onChange={(e) => handleChange('stockMin', Number(e.target.value))}
          />
        </div>

        {/* Fecha de Ingreso al Stock */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            label="Fecha de Ingreso al Stock"
            type="date"
            value={formData.entryDate || ''}
            onChange={(e) => handleChange('entryDate', e.target.value)}
          />
          <div className="flex items-center text-xs text-neutral-500 pt-5">
            <span>Se utiliza para calcular la antigüedad en stock, prendas estancadas y sugerencias inteligentes de precios.</span>
          </div>
        </div>

        {/* Product Variant Manager (Sizes & Colors) */}
        <ProductVariantManager
          variants={formData.variants}
          baseSku={formData.sku}
          onChange={(vars) => handleChange('variants', vars)}
        />

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 pt-4 border-t border-neutral-200">
          <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button type="submit" variant="primary" size="sm" isLoading={loading}>
            {initialProduct ? 'Guardar Cambios' : 'Crear Producto'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
