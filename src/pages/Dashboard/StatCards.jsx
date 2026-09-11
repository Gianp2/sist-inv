import { formatCurrency } from '../../utils/formatters';
import { CircleDollarSign, TrendingUp, TrendingDown, AlertTriangle, Boxes, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { Card } from '../../components/ui/Card';

export function StatCards({
  todayIncome = 0,
  monthIncome = 0,
  monthExpense = 0,
  totalStockUnits = 0,
  lowStockCount = 0,
  outOfStockCount = 0,
}) {
  const stats = [
    {
      title: 'Ingresos de Hoy',
      value: formatCurrency(todayIncome),
      subtitle: 'Total recaudado hoy',
      icon: CircleDollarSign,
      color: 'bg-emerald-50 text-emerald-800 border border-emerald-200',
    },
    {
      title: 'Ingresos del Mes',
      value: formatCurrency(monthIncome),
      subtitle: 'Recaudación mensual acumulada',
      icon: TrendingUp,
      color: 'bg-neutral-100 text-neutral-900 border border-neutral-200',
    },
    {
      title: 'Gastos / Egresos del Mes',
      value: formatCurrency(monthExpense),
      subtitle: 'Salidas y pagos del mes',
      icon: TrendingDown,
      color: 'bg-rose-50 text-rose-800 border border-rose-200',
    },
    {
      title: 'Stock Total & Alertas',
      value: `${totalStockUnits} prendas`,
      subtitle: lowStockCount + outOfStockCount > 0 ? `${lowStockCount} bajos / ${outOfStockCount} agotados` : 'Stock en nivel óptimo',
      icon: lowStockCount + outOfStockCount > 0 ? AlertTriangle : Boxes,
      color: lowStockCount + outOfStockCount > 0
        ? 'bg-amber-50 text-amber-800 border border-amber-200'
        : 'bg-neutral-100 text-neutral-900 border border-neutral-200',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat, idx) => {
        const Icon = stat.icon;
        return (
          <Card key={idx} className="p-5 flex flex-col justify-between hover:shadow-xs transition-shadow bg-white">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold text-neutral-500">
                  {stat.title}
                </p>
                <h4 className="text-xl sm:text-2xl font-black text-neutral-900 mt-1.5 tracking-tight">
                  {stat.value}
                </h4>
              </div>
              <div className={`p-2.5 rounded-xl shrink-0 ${stat.color}`}>
                <Icon className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-neutral-200 flex items-center justify-between text-[11px] text-neutral-500 font-medium">
              <span>{stat.subtitle}</span>
              <ArrowUpRight className="w-3.5 h-3.5 text-neutral-400" />
            </div>
          </Card>
        );
      })}
    </div>
  );
}
