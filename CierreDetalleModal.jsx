import { useMemo } from 'react';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { formatCurrency, formatDate } from '../../utils/formatters';
import {
  Printer,
  Calendar,
  User,
  Clock,
  CircleDollarSign,
  AlertCircle,
  CheckCircle2,
  FileSpreadsheet,
  ArrowUpRight,
  ArrowDownRight,
  ShoppingBag,
  CreditCard,
  Banknote,
  Smartphone,
  BookOpen,
} from 'lucide-react';

export function CierreDetalleModal({ isOpen, onClose, shift, allMovements = [], allSales = [] }) {
  if (!shift) return null;

  // Shift movements & sales
  const shiftMovements = useMemo(() => {
    return allMovements.filter((m) => m.cashRegisterId === shift.id);
  }, [allMovements, shift.id]);

  const shiftSales = useMemo(() => {
    return allSales.filter((s) => s.cashRegisterId === shift.id || (s.date && shift.openedAt && s.date >= shift.openedAt && (!shift.closedAt || s.date <= shift.closedAt)));
  }, [allSales, shift.id, shift.openedAt, shift.closedAt]);

  const isClosed = shift.status === 'CLOSED' || shift.status === 'closed' || !!shift.closedAt;
  const difference = Number(shift.difference) || 0;
  const isExact = Math.abs(difference) < 0.01;
  const isSurplus = difference > 0.01;
  const isDeficit = difference < -0.01;

  const handlePrint = () => {
    window.print();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={shift.shiftLabel || `Detalle de Cierre de Caja #${shift.shiftNumber || ''}`}
      subtitle={`Turno registrado del ${formatDate(shift.openedAt, 'short')}`}
      maxWidth="max-w-3xl"
    >
      <div className="space-y-5 print:p-0">
        {/* Header Badges & Timeline */}
        <div className="p-4 bg-neutral-50 rounded-2xl border border-neutral-200 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <Badge variant={isClosed ? 'default' : 'success'} size="sm">
              {isClosed ? 'Turno Cerrado' : 'Turno Activo'}
            </Badge>
            {shift.shiftNumber && (
              <span className="font-mono font-bold text-neutral-600 bg-white px-2 py-0.5 rounded-lg border border-neutral-200">
                Turno #{shift.shiftNumber}
              </span>
            )}
          </div>

          <div className="flex items-center gap-4 text-neutral-600 text-xs">
            <div className="flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-neutral-400" />
              <span>
                Apertura: <strong className="text-neutral-900">{shift.openedBy || shift.cashierName}</strong>
              </span>
            </div>
            {shift.closedBy && (
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-neutral-400" />
                <span>
                  Cierre: <strong className="text-neutral-900">{shift.closedBy}</strong>
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Timestamps */}
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="p-3 bg-white rounded-xl border border-neutral-200">
            <div className="flex items-center gap-1.5 text-neutral-500 mb-1">
              <Clock className="w-3.5 h-3.5" />
              <span>Fecha y Hora de Apertura</span>
            </div>
            <p className="font-mono font-bold text-neutral-900 text-sm">
              {formatDate(shift.openedAt, 'full')}
            </p>
          </div>
          <div className="p-3 bg-white rounded-xl border border-neutral-200">
            <div className="flex items-center gap-1.5 text-neutral-500 mb-1">
              <Clock className="w-3.5 h-3.5" />
              <span>Fecha y Hora de Cierre</span>
            </div>
            <p className="font-mono font-bold text-neutral-900 text-sm">
              {shift.closedAt ? formatDate(shift.closedAt, 'full') : 'Turno actualmente en curso'}
            </p>
          </div>
        </div>

        {/* Financial KPI Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <div className="p-3 rounded-2xl bg-neutral-50 border border-neutral-200">
            <p className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider">Fondo Inicial</p>
            <p className="text-lg font-black text-neutral-900 mt-1">
              {formatCurrency(shift.initialAmount || 0)}
            </p>
          </div>

          <div className="p-3 rounded-2xl bg-neutral-50 border border-neutral-200">
            <p className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider">Esperado en Cajón</p>
            <p className="text-lg font-black text-blue-700 mt-1">
              {formatCurrency(shift.expectedAmount || 0)}
            </p>
          </div>

          <div className="p-3 rounded-2xl bg-neutral-50 border border-neutral-200">
            <p className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider">Contado Real</p>
            <p className="text-lg font-black text-neutral-900 mt-1">
              {shift.finalAmount !== null && shift.finalAmount !== undefined
                ? formatCurrency(shift.finalAmount)
                : '-'}
            </p>
          </div>

          <div
            className={`p-3 rounded-2xl border ${
              isExact
                ? 'bg-neutral-50 border-neutral-200'
                : isSurplus
                ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
                : 'bg-rose-50 border-rose-200 text-rose-950'
            }`}
          >
            <p className="text-[11px] font-bold uppercase tracking-wider">
              {isExact ? 'Diferencia' : isSurplus ? 'Sobrante (+)' : 'Faltante (-)'}
            </p>
            <p
              className={`text-lg font-black mt-1 ${
                isExact
                  ? 'text-neutral-600'
                  : isSurplus
                  ? 'text-emerald-600'
                  : 'text-rose-600'
              }`}
            >
              {isSurplus ? '+' : ''}
              {formatCurrency(difference)}
            </p>
          </div>
        </div>

        {/* Incomes, Expenses & Total Sales */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200/60">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-800">Total Ingresos</span>
              <ArrowUpRight className="w-4 h-4 text-emerald-600" />
            </div>
            <p className="text-xl font-black text-emerald-700 mt-1">
              {formatCurrency(shift.totalIncome || 0)}
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-rose-50/70 border border-rose-200/60">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-rose-800">Total Egresos / Gastos</span>
              <ArrowDownRight className="w-4 h-4 text-rose-600" />
            </div>
            <p className="text-xl font-black text-rose-700 mt-1">
              {formatCurrency(shift.totalExpenses || 0)}
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-neutral-900 text-white shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-neutral-300">Ventas Totales</span>
              <ShoppingBag className="w-4 h-4 text-neutral-400" />
            </div>
            <p className="text-xl font-black text-white mt-1">
              {formatCurrency(shift.totalSales || 0)}
            </p>
            <p className="text-[11px] text-neutral-400 mt-0.5">
              {shift.salesCount || shiftSales.length} operaciones registradas
            </p>
          </div>
        </div>

        {/* Breakdown by Payment Method */}
        {shift.breakdown && (
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-neutral-900 uppercase tracking-wider">
              Desglose de Ventas por Medio de Pago
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              <div className="p-2.5 bg-white rounded-xl border border-neutral-200">
                <div className="flex items-center gap-1 text-neutral-500 text-[11px]">
                  <Banknote className="w-3 h-3 text-emerald-600" />
                  <span>Efectivo</span>
                </div>
                <p className="text-sm font-black text-neutral-900 mt-0.5">
                  {formatCurrency(shift.breakdown.EFECTIVO || 0)}
                </p>
              </div>

              <div className="p-2.5 bg-white rounded-xl border border-neutral-200">
                <div className="flex items-center gap-1 text-neutral-500 text-[11px]">
                  <CreditCard className="w-3 h-3 text-blue-600" />
                  <span>Débito</span>
                </div>
                <p className="text-sm font-black text-neutral-900 mt-0.5">
                  {formatCurrency(shift.breakdown.TARJETA_DEBITO || 0)}
                </p>
              </div>

              <div className="p-2.5 bg-white rounded-xl border border-neutral-200">
                <div className="flex items-center gap-1 text-neutral-500 text-[11px]">
                  <CreditCard className="w-3 h-3 text-indigo-600" />
                  <span>Crédito</span>
                </div>
                <p className="text-sm font-black text-neutral-900 mt-0.5">
                  {formatCurrency(shift.breakdown.TARJETA_CREDITO || 0)}
                </p>
              </div>

              <div className="p-2.5 bg-white rounded-xl border border-neutral-200">
                <div className="flex items-center gap-1 text-neutral-500 text-[11px]">
                  <Smartphone className="w-3 h-3 text-sky-600" />
                  <span>Transferencia</span>
                </div>
                <p className="text-sm font-black text-neutral-900 mt-0.5">
                  {formatCurrency(shift.breakdown.TRANSFERENCIA || 0)}
                </p>
              </div>

              <div className="p-2.5 bg-amber-50/60 rounded-xl border border-amber-200">
                <div className="flex items-center gap-1 text-amber-800 text-[11px]">
                  <BookOpen className="w-3 h-3 text-amber-600" />
                  <span>Cta. Corriente</span>
                </div>
                <p className="text-sm font-black text-amber-950 mt-0.5">
                  {formatCurrency(shift.breakdown.CUENTA_CORRIENTE || 0)}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Closing Notes */}
        {shift.closingNotes && (
          <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200 text-xs">
            <span className="font-bold text-neutral-700">Observaciones del Cierre: </span>
            <span className="text-neutral-600">{shift.closingNotes}</span>
          </div>
        )}

        {/* Movements list in this shift */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-neutral-900 uppercase tracking-wider">
              Movimientos del Turno ({shiftMovements.length})
            </h4>
            <span className="text-[11px] text-neutral-400">Auditoría cronológica</span>
          </div>

          <div className="max-h-52 overflow-y-auto border border-neutral-200 rounded-xl bg-white">
            <table className="w-full text-left text-xs">
              <thead className="bg-neutral-50 text-neutral-600 font-semibold border-b border-neutral-200 sticky top-0">
                <tr>
                  <th className="p-2.5">Hora</th>
                  <th className="p-2.5">Tipo</th>
                  <th className="p-2.5">Descripción</th>
                  <th className="p-2.5">Medio</th>
                  <th className="p-2.5 text-right">Monto</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {shiftMovements.map((m, idx) => {
                  const isPos = m.type === 'INGRESO' || m.type === 'VENTA' || m.type === 'APERTURA_CAJA';
                  return (
                    <tr key={m.id || idx} className="hover:bg-neutral-50/50">
                      <td className="p-2.5 font-mono text-neutral-500 whitespace-nowrap">
                        {formatDate(m.date, 'time')}
                      </td>
                      <td className="p-2.5 font-bold">
                        <Badge size="xs" variant={isPos ? 'success' : 'danger'}>
                          {m.type}
                        </Badge>
                      </td>
                      <td className="p-2.5 text-neutral-700 truncate max-w-xs">{m.description}</td>
                      <td className="p-2.5 text-neutral-500 whitespace-nowrap">{m.paymentMethod || 'Efectivo'}</td>
                      <td
                        className={`p-2.5 text-right font-black whitespace-nowrap ${
                          isPos ? 'text-emerald-600' : 'text-rose-600'
                        }`}
                      >
                        {isPos ? '+' : '-'}
                        {formatCurrency(m.amount)}
                      </td>
                    </tr>
                  );
                })}
                {shiftMovements.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-4 text-center text-neutral-400 text-xs">
                      No hay movimientos vinculados directamente a este turno
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-neutral-200">
          <Button
            variant="outline"
            size="sm"
            leftIcon={Printer}
            onClick={handlePrint}
            className="text-xs"
          >
            Imprimir Comprobante de Cierre
          </Button>

          <Button variant="primary" size="sm" onClick={onClose} className="text-xs font-bold px-6">
            Cerrar Vista
          </Button>
        </div>
      </div>
    </Modal>
  );
}
