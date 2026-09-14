import { useState, useMemo } from 'react';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { formatCurrency } from '../../utils/formatters';
import { calculateProfitability } from '../../utils/pricingUtils';
import {
  Percent,
  TrendingUp,
  DollarSign,
  AlertCircle,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle2,
} from 'lucide-react';
import { toast } from 'sonner';

export function BatchPriceUpdateModal({
  isOpen,
  onClose,
  selectedProducts = [],
  onApplyBatch,
}) {
  const [operationType, setOperationType] = useState('PERCENT_INCREASE'); // 'PERCENT_INCREASE' | 'PERCENT_DISCOUNT' | 'TARGET_MARGIN' | 'FIXED_PRICE'
  const [value, setValue] = useState(15);
  const [reason, setReason] = useState('Ajuste general de precios');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const presets = [
    'Ajuste por inflación',
    'Aumento general de temporada',
    'Promoción de liquidación',
    'Descuento fin de temporada',
    'Actualización de costos',
  ];

  // Calculate new prices and differences for all selected products
  const previewItems = useMemo(() => {
    const numValue = Number(value) || 0;

    return selectedProducts.map((p) => {
      const currentPrice = Number(p.salePrice ?? p.price ?? 0);
      const cost = Number(p.costPrice ?? p.cost ?? 0);
      let calculatedPrice = currentPrice;
      let note = '';

      if (operationType === 'PERCENT_INCREASE') {
        calculatedPrice = Math.round((currentPrice * (1 + numValue / 100)) / 100) * 100;
      } else if (operationType === 'PERCENT_DISCOUNT') {
        calculatedPrice = Math.round((currentPrice * (1 - numValue / 100)) / 100) * 100;
      } else if (operationType === 'FIXED_PRICE') {
        calculatedPrice = Math.round(numValue / 100) * 100;
      } else if (operationType === 'TARGET_MARGIN') {
        if (cost > 0) {
          // target markup on cost
          calculatedPrice = Math.round((cost * (1 + numValue / 100)) / 100) * 100;
        } else {
          calculatedPrice = currentPrice;
          note = 'Sin costo (no modificado)';
        }
      }

      calculatedPrice = Math.max(0, calculatedPrice);
      const diff = calculatedPrice - currentPrice;
      const diffPercent = currentPrice > 0 ? ((diff / currentPrice) * 100).toFixed(1) : '0';
      const profit = calculateProfitability(cost, calculatedPrice);

      return {
        product: p,
        productId: p.id,
        name: p.name,
        sku: p.sku || '-',
        currentPrice,
        cost,
        newPrice: calculatedPrice,
        diff,
        diffPercent,
        newMargin: profit.isValid ? profit.marginOnSales : null,
        note,
      };
    });
  }, [selectedProducts, operationType, value]);

  const handleConfirmApply = async () => {
    if (!reason.trim()) {
      toast.error('Indique un motivo para el historial');
      return;
    }
    if (previewItems.length === 0) {
      toast.error('No hay productos seleccionados');
      return;
    }

    setIsSubmitting(true);
    try {
      const updates = previewItems
        .filter((item) => item.newPrice > 0 && item.newPrice !== item.currentPrice)
        .map((item) => ({
          productId: item.productId,
          newPrice: item.newPrice,
          reason: reason.trim(),
        }));

      if (updates.length === 0) {
        toast.info('No hay cambios en los precios de los productos seleccionados');
        onClose();
        return;
      }

      await onApplyBatch(updates, reason.trim());
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
      setShowConfirm(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Actualización Masiva de Precios"
      subtitle={`${selectedProducts.length} ${selectedProducts.length === 1 ? 'prenda seleccionada' : 'prendas seleccionadas'}`}
      maxWidth="max-w-4xl"
    >
      <div className="space-y-5">
        {/* Step 1: Configuration Form */}
        <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-200 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="text-xs font-bold text-neutral-700 block mb-1">
              Método de actualización *
            </label>
            <select
              value={operationType}
              onChange={(e) => {
                setOperationType(e.target.value);
                if (e.target.value === 'PERCENT_INCREASE') setValue(15);
                else if (e.target.value === 'PERCENT_DISCOUNT') setValue(10);
                else if (e.target.value === 'TARGET_MARGIN') setValue(80);
                else if (e.target.value === 'FIXED_PRICE') setValue(25000);
              }}
              className="w-full px-3 py-2 text-xs font-semibold rounded-lg bg-white border border-neutral-300 text-neutral-800 focus:outline-hidden focus:ring-2 focus:ring-neutral-900"
            >
              <option value="PERCENT_INCREASE">Aumento Porcentual (+%)</option>
              <option value="PERCENT_DISCOUNT">Descuento Porcentual (-%)</option>
              <option value="TARGET_MARGIN">Margen Objetivo (% sobre costo)</option>
              <option value="FIXED_PRICE">Precio Fijo Manual ($)</option>
            </select>
          </div>

          <div>
            <Input
              label={operationType === 'FIXED_PRICE' ? 'Precio Nuevo ($) *' : 'Porcentaje (%) *'}
              type="number"
              min="0"
              step={operationType === 'FIXED_PRICE' ? '100' : '1'}
              value={value}
              onChange={(e) => setValue(e.target.value === '' ? '' : Number(e.target.value))}
            />
          </div>

          <div>
            <label className="text-xs font-bold text-neutral-700 block mb-1">
              Motivo del cambio *
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ej: Ajuste por inflación"
              className="w-full px-3 py-2 text-xs font-semibold rounded-lg bg-white border border-neutral-300 text-neutral-800 focus:outline-hidden focus:ring-2 focus:ring-neutral-900"
            />
          </div>
        </div>

        {/* Quick presets for reasons */}
        <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
          <span className="text-neutral-500 font-medium">Motivos rápidos:</span>
          {presets.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => setReason(preset)}
              className="px-2 py-0.5 rounded-md bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-medium cursor-pointer"
            >
              {preset}
            </button>
          ))}
        </div>

        {/* Step 2: Live Preview Table */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-800">
              Vista Previa de Cambios ({previewItems.length} prendas)
            </h4>
            <span className="text-xs text-neutral-500">
              Revisar antes de confirmar
            </span>
          </div>

          <div className="border border-neutral-200 rounded-xl overflow-hidden max-h-72 overflow-y-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-neutral-100 text-neutral-700 font-bold sticky top-0 border-b border-neutral-200 z-10">
                <tr>
                  <th className="p-2.5">Prenda</th>
                  <th className="p-2.5">SKU</th>
                  <th className="p-2.5 text-right">Precio Actual</th>
                  <th className="p-2.5 text-right">Nuevo Precio</th>
                  <th className="p-2.5 text-right">Diferencia</th>
                  <th className="p-2.5 text-right">Nuevo Margen</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 bg-white">
                {previewItems.map((item) => (
                  <tr key={item.productId} className="hover:bg-neutral-50">
                    <td className="p-2.5 font-bold text-neutral-800 max-w-[180px] truncate">
                      {item.name}
                      {item.note && (
                        <span className="block text-[10px] text-amber-600 font-normal">
                          {item.note}
                        </span>
                      )}
                    </td>
                    <td className="p-2.5 font-mono text-neutral-500 text-[11px]">{item.sku}</td>
                    <td className="p-2.5 text-right text-neutral-600 font-medium">
                      {formatCurrency(item.currentPrice)}
                    </td>
                    <td className="p-2.5 text-right font-black text-neutral-900">
                      {formatCurrency(item.newPrice)}
                    </td>
                    <td className="p-2.5 text-right font-bold">
                      <span
                        className={`inline-flex items-center justify-end gap-0.5 ${
                          item.diff >= 0 ? 'text-emerald-700' : 'text-rose-600'
                        }`}
                      >
                        {item.diff >= 0 ? (
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        ) : (
                          <ArrowDownRight className="w-3.5 h-3.5" />
                        )}
                        {item.diff >= 0 ? `+${formatCurrency(item.diff)}` : formatCurrency(item.diff)} ({item.diffPercent}%)
                      </span>
                    </td>
                    <td className="p-2.5 text-right font-semibold text-neutral-700">
                      {item.newMargin !== null ? `${item.newMargin}%` : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Step 3: Confirmation Dialog Box if clicked */}
        {showConfirm && (
          <div className="p-4 rounded-xl bg-amber-50 border border-amber-300 space-y-2">
            <div className="flex items-center gap-2 text-amber-900 font-bold text-sm">
              <AlertCircle className="w-5 h-5 text-amber-600" />
              ¿Confirmar actualización masiva de precios?
            </div>
            <p className="text-xs text-amber-800">
              Se actualizarán los precios de <strong>{previewItems.length} prendas</strong> y se
              guardará automáticamente una entrada en el historial de precios para cada una con el
              motivo <em>"{reason}"</em>.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="xs"
                onClick={() => setShowConfirm(false)}
                disabled={isSubmitting}
              >
                Volver a revisar
              </Button>
              <Button
                variant="primary"
                size="xs"
                onClick={handleConfirmApply}
                loading={isSubmitting}
              >
                Confirmar y Aplicar Cambios
              </Button>
            </div>
          </div>
        )}

        {/* Footer */}
        {!showConfirm && (
          <div className="flex justify-end gap-2 pt-3 border-t border-neutral-100">
            <Button variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setShowConfirm(true)}
              disabled={previewItems.length === 0}
            >
              Aplicar {previewItems.length} Precios
            </Button>
          </div>
        )}
      </div>
    </Modal>
  );
}
