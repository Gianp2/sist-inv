import { useState, useMemo } from 'react';
import { useCashRegister } from '../../context/CashContext';
import { useProducts } from '../../hooks/useProducts';
import { useSettings } from '../../hooks/useSettingsAndUsers';
import { useAuth } from '../../hooks/useAuth';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { exportToExcel, generateMonthlyReportPDF } from '../../utils/exportUtils';
import { Card, CardHeader } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
  Legend,
} from 'recharts';
import {
  FileText,
  Download,
  TrendingUp,
  TrendingDown,
  CircleDollarSign,
  Boxes,
  AlertTriangle,
  Calendar,
  Filter,
  CheckCircle2,
  ChevronDown,
  ArrowUpRight,
  ArrowDownRight,
  FileSpreadsheet,
  Layers,
  Search,
} from 'lucide-react';
import { toast } from 'sonner';

const COLORS = ['#111827', '#10B981', '#6366F1', '#F59E0B', '#EC4899', '#8B5CF6', '#14B8A6'];

const MONTHS = [
  { value: 0, label: 'Enero' },
  { value: 1, label: 'Febrero' },
  { value: 2, label: 'Marzo' },
  { value: 3, label: 'Abril' },
  { value: 4, label: 'Mayo' },
  { value: 5, label: 'Junio' },
  { value: 6, label: 'Julio' },
  { value: 7, label: 'Agosto' },
  { value: 8, label: 'Septiembre' },
  { value: 9, label: 'Octubre' },
  { value: 10, label: 'Noviembre' },
  { value: 11, label: 'Diciembre' },
];

export function ReportesPage() {
  const { allMovements, loading: cashLoading } = useCashRegister();
  const { products, loading: productsLoading } = useProducts();
  const { settings } = useSettings();
  const { user } = useAuth();

  // Active Month & Year selector for Monthly Reports
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth());
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
  const [activeTab, setActiveTab] = useState('RESUMEN'); // 'RESUMEN' | 'CAJA' | 'STOCK_CRITICO'
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [cashSearchTerm, setCashSearchTerm] = useState('');
  const [stockSearchTerm, setStockSearchTerm] = useState('');

  // Years options (Current year and past 3 years)
  const yearOptions = useMemo(() => {
    const current = new Date().getFullYear();
    return [current, current - 1, current - 2, current - 3];
  }, []);

  // Filter movements by selected Month and Year
  const monthlyMovements = useMemo(() => {
    return (allMovements || []).filter((m) => {
      if (!m.date) return false;
      const d = new Date(m.date);
      return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear;
    });
  }, [allMovements, selectedMonth, selectedYear]);

  // Cash Metrics for selected month
  const { totalIncome, totalExpense, netBalance, incomeCount, expenseCount } = useMemo(() => {
    let income = 0;
    let expense = 0;
    let inCount = 0;
    let exCount = 0;

    monthlyMovements.forEach((m) => {
      const amount = Number(m.amount) || 0;
      const type = (m.type || '').toUpperCase();
      if (['INGRESO', 'VENTA', 'APERTURA_CAJA'].includes(type)) {
        income += amount;
        inCount++;
      } else if (['EGRESO', 'RETIRO', 'GASTO', 'COMPRA', 'DEVOLUCION'].includes(type)) {
        expense += amount;
        exCount++;
      }
    });

    return {
      totalIncome: income,
      totalExpense: expense,
      netBalance: income - expense,
      incomeCount: inCount,
      expenseCount: exCount,
    };
  }, [monthlyMovements]);

  // Critical Stock calculation
  const { criticalProducts, outOfStockProducts, lowStockProducts, totalRestockCost } = useMemo(() => {
    const critical = (products || []).filter((p) => {
      const stock = Number(p.stock) || 0;
      const min = Number(p.stockMin !== undefined && p.stockMin !== null ? p.stockMin : 5);
      return stock <= min;
    }).map((p) => {
      const stock = Number(p.stock) || 0;
      const min = Number(p.stockMin !== undefined && p.stockMin !== null ? p.stockMin : 5);
      const deficit = Math.max(0, min - stock);
      const cost = Number(p.costPrice) || 0;
      const restockCost = deficit * cost;
      const isOut = stock === 0;

      // Variants out of stock
      const criticalVariants = (p.variants || [])
        .filter((v) => (Number(v.stock) || 0) <= 1)
        .map((v) => `${v.size || ''}${v.color ? `/${v.color}` : ''} (${v.stock || 0})`)
        .slice(0, 3)
        .join(', ');

      return {
        ...p,
        currentStock: stock,
        stockMin: min,
        deficit,
        restockCost,
        isOut,
        criticalVariants: criticalVariants || 'Todas',
      };
    });

    critical.sort((a, b) => {
      if (a.currentStock !== b.currentStock) return a.currentStock - b.currentStock;
      return b.deficit - a.deficit;
    });

    const outOfStock = critical.filter((p) => p.currentStock === 0);
    const lowStock = critical.filter((p) => p.currentStock > 0);
    const restockSum = critical.reduce((acc, p) => acc + p.restockCost, 0);

    return {
      criticalProducts: critical,
      outOfStockProducts: outOfStock,
      lowStockProducts: lowStock,
      totalRestockCost: restockSum,
    };
  }, [products]);

  // Incomes by Payment Method
  const paymentData = useMemo(() => {
    const map = {};
    monthlyMovements
      .filter((m) => ['INGRESO', 'VENTA'].includes(m.type))
      .forEach((m) => {
        const method = (m.paymentMethod || 'EFECTIVO').toUpperCase();
        map[method] = (map[method] || 0) + (Number(m.amount) || 0);
      });

    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [monthlyMovements]);

  // Incomes vs Expenses by Day of Month
  const dailyFlowData = useMemo(() => {
    const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
    const daysMap = {};
    for (let i = 1; i <= daysInMonth; i++) {
      daysMap[i] = { day: `Día ${i}`, Ingresos: 0, Egresos: 0 };
    }

    monthlyMovements.forEach((m) => {
      if (!m.date) return;
      const d = new Date(m.date);
      const day = d.getDate();
      const amount = Number(m.amount) || 0;
      const type = (m.type || '').toUpperCase();
      if (daysMap[day]) {
        if (['INGRESO', 'VENTA', 'APERTURA_CAJA'].includes(type)) {
          daysMap[day].Ingresos += amount;
        } else if (['EGRESO', 'RETIRO', 'GASTO', 'COMPRA', 'DEVOLUCION'].includes(type)) {
          daysMap[day].Egresos += amount;
        }
      }
    });

    return Object.values(daysMap);
  }, [monthlyMovements, selectedMonth, selectedYear]);

  // General Inventory Metrics
  const totalStockUnits = useMemo(() => products.reduce((acc, p) => acc + (p.stock || 0), 0), [products]);
  const totalInventoryValue = useMemo(() => products.reduce((acc, p) => acc + ((p.costPrice || 0) * (p.stock || 0)), 0), [products]);

  // Filtered lists for table search
  const displayedCashMovements = useMemo(() => {
    if (!cashSearchTerm.trim()) return monthlyMovements;
    const term = cashSearchTerm.toLowerCase();
    return monthlyMovements.filter((m) =>
      m.description?.toLowerCase().includes(term) ||
      m.category?.toLowerCase().includes(term) ||
      m.type?.toLowerCase().includes(term) ||
      m.paymentMethod?.toLowerCase().includes(term)
    );
  }, [monthlyMovements, cashSearchTerm]);

  const displayedCriticalProducts = useMemo(() => {
    if (!stockSearchTerm.trim()) return criticalProducts;
    const term = stockSearchTerm.toLowerCase();
    return criticalProducts.filter((p) =>
      p.name?.toLowerCase().includes(term) ||
      p.sku?.toLowerCase().includes(term) ||
      p.categoryName?.toLowerCase().includes(term) ||
      p.brandName?.toLowerCase().includes(term)
    );
  }, [criticalProducts, stockSearchTerm]);

  // ==========================================
  // HANDLERS FOR PDF & EXCEL GENERATION
  // ==========================================
  const handleGeneratePDF = async (reportType = 'FULL') => {
    setIsGeneratingPDF(true);
    try {
      const monthLabel = MONTHS.find((m) => m.value === selectedMonth)?.label || 'Mes';
      toast.loading(`Generando reporte PDF de ${monthLabel} ${selectedYear}...`, { id: 'pdf-toast' });

      await new Promise((resolve) => setTimeout(resolve, 300)); // Small yield for UI smoothness

      const result = generateMonthlyReportPDF({
        month: selectedMonth,
        year: selectedYear,
        cashMovements: allMovements,
        products,
        businessInfo: settings,
        userName: user?.name || user?.displayName || 'Administrador',
        reportType,
      });

      toast.success(`Reporte PDF descargado: ${result.filename}`, { id: 'pdf-toast' });
    } catch (error) {
      console.error('Error al generar PDF:', error);
      toast.error('Ocurrió un error al generar el reporte en PDF', { id: 'pdf-toast' });
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const handleExportCashExcel = () => {
    const monthLabel = MONTHS.find((m) => m.value === selectedMonth)?.label || 'Mes';
    const data = monthlyMovements.map((m) => ({
      Fecha: formatDate(m.date, 'full'),
      Tipo: m.type,
      Categoría: m.category || '-',
      Detalle: m.description,
      Método_Pago: m.paymentMethod || 'EFECTIVO',
      Usuario: m.user,
      Monto: m.amount,
    }));
    exportToExcel(data, `Reporte_Caja_${monthLabel}_${selectedYear}.xlsx`, 'Movimientos');
    toast.success('Excel de movimientos de caja exportado exitosamente');
  };

  const handleExportCriticalStockExcel = () => {
    const monthLabel = MONTHS.find((m) => m.value === selectedMonth)?.label || 'Mes';
    const data = criticalProducts.map((p) => ({
      SKU: p.sku || '-',
      Prenda: p.name,
      Categoría: p.categoryName || '-',
      Marca: p.brandName || '-',
      Stock_Actual: p.currentStock,
      Stock_Mínimo: p.stockMin,
      Faltante: p.deficit,
      Costo_Unitario: p.costPrice,
      Inversión_Reposición: p.restockCost,
      Estado: p.currentStock === 0 ? 'AGOTADO' : 'BAJO STOCK',
      Talles_Críticos: p.criticalVariants,
    }));
    exportToExcel(data, `Reporte_Stock_Critico_${monthLabel}_${selectedYear}.xlsx`, 'Stock_Critico');
    toast.success('Excel de stock crítico exportado exitosamente');
  };

  const activeMonthLabel = MONTHS.find((m) => m.value === selectedMonth)?.label || 'Mes';

  return (
    <div className="space-y-6">
      {/* Header & Period Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-neutral-900 tracking-tight flex items-center gap-2.5">
            <FileText className="w-7 h-7 text-neutral-900" />
            Reportes Mensuales en PDF y Análisis
          </h1>
          <p className="text-xs text-neutral-500 mt-0.5">
            Generación de reportes ejecutivos de caja (ingresos vs egresos) y auditoría de stock crítico por mes
          </p>
        </div>

        {/* Month & Year Selectors Bar */}
        <div className="card-panel flex flex-wrap items-center gap-2 p-1.5 rounded-2xl bg-white border border-neutral-200 shadow-xs">
          <div className="flex items-center gap-1.5 px-2 text-xs font-bold text-neutral-600">
            <Calendar className="w-4 h-4 text-neutral-500" />
            <span>Período:</span>
          </div>

          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(Number(e.target.value))}
            className="bg-neutral-50 border border-neutral-300 hover:border-neutral-400 rounded-xl px-3 py-1.5 text-xs font-bold text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900 cursor-pointer"
          >
            {MONTHS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>

          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="bg-neutral-50 border border-neutral-300 hover:border-neutral-400 rounded-xl px-3 py-1.5 text-xs font-bold text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900 cursor-pointer"
          >
            {yearOptions.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* PDF Generation Action Banner */}
      <div className="p-5 sm:p-6 rounded-2xl bg-neutral-900 text-white shadow-md relative overflow-hidden">
        {/* Subtle background graphic */}
        <div className="absolute right-0 top-0 bottom-0 opacity-5 pointer-events-none flex items-center pr-6">
          <FileText className="w-64 h-64" />
        </div>

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="space-y-1.5 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-neutral-800 border border-neutral-700 text-[11px] font-bold text-neutral-300 tracking-wide">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              REPORTE EJECUTIVO MENSUAL
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
              Informe Oficial: {activeMonthLabel} {selectedYear}
            </h2>
            <p className="text-xs text-neutral-300 leading-relaxed">
              Exporta un documento PDF estructurado que consolida los movimientos de caja (ingresos vs egresos),
              el balance neto, y el listado de prendas en stock crítico con cálculo de reposición e inversión estimada.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => handleGeneratePDF('FULL')}
              disabled={isGeneratingPDF}
              className="px-4 py-2.5 rounded-xl bg-white text-neutral-950 font-bold text-xs flex items-center gap-2 hover:bg-neutral-100 active:scale-95 transition-all shadow-sm cursor-pointer disabled:opacity-50"
            >
              <Download className="w-4 h-4 text-neutral-900" />
              {isGeneratingPDF ? 'Generando PDF...' : 'Descargar Reporte PDF Completo'}
            </button>

            <button
              onClick={() => handleGeneratePDF('CASH_ONLY')}
              disabled={isGeneratingPDF}
              className="px-3.5 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white font-bold text-xs flex items-center gap-1.5 transition-colors border border-neutral-700 cursor-pointer disabled:opacity-50"
              title="Descargar solo la sección de ingresos vs egresos de caja"
            >
              <FileText className="w-3.5 h-3.5 text-neutral-300" />
              PDF Solo Caja
            </button>

            <button
              onClick={() => handleGeneratePDF('STOCK_ONLY')}
              disabled={isGeneratingPDF}
              className="px-3.5 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white font-bold text-xs flex items-center gap-1.5 transition-colors border border-neutral-700 cursor-pointer disabled:opacity-50"
              title="Descargar solo la auditoría de stock crítico y reposición"
            >
              <Boxes className="w-3.5 h-3.5 text-neutral-300" />
              PDF Stock Crítico
            </button>
          </div>
        </div>
      </div>

      {/* Monthly KPI Overview Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Incomes */}
        <Card className="p-5 border-neutral-200 shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold text-neutral-500">Ingresos ({activeMonthLabel})</p>
              <h3 className="text-2xl font-black text-emerald-600 mt-1 tracking-tight">
                +{formatCurrency(totalIncome)}
              </h3>
            </div>
            <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-100">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between text-[11px] text-neutral-500 border-t border-neutral-100 pt-2">
            <span>{incomeCount} entradas registradas</span>
            <span className="font-semibold text-emerald-700">Ventas & Caja</span>
          </div>
        </Card>

        {/* Total Expenses */}
        <Card className="p-5 border-neutral-200 shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold text-neutral-500">Egresos ({activeMonthLabel})</p>
              <h3 className="text-2xl font-black text-rose-600 mt-1 tracking-tight">
                -{formatCurrency(totalExpense)}
              </h3>
            </div>
            <div className="p-2.5 rounded-xl bg-rose-50 text-rose-700 border border-rose-100">
              <TrendingDown className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between text-[11px] text-neutral-500 border-t border-neutral-100 pt-2">
            <span>{expenseCount} egresos contabilizados</span>
            <span className="font-semibold text-rose-700">Gastos & Compras</span>
          </div>
        </Card>

        {/* Net Cash Balance */}
        <Card className="p-5 border-neutral-200 shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold text-neutral-500">Balance Neto Mensual</p>
              <h3
                className={`text-2xl font-black mt-1 tracking-tight ${
                  netBalance >= 0 ? 'text-neutral-900' : 'text-rose-600'
                }`}
              >
                {formatCurrency(netBalance)}
              </h3>
            </div>
            <div
              className={`p-2.5 rounded-xl border ${
                netBalance >= 0
                  ? 'bg-neutral-100 text-neutral-900 border-neutral-200'
                  : 'bg-rose-50 text-rose-700 border-rose-100'
              }`}
            >
              <CircleDollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between text-[11px] text-neutral-500 border-t border-neutral-100 pt-2">
            <span>Ingresos - Egresos</span>
            <span
              className={`font-bold px-1.5 py-0.5 rounded text-[10px] ${
                netBalance >= 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
              }`}
            >
              {netBalance >= 0 ? 'Superávit' : 'Déficit'}
            </span>
          </div>
        </Card>

        {/* Critical Stock KPI */}
        <Card className="p-5 border-neutral-200 shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold text-neutral-500">Stock Crítico por Mes</p>
              <h3 className="text-2xl font-black text-neutral-900 mt-1 tracking-tight flex items-center gap-2">
                {criticalProducts.length}
                <span className="text-xs font-bold text-neutral-400">prendas</span>
              </h3>
            </div>
            <div
              className={`p-2.5 rounded-xl border ${
                criticalProducts.length > 0
                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                  : 'bg-emerald-50 text-emerald-700 border-emerald-200'
              }`}
            >
              {criticalProducts.length > 0 ? (
                <AlertTriangle className="w-5 h-5 text-amber-600" />
              ) : (
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              )}
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between text-[11px] text-neutral-500 border-t border-neutral-100 pt-2">
            <span className="text-rose-600 font-bold">{outOfStockProducts.length} agotadas</span>
            <span className="text-amber-700 font-bold">{lowStockProducts.length} bajo mínimo</span>
          </div>
        </Card>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-neutral-200">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('RESUMEN')}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'RESUMEN'
                ? 'border-neutral-900 text-neutral-900'
                : 'border-transparent text-neutral-500 hover:text-neutral-900'
            }`}
          >
            <Layers className="w-4 h-4" />
            Gráficos & Balance del Mes
          </button>

          <button
            onClick={() => setActiveTab('CAJA')}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'CAJA'
                ? 'border-neutral-900 text-neutral-900'
                : 'border-transparent text-neutral-500 hover:text-neutral-900'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            Movimientos de Caja ({monthlyMovements.length})
          </button>

          <button
            onClick={() => setActiveTab('STOCK_CRITICO')}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'STOCK_CRITICO'
                ? 'border-neutral-900 text-neutral-900'
                : 'border-transparent text-neutral-500 hover:text-neutral-900'
            }`}
          >
            <AlertTriangle className="w-4 h-4" />
            Stock Crítico a Reponer ({criticalProducts.length})
          </button>
        </div>
      </div>

      {/* TAB 1: RESUMEN Y GRÁFICOS */}
      {activeTab === 'RESUMEN' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Daily Incomes vs Expenses Chart */}
            <Card className="p-5">
              <CardHeader
                title={`Flujo Diario: Ingresos vs Egresos (${activeMonthLabel} ${selectedYear})`}
                subtitle="Comparación del dinero entrante y saliente por día"
              />
              <div className="h-72 mt-3">
                {monthlyMovements.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dailyFlowData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                      <XAxis dataKey="day" tick={{ fontSize: 9, fill: '#6B7280' }} />
                      <YAxis tick={{ fontSize: 10, fill: '#6B7280' }} />
                      <Tooltip
                        formatter={(val) => [formatCurrency(val), '']}
                        contentStyle={{ borderRadius: '12px', border: '1px solid #E5E7EB', fontSize: '12px' }}
                      />
                      <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }} />
                      <Bar dataKey="Ingresos" fill="#10B981" radius={[3, 3, 0, 0]} />
                      <Bar dataKey="Egresos" fill="#E11D48" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-xs text-neutral-400">
                    No hay movimientos registrados en {activeMonthLabel} {selectedYear}
                  </div>
                )}
              </div>
            </Card>

            {/* Income by Payment Method */}
            <Card className="p-5">
              <CardHeader
                title="Ingresos por Método de Pago"
                subtitle="Distribución entre Efectivo, Transferencia, Débito y Crédito"
              />
              <div className="h-72 mt-3">
                {paymentData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={paymentData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={85}
                        paddingAngle={4}
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        labelLine={false}
                      >
                        {paymentData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(val) => [formatCurrency(val), 'Total']} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-xs text-neutral-400">
                    Sin ingresos registrados en este mes
                  </div>
                )}
              </div>
            </Card>
          </div>

          {/* Quick Reposition Budget Box */}
          <div className="card-panel p-5 rounded-2xl bg-white border border-neutral-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="p-3 rounded-xl bg-amber-50 text-amber-700 border border-amber-200">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-neutral-900">
                  Presupuesto Estimado de Reposición ({activeMonthLabel})
                </h4>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Se requieren{' '}
                  <strong className="text-neutral-900">
                    {criticalProducts.reduce((acc, p) => acc + p.deficit, 0)} unidades
                  </strong>{' '}
                  para devolver las {criticalProducts.length} prendas críticas al stock mínimo de seguridad.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4 self-end sm:self-auto">
              <div className="text-right">
                <p className="text-[11px] font-semibold text-neutral-400 uppercase">Inversión Estimada</p>
                <p className="text-xl font-black text-neutral-900">{formatCurrency(totalRestockCost)}</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                leftIcon={FileText}
                onClick={() => handleGeneratePDF('STOCK_ONLY')}
              >
                PDF de Reposición
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: MOVIMIENTOS DE CAJA (INGRESOS VS EGRESOS) */}
      {activeTab === 'CAJA' && (
        <div className="card-panel bg-white border border-neutral-200 rounded-2xl shadow-xs overflow-hidden">
          {/* Controls Bar */}
          <div className="p-4 border-b border-neutral-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-neutral-50/50">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar por concepto, categoría o tipo..."
                value={cashSearchTerm}
                onChange={(e) => setCashSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3.5 py-1.5 text-xs rounded-xl border border-neutral-300 bg-white text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900"
              />
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                leftIcon={FileSpreadsheet}
                onClick={handleExportCashExcel}
              >
                Exportar Excel
              </Button>
              <Button
                variant="default"
                size="sm"
                leftIcon={FileText}
                onClick={() => handleGeneratePDF('CASH_ONLY')}
              >
                Descargar PDF Caja
              </Button>
            </div>
          </div>

          {/* Movements Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-neutral-600">
              <thead className="bg-neutral-50 text-[11px] font-bold text-neutral-700 uppercase tracking-wider border-b border-neutral-200">
                <tr>
                  <th className="p-3.5">Fecha y Hora</th>
                  <th className="p-3.5">Tipo</th>
                  <th className="p-3.5">Categoría</th>
                  <th className="p-3.5">Detalle / Concepto</th>
                  <th className="p-3.5">Medio de Pago</th>
                  <th className="p-3.5">Usuario</th>
                  <th className="p-3.5 text-right">Monto</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {displayedCashMovements.length > 0 ? (
                  displayedCashMovements.map((m) => {
                    const isIncome = ['INGRESO', 'VENTA', 'APERTURA_CAJA'].includes((m.type || '').toUpperCase());
                    return (
                      <tr key={m.id} className="hover:bg-neutral-50/80 transition-colors">
                        <td className="p-3.5 text-neutral-900 font-medium whitespace-nowrap">
                          {formatDate(m.date, 'full')}
                        </td>
                        <td className="p-3.5">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                              isIncome
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-rose-50 text-rose-700 border border-rose-200'
                            }`}
                          >
                            {isIncome ? (
                              <ArrowUpRight className="w-3 h-3" />
                            ) : (
                              <ArrowDownRight className="w-3 h-3" />
                            )}
                            {m.type}
                          </span>
                        </td>
                        <td className="p-3.5">{m.category || (isIncome ? 'Venta Mostrador' : 'Gasto')}</td>
                        <td className="p-3.5 text-neutral-900 font-medium">{m.description || '-'}</td>
                        <td className="p-3.5">
                          <span className="px-2 py-0.5 rounded bg-neutral-100 text-neutral-800 text-[10px] font-semibold">
                            {m.paymentMethod || 'Efectivo'}
                          </span>
                        </td>
                        <td className="p-3.5 text-neutral-500">{m.user || '-'}</td>
                        <td
                          className={`p-3.5 text-right font-black text-sm whitespace-nowrap ${
                            isIncome ? 'text-emerald-600' : 'text-rose-600'
                          }`}
                        >
                          {isIncome ? '+' : '-'} {formatCurrency(m.amount)}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-xs text-neutral-400">
                      No se encontraron movimientos para los filtros seleccionados
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: STOCK CRÍTICO */}
      {activeTab === 'STOCK_CRITICO' && (
        <div className="card-panel bg-white border border-neutral-200 rounded-2xl shadow-xs overflow-hidden">
          {/* Controls Bar */}
          <div className="p-4 border-b border-neutral-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-neutral-50/50">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar prenda crítica por nombre, SKU o categoría..."
                value={stockSearchTerm}
                onChange={(e) => setStockSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3.5 py-1.5 text-xs rounded-xl border border-neutral-300 bg-white text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900"
              />
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                leftIcon={FileSpreadsheet}
                onClick={handleExportCriticalStockExcel}
              >
                Exportar Excel
              </Button>
              <Button
                variant="default"
                size="sm"
                leftIcon={FileText}
                onClick={() => handleGeneratePDF('STOCK_ONLY')}
              >
                Descargar PDF Stock
              </Button>
            </div>
          </div>

          {/* Critical Products Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-neutral-600">
              <thead className="bg-neutral-50 text-[11px] font-bold text-neutral-700 uppercase tracking-wider border-b border-neutral-200">
                <tr>
                  <th className="p-3.5">SKU / Código</th>
                  <th className="p-3.5">Prenda / Artículo</th>
                  <th className="p-3.5">Categoría / Marca</th>
                  <th className="p-3.5">Talles Afectados</th>
                  <th className="p-3.5 text-center">Stock Actual</th>
                  <th className="p-3.5 text-center">Stock Mín.</th>
                  <th className="p-3.5 text-center">Estado</th>
                  <th className="p-3.5 text-center">Faltante</th>
                  <th className="p-3.5 text-right">Inversión Reposición</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {displayedCriticalProducts.length > 0 ? (
                  displayedCriticalProducts.map((p) => (
                    <tr key={p.id} className="hover:bg-neutral-50/80 transition-colors">
                      <td className="p-3.5 font-mono text-[11px] text-neutral-500 font-bold">{p.sku || '-'}</td>
                      <td className="p-3.5">
                        <span className="font-bold text-neutral-900 block">{p.name}</span>
                        {p.barcode && <span className="text-[10px] text-neutral-400">CB: {p.barcode}</span>}
                      </td>
                      <td className="p-3.5">
                        <span className="text-neutral-900 font-medium">{p.categoryName || '-'}</span>
                        {p.brandName && <span className="text-[11px] text-neutral-400 block">{p.brandName}</span>}
                      </td>
                      <td className="p-3.5 text-[11px] text-neutral-600 font-medium">{p.criticalVariants}</td>
                      <td className="p-3.5 text-center">
                        <span
                          className={`font-black text-sm ${
                            p.currentStock === 0 ? 'text-rose-600' : 'text-amber-600'
                          }`}
                        >
                          {p.currentStock}
                        </span>
                      </td>
                      <td className="p-3.5 text-center font-semibold text-neutral-500">{p.stockMin}</td>
                      <td className="p-3.5 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-black ${
                            p.currentStock === 0
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {p.currentStock === 0 ? 'AGOTADO' : 'BAJO STOCK'}
                        </span>
                      </td>
                      <td className="p-3.5 text-center font-bold text-neutral-800">{p.deficit} u.</td>
                      <td className="p-3.5 text-right font-black text-neutral-900">
                        {formatCurrency(p.restockCost)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-xs text-neutral-400">
                      ¡Excelente! No hay prendas en estado de stock crítico
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
