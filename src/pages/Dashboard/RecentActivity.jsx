import { formatDate, formatCurrency } from '../../utils/formatters';
import { Card, CardHeader } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { ArrowUpRight, ArrowDownRight, CircleDollarSign, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function RecentActivity({ movements = [], lowStockProducts = [] }) {
  const navigate = useNavigate();
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Latest Cash Movements */}
      <Card className="p-5">
        <CardHeader
          title="Últimos Movimientos de Caja"
          subtitle="Ingresos y salidas recientes"
        />
        <div className="space-y-3 mt-3">
          {(movements || []).slice(0, 5).map((m) => {
            const isPositive = m.type === 'INGRESO' || m.type === 'VENTA' || m.type === 'APERTURA_CAJA';
            return (
              <div
                key={m.id}
                className="flex items-center justify-between p-3 rounded-xl bg-white border border-neutral-200 shadow-2xs"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                      isPositive
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-rose-100 text-rose-700'
                    }`}
                  >
                    {isPositive ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-neutral-900">
                      {m.category || m.description || 'Movimiento'}
                    </p>
                    <p className="text-[10px] text-neutral-500 font-medium">
                      {m.user || 'Admin'} • {formatDate(m.date, 'time')}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p
                    className={`text-xs font-black ${
                      isPositive ? 'text-emerald-600' : 'text-rose-600'
                    }`}
                  >
                    {isPositive ? '+' : '-'}
                    {formatCurrency(m.amount)}
                  </p>
                  <Badge size="sm" variant={isPositive ? 'success' : 'danger'}>
                    {m.paymentMethod || 'Efectivo'}
                  </Badge>
                </div>
              </div>
            );
          })}
          {movements.length === 0 && (
            <p className="text-xs text-neutral-400 text-center py-6">
              No hay movimientos de caja registrados aún
            </p>
          )}
        </div>
      </Card>

      {/* Low Stock Alerts */}
      <Card className="p-5">
        <CardHeader
          title="Control de Stock Crítico"
          subtitle="Prendas con inventario bajo o sin existencias"
        />
        <div className="space-y-3 mt-3">
          {(lowStockProducts || []).slice(0, 5).map((prod) => (
            <div
              key={prod.id}
              onClick={() => navigate('/stock')}
              className="flex items-center justify-between p-3 rounded-xl bg-white border border-neutral-200 shadow-2xs hover:border-neutral-400 hover:shadow-xs transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-3">
                <img
                  src={prod.images?.[0] || 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=100&q=80'}
                  alt={prod.name}
                  className="w-10 h-10 rounded-lg object-cover bg-neutral-200"
                />
                <div>
                  <p className="text-xs font-bold text-neutral-900 group-hover:text-neutral-950 truncate max-w-[180px]">
                    {prod.name}
                  </p>
                  <p className="text-[10px] text-neutral-500 font-medium">
                    SKU: {prod.sku} • Mínimo: {prod.stockMin || 5}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge size="sm" variant={prod.stock === 0 ? 'danger' : 'warning'}>
                  {prod.stock === 0 ? 'Agotado' : `${prod.stock} un.`}
                </Badge>
              </div>
            </div>
          ))}
          {lowStockProducts.length === 0 && (
            <p className="text-xs text-neutral-500 text-center py-6 font-medium">
              ✓ Sin alertas de stock crítico
            </p>
          )}
        </div>
      </Card>
    </div>
  );
}
