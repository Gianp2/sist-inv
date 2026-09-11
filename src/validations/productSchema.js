import { z } from 'zod';

export const productVariantSchema = z.object({
  id: z.string().optional(),
  color: z.string().min(1, 'El color es obligatorio'),
  colorHex: z.string().default('#111827'),
  size: z.string().min(1, 'El talle es obligatorio'),
  stock: z.number().min(0, 'El stock no puede ser negativo').default(0),
  sku: z.string().optional(),
});

export const productSchema = z.object({
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  sku: z.string().min(2, 'El SKU es requerido'),
  barcode: z.string().optional(),
  categoryId: z.string().optional(),
  categoryName: z.string().min(1, 'Selecciona una categoría'),
  brandId: z.string().optional(),
  brandName: z.string().min(1, 'Selecciona una marca'),
  description: z.string().optional(),
  costPrice: z.number().min(0, 'El precio de costo debe ser mayor o igual a 0'),
  salePrice: z.number().min(0.01, 'El precio de venta debe ser mayor a 0'),
  wholesalePrice: z.number().min(0).optional(),
  discount: z.number().min(0).max(100).default(0),
  stockMin: z.number().min(0, 'El stock mínimo no puede ser negativo').default(5),
  images: z.array(z.string()).default([]),
  variants: z.array(productVariantSchema).default([]),
  active: z.boolean().default(true),
});

export const categorySchema = z.object({
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  code: z.string().max(5).optional(),
  description: z.string().optional(),
  active: z.boolean().default(true),
});

export const brandSchema = z.object({
  name: z.string().min(2, 'El nombre de la marca es obligatorio'),
  origin: z.string().optional(),
  description: z.string().optional(),
  active: z.boolean().default(true),
});
