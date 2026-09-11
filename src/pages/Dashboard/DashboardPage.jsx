import { useProducts } from '../../hooks/useProducts';
import { useCashRegister } from '../../context/CashContext';
import { useSettings } from '../../context/SettingsContext';
import { StatCards } from './StatCards';
import { SalesCharts } from './SalesCharts';
import { RecentActivity } from './RecentActivity';
import { QuickActions } from './QuickActions';
import { Skeleton, CardSkeleton } from '../../components/ui/Skeleton';

export function DashboardPage() {
  const { products, loading: productsLoading } = useProducts();
  const { allMovements, loading: cashLoading } = useCashRegister();
  const { settings } = useSettings();
  const storeName = settings?.businessName || 'Sistema Inv';

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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
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

      {/* KPI Cards */}
      <StatCards
        todayIncome={todayIncome}
        monthIncome={monthIncome}
        monthExpense={monthExpense}
        totalStockUnits={totalStockUnits}
        lowStockCount={lowStockProducts.length}
        outOfStockCount={outOfStockProducts.length}
      />

      {/* Cash Flow Charts */}
      <SalesCharts movements={allMovements} />

      {/* Recent Activity & Stock alerts */}
      <RecentActivity movements={allMovements} lowStockProducts={[...outOfStockProducts, ...lowStockProducts]} />
    </div>
  );
}
