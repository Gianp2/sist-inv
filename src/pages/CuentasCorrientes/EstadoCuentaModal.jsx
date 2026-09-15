import { useMemo } from 'react';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { formatCurrency, formatDate } from '../../utils/formatters';
import {
  Printer,
  User,
  Phone,
  Mail,
  MapPin,
  Calendar,
  CircleDollarSign,
  ArrowUpRight,
  ArrowDownRight,
  Download,
} from 'lucide-react';

export function EstadoCuentaModal({
  isOpen,
  onClose,
  customer,
  movements = [],
  onOpenPayment,
}) {
  if (!customer) return null;

  // Filter movements for this customer and sort chronologically
  const customerMovements = useMemo(() => {
    return movements
      .filter((m) => m.customerId === customer.id)
      .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
  }, [movements, customer.id]);

  const currentDebt = Number(customer.currentBalance) || 0;
  const totalDebts = customerMovements
    .filter((m) => m.type === 'DEUDA')
    .reduce((sum, m) => sum + (Number(m.amount) || 0), 0);

  const totalPayments = customerMovements
    .filter((m) => m.type === 'PAGO' || m.type === 'ENTREGA')
    .reduce((sum, m) => sum + (Number(m.amount) || 0), 0);

  const handlePrint = () => {
    window.print();
  };

  const handleExportCsv = () => {
    const headers = ['Fecha', 'Tipo', 'Detalle/Observaciones', 'Monto', 'Medio de Pago', 'Usuario'];
    const rows = customerMovements.map((m) => [
      formatDate(m.date, 'full'),
      m.type === 'DEUDA' ? 'Venta a Crédito' : 'Pago / Entrega',
      `"${(m.notes || m.itemsSummary || '').replace(/"/g, '""')}"`,
      m.amount,
      m.paymentMethod || 'Efectivo',
      m.user || 'Administrador',
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `Estado_Cuenta_${customer.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Estado de Cuenta: ${customer.name}`}
      subtitle="Historial cronológico de compras a crédito, entregas y saldo pendiente"
      maxWidth="max-w-3xl"
    >
      <div className="space-y-5 print:p-0">
        {/* Customer Header Info */}
        <div className="p-4 bg-neutral-50 rounded-2xl border border-neutral-200 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 font-bold text-neutral-900 text-sm">
              <User className="w-4 h-4 text-neutral-600" />
              <span>{customer.name}</span>
              {customer.dni && (
                <span className="text-xs font-normal text-neutral-500">
                  (DNI/CUIT: {customer.dni})
                </span>
              )}
            </div>
            {customer.phone && (
              <div className="flex items-center gap-1.5 text-neutral-600">
                <Phone className="w-3.5 h-3.5 text-neutral-400" />
                <span>{customer.phone}</span>
              </div>
            )}
            {customer.address && (
              <div className="flex items-center gap-1.5 text-neutral-600">
                <MapPin className="w-3.5 h-3.5 text-neutral-400" />
                <span>{customer.address}</span>
              </div>
            )}
          </div>

          <div className="flex flex-col sm:items-end justify-center">
            <p className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider">
              Saldo Pendiente Actual
            </p>
            <p
              className={`text-2xl font-black mt-0.5 ${
                currentDebt > 0 ? 'text-rose-600' : 'text-emerald-600'
              }`}
            >
              {formatCurrency(currentDebt)}
            </p>
            <span className="text-[11px] text-neutral-400">
              {currentDebt > 0 ? 'Cuenta con deuda impaga' : 'Al día / Sin saldo deudor'}
            </span>
          </div>
        </div>

        {/* Financial Summary Badges */}
        <div className="grid grid-cols-3 gap-2.5 text-xs">
          <div className="p-3 rounded-xl bg-white border border-neutral-200">
            <span className="text-neutral-500 font-medium">Total Compras Crédito</span>
            <p className="text-base font-black text-neutral-900 mt-0.5">
              {formatCurrency(totalDebts)}
            </p>
          </div>

          <div className="p-3 rounded-xl bg-white border border-neutral-200">
            <span className="text-neutral-500 font-medium">Total Pagado / Entregado</span>
            <p className="text-base font-black text-emerald-700 mt-0.5">
              {formatCurrency(totalPayments)}
            </p>
          </div>

          <div className="p-3 rounded-xl bg-white border border-neutral-200">
            <span className="text-neutral-500 font-medium">Movimientos Totales</span>
            <p className="text-base font-black text-neutral-900 mt-0.5">
              {customerMovements.length}
            </p>
          </div>
        </div>

        {/* Chronological Movements Table */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-neutral-900 uppercase tracking-wider">
              Historial de Movimientos
            </h4>
            <span className="text-[11px] text-neutral-400">Ordenado más reciente primero</span>
          </div>

          <div className="max-h-64 overflow-y-auto border border-neutral-200 rounded-xl bg-white">
            <table className="w-full text-left text-xs">
              <thead className="bg-neutral-50 text-neutral-600 font-semibold border-b border-neutral-200 sticky top-0">
                <tr>
                  <th className="p-2.5">Fecha</th>
                  <th className="p-2.5">Tipo</th>
                  <th className="p-2.5">Detalle / Obs</th>
                  <th className="p-2.5">Medio</th>
                  <th className="p-2.5 text-right">Importe</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {customerMovements.map((m, idx) => {
                  const isPayment = m.type === 'PAGO' || m.type === 'ENTREGA';
                  return (
                    <tr key={m.id || idx} className="hover:bg-neutral-50/50">
                      <td className="p-2.5 font-mono text-neutral-500 whitespace-nowrap">
                        {formatDate(m.date, 'short')}
                      </td>
                      <td className="p-2.5 font-bold">
                        <Badge size="xs" variant={isPayment ? 'success' : 'danger'}>
                          {isPayment ? 'PAGO / ENTREGA' : 'VENTA A CRÉDITO'}
                        </Badge>
                      </td>
                      <td className="p-2.5 text-neutral-700">
                        <p className="font-medium">{m.notes || (isPayment ? 'Entrega de dinero' : 'Venta a Cuenta Corriente')}</p>
                        {m.itemsSummary && (
                          <p className="text-[11px] text-neutral-400 truncate max-w-xs">
                            {m.itemsSummary}
                          </p>
                        )}
                      </td>
                      <td className="p-2.5 text-neutral-500 whitespace-nowrap">
                        {m.paymentMethod || (isPayment ? 'Efectivo' : 'Cta. Cte.')}
                      </td>
                      <td
                        className={`p-2.5 text-right font-black whitespace-nowrap ${
                          isPayment ? 'text-emerald-600' : 'text-rose-600'
                        }`}
                      >
                        {isPayment ? '-' : '+'}
                        {formatCurrency(m.amount)}
                      </td>
                    </tr>
                  );
                })}
                {customerMovements.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-6 text-center text-neutral-400 text-xs">
                      No hay compras a crédito ni pagos registrados para este cliente
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-neutral-200">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              leftIcon={Printer}
              onClick={handlePrint}
              className="text-xs"
            >
              Imprimir Estado de Cuenta
            </Button>
            <Button
              variant="outline"
              size="sm"
              leftIcon={Download}
              onClick={handleExportCsv}
              disabled={customerMovements.length === 0}
              className="text-xs"
            >
              Exportar CSV
            </Button>
          </div>

          <div className="flex items-center gap-2">
            {currentDebt > 0 && onOpenPayment && (
              <Button
                variant="primary"
                size="sm"
                leftIcon={CircleDollarSign}
                onClick={() => {
                  onClose();
                  onOpenPayment(customer);
                }}
                className="text-xs font-bold"
              >
                Cobrar / Registrar Entrega
              </Button>
            )}
            <Button variant="secondary" size="sm" onClick={onClose} className="text-xs">
              Cerrar
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
