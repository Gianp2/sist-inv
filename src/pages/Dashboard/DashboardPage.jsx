import { useProducts } from '../../hooks/useProducts';
import { useCashRegister } from '../../context/CashContext';
import { useSettings } from '../../context/SettingsContext';
import { useAuth } from '../../context/AuthContext';
import { StatCards } from './StatCards';
import { SalesCharts } from './SalesCharts';
import { RecentActivity } from './RecentActivity';
import { QuickActions } from './QuickActions';
import { Skeleton, CardSkeleton } from '../../components/ui/Skeleton';
import { ShieldCheck, Info } from 'lucide-react';

export function DashboardPage() {
  const { products, loading: productsLoading } = useProducts();
  const { allMovements, loading: cashLoading } = useCashRegister();
  const { settings } = useSettings();
  const { can, roleLabel, user } = useAuth();
  const storeName = settings?.businessName || 'Sistema Inv';
  const canSeeFinancials = can('dashboard.financials');

  if (productsLoading || cashLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-64" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      </div>
    );
  }

  // Current Date Strings
  const todayStr = new Date().toISOString().split('T')[0];
  const currentMonthStr = todayStr.substring(0, 7);

  // Cash Calculations
  const todayMovements = allMovements.filter((m) => m.date?.startsWith(todayStr));
  const todayIncome = todayMovements
    .filter((m) => m.type === 'INGRESO' || m.type === 'VENTA' || m.type === 'APERTURA_CAJA')
    .reduce((acc, m) => acc + (Number(m.amount) || 0), 0);

  const monthMovements = allMovements.filter((m) => m.date?.startsWith(currentMonthStr));
  const monthIncome = monthMovements
    .filter((m) => m.type === 'INGRESO' || m.type === 'VENTA' || m.type === 'APERTURA_CAJA')
    .reduce((acc, m) => acc + (Number(m.amount) || 0), 0);
  const monthExpense = monthMovements
    .filter((m) => m.type === 'EGRESO' || m.type === 'RETIRO' || m.type === 'GASTO' || m.type === 'COMPRA')
    .reduce((acc, m) => acc + (Number(m.amount) || 0), 0);

  // Stock Calculations
  const totalStockUnits = products.reduce((acc, p) => acc + (p.stock || 0), 0);
  const lowStockProducts = products.filter((p) => (p.stock || 0) <= (p.stockMin || 5) && (p.stock || 0) > 0);
  const outOfStockProducts = products.filter((p) => (p.stock || 0) === 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-center sm:text-left">
        <div>
          <h1 className="text-2xl font-black text-neutral-900 tracking-tight">
            Panel de Control
          </h1>
          <p className="text-xs text-neutral-500 mt-0.5">
            Gestión comercial de <strong className="font-semibold text-neutral-700">{storeName}</strong> • {settings?.address || 'Control de stock y caja'}
          </p>
        </div>
        <QuickActions />
      </div>

      {/* Role Notice for Employees */}
      {!canSeeFinancials && (
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-3 p-3.5 rounded-2xl bg-blue-50/70 border border-blue-200/80 text-blue-900 text-xs text-center sm:text-left">
          <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-bold">Sesión activa como {roleLabel}:</span>{' '}
            <span className="text-blue-800">
              Tienes acceso a la caja del turno, cobro de ventas, registro de clientes y catálogo de stock. Los balances financieros mensuales, costos de compra y configuración del negocio están bloqueados y reservados exclusivamente a la Dueña.
            </span>
          </div>
        </div>
      )}

      {/* KPI Cards */}
      <StatCards
        todayIncome={todayIncome}
        monthIncome={monthIncome}
        monthExpense={monthExpense}
        totalStockUnits={totalStockUnits}
        lowStockCount={lowStockProducts.length}
        outOfStockCount={outOfStockProducts.length}
        todaySalesCount={todayMovements.filter((m) => m.type === 'VENTA').length}
        productsCount={products.length}
      />

      {/* Cash Flow Charts (Solo Dueña / Admin) */}
      {canSeeFinancials && <SalesCharts movements={allMovements} />}

      {/* Recent Activity & Stock alerts */}
      <RecentActivity movements={allMovements} lowStockProducts={[...outOfStockProducts, ...lowStockProducts]} />
    </div>
  );
}
