import { useState, useEffect } from 'react';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { formatCurrency } from '../../utils/formatters';
import { calculateProfitability, calculateSuggestedPrice } from '../../utils/pricingUtils';
import { Tag, TrendingUp, Lightbulb, AlertCircle, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { toast } from 'sonner';

export function EditPriceModal({ isOpen, onClose, product, onSave }) {
  const [newPrice, setNewPrice] = useState('');
  const [reason, setReason] = useState('Actualización de precios');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (product) {
      const current = Number(product.salePrice ?? product.price ?? 0);
      setNewPrice(current > 0 ? current.toString() : '');
      setReason('Actualización de precios');
    }
  }, [product, isOpen]);

  if (!product) return null;

  const currentPrice = Number(product.salePrice ?? product.price ?? 0);
  const cost = Number(product.costPrice ?? product.cost ?? 0);
  const numericNewPrice = Number(newPrice) || 0;

  const currentProfit = calculateProfitability(cost, currentPrice);
  const newProfit = calculateProfitability(cost, numericNewPrice);
  const suggestion = calculateSuggestedPrice(product);

  const diff = numericNewPrice - currentPrice;
  const diffPercent = currentPrice > 0 ? ((diff / currentPrice) * 100).toFixed(1) : null;

  const quickPresets = [
    'Ajuste por inflación',
    'Actualización de costos',
    'Promoción de temporada',
    'Liquidación stock estancado',
    'Alineación de precios',
  ];

  const applyPercent = (pct) => {
    if (!currentPrice || currentPrice <= 0) return;
    const calculated = Math.round((currentPrice * (1 + pct / 100)) / 100) * 100;
    setNewPrice(calculated.toString());
    setReason(pct > 0 ? `Aumento del ${pct}%` : `Descuento del ${Math.abs(pct)}%`);
  };

  const applySuggested = () => {
    if (suggestion.suggestedPrice) {
      setNewPrice(suggestion.suggestedPrice.toString());
      setReason(`Aplicación de precio sugerido (${suggestion.actionLabel})`);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (numericNewPrice <= 0) {
      toast.error('El precio debe ser un valor positivo mayor a 0');
      return;
    }
    if (!reason.trim()) {
      toast.error('Por favor indique el motivo de la modificación');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSave(product.id, numericNewPrice, reason.trim());
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Modificar Precio de Venta"
      subtitle={`${product.name} • SKU: ${product.sku || '-'}`}
      maxWidth="max-w-lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Current State Summary */}
        <div className="p-3 rounded-xl bg-neutral-50 border border-neutral-200 grid grid-cols-3 gap-2 text-center">
          <div>
            <span className="text-[10px] uppercase font-bold text-neutral-400 block">Costo</span>
            <span className="text-xs font-black text-neutral-800">
              {cost > 0 ? formatCurrency(cost) : 'Sin costo'}
            </span>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-neutral-400 block">Precio Actual</span>
            <span className="text-xs font-black text-neutral-900">
              {currentPrice > 0 ? formatCurrency(currentPrice) : 'No fijado'}
            </span>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-neutral-400 block">Margen Actual</span>
            <span className="text-xs font-bold text-emerald-700">
              {currentProfit.isValid ? `${currentProfit.marginOnSales}%` : '-'}
            </span>
          </div>
        </div>

        {/* Suggested Price Shortcut */}
        {suggestion.canCalculate && suggestion.suggestedPrice && (
          <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Lightbulb className="w-4 h-4 text-amber-600 shrink-0" />
              <div>
                <p className="text-xs font-bold text-amber-950">
                  Sugerido: {formatCurrency(suggestion.suggestedPrice)}
                </p>
                <p className="text-[10px] text-amber-700">{suggestion.reasons[0]}</p>
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              size="xs"
              className="bg-white border-amber-300 text-amber-900 hover:bg-amber-100"
              onClick={applySuggested}
            >
              Usar sugerido
            </Button>
          </div>
        )}

        {/* Quick adjustments */}
        <div>
          <label className="text-[11px] font-bold text-neutral-600 block mb-1.5">
            Ajustes Rápidos sobre el precio actual:
          </label>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => applyPercent(5)}
              className="px-2 py-1 text-xs rounded-lg bg-neutral-100 hover:bg-neutral-200 text-neutral-800 font-semibold cursor-pointer"
            >
              +5%
            </button>
            <button
              type="button"
              onClick={() => applyPercent(10)}
              className="px-2 py-1 text-xs rounded-lg bg-neutral-100 hover:bg-neutral-200 text-neutral-800 font-semibold cursor-pointer"
            >
              +10%
            </button>
            <button
              type="button"
              onClick={() => applyPercent(15)}
              className="px-2 py-1 text-xs rounded-lg bg-neutral-100 hover:bg-neutral-200 text-neutral-800 font-semibold cursor-pointer"
            >
              +15%
            </button>
            <button
              type="button"
              onClick={() => applyPercent(20)}
              className="px-2 py-1 text-xs rounded-lg bg-neutral-100 hover:bg-neutral-200 text-neutral-800 font-semibold cursor-pointer"
            >
              +20%
            </button>
            <button
              type="button"
              onClick={() => applyPercent(-10)}
              className="px-2 py-1 text-xs rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold cursor-pointer"
            >
              -10% (Promo)
            </button>
            <button
              type="button"
              onClick={() => applyPercent(-15)}
              className="px-2 py-1 text-xs rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold cursor-pointer"
            >
              -15%
            </button>
            <button
              type="button"
              onClick={() => applyPercent(-25)}
              className="px-2 py-1 text-xs rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold cursor-pointer"
            >
              -25% (Liquidación)
            </button>
          </div>
        </div>

        {/* Input New Price */}
        <div>
          <Input
            label="Nuevo Precio de Venta ($) *"
            type="number"
            min="1"
            step="10"
            value={newPrice}
            onChange={(e) => setNewPrice(e.target.value)}
            required
            autoFocus
          />
        </div>

        {/* Impact Preview */}
        {numericNewPrice > 0 && currentPrice > 0 && (
          <div className="p-3 rounded-xl bg-neutral-100 border border-neutral-200 text-xs space-y-1">
            <div className="flex justify-between items-center">
              <span className="text-neutral-600">Diferencia:</span>
              <span className={`font-bold flex items-center gap-0.5 ${diff >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                {diff >= 0 ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                {diff >= 0 ? `+${formatCurrency(diff)}` : formatCurrency(diff)} ({diffPercent}%)
              </span>
            </div>
            {newProfit.isValid && (
              <div className="flex justify-between items-center">
                <span className="text-neutral-600">Nuevo Margen:</span>
                <span className="font-bold text-neutral-900">
                  {newProfit.marginOnSales}% sobre venta (Ganancia: {formatCurrency(newProfit.profit)})
                </span>
              </div>
            )}
          </div>
        )}

        {/* Reason */}
        <div>
          <Input
            label="Motivo del cambio de precio *"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Ej: Ajuste por inflación, liquidación, promoción..."
            required
          />
          <div className="flex flex-wrap gap-1 mt-1.5">
            {quickPresets.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setReason(preset)}
                className="text-[10px] px-2 py-0.5 rounded-md bg-neutral-200/70 hover:bg-neutral-300 text-neutral-700 font-medium cursor-pointer"
              >
                {preset}
              </button>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 pt-3 border-t border-neutral-100">
          <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button type="submit" variant="primary" size="sm" loading={isSubmitting}>
            Guardar y Registrar Historial
          </Button>
        </div>
      </form>
    </Modal>
  );
}
