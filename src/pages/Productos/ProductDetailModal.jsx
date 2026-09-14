import { useState } from 'react';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { ProductVisualBadge, GarmentSpecsPills } from '../../components/common/ProductVisualBadge';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { calculateProfitability, getProductAging, getLastSaleInfo, calculateCostMetrics } from '../../utils/pricingUtils';
import { useProducts } from '../../hooks/useProducts';
import { useAuth } from '../../context/AuthContext';
import {
  Tag,
  Clock,
  TrendingUp,
  DollarSign,
  Calendar,
  AlertTriangle,
  History,
  Boxes,
  ArrowUpRight,
  ArrowDownRight,
  FileSpreadsheet,
  MapPin,
  Shirt,
  Info,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';

export function ProductDetailModal({ isOpen, onClose, product, onEdit, priceHistories = [], costHistories = [] }) {
  const { getProductPriceHistory, getProductCostHistory } = useProducts();
  const { can } = useAuth();
  const [activeTab, setActiveTab] = useState('PRECIOS'); // 'PRECIOS' | 'VARIANTES'

  if (!product) return null;

  const images = product.images || [];
  const currentPrice = Number(product.salePrice ?? product.price ?? 0);
  const currentCost = Number(product.costPrice ?? product.cost ?? 0);

  // Profitability
  const profit = calculateProfitability(currentCost, currentPrice);

  // Aging
  const aging = getProductAging(product);

  // Sales
  const lastSale = getLastSaleInfo(product);

  // Histories
  const pHist = priceHistories.length > 0 ? priceHistories : getProductPriceHistory(product.id) || [];
  const cHist = costHistories.length > 0 ? costHistories : getProductCostHistory(product.id) || [];

  // Cost metrics
  const costMetrics = calculateCostMetrics(cHist, currentCost);

  // Price chart data
  const chartData = [...pHist]
    .sort((a, b) => new Date(a.date || 0) - new Date(b.date || 0))
    .map((h) => ({
      date: formatDate(h.date, 'short'),
      precio: Number(h.newPrice || 0),
      motivo: h.reason || 'Cambio',
    }));

  // If no price history exists but current price is known, show at least current price point
  if (chartData.length === 0 && currentPrice > 0) {
    chartData.push({
      date: formatDate(product.priceLastUpdatedAt || product.createdAt || new Date(), 'short'),
      precio: currentPrice,
      motivo: 'Precio actual',
    });
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={product.name}
      subtitle={`SKU: ${product.sku || 'Sin SKU'} | Categoría: ${product.categoryName || 'General'} | Código: ${product.barcode || '-'}`}
      maxWidth="max-w-3xl"
    >
      <div className="space-y-5">
        {/* Ficha Visual y Reconocimiento de Prenda (Ideal para computadoras) */}
        <div className="p-4 rounded-2xl bg-neutral-50/90 border border-neutral-200 flex flex-col sm:flex-row gap-4 items-start">
          <div className="flex flex-col items-center gap-1.5 shrink-0">
            <ProductVisualBadge product={product} size="xl" className="shadow-2xs" />
            <span className="text-[10px] font-semibold text-neutral-500">
              {images.length > 0 ? `${images.length} foto(s)` : 'Sin foto cargada'}
            </span>
          </div>

          <div className="flex-1 min-w-0 space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-base font-black text-neutral-900 leading-tight">
                  {product.name}
                </h3>
                <p className="text-xs text-neutral-500">
                  Marca: <span className="font-semibold text-neutral-700">{product.brandName || 'General'}</span> • Categoría: <span className="font-semibold text-neutral-700">{product.categoryName || 'General'}</span>
                </p>
              </div>

              <Badge
                size="sm"
                variant={product.stock === 0 ? 'danger' : product.stock <= (product.stockMin || 5) ? 'warning' : 'success'}
              >
                {product.stock === 0 ? 'Agotado' : `${product.stock} en stock`}
              </Badge>
            </div>

            {/* Ficha de Reconocimiento Físico sin necesidad de foto */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
              <div className="p-2 rounded-xl bg-white border border-neutral-200">
                <span className="text-[10px] uppercase font-bold text-neutral-400 block">Ubicación</span>
                <span className="text-xs font-bold text-neutral-800 truncate block">
                  {product.location ? `📍 ${product.location}` : 'No asignada'}
                </span>
              </div>
              <div className="p-2 rounded-xl bg-white border border-neutral-200">
                <span className="text-[10px] uppercase font-bold text-neutral-400 block">Tela / Tejido</span>
                <span className="text-xs font-bold text-neutral-800 truncate block">
                  {product.fabric ? `🧵 ${product.fabric}` : 'Estándar'}
                </span>
              </div>
              <div className="p-2 rounded-xl bg-white border border-neutral-200">
                <span className="text-[10px] uppercase font-bold text-neutral-400 block">Corte / Estilo</span>
                <span className="text-xs font-bold text-neutral-800 truncate block">
                  {product.cutStyle || 'Clásico'}
                </span>
              </div>
              <div className="p-2 rounded-xl bg-white border border-neutral-200">
                <span className="text-[10px] uppercase font-bold text-neutral-400 block">Temporada</span>
                <span className="text-xs font-bold text-neutral-800 truncate block">
                  {product.season || 'Atemporal'}
                </span>
              </div>
            </div>

            {product.distinctiveDetails && (
              <p className="text-xs text-neutral-600 bg-white px-3 py-1.5 rounded-xl border border-neutral-200">
                <span className="font-bold text-neutral-800">Detalles:</span> {product.distinctiveDetails}
              </p>
            )}

            {/* Images Preview if available */}
            {images.length > 0 && (
              <div className="flex gap-2 overflow-x-auto pt-1">
                {images.map((img, i) => (
                  <img
                    key={i}
                    src={img}
                    alt={`${product.name} ${i + 1}`}
                    referrerPolicy="no-referrer"
                    className="w-14 h-14 rounded-xl object-cover border border-neutral-200 bg-neutral-100 shrink-0"
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-neutral-200 pb-2">
          <button
            type="button"
            onClick={() => setActiveTab('PRECIOS')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'PRECIOS'
                ? 'bg-neutral-900 text-white shadow-xs'
                : 'text-neutral-600 hover:text-neutral-900 bg-neutral-100'
            }`}
          >
            <DollarSign className="w-3.5 h-3.5" />
            Información de Precios e Historial
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('VARIANTES')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'VARIANTES'
                ? 'bg-neutral-900 text-white shadow-xs'
                : 'text-neutral-600 hover:text-neutral-900 bg-neutral-100'
            }`}
          >
            <Boxes className="w-3.5 h-3.5" />
            Variantes y Stock ({product.stock || 0} un.)
          </button>
        </div>

        {activeTab === 'PRECIOS' && (
          <div className="space-y-6">
            {/* SECCIÓN 1: INFORMACIÓN DE PRECIOS & ANTIGÜEDAD */}
            <div>
              <h3 className="text-xs font-black uppercase text-neutral-800 tracking-wider mb-3 flex items-center gap-2">
                <Tag className="w-4 h-4 text-neutral-700" />
                Información de Precios y Rendimiento
              </h3>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-xl bg-white border border-neutral-200 shadow-2xs">
                  <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Precio Actual</p>
                  <p className="text-lg font-black text-neutral-900 mt-0.5">
                    {currentPrice > 0 ? formatCurrency(currentPrice) : 'No registrado'}
                  </p>
                  <p className="text-[10px] text-neutral-500 mt-1">
                    Última act: {product.priceLastUpdatedAt ? formatDate(product.priceLastUpdatedAt, 'short') : 'Sin registro'}
                  </p>
                </div>

                {can('costs.view') ? (
                  <>
                    <div className="p-3.5 rounded-xl bg-white border border-neutral-200 shadow-2xs">
                      <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Costo Unitario</p>
                      <p className="text-lg font-black text-neutral-900 mt-0.5">
                        {currentCost > 0 ? formatCurrency(currentCost) : 'No registrado'}
                      </p>
                      <p className="text-[10px] text-neutral-500 mt-1">
                        {costMetrics.hasHistory ? `${costMetrics.costCount} registros` : 'Costo único'}
                      </p>
                    </div>

                    <div className="p-3.5 rounded-xl bg-white border border-neutral-200 shadow-2xs">
                      <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Ganancia / Margen</p>
                      {profit.isValid ? (
                        <>
                          <p className={`text-lg font-black mt-0.5 ${profit.isLoss ? 'text-rose-600' : 'text-emerald-700'}`}>
                            {formatCurrency(profit.profit)}
                          </p>
                          <p className="text-[10px] font-bold text-emerald-700 mt-1">
                            Margen: {profit.marginOnSales}% (Sobre costo: +{profit.markupOnCost}%)
                          </p>
                        </>
                      ) : (
                        <p className="text-xs font-bold text-neutral-400 mt-1">Sin información de costo</p>
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="p-3.5 rounded-xl bg-white border border-neutral-200 shadow-2xs">
                      <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Stock Disponible</p>
                      <p className="text-lg font-black text-neutral-900 mt-0.5">
                        {product.stock || 0} u.
                      </p>
                      <p className="text-[10px] text-neutral-500 mt-1">
                        Mínimo sugerido: {product.stockMin || 5} u.
                      </p>
                    </div>

                    <div className="p-3.5 rounded-xl bg-white border border-neutral-200 shadow-2xs">
                      <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Variantes y Talles</p>
                      <p className="text-lg font-black text-neutral-900 mt-0.5">
                        {product.variants?.length || 0} opciones
                      </p>
                      <p className="text-[10px] text-neutral-500 mt-1">
                        Ver pestaña 'Variantes'
                      </p>
                    </div>
                  </>
                )}

                <div className="p-3.5 rounded-xl bg-white border border-neutral-200 shadow-2xs">
                  <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Antigüedad en Stock</p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className={`inline-block w-2 h-2 rounded-full ${aging.status.dotClass}`} />
                    <span className="text-xs font-bold text-neutral-900">{aging.status.label}</span>
                  </div>
                  <p className="text-[11px] font-semibold text-neutral-600 mt-1">
                    {aging.daysInStock !== null ? `${aging.daysInStock} días` : 'Fecha no registrada'}
                  </p>
                </div>
              </div>

              {/* Secondary Details: Ingreso, Última Venta, Días sin Vender */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
                <div className="p-3 rounded-xl bg-neutral-50 border border-neutral-200 text-xs">
                  <span className="text-neutral-500 font-bold block mb-1">Fecha de Ingreso:</span>
                  <span className="font-bold text-neutral-800">
                    {aging.entryDate ? formatDate(aging.entryDate, 'full') : 'No registrada'}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-neutral-50 border border-neutral-200 text-xs">
                  <span className="text-neutral-500 font-bold block mb-1">Última Venta:</span>
                  <span className="font-bold text-neutral-800">
                    {lastSale.hasSales ? formatDate(lastSale.lastSaleDate, 'short') : 'Sin ventas registradas'}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-neutral-50 border border-neutral-200 text-xs">
                  <span className="text-neutral-500 font-bold block mb-1">Días sin Vender:</span>
                  <span className="font-bold text-neutral-800">
                    {lastSale.daysWithoutSales !== null ? `${lastSale.daysWithoutSales} días (${lastSale.formatted})` : 'Sin ventas'}
                  </span>
                </div>
              </div>
            </div>

            {/* SECCIÓN 2: HISTORIAL DE PRECIOS */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black uppercase text-neutral-800 tracking-wider flex items-center gap-2">
                  <History className="w-4 h-4 text-neutral-700" />
                  Historial de Precios ({pHist.length})
                </h3>
              </div>

              {/* Visual trend chart if multiple price updates */}
              {chartData.length > 1 && (
                <div className="p-3 rounded-xl bg-white border border-neutral-200 shadow-2xs h-40">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="#94a3b8" />
                      <YAxis tick={{ fontSize: 10 }} stroke="#94a3b8" />
                      <Tooltip
                        formatter={(val) => [formatCurrency(val), 'Precio']}
                        contentStyle={{ backgroundColor: '#18181b', color: '#fff', borderRadius: '8px', fontSize: '12px' }}
                      />
                      <Line type="monotone" dataKey="precio" stroke="#18181b" strokeWidth={2} dot={{ r: 4 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}

              {pHist.length > 0 ? (
                <div className="border border-neutral-200 rounded-xl overflow-hidden bg-white">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-neutral-50 text-neutral-600 font-bold border-b border-neutral-200">
                      <tr>
                        <th className="p-2.5">Fecha y Hora</th>
                        <th className="p-2.5">Precio Anterior</th>
                        <th className="p-2.5">Nuevo Precio</th>
                        <th className="p-2.5">Variación</th>
                        <th className="p-2.5">Motivo</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100">
                      {pHist.map((item, idx) => {
                        const prev = Number(item.previousPrice || 0);
                        const curr = Number(item.newPrice || 0);
                        const diff = curr - prev;
                        const diffPct = prev > 0 ? ((diff / prev) * 100).toFixed(1) : null;

                        return (
                          <tr key={item.id || idx} className="hover:bg-neutral-50">
                            <td className="p-2.5 font-bold text-neutral-800">
                              {formatDate(item.date, 'short')} {item.time ? `• ${item.time}` : ''}
                            </td>
                            <td className="p-2.5 text-neutral-600 font-medium">
                              {prev > 0 ? formatCurrency(prev) : '-'}
                            </td>
                            <td className="p-2.5 font-black text-neutral-900">
                              {formatCurrency(curr)}
                            </td>
                            <td className="p-2.5 font-bold">
                              {prev > 0 ? (
                                <span className={`inline-flex items-center gap-0.5 ${diff >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                                  {diff >= 0 ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                                  {diff >= 0 ? `+${diffPct}%` : `${diffPct}%`}
                                </span>
                              ) : (
                                <span className="text-neutral-400">Inicial</span>
                              )}
                            </td>
                            <td className="p-2.5 text-neutral-600 italic">
                              {item.reason || 'Actualización'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-200 text-center text-xs text-neutral-500">
                  Sin historial de cambios de precio registrado para este producto.
                </div>
              )}
            </div>

            {/* SECCIÓN 3: HISTORIAL DE COSTOS (SOLO DUEÑA / ADMIN) */}
            {can('costs.view') && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black uppercase text-neutral-800 tracking-wider flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-neutral-700" />
                    Historial de Costos ({cHist.length})
                  </h3>
                  {costMetrics.avgCost && (
                    <span className="text-[11px] font-bold text-neutral-600">
                      Promedio: {formatCurrency(costMetrics.avgCost)} | Mín: {formatCurrency(costMetrics.minCost)} | Máx: {formatCurrency(costMetrics.maxCost)}
                    </span>
                  )}
                </div>

                {cHist.length > 0 ? (
                  <div className="border border-neutral-200 rounded-xl overflow-hidden bg-white">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-neutral-50 text-neutral-600 font-bold border-b border-neutral-200">
                        <tr>
                          <th className="p-2.5">Fecha</th>
                          <th className="p-2.5">Costo Unitario</th>
                          <th className="p-2.5">Proveedor</th>
                          <th className="p-2.5">Cantidad</th>
                          <th className="p-2.5">Motivo / Ref</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-100">
                        {cHist.map((item, idx) => (
                          <tr key={item.id || idx} className="hover:bg-neutral-50">
                            <td className="p-2.5 font-bold text-neutral-800">
                              {formatDate(item.date, 'short')} {item.time ? `• ${item.time}` : ''}
                            </td>
                            <td className="p-2.5 font-black text-neutral-900">
                              {formatCurrency(item.cost)}
                            </td>
                            <td className="p-2.5 text-neutral-700 font-medium">
                              {item.supplierName || 'Proveedor no registrado'}
                            </td>
                            <td className="p-2.5 text-neutral-800 font-bold">
                              {item.quantity || 1} un.
                            </td>
                            <td className="p-2.5 text-neutral-600 italic">
                              {item.reason || item.purchaseNumber || 'Ingreso de compra'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-200 text-center text-xs text-neutral-500">
                    {currentCost > 0
                      ? `Costo registrado actual: ${formatCurrency(currentCost)} (sin historial de compras previas registrado)`
                      : 'No hay costos registrados para este producto.'}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'VARIANTES' && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-bold text-neutral-800 uppercase tracking-wider">
                Desglose de Variantes y Stock ({product.variants?.length || 0} combinaciones)
              </h4>
              <span className="text-xs font-black text-neutral-900">
                Total: {product.stock || 0} unidades
              </span>
            </div>

            <div className="border border-neutral-200 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-neutral-50 text-neutral-600 font-bold border-b border-neutral-200">
                  <tr>
                    <th className="p-2.5">Color</th>
                    <th className="p-2.5">Talle</th>
                    <th className="p-2.5">SKU Variante</th>
                    <th className="p-2.5 text-right">Stock</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {product.variants?.filter((v) => v && typeof v === 'object').map((v, idx) => (
                    <tr key={idx} className="hover:bg-neutral-50">
                      <td className="p-2.5 font-semibold text-neutral-800 flex items-center gap-2">
                        <span
                          className="w-3.5 h-3.5 rounded-full border border-neutral-300"
                          style={{ background: v.colorHex || '#111827' }}
                        />
                        {v.color || 'Único'}
                      </td>
                      <td className="p-2.5 font-bold text-neutral-900">{v.size || '-'}</td>
                      <td className="p-2.5 text-neutral-500 font-mono text-[11px]">
                        {v.sku || '-'}
                      </td>
                      <td className="p-2.5 text-right font-black">
                        <span
                          className={
                            (v.stock ?? 0) <= 2
                              ? 'text-rose-600 font-bold'
                              : 'text-neutral-900 font-bold'
                          }
                        >
                          {v.stock ?? 0}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex justify-end gap-3 pt-3 border-t border-neutral-100">
          <Button variant="outline" size="sm" onClick={onClose}>
            Cerrar
          </Button>
          {onEdit && can('products.edit') && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                onClose();
                onEdit(product);
              }}
            >
              Editar Producto
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}


