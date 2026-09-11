import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { calculateSuggestedPrice, getProductAging, getLastSaleInfo } from '../../utils/pricingUtils';
import { Lightbulb, Percent, AlertTriangle, CheckCircle2, DollarSign, Calendar, Clock, ArrowRight } from 'lucide-react';

export function PriceExplanationModal({ isOpen, onClose, product, onApplySuggestion }) {
  if (!product) return null;

  const suggestion = calculateSuggestedPrice(product);
  const aging = getProductAging(product);
  const saleInfo = getLastSaleInfo(product);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Desglose del Precio Sugerido"
      subtitle={`${product.name} • SKU: ${product.sku || '-'}`}
      maxWidth="max-w-lg"
    >
      <div className="space-y-4">
        {/* Banner with status and suggested price */}
        <div className="p-4 rounded-xl bg-neutral-900 text-white flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold text-neutral-400 block tracking-wider">
              Acción recomendada
            </span>
            <span className="text-base font-black flex items-center gap-1.5 mt-0.5">
              <Lightbulb className="w-4 h-4 text-amber-400" />
              {suggestion.actionLabel}
            </span>
            <span className="text-xs text-neutral-300 block mt-0.5">
              Estado: {suggestion.reviewReason}
            </span>
          </div>

          <div className="text-right">
            <span className="text-[10px] uppercase font-bold text-neutral-400 block tracking-wider">
              Precio Sugerido
            </span>
            <span className="text-xl font-black text-amber-400">
              {suggestion.suggestedPrice ? formatCurrency(suggestion.suggestedPrice) : 'No disponible'}
            </span>
          </div>
        </div>

        {/* Missing Info Warning */}
        {!suggestion.canCalculate && (
          <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-2.5">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-amber-900">{suggestion.missingInfo}</p>
              <p className="text-xs text-amber-700 mt-0.5">
                Para calcular una sugerencia automática se requiere conocer el costo de adquisición de la prenda. No inventamos información financiera.
              </p>
            </div>
          </div>
        )}

        {/* Breakdown of calculation */}
        <div className="p-4 rounded-xl bg-white border border-neutral-200 shadow-2xs space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-700">
            Fórmula y Datos Considerados
          </h4>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-1.5 border-b border-neutral-100">
              <span className="text-neutral-500 flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5 text-neutral-400" />
                Costo unitario considerado:
              </span>
              <span className="font-bold text-neutral-800">
                {suggestion.cost ? formatCurrency(suggestion.cost) : 'No registrado'}
              </span>
            </div>

            <div className="flex justify-between py-1.5 border-b border-neutral-100">
              <span className="text-neutral-500 flex items-center gap-1.5">
                <Percent className="w-3.5 h-3.5 text-neutral-400" />
                Margen objetivo sobre costo:
              </span>
              <span className="font-bold text-neutral-800">
                {suggestion.targetMargin}%
              </span>
            </div>

            <div className="flex justify-between py-1.5 border-b border-neutral-100">
              <span className="text-neutral-500">Precio actual en catálogo:</span>
              <span className="font-bold text-neutral-800">
                {suggestion.currentPrice ? formatCurrency(suggestion.currentPrice) : 'No establecido'}
              </span>
            </div>

            <div className="flex justify-between py-1.5 border-b border-neutral-100">
              <span className="text-neutral-500 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-neutral-400" />
                Días en stock (Antigüedad):
              </span>
              <span className="font-bold text-neutral-800">
                {aging.daysInStock !== null ? `${aging.daysInStock} días (${aging.status.label})` : 'Fecha de ingreso no registrada'}
              </span>
            </div>

            <div className="flex justify-between py-1.5">
              <span className="text-neutral-500 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-neutral-400" />
                Última venta registrada:
              </span>
              <span className="font-bold text-neutral-800">
                {saleInfo.hasSales
                  ? `${formatDate(saleInfo.lastSaleDate, 'short')} (${saleInfo.formatted})`
                  : 'Sin ventas'}
              </span>
            </div>
          </div>
        </div>

        {/* Motivos explicativos */}
        <div className="p-3.5 rounded-xl bg-neutral-50 border border-neutral-200">
          <p className="text-xs font-bold text-neutral-800 mb-2">Fundamento de la sugerencia:</p>
          <ul className="space-y-1.5 text-xs text-neutral-600">
            {suggestion.reasons.map((r, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-neutral-400 mt-1.5 shrink-0" />
                <span>{r}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Stagnant warning if applicable */}
        {aging.isStagnant && product.stock > 0 && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold block">Recomendación para prenda estancada:</span>
              <span>
                Esta prenda tiene más de 365 días en inventario y {product.stock} unidades sin rotar. Se recomienda aplicar liquidación o promociones 2x1 para liberar capital inmovilizado.
              </span>
            </div>
          </div>
        )}

        {/* Footer actions */}
        <div className="flex justify-end gap-2 pt-3 border-t border-neutral-100">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            Cerrar
          </Button>
          {suggestion.canCalculate && suggestion.suggestedPrice && onApplySuggestion && (
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={() => {
                onApplySuggestion(product, suggestion.suggestedPrice, `Precio sugerido (${suggestion.actionLabel})`);
                onClose();
              }}
            >
              Aplicar {formatCurrency(suggestion.suggestedPrice)}
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}
