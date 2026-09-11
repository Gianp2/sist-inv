// Standard clothing sizes, colors and categories
export const CLOTHING_SIZES = [
  'XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL',
  '34', '36', '38', '40', '42', '44', '46', '48',
  'Único', 'Infantil 4', 'Infantil 6', 'Infantil 8', 'Infantil 10', 'Infantil 12', 'Infantil 14'
];

export const CLOTHING_COLORS = [
  { name: 'Negro', hex: '#111827', border: false },
  { name: 'Blanco', hex: '#FFFFFF', border: true },
  { name: 'Gris Melange', hex: '#9CA3AF', border: false },
  { name: 'Azul Marino', hex: '#1E3A8A', border: false },
  { name: 'Azul Francia', hex: '#2563EB', border: false },
  { name: 'Rojo', hex: '#DC2626', border: false },
  { name: 'Bordo / Vino', hex: '#831843', border: false },
  { name: 'Verde Militar', hex: '#3F6212', border: false },
  { name: 'Verde Esmeralda', hex: '#059669', border: false },
  { name: 'Rosa Pastel', hex: '#F472B6', border: false },
  { name: 'Beige / Arena', hex: '#D6D3D1', border: false },
  { name: 'Terracota / Camel', hex: '#B45309', border: false },
  { name: 'Amarillo Mostaza', hex: '#CA8A04', border: false },
  { name: 'Violeta / Lila', hex: '#9333EA', border: false },
  { name: 'Estampado / Multicolor', hex: 'linear-gradient(135deg, #ef4444, #3b82f6, #10b981)', border: false }
];

export const PAYMENT_METHODS = [
  { id: 'EFECTIVO', name: 'Efectivo', icon: 'Banknote', color: 'emerald' },
  { id: 'TARJETA_DEBITO', name: 'Tarjeta de Débito', icon: 'CreditCard', color: 'blue' },
  { id: 'TARJETA_CREDITO', name: 'Tarjeta de Crédito', icon: 'CreditCard', color: 'indigo' },
  { id: 'TRANSFERENCIA', name: 'Transferencia / MP', icon: 'Smartphone', color: 'sky' },
  { id: 'CUENTA_CORRIENTE', name: 'Cuenta Corriente / Fiado', icon: 'BookOpen', color: 'amber' },
  { id: 'MIXTO', name: 'Pago Mixto', icon: 'Layers', color: 'purple' },
];

export const MOVEMENT_TYPES = {
  INCOME: 'INGRESO',
  EXPENSE: 'EGRESO',
  SALE: 'VENTA',
  PURCHASE: 'COMPRA',
  WITHDRAWAL: 'RETIRO_CAJA',
  INITIAL: 'APERTURA_CAJA',
  ADJUSTMENT: 'AJUSTE',
};

export const INCOME_CATEGORIES = [
  'Venta Mostrador',
  'Venta Online / Envíos',
  'Cobro de Cuenta Corriente',
  'Aporte de Capital',
  'Ingreso Extraordinario',
  'Otro Ingreso',
];

export const EXPENSE_CATEGORIES = [
  'Compra de Mercadería / Proveedor',
  'Alquiler del Local',
  'Servicios (Luz / Internet / Tel)',
  'Sueldos / Personal',
  'Insumos (Bolsas, Etiquetas, Embalaje)',
  'Impuestos / Contabilidad',
  'Mantenimiento / Limpieza',
  'Retiro de Titular / Ganancias',
  'Gastos Varios',
];

