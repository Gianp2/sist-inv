import { useState } from 'react';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { PAYMENT_METHODS, INCOME_CATEGORIES } from '../../constants/clothingConstants';
import { formatCurrency } from '../../utils/formatters';
import { Shirt, DollarSign, Plus, Trash2, ShoppingBag, AlertCircle } from 'lucide-react';
import { toastAlert, toast } from '../../components/ui/Toast';

export function RegistrarIngresoModal({
  isOpen,
  onClose,
  products = [],
  customers = [],
  onSaveDirectIncome,
  onSaveSale,
}) {
  const [activeTab, setActiveTab] = useState('VENTA'); // 'VENTA' | 'DIRECTO'

  // --- VENTA DE PRENDAS STATE ---
  const [selectedProductId, setSelectedProductId] = useState('');
  const [selectedVariantId, setSelectedVariantId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [unitPrice, setUnitPrice] = useState('');
  const [cartItems, setCartItems] = useState([]);
  const [saleCustomerId, setSaleCustomerId] = useState('');
  const [salePaymentMethod, setSalePaymentMethod] = useState('EFECTIVO');
  const [saleNotes, setSaleNotes] = useState('');
  const [saleDate, setSaleDate] = useState(() => new Date().toISOString().split('T')[0]);

  // --- INGRESO DIRECTO STATE ---
  const [directAmount, setDirectAmount] = useState('');
  const [directCategory, setDirectCategory] = useState('Venta Mostrador');
  const [directPaymentMethod, setDirectPaymentMethod] = useState('EFECTIVO');
  const [directDesc, setDirectDesc] = useState('');
  const [directDate, setDirectDate] = useState(() => new Date().toISOString().split('T')[0]);

  const [loading, setLoading] = useState(false);

  // When product is selected, pre-fill variant and price
  const selectedProduct = products.find((p) => p.id === selectedProductId);
  const productVariants = selectedProduct?.variants || [];
  const selectedVariant = productVariants.find((v) => v.id === selectedVariantId);

  const handleProductChange = (productId) => {
    setSelectedProductId(productId);
    const prod = products.find((p) => p.id === productId);
    if (prod) {
      setUnitPrice(prod.salePrice || '');
      if (prod.variants && prod.variants.length > 0) {
        setSelectedVariantId(prod.variants[0].id);
      } else {
        setSelectedVariantId('');
      }
    } else {
      setUnitPrice('');
      setSelectedVariantId('');
    }
  };

  const handleAddToCart = () => {
    if (!selectedProduct) {
      toastAlert.warning('Selecciona una prenda', 'Elige una prenda del catálogo para continuar.');
      return;
    }

    const qty = Number(quantity);
    if (!qty || qty <= 0) {
      toastAlert.error('Cantidad no válida', 'Ingresa una cantidad mayor a 0 unidades.');
      return;
    }

    const price = Number(unitPrice);
    if (price < 0 || isNaN(price)) {
      toastAlert.error('Precio no válido', 'Ingresa un precio de venta numérico.');
      return;
    }

    // Check variant stock availability
    if (selectedVariant) {
      const availableStock = Number(selectedVariant.stock) || 0;
      const alreadyInCart = cartItems
        .filter((i) => i.productId === selectedProduct.id && i.variantId === selectedVariant.id)
        .reduce((sum, i) => sum + i.quantity, 0);

      if (qty + alreadyInCart > availableStock) {
        toastAlert.error(
          'Stock insuficiente',
          `Disponible para este talle/color: ${availableStock} unidades.`
        );
        return;
      }
    } else {
      const availableStock = Number(selectedProduct.stock) || 0;
      const alreadyInCart = cartItems
        .filter((i) => i.productId === selectedProduct.id)
        .reduce((sum, i) => sum + i.quantity, 0);

      if (qty + alreadyInCart > availableStock) {
        toastAlert.error('Stock insuficiente', `Stock total disponible: ${availableStock} unidades.`);
        return;
      }
    }

    const newItem = {
      productId: selectedProduct.id,
      productName: selectedProduct.name,
      variantId: selectedVariant?.id || null,
      size: selectedVariant?.size || 'Único',
      color: selectedVariant?.color || 'Único',
      quantity: qty,
      price: price,
      costPrice: Number(selectedProduct.costPrice) || 0,
      subtotal: qty * price,
    };

    setCartItems((prev) => [...prev, newItem]);
    setQuantity(1);
    toastAlert.success(
      `${selectedProduct.name} agregada`,
      `Talle: ${selectedVariant?.size || 'Único'} | Color: ${selectedVariant?.color || 'Único'} | Cantidad: ${qty}`
    );
  };

  const handleRemoveFromCart = (index) => {
    const item = cartItems[index];
    setCartItems((prev) => prev.filter((_, i) => i !== index));
    if (item) {
      toastAlert.info('Prenda removida', `Se quitó ${item.productName} del cobro.`);
    }
  };

  const totalSaleAmount = cartItems.reduce((sum, item) => sum + item.subtotal, 0);

  // Submit Sale with Stock Deduction
  const handleSubmitSale = async (e) => {
    e.preventDefault();
    if (cartItems.length === 0) {
      toastAlert.warning(
        'Venta sin prendas',
        'Agrega al menos una prenda al detalle antes de confirmar el cobro.'
      );
      return;
    }

    setLoading(true);
    try {
      const customer = customers.find((c) => c.id === saleCustomerId);
      await onSaveSale({
        items: cartItems,
        total: totalSaleAmount,
        paymentMethod: salePaymentMethod,
        customerId: customer?.id || null,
        customerName: customer?.name || 'Consumidor Final',
        notes: saleNotes,
        date: saleDate ? new Date(saleDate + 'T12:00:00').toISOString() : new Date().toISOString(),
      });
      // Reset form
      setCartItems([]);
      setSelectedProductId('');
      setSelectedVariantId('');
      setUnitPrice('');
      setSaleNotes('');
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Submit Direct Income
  const handleSubmitDirect = async (e) => {
    e.preventDefault();
    const amount = Number(directAmount);
    if (!amount || amount <= 0) {
      toastAlert.error('Monto requerido', 'Ingresa un importe válido mayor a $ 0.');
      return;
    }

    setLoading(true);
    try {
      await onSaveDirectIncome({
        amount,
        category: directCategory || 'Venta Mostrador',
        paymentMethod: directPaymentMethod,
        description: directDesc || 'Ingreso de dinero',
        date: directDate ? new Date(directDate + 'T12:00:00').toISOString() : new Date().toISOString(),
      });
      // Reset form
      setDirectAmount('');
      setDirectDesc('');
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Registrar Ingreso de Dinero"
      subtitle="Venta de indumentaria con descuento de stock o ingreso libre"
      maxWidth="max-w-2xl"
    >
      <div className="space-y-4">
        {/* Mode Selector Tabs */}
        <div className="flex rounded-xl bg-neutral-100 p-1 border border-neutral-200">
          <button
            type="button"
            onClick={() => setActiveTab('VENTA')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              activeTab === 'VENTA'
                ? 'bg-white text-neutral-900 shadow-xs'
                : 'text-neutral-500 hover:text-neutral-900'
            }`}
          >
            <Shirt className="w-4 h-4 text-emerald-600" />
            <span>Venta de Prendas (Descuenta Stock)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('DIRECTO')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              activeTab === 'DIRECTO'
                ? 'bg-white text-neutral-900 shadow-xs'
                : 'text-neutral-500 hover:text-neutral-900'
            }`}
          >
            <DollarSign className="w-4 h-4 text-neutral-600" />
            <span>Ingreso Libre / Cobro Manual</span>
          </button>
        </div>

        {/* TAB 1: VENTA DE PRENDAS */}
        {activeTab === 'VENTA' && (
          <form onSubmit={handleSubmitSale} className="space-y-4">
            {/* Prenda selector box */}
            <div className="p-3.5 rounded-xl bg-neutral-50 border border-neutral-200 space-y-3">
              <p className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">
                Seleccionar Prenda y Talle
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Select
                  label="Prenda *"
                  value={selectedProductId}
                  onChange={(e) => handleProductChange(e.target.value)}
                >
                  <option key="default-product" value="">Seleccionar del catálogo...</option>
                  {products.map((p, idx) => (
                    <option key={p.id || `prod-${idx}`} value={p.id || ''}>
                      {p.name} {p.location ? `[${p.location}]` : ''} - {formatCurrency(p.salePrice)} (Stock: {p.stock || 0})
                    </option>
                  ))}
                </Select>

                {selectedProduct && productVariants.length > 0 ? (
                  <Select
                    label="Talle y Color *"
                    value={selectedVariantId}
                    onChange={(e) => setSelectedVariantId(e.target.value)}
                  >
                    {productVariants.map((v, idx) => {
                      const vKey = v.id || `var-${v.color || 'c'}-${v.size || 's'}-${idx}`;
                      return (
                        <option key={vKey} value={v.id || vKey}>
                          Talle: {v.size} - Color: {v.color} (Stock: {v.stock})
                        </option>
                      );
                    })}
                  </Select>
                ) : (
                  <div className="flex flex-col justify-end">
                    <span className="text-xs text-neutral-500 mb-2">
                      {selectedProduct ? `Stock disponible: ${selectedProduct.stock || 0}` : 'Elige una prenda'}
                    </span>
                  </div>
                )}
              </div>

              {/* Ficha descriptiva para reconocimiento en el mostrador */}
              {selectedProduct && (
                <div className="flex items-center gap-2 flex-wrap text-xs text-neutral-600 bg-white px-3 py-2 rounded-xl border border-neutral-200">
                  <span className="font-bold text-neutral-800 text-[11px] uppercase tracking-wider">Identificación:</span>
                  {selectedProduct.location && (
                    <span className="bg-neutral-100 text-neutral-800 px-2 py-0.5 rounded font-bold text-[11px]">
                      📍 Ubicación: {selectedProduct.location}
                    </span>
                  )}
                  {selectedProduct.fabric && (
                    <span className="text-neutral-700 font-medium">
                      🧵 Tela: {selectedProduct.fabric}
                    </span>
                  )}
                  {selectedProduct.cutStyle && (
                    <span className="text-neutral-600">
                      ✂️ Corte: {selectedProduct.cutStyle}
                    </span>
                  )}
                  {selectedProduct.distinctiveDetails && (
                    <span className="text-neutral-500 italic">
                      "{selectedProduct.distinctiveDetails}"
                    </span>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 items-end">
                <Input
                  label="Cantidad *"
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                />
                <Input
                  label="Precio Unitario ($) *"
                  type="number"
                  min="0"
                  value={unitPrice}
                  onChange={(e) => setUnitPrice(e.target.value)}
                />
                <div className="col-span-2 sm:col-span-1">
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    className="w-full"
                    leftIcon={Plus}
                    onClick={handleAddToCart}
                    disabled={!selectedProductId}
                  >
                    Agregar
                  </Button>
                </div>
              </div>
            </div>

            {/* Cart Items List */}
            {cartItems.length > 0 ? (
              <div className="border border-neutral-200 rounded-xl overflow-hidden">
                <div className="bg-neutral-100 px-3 py-2 text-[11px] font-bold text-neutral-700 uppercase flex justify-between items-center">
                  <span>Prendas a Vender ({cartItems.length})</span>
                  <span>Total: {formatCurrency(totalSaleAmount)}</span>
                </div>
                <div className="divide-y divide-neutral-200 max-h-44 overflow-y-auto bg-white">
                  {cartItems.map((item, idx) => (
                    <div key={idx} className="p-2.5 flex items-center justify-between text-xs">
                      <div>
                        <p className="font-bold text-neutral-900">{item.productName}</p>
                        <p className="text-[11px] text-neutral-500">
                          Talle: <span className="font-medium text-neutral-700">{item.size}</span> | Color:{' '}
                          <span className="font-medium text-neutral-700">{item.color}</span> | Cant:{' '}
                          <span className="font-semibold text-neutral-900">{item.quantity}</span> x{' '}
                          {formatCurrency(item.price)}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-extrabold text-neutral-900">
                          {formatCurrency(item.subtotal)}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveFromCart(idx)}
                          className="p-1 text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-xl border border-dashed border-neutral-200 text-center text-xs text-neutral-400">
                <ShoppingBag className="w-5 h-5 mx-auto mb-1 text-neutral-300" />
                Agrega prendas a la venta arriba para descontar stock automáticamente.
              </div>
            )}

            {/* Sale metadata: Customer, Payment Method, Date */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <Select
                label="Cliente"
                value={saleCustomerId}
                onChange={(e) => setSaleCustomerId(e.target.value)}
              >
                <option key="default-customer" value="">Consumidor Final</option>
                {customers.map((c, idx) => (
                  <option key={c.id || `cust-${idx}`} value={c.id || ''}>
                    {c.name} {c.dni ? `(${c.dni})` : ''}
                  </option>
                ))}
              </Select>

              <Select
                label="Método de Pago *"
                value={salePaymentMethod}
                onChange={(e) => setSalePaymentMethod(e.target.value)}
              >
                {PAYMENT_METHODS.map((pm) => (
                  <option key={pm.id} value={pm.id}>
                    {pm.name}
                  </option>
                ))}
              </Select>

              <Input
                label="Fecha"
                type="date"
                value={saleDate}
                onChange={(e) => setSaleDate(e.target.value)}
              />
            </div>

            <Input
              label="Observaciones (opcional)"
              placeholder="Ej: Cliente habitual, descuento acordado..."
              value={saleNotes}
              onChange={(e) => setSaleNotes(e.target.value)}
            />

            {/* Action buttons */}
            <div className="flex items-center justify-between pt-3 border-t border-neutral-200">
              <div className="text-left">
                <p className="text-[11px] text-neutral-400 font-semibold uppercase">Total a Cobrar</p>
                <p className="text-xl font-black text-neutral-900">
                  {formatCurrency(totalSaleAmount)}
                </p>
              </div>

              <div className="flex gap-2">
                <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={loading}>
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={loading || cartItems.length === 0}
                >
                  {loading ? 'Procesando...' : 'Confirmar Venta y Cobrar'}
                </Button>
              </div>
            </div>
          </form>
        )}

        {/* TAB 2: INGRESO DIRECTO / APORTE LIBRE */}
        {activeTab === 'DIRECTO' && (
          <form onSubmit={handleSubmitDirect} className="space-y-4">
            <Input
              label="Monto a Ingresar ($) *"
              type="number"
              min="1"
              placeholder="0.00"
              value={directAmount}
              onChange={(e) => setDirectAmount(e.target.value)}
              required
              autoFocus
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Select
                label="Categoría del Ingreso *"
                value={directCategory}
                onChange={(e) => setDirectCategory(e.target.value)}
                required
              >
                {INCOME_CATEGORIES.map((cat, i) => (
                  <option key={i} value={cat}>
                    {cat}
                  </option>
                ))}
              </Select>

              <Select
                label="Método de Pago *"
                value={directPaymentMethod}
                onChange={(e) => setDirectPaymentMethod(e.target.value)}
              >
                {PAYMENT_METHODS.map((pm) => (
                  <option key={pm.id} value={pm.id}>
                    {pm.name}
                  </option>
                ))}
              </Select>
            </div>

            <Input
              label="Detalle / Observación"
              placeholder="Ej: Cobro de seña, ajuste de balance..."
              value={directDesc}
              onChange={(e) => setDirectDesc(e.target.value)}
            />

            <Input
              label="Fecha del Movimiento"
              type="date"
              value={directDate}
              onChange={(e) => setDirectDate(e.target.value)}
            />

            <div className="flex justify-end gap-2 pt-3 border-t border-neutral-200">
              <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={loading}>
                Cancelar
              </Button>
              <Button type="submit" variant="primary" size="sm" disabled={loading || !directAmount}>
                {loading ? 'Guardando...' : 'Guardar Ingreso'}
              </Button>
            </div>
          </form>
        )}
      </div>
    </Modal>
  );
}
