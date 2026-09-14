import { useState } from 'react';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { formatCurrency } from '../../utils/formatters';
import { Plus, Trash2, ArrowDownLeft } from 'lucide-react';
import { toast } from 'sonner';

export function NuevaCompraModal({ isOpen, onClose, onSave, suppliers = [], products = [] }) {
  const [supplierId, setSupplierId] = useState('');
  const [items, setItems] = useState([]);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [selectedVariantId, setSelectedVariantId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [costPrice, setCostPrice] = useState(0);
  const [notes, setNotes] = useState('');
  const [registerCashExpense, setRegisterCashExpense] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState('EFECTIVO');
  const [loading, setLoading] = useState(false);

  const selectedProduct = products.find((p) => p.id === selectedProductId);

  const handleAddProductItem = () => {
    if (!selectedProduct) return;
    const variant = selectedProduct.variants?.find((v, idx) => {
      const vid = v.id || `var-${v.color || ''}-${v.size || ''}-${idx}`;
      return v.id === selectedVariantId || vid === selectedVariantId;
    });

    const newItem = {
      productId: selectedProduct.id,
      productName: selectedProduct.name,
      variantId: variant?.id || (selectedVariantId || null),
      size: variant?.size || 'Único',
      color: variant?.color || 'Único',
      quantity: Number(quantity) || 1,
      costPrice: Number(costPrice) || selectedProduct.costPrice || 0,
      total: (Number(quantity) || 1) * (Number(costPrice) || selectedProduct.costPrice || 0),
    };

    setItems([...items, newItem]);
    setSelectedVariantId('');
    setQuantity(1);
    setCostPrice(0);
  };

  const handleRemoveItem = (idx) => {
    setItems(items.filter((_, i) => i !== idx));
  };

  const totalAmount = items.reduce((acc, it) => acc + it.total, 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (items.length === 0) {
      toast.error('Agrega al menos una prenda a la compra');
      return;
    }
    const supplier = suppliers.find((s) => s.id === supplierId);

    setLoading(true);
    try {
      await onSave({
        supplierId: supplier?.id || null,
        supplierName: supplier?.name || 'Proveedor General',
        items,
        total: totalAmount,
        notes,
        registerCashExpense,
        paymentMethod,
      });
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
      title="Registrar Compra a Proveedor"
      subtitle="El stock de cada talle y color se incrementará automáticamente"
      maxWidth="max-w-3xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Supplier */}
        <Select
          label="Proveedor *"
          value={supplierId}
          onChange={(e) => setSupplierId(e.target.value)}
        >
          <option key="default-supplier" value="">Seleccionar Proveedor...</option>
          {suppliers.map((s, idx) => (
            <option key={s.id || `supplier-${idx}`} value={s.id || `supplier-${idx}`}>
              {s.name} ({s.contactName || 'General'})
            </option>
          ))}
        </Select>

        {/* Item adder box */}
        <div className="card-panel p-4 rounded-2xl bg-white border border-neutral-200 shadow-2xs space-y-3">
          <p className="text-xs font-bold text-neutral-900 uppercase">
            Agregar Prenda a la Compra
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Select
              label="Prenda"
              value={selectedProductId}
              onChange={(e) => {
                setSelectedProductId(e.target.value);
                const prod = products.find((p) => p.id === e.target.value);
                if (prod) setCostPrice(prod.costPrice || 0);
              }}
            >
              <option key="default-product" value="">Seleccionar Prenda...</option>
              {products.map((p, idx) => (
                <option key={p.id || `product-${idx}`} value={p.id || ''}>
                  {p.name} {p.sku ? `(SKU: ${p.sku})` : ''}
                </option>
              ))}
            </Select>

            {selectedProduct && selectedProduct.variants?.length > 0 && (
              <Select
                label="Talle / Color (Variante)"
                value={selectedVariantId}
                onChange={(e) => setSelectedVariantId(e.target.value)}
              >
                <option key="default-variant" value="">Seleccionar Variante...</option>
                {selectedProduct.variants.map((v, idx) => {
                  const variantKey = v.id || `var-${v.color || 'c'}-${v.size || 's'}-${idx}`;
                  return (
                    <option key={variantKey} value={v.id || variantKey}>
                      {v.color || 'Color único'} - Talle {v.size || 'Único'} (Stock actual: {v.stock ?? 0})
                    </option>
                  );
                })}
              </Select>
            )}
          </div>

          <div className="grid grid-cols-3 gap-3 items-end">
            <Input
              label="Cantidad de Unidades"
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value === '' ? '' : Number(e.target.value))}
            />
            <Input
              label="Costo Unitario ($)"
              type="number"
              min="0"
              value={costPrice}
              onChange={(e) => setCostPrice(e.target.value === '' ? '' : Number(e.target.value))}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              leftIcon={Plus}
              disabled={!selectedProductId}
              onClick={handleAddProductItem}
            >
              Agregar Item
            </Button>
          </div>
        </div>

        {/* Added Items List */}
        {items.length > 0 && (
          <div className="border border-neutral-200 rounded-xl overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-white text-neutral-800 font-bold border-b border-neutral-200">
                <tr>
                  <th className="p-2.5">Prenda</th>
                  <th className="p-2.5">Variante</th>
                  <th className="p-2.5 text-center">Cantidad</th>
                  <th className="p-2.5 text-right">Costo Unit.</th>
                  <th className="p-2.5 text-right">Subtotal</th>
                  <th className="p-2.5 text-right"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {items.map((it, idx) => (
                  <tr key={`item-${it.productId}-${it.variantId || idx}-${idx}`} className="hover:bg-neutral-50/80">
                    <td className="p-2.5 font-bold text-neutral-900">{it.productName}</td>
                    <td className="p-2.5 text-neutral-700 font-medium">
                      {it.color} / {it.size}
                    </td>
                    <td className="p-2.5 text-center font-bold text-neutral-900">+{it.quantity}</td>
                    <td className="p-2.5 text-right text-neutral-700">{formatCurrency(it.costPrice)}</td>
                    <td className="p-2.5 text-right font-black text-neutral-900">{formatCurrency(it.total)}</td>
                    <td className="p-2.5 text-right">
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(idx)}
                        className="text-neutral-400 hover:text-rose-600 cursor-pointer p-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex justify-between items-center p-3 rounded-xl bg-white border border-neutral-200 text-sm font-black text-neutral-900 shadow-2xs">
          <span>Total de la Compra:</span>
          <span>{formatCurrency(totalAmount)}</span>
        </div>

        {/* Option to record expense directly in Cash register */}
        <div className="p-3.5 rounded-xl bg-white border border-neutral-200 shadow-2xs space-y-2.5">
          <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-neutral-700">
            <input
              type="checkbox"
              checked={registerCashExpense}
              onChange={(e) => setRegisterCashExpense(e.target.checked)}
              className="w-4 h-4 rounded text-neutral-900 focus:ring-neutral-900 cursor-pointer"
            />
            <span>Registrar egreso de dinero en Caja por esta compra</span>
          </label>
          {registerCashExpense && (
            <Select
              label="Medio de Pago Saliente"
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
            >
              <option key="pm-efectivo" value="EFECTIVO">Efectivo (Caja del local)</option>
              <option key="pm-transferencia" value="TRANSFERENCIA">Transferencia Bancaria</option>
              <option key="pm-debito" value="DEBITO">Tarjeta de Débito</option>
              <option key="pm-credito" value="CREDITO">Tarjeta de Crédito</option>
            </Select>
          )}
        </div>

        <Input
          label="Observaciones / Remito Proveedor"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />

        <div className="flex justify-end gap-2 pt-3 border-t border-neutral-200">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="sm"
            isLoading={loading}
            leftIcon={ArrowDownLeft}
          >
            Confirmar Compra
          </Button>
        </div>
      </form>
    </Modal>
  );
}
