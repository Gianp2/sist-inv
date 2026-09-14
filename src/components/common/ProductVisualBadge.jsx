import { useState } from 'react';
import { Shirt, Tag, Layers, Sparkles, ShoppingBag, Footprints, ImageOff } from 'lucide-react';

/**
 * Returns a fitting Lucide icon based on the product category or garment name
 */
export function getGarmentIcon(categoryName = '', productName = '') {
  const text = `${categoryName} ${productName}`.toLowerCase();
  if (text.includes('calzado') || text.includes('zapat') || text.includes('bota') || text.includes('sandalia')) {
    return Footprints;
  }
  if (text.includes('accesorio') || text.includes('bolso') || text.includes('cartera') || text.includes('mochila') || text.includes('cinto')) {
    return ShoppingBag;
  }
  if (text.includes('vestido') || text.includes('pollera') || text.includes('falda') || text.includes('fiesta')) {
    return Sparkles;
  }
  if (text.includes('campera') || text.includes('buzo') || text.includes('abrigo') || text.includes('chaleco')) {
    return Layers;
  }
  if (text.includes('pantalon') || text.includes('jean') || text.includes('short') || text.includes('bermuda') || text.includes('cargo')) {
    return Tag;
  }
  return Shirt;
}

const SIZE_CONFIGS = {
  xs: {
    container: 'w-8 h-8 rounded-lg',
    icon: 'w-4 h-4',
    dot: 'w-2 h-2 -bottom-0.5 -right-0.5',
    text: 'text-[9px]',
  },
  sm: {
    container: 'w-10 h-10 rounded-xl',
    icon: 'w-5 h-5',
    dot: 'w-2.5 h-2.5 -bottom-0.5 -right-0.5',
    text: 'text-[10px]',
  },
  md: {
    container: 'w-12 h-12 rounded-xl',
    icon: 'w-6 h-6',
    dot: 'w-3 h-3 bottom-0 right-0',
    text: 'text-[11px]',
  },
  lg: {
    container: 'w-16 h-16 rounded-2xl',
    icon: 'w-8 h-8',
    dot: 'w-3.5 h-3.5 bottom-0.5 right-0.5',
    text: 'text-xs',
  },
  xl: {
    container: 'w-24 h-24 rounded-3xl',
    icon: 'w-11 h-11',
    dot: 'w-5 h-5 bottom-1 right-1',
    text: 'text-sm',
  },
};

/**
 * ProductVisualBadge
 * Componente de renderizado visual para prendas de vestir:
 * - Si tiene imagen cargada, la muestra de forma nítida y limpia.
 * - Si NO tiene imagen (o se está usando en computadora sin cámara),
 *   muestra un avatar elegante con icono de la prenda, muestra de color real del tejido
 *   y detalles identificatorios sin depender de fotos.
 */
export function ProductVisualBadge({
  product,
  size = 'md',
  className = '',
  showLabel = false,
}) {
  const [imageFailed, setImageFailed] = useState(false);

  const hasRealImage = Boolean(product?.images?.[0] && !imageFailed);
  const sizeConfig = SIZE_CONFIGS[size] || SIZE_CONFIGS.md;
  const IconComponent = getGarmentIcon(product?.categoryName, product?.name);

  // Obtain primary color info from variants or defaults
  const firstVariant = product?.variants?.[0];
  const primaryColorHex = firstVariant?.colorHex || '#334155';
  const primaryColorName = firstVariant?.color || 'Color estándar';
  const isLightColor = primaryColorHex.toLowerCase() === '#ffffff' || primaryColorHex.toLowerCase() === '#fff';

  if (hasRealImage) {
    return (
      <div className={`relative shrink-0 overflow-hidden border border-neutral-200 bg-neutral-100 ${sizeConfig.container} ${className}`}>
        <img
          src={product.images[0]}
          alt={product.name || 'Prenda'}
          referrerPolicy="no-referrer"
          onError={() => setImageFailed(true)}
          className="w-full h-full object-cover"
        />
        {firstVariant?.colorHex && (
          <span
            title={`Color: ${primaryColorName}`}
            className={`absolute rounded-full border shadow-2xs ${sizeConfig.dot} ${
              isLightColor ? 'border-neutral-400' : 'border-white'
            }`}
            style={{ backgroundColor: primaryColorHex }}
          />
        )}
      </div>
    );
  }

  // Visual avatar for products without an image
  return (
    <div
      className={`relative shrink-0 flex flex-col items-center justify-center border border-neutral-200 bg-neutral-100/90 text-neutral-700 select-none ${sizeConfig.container} ${className}`}
      title={product?.name ? `${product.name} (Sin foto cargada - Identificado por ficha)` : 'Prenda'}
    >
      <IconComponent className={`${sizeConfig.icon} text-neutral-600`} />

      {/* Color swatch dot of the garment */}
      {firstVariant?.colorHex && (
        <span
          title={`Color principal: ${primaryColorName}`}
          className={`absolute rounded-full border shadow-2xs ${sizeConfig.dot} ${
            isLightColor ? 'border-neutral-400' : 'border-white'
          }`}
          style={{ backgroundColor: primaryColorHex }}
        />
      )}

      {showLabel && (
        <span className="text-[9px] font-bold text-neutral-400 mt-0.5">
          Ficha
        </span>
      )}
    </div>
  );
}

/**
 * Ficha resumen de detalles de prenda sin foto
 * Útil para mostrar en listas, modales de venta y fichas de producto
 */
export function GarmentSpecsPills({ product, className = '' }) {
  if (!product) return null;

  const items = [];

  if (product.location) {
    items.push({ icon: '📍', label: product.location, title: 'Ubicación física en el local' });
  }
  if (product.fabric) {
    items.push({ icon: '🧵', label: product.fabric, title: 'Tela y material' });
  }
  if (product.cutStyle) {
    items.push({ icon: '✂️', label: product.cutStyle, title: 'Corte y confección' });
  }
  if (product.season && !product.season.includes('Atemporal')) {
    items.push({ icon: '🗓️', label: product.season, title: 'Temporada' });
  }

  if (items.length === 0) return null;

  return (
    <div className={`flex items-center gap-1.5 flex-wrap ${className}`}>
      {items.map((item, idx) => (
        <span
          key={idx}
          title={item.title}
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-neutral-100 border border-neutral-200 text-neutral-700"
        >
          <span>{item.icon}</span>
          <span>{item.label}</span>
        </span>
      ))}
    </div>
  );
}
