import { useState, useMemo } from 'react';
import { useCurrentAccounts } from '../../hooks/useCurrentAccounts';
import { useAuth } from '../../hooks/useAuth';
import { RegistrarPagoModal } from './RegistrarPagoModal';
import { EstadoCuentaModal } from './EstadoCuentaModal';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { formatCurrency, formatDate } from '../../utils/formatters';
import {
  BookOpen,
  CircleDollarSign,
  Search,
  Users,
  Calendar,
  Phone,
  FileText,
  ArrowDownLeft,
  ArrowUpRight,
  Printer,
  CheckCircle2,
  AlertCircle,
  Filter,
} from 'lucide-react';

export function CuentasCorrientesPage() {
  const { movements, customers, loading, metrics, registerPayment } = useCurrentAccounts();
  const { can } = useAuth();

  const [activeTab, setActiveTab] = useState('CLIENTES'); // 'CLIENTES' | 'MOVIMIENTOS'
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDebtOnly, setFilterDebtOnly] = useState('ALL'); // 'ALL' | 'DEBT_ONLY' | 'UP_TO_DATE'

  // Modals state
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedCustomerForPayment, setSelectedCustomerForPayment] = useState(null);

  const [isStatementModalOpen, setIsStatementModalOpen] = useState(false);
  const [selectedCustomerForStatement, setSelectedCustomerForStatement] = useState(null);

  // Filtered customers list
  const filteredCustomers = useMemo(() => {
    return customers.filter((c) => {
      const matchSearch =
        !searchTerm ||
        c.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.phone?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.dni?.toLowerCase().includes(searchTerm.toLowerCase());

      const balance = Number(c.currentBalance) || 0;
      let matchFilter = true;
      if (filterDebtOnly === 'DEBT_ONLY') matchFilter = balance > 0;
      if (filterDebtOnly === 'UP_TO_DATE') matchFilter = balance === 0;

      return matchSearch && matchFilter;
    }).sort((a, b) => (Number(b.currentBalance) || 0) - (Number(a.currentBalance) || 0));
  }, [customers, searchTerm, filterDebtOnly]);

  // Filtered movements list
  const filteredMovements = useMemo(() => {
    return movements.filter((m) => {
      if (!searchTerm) return true;
      const term = searchTerm.toLowerCase();
      return (
        m.customerName?.toLowerCase().includes(term) ||
        m.notes?.toLowerCase().includes(term) ||
        m.paymentMethod?.toLowerCase().includes(term) ||
        m.user?.toLowerCase().includes(term)
      );
    });
  }, [movements, searchTerm]);

  const handleOpenPayment = (customer = null) => {
    setSelectedCustomerForPayment(customer);
    setIsPaymentModalOpen(true);
  };

  const handleOpenStatement = (customer) => {
    setSelectedCustomerForStatement(customer);
    setIsStatementModalOpen(true);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-neutral-900 tracking-tight">
              Cuentas Corrientes
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-900">
              Créditos & Fiados
            </span>
          </div>
          <p className="text-xs text-neutral-500 mt-1">
            Control de saldos deudores de clientes, registro de pagos con impacto en caja e historial de cuentas
          </p>
        </div>

        <div className="flex items-center gap-2">
          {can('current_accounts.manage') && (
            <Button
              variant="primary"
              size="sm"
              leftIcon={CircleDollarSign}
              onClick={() => handleOpenPayment(null)}
              className="text-xs font-bold shadow-xs"
            >
              Registrar Cobro / Entrega
            </Button>
          )}
        </div>
      </div>

      {/* KPI Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Total Outstanding Debt */}
        <Card className="p-4 border-rose-200/80 bg-rose-50/40">
          <div className="flex items-center justify-between text-xs text-rose-800 font-bold">
            <span>Deuda Total Pendiente</span>
            <AlertCircle className="w-4 h-4 text-rose-600" />
          </div>
          <p className="text-2xl font-black text-rose-700 mt-1.5 tracking-tight">
            {formatCurrency(metrics.totalDebt)}
          </p>
          <p className="text-[11px] text-rose-600/90 mt-1">
            en poder de clientes
          </p>
        </Card>

        {/* Debtors count */}
        <Card className="p-4">
          <div className="flex items-center justify-between text-xs text-neutral-500 font-bold">
            <span>Clientes con Deuda</span>
            <Users className="w-4 h-4 text-neutral-400" />
          </div>
          <p className="text-2xl font-black text-neutral-900 mt-1.5 tracking-tight">
            {metrics.debtorsCount}
          </p>
          <p className="text-[11px] text-neutral-400 mt-1">
            de {metrics.totalCustomers} clientes registrados
          </p>
        </Card>

        {/* Total collected this month */}
        <Card className="p-4 border-emerald-200/80 bg-emerald-50/40">
          <div className="flex items-center justify-between text-xs text-emerald-800 font-bold">
            <span>Cobrado Este Mes</span>
            <ArrowDownLeft className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-black text-emerald-700 mt-1.5 tracking-tight">
            {formatCurrency(metrics.totalCollectedMonth)}
          </p>
          <p className="text-[11px] text-emerald-600/90 mt-1">
            ingresado a caja
          </p>
        </Card>

        {/* Total collected today */}
        <Card className="p-4 border-blue-200/80 bg-blue-50/40">
          <div className="flex items-center justify-between text-xs text-blue-800 font-bold">
            <span>Cobrado Hoy</span>
            <Calendar className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-2xl font-black text-blue-700 mt-1.5 tracking-tight">
            {formatCurrency(metrics.totalCollectedToday)}
          </p>
          <p className="text-[11px] text-blue-600/90 mt-1">
            impacto en turno diario
          </p>
        </Card>
      </div>

      {/* Main Tabs Navigation & Filter Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-200 pb-3">
        {/* Tabs */}
        <div className="flex items-center gap-1 bg-neutral-100 p-1 rounded-xl w-fit text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveTab('CLIENTES')}
            className={`px-3.5 py-1.5 rounded-lg transition-all cursor-pointer ${
              activeTab === 'CLIENTES'
                ? 'bg-white text-neutral-900 shadow-xs'
                : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            Saldos por Cliente ({filteredCustomers.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('MOVIMIENTOS')}
            className={`px-3.5 py-1.5 rounded-lg transition-all cursor-pointer ${
              activeTab === 'MOVIMIENTOS'
                ? 'bg-white text-neutral-900 shadow-xs'
                : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            Historial de Movimientos ({filteredMovements.length})
          </button>
        </div>

        {/* Search Bar */}
        <div className="flex items-center gap-2">
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar cliente, DNI, teléfono..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-neutral-200 focus:outline-hidden focus:ring-2 focus:ring-neutral-900 bg-white"
            />
          </div>

          {activeTab === 'CLIENTES' && (
            <div className="flex items-center p-1 rounded-xl bg-neutral-100 border border-neutral-200 text-xs shrink-0">
              <button
                type="button"
                onClick={() => setFilterDebtOnly('ALL')}
                className={`px-2.5 py-1 rounded-lg font-medium cursor-pointer ${
                  filterDebtOnly === 'ALL'
                    ? 'bg-white text-neutral-900 font-bold shadow-xs'
                    : 'text-neutral-600'
                }`}
              >
                Todos
              </button>
              <button
                type="button"
                onClick={() => setFilterDebtOnly('DEBT_ONLY')}
                className={`px-2.5 py-1 rounded-lg font-medium cursor-pointer ${
                  filterDebtOnly === 'DEBT_ONLY'
                    ? 'bg-white text-rose-600 font-bold shadow-xs'
                    : 'text-neutral-600'
                }`}
              >
                Con Deuda
              </button>
              <button
                type="button"
                onClick={() => setFilterDebtOnly('UP_TO_DATE')}
                className={`px-2.5 py-1 rounded-lg font-medium cursor-pointer ${
                  filterDebtOnly === 'UP_TO_DATE'
                    ? 'bg-white text-emerald-600 font-bold shadow-xs'
                    : 'text-neutral-600'
                }`}
              >
                Al Día
              </button>
            </div>
          )}
        </div>
      </div>

      {/* --- TAB 1: CLIENTES Y SALDOS --- */}
      {activeTab === 'CLIENTES' && (
        <Card className="p-0 overflow-hidden">
          {/* Mobile View: Cards */}
          <div className="md:hidden divide-y divide-neutral-200">
            {filteredCustomers.map((customer, idx) => {
              const debt = Number(customer.currentBalance) || 0;
              const hasDebt = debt > 0;

              return (
                <div key={customer.id ? `${customer.id}-${idx}` : `cc-${idx}`} className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <span className="w-9 h-9 rounded-full bg-neutral-100 flex items-center justify-center text-sm font-black text-neutral-800 shrink-0 border border-neutral-200">
                        {customer.name?.charAt(0) || 'C'}
                      </span>
                      <div>
                        <p className="text-sm font-bold text-neutral-900">{customer.name}</p>
                        {customer.dni && (
                          <p className="text-xs text-neutral-400 font-normal">DNI: {customer.dni}</p>
                        )}
                        {customer.phone && (
                          <a
                            href={`tel:${customer.phone}`}
                            className="text-xs text-neutral-600 flex items-center gap-1 mt-0.5"
                          >
                            <Phone className="w-3 h-3 text-neutral-400" />
                            <span>{customer.phone}</span>
                          </a>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <span
                        className={`text-base font-black font-mono block ${
                          hasDebt ? 'text-rose-600' : 'text-emerald-600'
                        }`}
                      >
                        {formatCurrency(debt)}
                      </span>
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                          hasDebt ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'
                        }`}
                      >
                        {hasDebt ? 'Deuda Pendiente' : 'Al Día'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-neutral-500 pt-1 border-t border-neutral-100">
                    <span>Total Pagado: <strong>{formatCurrency(customer.totalPaid || 0)}</strong></span>
                    <span>Último pago: <strong>{customer.lastPaymentDate ? formatDate(customer.lastPaymentDate, 'short') : 'Sin pagos'}</strong></span>
                  </div>

                  {/* Touch buttons on mobile */}
                  <div className="flex items-center gap-2 pt-1">
                    {hasDebt && can('current_accounts.manage') && (
                      <Button
                        variant="primary"
                        size="sm"
                        leftIcon={CircleDollarSign}
                        onClick={() => handleOpenPayment(customer)}
                        className="flex-1 h-11 text-xs font-bold justify-center"
                      >
                        Registrar Cobro
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      leftIcon={FileText}
                      onClick={() => handleOpenStatement(customer)}
                      className="flex-1 h-11 text-xs font-bold justify-center"
                    >
                      Ver Cuenta
                    </Button>
                  </div>
                </div>
              );
            })}

            {filteredCustomers.length === 0 && (
              <div className="p-8 text-center text-neutral-400 text-xs">
                No se encontraron clientes para los filtros aplicados.
              </div>
            )}
          </div>

          {/* Desktop View: Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-neutral-50 text-neutral-600 font-semibold border-b border-neutral-200">
                <tr>
                  <th className="p-3.5">Cliente</th>
                  <th className="p-3.5">Contacto</th>
                  <th className="p-3.5 text-right">Saldo Pendiente (Deuda)</th>
                  <th className="p-3.5 text-right">Total Pagado</th>
                  <th className="p-3.5">Último Pago</th>
                  <th className="p-3.5 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 bg-white">
                {filteredCustomers.map((customer, idx) => {
                  const debt = Number(customer.currentBalance) || 0;
                  const hasDebt = debt > 0;

                  return (
                    <tr key={customer.id ? `${customer.id}-${idx}` : `cc-${idx}`} className="hover:bg-neutral-50/70 transition-colors">
                      <td className="p-3.5 font-bold text-neutral-900">
                        <div className="flex items-center gap-2">
                          <span className="w-7 h-7 rounded-full bg-neutral-100 flex items-center justify-center text-xs font-bold text-neutral-700 shrink-0">
                            {customer.name?.charAt(0) || 'C'}
                          </span>
                          <div>
                            <p className="text-xs font-bold text-neutral-900">{customer.name}</p>
                            {customer.dni && (
                              <p className="text-[11px] text-neutral-400 font-normal">
                                DNI: {customer.dni}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="p-3.5 text-neutral-600">
                        {customer.phone ? (
                          <div className="flex items-center gap-1">
                            <Phone className="w-3 h-3 text-neutral-400" />
                            <span>{customer.phone}</span>
                          </div>
                        ) : (
                          <span className="text-neutral-400">-</span>
                        )}
                      </td>

                      <td className="p-3.5 text-right">
                        <span
                          className={`font-black text-sm font-mono ${
                            hasDebt ? 'text-rose-600' : 'text-emerald-600'
                          }`}
                        >
                          {formatCurrency(debt)}
                        </span>
                        {hasDebt && (
                          <span className="block text-[10px] text-rose-500 font-medium">
                            Pendiente
                          </span>
                        )}
                      </td>

                      <td className="p-3.5 text-right font-mono text-neutral-700">
                        {formatCurrency(customer.totalPaid || 0)}
                      </td>

                      <td className="p-3.5 text-neutral-500 text-[11px] whitespace-nowrap">
                        {customer.lastPaymentDate
                          ? formatDate(customer.lastPaymentDate, 'short')
                          : 'Sin pagos'}
                      </td>

                      <td className="p-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {hasDebt && can('current_accounts.manage') && (
                            <Button
                              variant="primary"
                              size="xs"
                              leftIcon={CircleDollarSign}
                              onClick={() => handleOpenPayment(customer)}
                              className="text-[11px] font-bold"
                            >
                              Cobrar
                            </Button>
                          )}

                          <Button
                            variant="outline"
                            size="xs"
                            leftIcon={FileText}
                            onClick={() => handleOpenStatement(customer)}
                            className="text-[11px]"
                          >
                            Estado Cuenta
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {filteredCustomers.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-neutral-400 text-xs">
                      No se encontraron clientes para los filtros aplicados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* --- TAB 2: HISTORIAL DE MOVIMIENTOS --- */}
      {activeTab === 'MOVIMIENTOS' && (
        <Card className="p-0 overflow-hidden">
          {/* Mobile View: Cards */}
          <div className="md:hidden divide-y divide-neutral-200">
            {filteredMovements.map((m, idx) => {
              const isPayment = m.type === 'PAGO' || m.type === 'ENTREGA';

              return (
                <div key={m.id ? `${m.id}-${idx}` : `mov-${idx}`} className="p-4 space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[11px] font-mono text-neutral-400 block">
                        {formatDate(m.date, 'full')}
                      </span>
                      <p className="text-sm font-bold text-neutral-900 mt-0.5">
                        {m.customerName || 'Cliente'}
                      </p>
                    </div>
                    <div className="text-right">
                      <span
                        className={`text-base font-black font-mono block ${
                          isPayment ? 'text-emerald-600' : 'text-rose-600'
                        }`}
                      >
                        {isPayment ? '-' : '+'}
                        {formatCurrency(m.amount)}
                      </span>
                      <Badge size="xs" variant={isPayment ? 'success' : 'danger'} className="mt-0.5">
                        {isPayment ? 'PAGO / ENTREGA' : 'VENTA CRÉDITO'}
                      </Badge>
                    </div>
                  </div>

                  <p className="text-xs text-neutral-700 bg-neutral-50 border border-neutral-200 p-2 rounded-lg">
                    {m.notes || (isPayment ? 'Cobro de cuenta corriente' : 'Venta a Cuenta Corriente')}
                  </p>

                  <div className="flex items-center justify-between text-[11px] text-neutral-500 pt-1 border-t border-neutral-100">
                    <span>Medio: <strong>{m.paymentMethod || (isPayment ? 'Efectivo' : 'Cta. Cte.')}</strong></span>
                    <span>Por: <strong>{m.user || 'Admin'}</strong></span>
                  </div>
                </div>
              );
            })}

            {filteredMovements.length === 0 && (
              <div className="p-8 text-center text-neutral-400 text-xs">
                No hay registros de movimientos en cuentas corrientes.
              </div>
            )}
          </div>

          {/* Desktop View: Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-neutral-50 text-neutral-600 font-semibold border-b border-neutral-200">
                <tr>
                  <th className="p-3.5">Fecha y Hora</th>
                  <th className="p-3.5">Cliente</th>
                  <th className="p-3.5">Tipo</th>
                  <th className="p-3.5">Detalle / Obs</th>
                  <th className="p-3.5">Medio de Pago</th>
                  <th className="p-3.5">Registrado por</th>
                  <th className="p-3.5 text-right">Importe</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 bg-white">
                {filteredMovements.map((m, idx) => {
                  const isPayment = m.type === 'PAGO' || m.type === 'ENTREGA';

                  return (
                    <tr key={m.id ? `${m.id}-${idx}` : `mov-${idx}`} className="hover:bg-neutral-50/70 transition-colors">
                      <td className="p-3.5 font-mono text-neutral-500 whitespace-nowrap">
                        {formatDate(m.date, 'full')}
                      </td>
                      <td className="p-3.5 font-bold text-neutral-900">
                        {m.customerName || 'Cliente'}
                      </td>
                      <td className="p-3.5 font-bold">
                        <Badge size="xs" variant={isPayment ? 'success' : 'danger'}>
                          {isPayment ? 'PAGO / ENTREGA' : 'VENTA CRÉDITO'}
                        </Badge>
                      </td>
                      <td className="p-3.5 text-neutral-700">
                        <p className="font-medium">{m.notes || (isPayment ? 'Cobro de cuenta corriente' : 'Venta a Cuenta Corriente')}</p>
                        {m.itemsSummary && (
                          <p className="text-[11px] text-neutral-400 truncate max-w-sm">
                            {m.itemsSummary}
                          </p>
                        )}
                      </td>
                      <td className="p-3.5 text-neutral-600 whitespace-nowrap">
                        {m.paymentMethod || (isPayment ? 'Efectivo' : 'Cta. Cte.')}
                      </td>
                      <td className="p-3.5 text-neutral-500 whitespace-nowrap">
                        {m.user || 'Administrador'}
                      </td>
                      <td
                        className={`p-3.5 text-right font-black font-mono text-sm whitespace-nowrap ${
                          isPayment ? 'text-emerald-600' : 'text-rose-600'
                        }`}
                      >
                        {isPayment ? '-' : '+'}
                        {formatCurrency(m.amount)}
                      </td>
                    </tr>
                  );
                })}

                {filteredMovements.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-neutral-400 text-xs">
                      No hay registros de movimientos en cuentas corrientes.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Modal: Registrar Pago / Entrega */}
      <RegistrarPagoModal
        isOpen={isPaymentModalOpen}
        onClose={() => {
          setIsPaymentModalOpen(false);
          setSelectedCustomerForPayment(null);
        }}
        customers={customers}
        initialCustomer={selectedCustomerForPayment}
        onSavePayment={registerPayment}
      />

      {/* Modal: Estado de Cuenta */}
      <EstadoCuentaModal
        isOpen={isStatementModalOpen}
        onClose={() => {
          setIsStatementModalOpen(false);
          setSelectedCustomerForStatement(null);
        }}
        customer={selectedCustomerForStatement}
        movements={movements}
        onOpenPayment={(cust) => handleOpenPayment(cust)}
      />
    </div>
  );
}
