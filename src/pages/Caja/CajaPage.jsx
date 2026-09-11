import { useState, useMemo } from 'react';
import { useCashRegister } from '../../context/CashContext';
import { useAuth } from '../../hooks/useAuth';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { exportToExcel, generateMonthlyReportPDF } from '../../utils/exportUtils';
import { useSettings } from '../../hooks/useSettingsAndUsers';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Modal } from '../../components/ui/Modal';
import { Badge } from '../../components/ui/Badge';
import { Card, CardHeader } from '../../components/ui/Card';
import {
  CircleDollarSign,
  ArrowUpRight,
  ArrowDownRight,
  Lock,
  Unlock,
  PlusCircle,
  MinusCircle,
  Calendar,
  Filter,
  Download,
  Search,
  TrendingUp,
  TrendingDown,
  Wallet,
  Building2,
  CalendarDays,
  History,
  CreditCard,
  Banknote,
  Smartphone,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Pencil,
  Trash2,
  AlertTriangle,
  ListOrdered,
  ArrowUpDown,
  FileText,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts';
import {
  PAYMENT_METHODS,
  INCOME_CATEGORIES,
  EXPENSE_CATEGORIES,
} from '../../constants/clothingConstants';
import { useProducts } from '../../hooks/useProducts';
import { useCustomers } from '../../hooks/useContacts';
import { RegistrarIngresoModal } from './RegistrarIngresoModal';
import { addDocument, updateDocument, getDocument } from '../../services/firebase/firestore';
import { COLLECTIONS } from '../../constants/collections';
import { calculateTotalStock } from '../../utils/calculations';
import { toast } from 'sonner';

export function CajaPage() {
  const {
    currentShift,
    isCashOpen,
    movements: shiftMovements,
    allMovements,
    shifts,
    openCash,
    closeCash,
    addMovement,
    updateMovement,
    deleteMovement,
  } = useCashRegister();
  const { user } = useAuth();
  const { products } = useProducts();
  const { customers } = useCustomers();
  const { settings } = useSettings();

  // Active Main Tab: 'TODOS' | 'TURNO' | 'MES' | 'SEMANA' | 'HISTORIAL'
  const [activeTab, setActiveTab] = useState('TODOS');

  // Modals
  const [openModalOpen, setOpenModalOpen] = useState(false);
  const [closeModalOpen, setCloseModalOpen] = useState(false);
  const [incomeModalOpen, setIncomeModalOpen] = useState(false);
  const [expenseModalOpen, setExpenseModalOpen] = useState(false);

  // Movement Filter States
  const [movementTypeFilter, setMovementTypeFilter] = useState('ALL'); // 'ALL' | 'INGRESO' | 'EGRESO'
  const [movementScope, setMovementScope] = useState('ALL'); // 'ALL' | 'TURNO'

  // Edit Movement Modal State
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingMovement, setEditingMovement] = useState(null);
  const [editType, setEditType] = useState('INGRESO');
  const [editAmount, setEditAmount] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editCustomCategory, setEditCustomCategory] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editPaymentMethod, setEditPaymentMethod] = useState('EFECTIVO');
  const [editDate, setEditDate] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Delete Confirmation Modal State
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deletingMovement, setDeletingMovement] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Form states
  const [initialAmount, setInitialAmount] = useState('5000');
  const [actualClosingCash, setActualClosingCash] = useState('');
  const [closingNotes, setClosingNotes] = useState('');

  // Movement Form
  const [movAmount, setMovAmount] = useState('');
  const [movCategory, setMovCategory] = useState('');
  const [movDesc, setMovDesc] = useState('');
  const [movPaymentMethod, setMovPaymentMethod] = useState('EFECTIVO');
  const [movDate, setMovDate] = useState(() => new Date().toISOString().split('T')[0]);

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('ALL');

  // Month & Year Selector for "MES" view
  const today = new Date();
  const [selectedYear, setSelectedYear] = useState(today.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(today.getMonth()); // 0-indexed

  // Week Selector for "SEMANA" view (offset from current week: 0 = this week, -1 = last week)
  const [weekOffset, setWeekOffset] = useState(0);

  // --- Handlers ---
  const handleOpenCash = async (e) => {
    e.preventDefault();
    try {
      await openCash(Number(initialAmount) || 0, user?.displayName || 'Administrador');
      toast.success('¡Caja abierta con éxito!');
      setOpenModalOpen(false);
    } catch (err) {
      toast.error(err.message || 'Error al abrir caja');
    }
  };

  const handleCloseCash = async (e) => {
    e.preventDefault();
    try {
      await closeCash(Number(actualClosingCash) || 0, closingNotes, user?.displayName || 'Administrador');
      toast.success('¡Cierre de caja completado!');
      setCloseModalOpen(false);
    } catch (err) {
      toast.error(err.message || 'Error al cerrar caja');
    }
  };

  const handleSaveDirectIncome = async ({ amount, category, paymentMethod, description, date }) => {
    try {
      await addMovement({
        type: 'INGRESO',
        category: category || 'Venta Mostrador',
        amount: Number(amount),
        description: description || 'Ingreso de dinero',
        paymentMethod: paymentMethod || 'EFECTIVO',
        user: user?.displayName || 'Administrador',
        date: date || new Date().toISOString(),
      });
      toast.success('Ingreso registrado correctamente');
    } catch (err) {
      toast.error(err.message || 'Error al registrar ingreso');
      throw err;
    }
  };

  const handleSaveSale = async ({ items, total, paymentMethod, customerId, customerName, notes, date }) => {
    try {
      const saleNumber = `VTA-${Date.now().toString().slice(-6)}`;

      // 1. Deduct stock for each item & variant
      for (const item of items) {
        if (!item.productId) continue;
        try {
          const product = await getDocument(COLLECTIONS.PRODUCTS, item.productId);
          if (product) {
            let updatedVariants = product.variants || [];
            if (updatedVariants.length > 0) {
              updatedVariants = updatedVariants.map((v) => {
                const isMatch = (item.variantId && v.id === item.variantId) || (v.color === item.color && v.size === item.size);
                if (isMatch) {
                  return { ...v, stock: Math.max(0, (Number(v.stock) || 0) - Number(item.quantity)) };
                }
                return v;
              });
            }
            const totalStock = calculateTotalStock(
              updatedVariants,
              Math.max(0, (Number(product.stock) || 0) - Number(item.quantity))
            );
            await updateDocument(COLLECTIONS.PRODUCTS, item.productId, {
              variants: updatedVariants,
              stock: Math.max(0, totalStock),
            });

            // Log stock movement
            await addDocument(COLLECTIONS.STOCK_MOVEMENTS, {
              productId: item.productId,
              productName: item.productName,
              variantId: item.variantId || null,
              size: item.size || 'Único',
              color: item.color || 'Único',
              quantity: -Number(item.quantity),
              type: 'VENTA',
              referenceId: saleNumber,
              date: date || new Date().toISOString(),
            });
          }
        } catch (err) {
          console.error('Error updating stock on sale:', err);
        }
      }

      // 2. Save Sale Document
      try {
        await addDocument(COLLECTIONS.SALES, {
          saleNumber,
          items,
          total: Number(total),
          paymentMethod,
          customerId: customerId || null,
          customerName: customerName || 'Consumidor Final',
          seller: user?.displayName || 'Administrador',
          notes: notes || '',
          date: date || new Date().toISOString(),
        });
      } catch (err) {
        console.error('Error recording sale doc:', err);
      }

      // 3. Update customer stats if customer selected
      if (customerId) {
        try {
          const cust = await getDocument(COLLECTIONS.CUSTOMERS, customerId);
          if (cust) {
            await updateDocument(COLLECTIONS.CUSTOMERS, customerId, {
              totalPurchases: (Number(cust.totalPurchases) || 0) + Number(total),
              purchaseCount: (Number(cust.purchaseCount) || 0) + 1,
              lastPurchaseDate: new Date().toISOString(),
            });
          }
        } catch (err) {
          console.error('Error updating customer:', err);
        }
      }

      // 4. Record Cash Movement
      const itemsSummary = items
        .map((i) => `${i.productName} (${i.size}/${i.color}) x${i.quantity}`)
        .join(', ');

      await addMovement({
        type: 'VENTA',
        category: 'Venta Mostrador',
        amount: Number(total),
        description: `Venta ${saleNumber}: ${itemsSummary}${notes ? ` - ${notes}` : ''}`,
        paymentMethod,
        user: user?.displayName || 'Administrador',
        date: date || new Date().toISOString(),
      });

      toast.success(`Venta ${saleNumber} registrada: stock y caja actualizados`);
    } catch (err) {
      toast.error(err.message || 'Error al procesar la venta');
      throw err;
    }
  };

  const handleSaveExpense = async (e) => {
    e.preventDefault();
    if (!movAmount || Number(movAmount) <= 0) {
      toast.error('Ingresa un monto válido mayor a 0');
      return;
    }
    try {
      await addMovement({
        type: 'EGRESO',
        category: movCategory || 'Gastos Varios',
        amount: Number(movAmount),
        description: movDesc || 'Egreso de dinero',
        paymentMethod: movPaymentMethod,
        user: user?.displayName || 'Administrador',
        date: movDate ? new Date(movDate + 'T12:00:00').toISOString() : new Date().toISOString(),
      });
      toast.success('Egreso / Gasto registrado correctamente');
      setExpenseModalOpen(false);
      setMovAmount('');
      setMovDesc('');
      setMovCategory('');
    } catch (err) {
      toast.error(err.message || 'Error al registrar egreso');
    }
  };

  // --- Handlers for Editing & Deleting Movements ---
  const handleOpenEdit = (mov) => {
    setEditingMovement(mov);
    const isEgreso =
      mov.type === 'EGRESO' || mov.type === 'GASTO' || mov.type === 'RETIRO' || mov.type === 'COMPRA';
    const typeVal = isEgreso ? 'EGRESO' : 'INGRESO';
    setEditType(typeVal);
    setEditAmount(String(mov.amount || ''));

    const standardCategories = typeVal === 'INGRESO' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
    if (mov.category && standardCategories.includes(mov.category)) {
      setEditCategory(mov.category);
      setEditCustomCategory('');
    } else if (mov.category) {
      setEditCategory('OTRO');
      setEditCustomCategory(mov.category);
    } else {
      setEditCategory(standardCategories[0]);
      setEditCustomCategory('');
    }

    setEditDesc(mov.description || '');
    setEditPaymentMethod(mov.paymentMethod || 'EFECTIVO');
    setEditDate(mov.date ? mov.date.split('T')[0] : new Date().toISOString().split('T')[0]);
    setEditModalOpen(true);
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editingMovement) return;
    const numAmount = Number(editAmount);
    if (!numAmount || numAmount <= 0) {
      toast.error('Ingresa un monto válido mayor a 0');
      return;
    }

    const finalCategory =
      editCategory === 'OTRO' ? editCustomCategory.trim() || 'General' : editCategory;

    setIsSavingEdit(true);
    try {
      await updateMovement(editingMovement.id, {
        type: editType,
        amount: numAmount,
        category: finalCategory || (editType === 'INGRESO' ? 'Ingreso General' : 'Gasto General'),
        description: editDesc || (editType === 'INGRESO' ? 'Ingreso editado' : 'Egreso editado'),
        paymentMethod: editPaymentMethod,
        date: editDate ? new Date(editDate + 'T12:00:00').toISOString() : new Date().toISOString(),
      });
      toast.success('Movimiento actualizado correctamente');
      setEditModalOpen(false);
      setEditingMovement(null);
    } catch (err) {
      toast.error(err.message || 'Error al actualizar movimiento');
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleOpenDelete = (mov) => {
    setDeletingMovement(mov);
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deletingMovement) return;
    setIsDeleting(true);
    try {
      await deleteMovement(deletingMovement.id);
      toast.success('Movimiento eliminado correctamente');
      setDeleteModalOpen(false);
      setDeletingMovement(null);
    } catch (err) {
      toast.error(err.message || 'Error al eliminar movimiento');
    } finally {
      setIsDeleting(false);
    }
  };

  // --- Turno Calculations ---
  const currentShiftIncomes = shiftMovements
    .filter((m) => m.type === 'INGRESO' || m.type === 'VENTA')
    .reduce((acc, m) => acc + (Number(m.amount) || 0), 0);

  const currentShiftExpenses = shiftMovements
    .filter((m) => m.type === 'EGRESO' || m.type === 'RETIRO' || m.type === 'GASTO' || m.type === 'COMPRA')
    .reduce((acc, m) => acc + (Number(m.amount) || 0), 0);

  const currentExpectedBalance = (currentShift?.initialAmount || 0) + currentShiftIncomes - currentShiftExpenses;

  // --- Month View Data Calculations ---
  const monthData = useMemo(() => {
    const startOfMonth = new Date(selectedYear, selectedMonth, 1);
    const endOfMonth = new Date(selectedYear, selectedMonth + 1, 0, 23, 59, 59);

    const monthMovements = allMovements.filter((m) => {
      const d = new Date(m.date);
      return d >= startOfMonth && d <= endOfMonth;
    });

    const totalIncome = monthMovements
      .filter((m) => m.type === 'INGRESO' || m.type === 'VENTA')
      .reduce((acc, m) => acc + (Number(m.amount) || 0), 0);

    const totalExpense = monthMovements
      .filter((m) => m.type === 'EGRESO' || m.type === 'RETIRO' || m.type === 'GASTO' || m.type === 'COMPRA')
      .reduce((acc, m) => acc + (Number(m.amount) || 0), 0);

    const netBalance = totalIncome - totalExpense;

    // Daily breakdown for charts
    const daysInMonth = endOfMonth.getDate();
    const dailyMap = {};
    for (let day = 1; day <= daysInMonth; day++) {
      dailyMap[day] = { day: `Día ${day}`, ingresado: 0, egresado: 0, balance: 0 };
    }

    // Weekly breakdown
    const weeklySummary = [
      { name: 'Semana 1 (Días 1-7)', ingresado: 0, egresado: 0, balance: 0 },
      { name: 'Semana 2 (Días 8-14)', ingresado: 0, egresado: 0, balance: 0 },
      { name: 'Semana 3 (Días 15-21)', ingresado: 0, egresado: 0, balance: 0 },
      { name: 'Semana 4 (Días 22-28)', ingresado: 0, egresado: 0, balance: 0 },
      { name: 'Semana 5 (Días 29+)', ingresado: 0, egresado: 0, balance: 0 },
    ];

    // Method breakdown
    const paymentMethodMap = {};
    // Category breakdown
    const categoryMap = {};

    monthMovements.forEach((m) => {
      const d = new Date(m.date);
      const dayNum = d.getDate();
      const amt = Number(m.amount) || 0;
      const isInc = m.type === 'INGRESO' || m.type === 'VENTA';
      const isExp = m.type === 'EGRESO' || m.type === 'RETIRO' || m.type === 'GASTO' || m.type === 'COMPRA';

      if (dailyMap[dayNum]) {
        if (isInc) dailyMap[dayNum].ingresado += amt;
        if (isExp) dailyMap[dayNum].egresado += amt;
        dailyMap[dayNum].balance = dailyMap[dayNum].ingresado - dailyMap[dayNum].egresado;
      }

      // Week bucket
      let weekIdx = 0;
      if (dayNum > 28) weekIdx = 4;
      else if (dayNum > 21) weekIdx = 3;
      else if (dayNum > 14) weekIdx = 2;
      else if (dayNum > 7) weekIdx = 1;

      if (isInc) weeklySummary[weekIdx].ingresado += amt;
      if (isExp) weeklySummary[weekIdx].egresado += amt;
      weeklySummary[weekIdx].balance = weeklySummary[weekIdx].ingresado - weeklySummary[weekIdx].egresado;

      // Group payment methods (only for incomes)
      if (isInc) {
        const pm = m.paymentMethod || 'EFECTIVO';
        paymentMethodMap[pm] = (paymentMethodMap[pm] || 0) + amt;

        const cat = m.category || 'Venta Mostrador';
        categoryMap[cat] = (categoryMap[cat] || 0) + amt;
      }
    });

    return {
      monthMovements,
      totalIncome,
      totalExpense,
      netBalance,
      chartData: Object.values(dailyMap),
      weeklySummary,
      paymentMethodMap,
      categoryMap,
      daysInMonth,
    };
  }, [allMovements, selectedYear, selectedMonth]);

  // --- Week View Data Calculations ---
  const weekData = useMemo(() => {
    const curr = new Date();
    // Move to target week offset
    curr.setDate(curr.getDate() + weekOffset * 7);

    // Get Monday of that week
    const firstDay = new Date(curr);
    const dayOfWeek = firstDay.getDay(); // 0 is Sunday, 1 is Monday...
    const distanceToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    firstDay.setDate(firstDay.getDate() + distanceToMonday);
    firstDay.setHours(0, 0, 0, 0);

    const lastDay = new Date(firstDay);
    lastDay.setDate(lastDay.getDate() + 6);
    lastDay.setHours(23, 59, 59, 999);

    const weekMovements = allMovements.filter((m) => {
      const d = new Date(m.date);
      return d >= firstDay && d <= lastDay;
    });

    const daysName = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
    const daysArr = [];

    let totalWeekIncome = 0;
    let totalWeekExpense = 0;

    for (let i = 0; i < 7; i++) {
      const dateObj = new Date(firstDay);
      dateObj.setDate(firstDay.getDate() + i);
      const dateStr = dateObj.toISOString().split('T')[0];

      const dayMovs = weekMovements.filter((m) => m.date?.startsWith(dateStr));
      const dayIncome = dayMovs
        .filter((m) => m.type === 'INGRESO' || m.type === 'VENTA')
        .reduce((acc, m) => acc + (Number(m.amount) || 0), 0);
      const dayExpense = dayMovs
        .filter((m) => m.type === 'EGRESO' || m.type === 'RETIRO' || m.type === 'GASTO' || m.type === 'COMPRA')
        .reduce((acc, m) => acc + (Number(m.amount) || 0), 0);

      totalWeekIncome += dayIncome;
      totalWeekExpense += dayExpense;

      daysArr.push({
        dayName: daysName[i],
        dateFormatted: `${dateObj.getDate()}/${dateObj.getMonth() + 1}`,
        dateIso: dateStr,
        income: dayIncome,
        expense: dayExpense,
        balance: dayIncome - dayExpense,
        movementsCount: dayMovs.length,
        movements: dayMovs,
      });
    }

    return {
      firstDay,
      lastDay,
      weekMovements,
      daysArr,
      totalWeekIncome,
      totalWeekExpense,
      netWeekBalance: totalWeekIncome - totalWeekExpense,
    };
  }, [allMovements, weekOffset]);

  // Months label
  const monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
  ];

  // Filtered movements for the active list
  const displayedMovements = useMemo(() => {
    let source = [];
    if (activeTab === 'TURNO') {
      source = (isCashOpen && shiftMovements.length > 0 && movementScope === 'TURNO')
        ? shiftMovements
        : allMovements;
    } else if (activeTab === 'TODOS') {
      source = allMovements;
    } else if (activeTab === 'MES') {
      source = monthData.monthMovements;
    } else if (activeTab === 'SEMANA') {
      source = weekData.weekMovements;
    } else {
      source = allMovements;
    }

    return source.filter((m) => {
      const isPositive = m.type === 'INGRESO' || m.type === 'VENTA' || m.type === 'APERTURA_CAJA';
      const matchType =
        movementTypeFilter === 'ALL' ||
        (movementTypeFilter === 'INGRESO' && isPositive) ||
        (movementTypeFilter === 'EGRESO' && !isPositive);

      const matchSearch =
        m.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.user?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchPayment = paymentFilter === 'ALL' || m.paymentMethod === paymentFilter;

      return matchType && matchSearch && matchPayment;
    });
  }, [
    activeTab,
    isCashOpen,
    movementScope,
    shiftMovements,
    monthData.monthMovements,
    weekData.weekMovements,
    allMovements,
    movementTypeFilter,
    searchTerm,
    paymentFilter,
  ]);

  // Income / Expense counts for quick badges
  const { totalIncomesCount, totalExpensesCount } = useMemo(() => {
    let inc = 0;
    let exp = 0;
    allMovements.forEach((m) => {
      if (m.type === 'INGRESO' || m.type === 'VENTA' || m.type === 'APERTURA_CAJA') inc++;
      else exp++;
    });
    return { totalIncomesCount: inc, totalExpensesCount: exp };
  }, [allMovements]);

  const handleExportData = () => {
    const exportRows = displayedMovements.map((m) => ({
      Fecha: formatDate(m.date, 'full'),
      Tipo: m.type,
      Categoría: m.category || '-',
      Descripción: m.description,
      Método_Pago: m.paymentMethod || 'EFECTIVO',
      Usuario: m.user,
      Monto: m.amount,
    }));
    exportToExcel(exportRows, `Movimientos_Caja_${activeTab}_${new Date().toISOString().split('T')[0]}`);
    toast.success('Archivo exportado con éxito');
  };

  const handleExportPDF = () => {
    try {
      const now = new Date();
      generateMonthlyReportPDF({
        month: now.getMonth(),
        year: now.getFullYear(),
        cashMovements: allMovements,
        products,
        businessInfo: settings,
        userName: user?.name || user?.displayName || 'Administrador',
        reportType: 'CASH_ONLY',
      });
      toast.success('Reporte mensual de caja generado en PDF');
    } catch (err) {
      console.error(err);
      toast.error('Error al generar PDF de caja');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-neutral-900 tracking-tight">
            Control de Caja y Finanzas
          </h1>
          <p className="text-xs text-neutral-500 mt-0.5">
            Registro detallado de ingresos, egresos y balances por mes, semana y turno
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="primary"
            size="sm"
            leftIcon={PlusCircle}
            onClick={() => {
              setMovCategory('Venta Mostrador');
              setIncomeModalOpen(true);
            }}
          >
            + Registrar Venta / Ingreso
          </Button>
          <Button
            variant="outline"
            size="sm"
            leftIcon={MinusCircle}
            onClick={() => {
              setMovCategory('Gastos Varios');
              setExpenseModalOpen(true);
            }}
          >
            - Registrar Egreso / Gasto
          </Button>

          {isCashOpen ? (
            <Button
              variant="danger"
              size="sm"
              leftIcon={Lock}
              onClick={() => setCloseModalOpen(true)}
            >
              Cerrar Caja
            </Button>
          ) : (
            <Button
              variant="primary"
              size="sm"
              leftIcon={Unlock}
              onClick={() => setOpenModalOpen(true)}
            >
              Abrir Turno de Caja
            </Button>
          )}
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-200 pb-3">
        <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-xl bg-neutral-100 border border-neutral-200">
          <button
            onClick={() => setActiveTab('TODOS')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'TODOS'
                ? 'bg-white text-neutral-900 shadow-xs'
                : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            <ListOrdered className="w-3.5 h-3.5" />
            <span>Todos los Movimientos</span>
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-black bg-neutral-200 text-neutral-800">
              {allMovements.length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('TURNO')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'TURNO'
                ? 'bg-white text-neutral-900 shadow-xs'
                : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            <Wallet className="w-3.5 h-3.5" />
            <span>Turno Actual</span>
            {isCashOpen && <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />}
          </button>
          <button
            onClick={() => setActiveTab('MES')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'MES'
                ? 'bg-white text-neutral-900 shadow-xs'
                : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            Ingresos por Mes
          </button>
          <button
            onClick={() => setActiveTab('SEMANA')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'SEMANA'
                ? 'bg-white text-neutral-900 shadow-xs'
                : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            <CalendarDays className="w-3.5 h-3.5" />
            Ingresos por Semana
          </button>
          <button
            onClick={() => setActiveTab('HISTORIAL')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'HISTORIAL'
                ? 'bg-white text-neutral-900 shadow-xs'
                : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            Historial de Cierres
          </button>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            leftIcon={Download}
            onClick={handleExportData}
          >
            Exportar Excel
          </Button>
          <Button
            variant="default"
            size="sm"
            leftIcon={FileText}
            onClick={handleExportPDF}
          >
            PDF Mensual
          </Button>
        </div>
      </div>

      {/* --- TAB: TODOS LOS MOVIMIENTOS KPI SUMMARY --- */}
      {activeTab === 'TODOS' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-4 bg-white border-neutral-200 shadow-xs">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-neutral-600">Total Ingresos</p>
                <h4 className="text-xl font-black text-neutral-900 mt-1">
                  {formatCurrency(
                    allMovements
                      .filter((m) => m.type === 'INGRESO' || m.type === 'VENTA' || m.type === 'APERTURA_CAJA')
                      .reduce((acc, m) => acc + (Number(m.amount) || 0), 0)
                  )}
                </h4>
                <p className="text-[11px] text-neutral-500 mt-0.5">{totalIncomesCount} operaciones registradas</p>
              </div>
              <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200">
                <ArrowUpRight className="w-5 h-5" />
              </div>
            </div>
          </Card>

          <Card className="p-4 bg-white border-neutral-200 shadow-xs">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-neutral-600">Total Egresos</p>
                <h4 className="text-xl font-black text-neutral-900 mt-1">
                  {formatCurrency(
                    allMovements
                      .filter((m) => m.type === 'EGRESO' || m.type === 'GASTO')
                      .reduce((acc, m) => acc + (Number(m.amount) || 0), 0)
                  )}
                </h4>
                <p className="text-[11px] text-neutral-500 mt-0.5">{totalExpensesCount} operaciones registradas</p>
              </div>
              <div className="p-2.5 rounded-xl bg-rose-50 text-rose-700 border border-rose-200">
                <ArrowDownRight className="w-5 h-5" />
              </div>
            </div>
          </Card>

          <Card className="p-4 bg-white border-neutral-200 shadow-xs">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-neutral-600">Balance Neto</p>
                <h4 className="text-xl font-black text-neutral-900 mt-1">
                  {formatCurrency(
                    allMovements.reduce((acc, m) => {
                      const isPos = m.type === 'INGRESO' || m.type === 'VENTA' || m.type === 'APERTURA_CAJA';
                      return acc + (isPos ? Number(m.amount) || 0 : -(Number(m.amount) || 0));
                    }, 0)
                  )}
                </h4>
                <p className="text-[11px] text-neutral-500 mt-0.5">Ingresos menos Egresos</p>
              </div>
              <div className="p-2.5 rounded-xl bg-neutral-100 text-neutral-900 border border-neutral-200">
                <CircleDollarSign className="w-5 h-5" />
              </div>
            </div>
          </Card>

          <Card className="p-4 bg-white border-neutral-200 shadow-xs">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-neutral-600">Total Movimientos</p>
                <h4 className="text-xl font-black text-neutral-900 mt-1">{allMovements.length}</h4>
                <p className="text-[11px] text-neutral-500 mt-0.5">Acciones de Edición y Eliminación activas</p>
              </div>
              <div className="p-2.5 rounded-xl bg-neutral-100 text-neutral-700 border border-neutral-200">
                <ListOrdered className="w-5 h-5" />
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* --- TAB 1: TURNO ACTUAL --- */}
      {activeTab === 'TURNO' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-neutral-500">Estado de Caja</p>
                  <h3 className="text-lg font-black text-neutral-900 mt-1">
                    {isCashOpen ? 'TURNO ABIERTO' : 'CAJA CERRADA'}
                  </h3>
                </div>
                <Badge size="md" variant={isCashOpen ? 'success' : 'neutral'}>
                  {isCashOpen ? 'En Operación' : 'Inactiva'}
                </Badge>
              </div>
              {isCashOpen && (
                <p className="text-[11px] text-neutral-500 mt-2">
                  Iniciado por: <span className="font-semibold text-neutral-800">{currentShift?.cashierName || 'Admin'}</span>
                </p>
              )}
            </Card>

            <Card className="p-5">
              <p className="text-xs font-semibold text-neutral-500">Fondo Inicial</p>
              <h3 className="text-xl font-black text-neutral-900 mt-1">
                {formatCurrency(currentShift?.initialAmount || 0)}
              </h3>
              <p className="text-[11px] text-neutral-500 mt-2">Cambio de inicio de jornada</p>
            </Card>

            <Card className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-semibold text-neutral-500">Ingresos del Turno</p>
                  <h3 className="text-xl font-black text-emerald-600 mt-1">
                    +{formatCurrency(currentShiftIncomes)}
                  </h3>
                </div>
                <div className="p-2 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <ArrowUpRight className="w-4 h-4" />
                </div>
              </div>
              <p className="text-[11px] text-neutral-500 mt-2">Ventas e ingresos extras</p>
            </Card>

            <Card className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-semibold text-neutral-500">Saldo Estimado en Caja</p>
                  <h3 className="text-xl font-black text-neutral-900 mt-1">
                    {formatCurrency(currentExpectedBalance)}
                  </h3>
                </div>
                <div className="p-2 rounded-xl bg-neutral-100 text-neutral-900 border border-neutral-200">
                  <CircleDollarSign className="w-4 h-4" />
                </div>
              </div>
              <p className="text-[11px] text-neutral-500 mt-2">Efectivo + Ingresos - Egresos</p>
            </Card>
          </div>

          {!isCashOpen && (
            <div className="card-panel p-4 rounded-2xl bg-white border border-neutral-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-neutral-200 text-neutral-800 shrink-0">
                  <Lock className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-neutral-900">La caja se encuentra cerrada</h4>
                  <p className="text-xs text-neutral-600 font-medium">
                    Abre un turno con tu fondo inicial de cambio en efectivo para comenzar a registrar ventas e ingresos del día.
                  </p>
                </div>
              </div>
              <Button
                variant="primary"
                size="sm"
                leftIcon={Unlock}
                onClick={() => setOpenModalOpen(true)}
              >
                Abrir Turno de Caja
              </Button>
            </div>
          )}
        </div>
      )}

      {/* --- TAB 2: INGRESADO POR MES --- */}
      {activeTab === 'MES' && (
        <div className="space-y-6">
          {/* Month Selector Toolbar */}
          <div className="card-panel flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-white border border-neutral-200 shadow-xs">
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-neutral-700" />
              <div>
                <h3 className="text-sm font-black text-neutral-900">
                  Balance y Rendimiento Mensual
                </h3>
                <p className="text-[11px] text-neutral-500">
                  Selecciona el período para ver el desglose total ingresado
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                className="px-3 py-1.5 rounded-xl border border-neutral-300 bg-white text-xs font-bold text-neutral-800"
              >
                {monthNames.map((name, idx) => (
                  <option key={idx} value={idx}>
                    {name}
                  </option>
                ))}
              </select>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="px-3 py-1.5 rounded-xl border border-neutral-300 bg-white text-xs font-bold text-neutral-800"
              >
                {[2024, 2025, 2026, 2027].map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Month KPI Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="p-5 bg-white border border-neutral-200">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-semibold text-neutral-500">
                    Total Ingresado en {monthNames[selectedMonth]}
                  </p>
                  <h3 className="text-2xl font-black text-emerald-600 mt-1">
                    +{formatCurrency(monthData.totalIncome)}
                  </h3>
                </div>
                <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <TrendingUp className="w-5 h-5" />
                </div>
              </div>
              <p className="text-[11px] text-neutral-500 mt-3 border-t border-neutral-100 pt-2">
                Recaudación total del mes
              </p>
            </Card>

            <Card className="p-5 bg-white border border-neutral-200">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-semibold text-neutral-500">
                    Total Egresado / Gastos
                  </p>
                  <h3 className="text-2xl font-black text-rose-600 mt-1">
                    -{formatCurrency(monthData.totalExpense)}
                  </h3>
                </div>
                <div className="p-2.5 rounded-xl bg-rose-50 text-rose-700 border border-rose-200">
                  <TrendingDown className="w-5 h-5" />
                </div>
              </div>
              <p className="text-[11px] text-neutral-500 mt-3 border-t border-neutral-100 pt-2">
                Compras, servicios y extracciones
              </p>
            </Card>

            <Card className="p-5 bg-white border border-neutral-200">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-semibold text-neutral-500">
                    Balance Neto del Mes
                  </p>
                  <h3 className="text-2xl font-black text-neutral-900 mt-1">
                    {formatCurrency(monthData.netBalance)}
                  </h3>
                </div>
                <div className="p-2.5 rounded-xl bg-neutral-100 text-neutral-900 border border-neutral-200">
                  <CircleDollarSign className="w-5 h-5" />
                </div>
              </div>
              <p className="text-[11px] text-neutral-500 mt-3 border-t border-neutral-100 pt-2">
                Ganancia / Flujo neto de efectivo
              </p>
            </Card>
          </div>

          {/* Daily Evolution Chart */}
          <Card className="p-5">
            <CardHeader
              title={`Evolución Diaria de Ingresos vs Egresos (${monthNames[selectedMonth]} ${selectedYear})`}
              subtitle="Comportamiento día por día de la caja"
            />
            <div className="h-64 mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthData.chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                  <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#6B7280' }} />
                  <YAxis tick={{ fontSize: 10, fill: '#6B7280' }} tickFormatter={(val) => `$${val}`} />
                  <Tooltip
                    formatter={(val) => [formatCurrency(val), '']}
                    contentStyle={{ borderRadius: '12px', border: '1px solid #E5E7EB', fontSize: '12px' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                  <Bar dataKey="ingresado" name="Ingresos ($)" fill="#10B981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="egresado" name="Egresos ($)" fill="#F43F5E" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Weekly Breakdown Table of the Month */}
          <Card className="p-5">
            <CardHeader
              title="Resumen Agrupado por Semanas del Mes"
              subtitle="Detalle de lo ingresado y egresado dividido por período semanal"
            />
            <div className="overflow-x-auto mt-3">
              <table className="w-full text-left text-xs">
                <thead className="bg-neutral-50 text-neutral-600 font-semibold border-b border-neutral-200">
                  <tr>
                    <th className="p-3">Semana</th>
                    <th className="p-3 text-right">Ingresado</th>
                    <th className="p-3 text-right">Egresado</th>
                    <th className="p-3 text-right">Balance Semanal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {monthData.weeklySummary.map((week, idx) => (
                    <tr key={idx} className="hover:bg-neutral-50/60">
                      <td className="p-3 font-bold text-neutral-800">{week.name}</td>
                      <td className="p-3 text-right font-bold text-emerald-600">
                        +{formatCurrency(week.ingresado)}
                      </td>
                      <td className="p-3 text-right font-bold text-rose-600">
                        -{formatCurrency(week.egresado)}
                      </td>
                      <td className="p-3 text-right font-black text-neutral-900">
                        {formatCurrency(week.balance)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* --- TAB 3: INGRESADO POR SEMANA --- */}
      {activeTab === 'SEMANA' && (
        <div className="space-y-6">
          {/* Week Navigation Toolbar */}
          <div className="card-panel flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-white border border-neutral-200 shadow-xs">
            <div className="flex items-center gap-3">
              <CalendarDays className="w-5 h-5 text-neutral-700" />
              <div>
                <h3 className="text-sm font-black text-neutral-900">
                  Semana del {formatDate(weekData.firstDay, 'short')} al {formatDate(weekData.lastDay, 'short')}
                </h3>
                <p className="text-[11px] text-neutral-500">
                  {weekOffset === 0 ? 'Semana Actual en curso' : `Semana (${weekOffset > 0 ? '+' : ''}${weekOffset})`}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                leftIcon={ChevronLeft}
                onClick={() => setWeekOffset((prev) => prev - 1)}
              >
                Semana Anterior
              </Button>
              {weekOffset !== 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setWeekOffset(0)}
                >
                  Hoy
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                rightIcon={ChevronRight}
                onClick={() => setWeekOffset((prev) => prev + 1)}
              >
                Semana Siguiente
              </Button>
            </div>
          </div>

          {/* Week Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="p-5">
              <p className="text-xs font-semibold text-neutral-500">Ingresado en la Semana</p>
              <h3 className="text-2xl font-black text-emerald-600 mt-1">
                +{formatCurrency(weekData.totalWeekIncome)}
              </h3>
            </Card>
            <Card className="p-5">
              <p className="text-xs font-semibold text-neutral-500">Gastos / Egresos de la Semana</p>
              <h3 className="text-2xl font-black text-rose-600 mt-1">
                -{formatCurrency(weekData.totalWeekExpense)}
              </h3>
            </Card>
            <Card className="p-5">
              <p className="text-xs font-semibold text-neutral-500">Balance Neto Semanal</p>
              <h3 className="text-2xl font-black text-neutral-900 mt-1">
                {formatCurrency(weekData.netWeekBalance)}
              </h3>
            </Card>
          </div>

          {/* 7-Day Grid Breakdown */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-3">
            {weekData.daysArr.map((d, idx) => (
              <Card key={idx} className="p-4 flex flex-col justify-between hover:border-neutral-400 transition-colors">
                <div>
                  <div className="flex items-center justify-between border-b border-neutral-100 pb-2 mb-2">
                    <span className="text-xs font-black text-neutral-900">{d.dayName}</span>
                    <span className="text-[10px] text-neutral-400 font-mono">{d.dateFormatted}</span>
                  </div>
                  <div className="space-y-1.5 text-xs">
                    <div>
                      <p className="text-[10px] text-neutral-400">Ingresos:</p>
                      <p className="font-bold text-emerald-600">+{formatCurrency(d.income)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-neutral-400">Egresos:</p>
                      <p className="font-bold text-rose-600">-{formatCurrency(d.expense)}</p>
                    </div>
                  </div>
                </div>
                <div className="mt-3 pt-2 border-t border-neutral-100">
                  <p className="text-[10px] text-neutral-400">Balance Día:</p>
                  <p className="text-xs font-black text-neutral-900">{formatCurrency(d.balance)}</p>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* --- TAB 4: HISTORIAL DE CIERRES --- */}
      {activeTab === 'HISTORIAL' && (
        <Card className="p-5">
          <CardHeader
            title="Historial de Cajas y Arqueos Cerrados"
            subtitle="Registro histórico de auditoría de cada turno finalizado"
          />
          <div className="overflow-x-auto mt-3">
            <table className="w-full text-left text-xs">
              <thead className="bg-neutral-50 text-neutral-600 font-semibold border-b border-neutral-200">
                <tr>
                  <th className="p-3">Apertura</th>
                  <th className="p-3">Cierre</th>
                  <th className="p-3">Responsable</th>
                  <th className="p-3 text-right">Fondo Inicial</th>
                  <th className="p-3 text-right">Esperado</th>
                  <th className="p-3 text-right">Contado Real</th>
                  <th className="p-3 text-right">Diferencia</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {shifts.map((shift) => (
                  <tr key={shift.id} className="hover:bg-neutral-50/60">
                    <td className="p-3 font-mono text-neutral-600">{formatDate(shift.openedAt, 'full')}</td>
                    <td className="p-3 font-mono text-neutral-600">
                      {shift.closedAt ? formatDate(shift.closedAt, 'full') : (
                        <Badge size="xs" variant="success">En Curso</Badge>
                      )}
                    </td>
                    <td className="p-3 font-medium text-neutral-800">{shift.openedBy || shift.cashierName}</td>
                    <td className="p-3 text-right font-mono">{formatCurrency(shift.initialAmount || 0)}</td>
                    <td className="p-3 text-right font-mono font-bold">{formatCurrency(shift.expectedAmount || 0)}</td>
                    <td className="p-3 text-right font-mono font-bold">
                      {shift.finalAmount !== null && shift.finalAmount !== undefined
                        ? formatCurrency(shift.finalAmount)
                        : '-'}
                    </td>
                    <td className="p-3 text-right font-black">
                      {shift.difference ? (
                        <span className={shift.difference >= 0 ? 'text-emerald-600' : 'text-rose-600'}>
                          {shift.difference > 0 ? '+' : ''}
                          {formatCurrency(shift.difference)}
                        </span>
                      ) : (
                        <span className="text-neutral-400">$0.00</span>
                      )}
                    </td>
                  </tr>
                ))}
                {shifts.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-6 text-center text-neutral-400 text-xs">
                      No hay registros históricos de cierres de caja
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* --- MOVEMENTS TABLE & MOBILE CARDS (Full CRUD with Edit and Delete) --- */}
      <Card className="p-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-neutral-100">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-black text-neutral-900">
                Movimientos de Caja (Ingresos y Egresos)
              </h3>
              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-neutral-100 text-neutral-800">
                {displayedMovements.length}
              </span>
            </div>
            <p className="text-[11px] text-neutral-500 mt-0.5">
              Administra, edita o elimina cualquier ingreso o egreso registrado
            </p>
          </div>

          {/* Filter toolbar */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Type selector pills */}
            <div className="flex items-center p-1 rounded-xl bg-neutral-100 border border-neutral-200 text-xs">
              <button
                type="button"
                onClick={() => setMovementTypeFilter('ALL')}
                className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  movementTypeFilter === 'ALL'
                    ? 'bg-white text-neutral-900 shadow-2xs'
                    : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                Todos ({allMovements.length})
              </button>
              <button
                type="button"
                onClick={() => setMovementTypeFilter('INGRESO')}
                className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  movementTypeFilter === 'INGRESO'
                    ? 'bg-emerald-600 text-white shadow-2xs'
                    : 'text-emerald-700 hover:text-emerald-900'
                }`}
              >
                + Ingresos ({totalIncomesCount})
              </button>
              <button
                type="button"
                onClick={() => setMovementTypeFilter('EGRESO')}
                className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  movementTypeFilter === 'EGRESO'
                    ? 'bg-rose-600 text-white shadow-2xs'
                    : 'text-rose-700 hover:text-rose-900'
                }`}
              >
                - Egresos ({totalExpensesCount})
              </button>
            </div>

            {/* Scope toggle (if shift is open) */}
            {isCashOpen && activeTab === 'TURNO' && (
              <select
                value={movementScope}
                onChange={(e) => setMovementScope(e.target.value)}
                className="px-2.5 py-1.5 rounded-xl border border-neutral-300 bg-white text-xs font-semibold text-neutral-800 cursor-pointer focus:outline-none focus:ring-2 focus:ring-neutral-900 hover:border-neutral-400"
              >
                <option value="ALL">Ver Todo el Historial</option>
                <option value="TURNO">Solo Turno Actual</option>
              </select>
            )}

            {/* Search input */}
            <div className="relative flex items-center">
              <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 pointer-events-none" />
              <input
                type="text"
                placeholder="Buscar por concepto o usuario..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs rounded-xl border border-neutral-300 bg-white text-neutral-900 placeholder:text-neutral-400 w-44 sm:w-56 focus:outline-none focus:ring-2 focus:ring-neutral-900 hover:border-neutral-400"
              />
            </div>

            {/* Payment method selector */}
            <select
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value)}
              className="px-2.5 py-1.5 rounded-xl border border-neutral-300 bg-white text-xs font-semibold text-neutral-800 cursor-pointer focus:outline-none focus:ring-2 focus:ring-neutral-900 hover:border-neutral-400"
            >
              <option value="ALL">Todos los Pagos</option>
              {PAYMENT_METHODS.map((pm) => (
                <option key={pm.id} value={pm.id}>
                  {pm.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Mobile View: Cards Layout (visible on small screens) */}
        <div className="sm:hidden mt-3 space-y-3">
          {displayedMovements.map((m) => {
            const isPositive = m.type === 'INGRESO' || m.type === 'VENTA' || m.type === 'APERTURA_CAJA';
            return (
              <div
                key={`mobile-${m.id}`}
                className="p-3.5 rounded-xl border border-neutral-200 bg-white space-y-2.5 shadow-2xs"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[11px] font-mono text-neutral-400 block">
                      {formatDate(m.date, 'full')}
                    </span>
                    <h4 className="text-xs font-bold text-neutral-900 mt-0.5">
                      {m.category || (isPositive ? 'Ingreso' : 'Egreso')}
                    </h4>
                  </div>
                  <div className="text-right">
                    <span
                      className={`text-sm font-black whitespace-nowrap block ${
                        isPositive ? 'text-emerald-600' : 'text-rose-600'
                      }`}
                    >
                      {isPositive ? '+' : '-'}
                      {formatCurrency(m.amount)}
                    </span>
                    <Badge size="xs" variant={isPositive ? 'success' : 'danger'} className="mt-0.5">
                      {m.type}
                    </Badge>
                  </div>
                </div>

                {m.description && (
                  <p className="text-xs text-neutral-800 bg-white border border-neutral-200 p-2 rounded-lg">
                    {m.description}
                  </p>
                )}

                <div className="flex items-center justify-between text-[11px] text-neutral-500 pt-1 border-t border-neutral-100">
                  <span>Pago: <strong>{PAYMENT_METHODS.find((p) => p.id === m.paymentMethod)?.name || m.paymentMethod || 'Efectivo'}</strong></span>
                  <span>Por: <strong>{m.user || 'Admin'}</strong></span>
                </div>

                {/* Clear Edit / Delete Buttons on Mobile */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => handleOpenEdit(m)}
                    className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-bold text-neutral-800 bg-neutral-100 hover:bg-neutral-200 border border-neutral-300 transition-colors cursor-pointer"
                  >
                    <Pencil className="w-3.5 h-3.5 text-neutral-600" />
                    Editar
                  </button>
                  <button
                    type="button"
                    onClick={() => handleOpenDelete(m)}
                    className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                    Eliminar
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Desktop View: Full Table Layout (visible on sm and up) */}
        <div className="hidden sm:block overflow-x-auto mt-3">
          <table className="w-full text-left text-xs">
            <thead className="bg-neutral-50 text-neutral-600 font-semibold border-b border-neutral-200">
              <tr>
                <th className="p-3">Fecha y Hora</th>
                <th className="p-3">Tipo</th>
                <th className="p-3">Categoría / Concepto</th>
                <th className="p-3">Descripción</th>
                <th className="p-3">Método de Pago</th>
                <th className="p-3">Usuario</th>
                <th className="p-3 text-right">Monto</th>
                <th className="p-3 text-center min-w-[180px]">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {displayedMovements.map((m) => {
                const isPositive = m.type === 'INGRESO' || m.type === 'VENTA' || m.type === 'APERTURA_CAJA';
                return (
                  <tr key={m.id} className="hover:bg-neutral-50/60 transition-colors">
                    <td className="p-3 text-neutral-500 font-mono whitespace-nowrap">
                      {formatDate(m.date, 'full')}
                    </td>
                    <td className="p-3 font-bold">
                      <Badge size="xs" variant={isPositive ? 'success' : 'danger'}>
                        {m.type}
                      </Badge>
                    </td>
                    <td className="p-3 font-semibold text-neutral-800">
                      {m.category || (isPositive ? 'Ingreso' : 'Egreso')}
                    </td>
                    <td className="p-3 text-neutral-600">
                      {m.description}
                    </td>
                    <td className="p-3 text-neutral-600 font-medium">
                      {PAYMENT_METHODS.find((p) => p.id === m.paymentMethod)?.name || m.paymentMethod || 'Efectivo'}
                    </td>
                    <td className="p-3 text-neutral-500">{m.user || 'Admin'}</td>
                    <td
                      className={`p-3 text-right font-black text-sm whitespace-nowrap ${
                        isPositive ? 'text-emerald-600' : 'text-rose-600'
                      }`}
                    >
                      {isPositive ? '+' : '-'}
                      {formatCurrency(m.amount)}
                    </td>
                    <td className="p-3 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          type="button"
                          id={`btn-edit-movement-${m.id}`}
                          onClick={() => handleOpenEdit(m)}
                          title="Editar este movimiento"
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold text-neutral-800 bg-neutral-100 hover:bg-neutral-200 border border-neutral-300 hover:border-neutral-400 transition-all shadow-2xs cursor-pointer"
                        >
                          <Pencil className="w-3.5 h-3.5 text-neutral-700" />
                          <span>Editar</span>
                        </button>
                        <button
                          type="button"
                          id={`btn-delete-movement-${m.id}`}
                          onClick={() => handleOpenDelete(m)}
                          title="Eliminar este movimiento"
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 hover:border-rose-300 transition-all shadow-2xs cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                          <span>Eliminar</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Empty State */}
        {displayedMovements.length === 0 && (
          <div className="p-8 text-center border-t border-neutral-100">
            <div className="w-12 h-12 rounded-full bg-neutral-100 text-neutral-400 flex items-center justify-center mx-auto mb-3">
              <CircleDollarSign className="w-6 h-6" />
            </div>
            <p className="text-sm font-bold text-neutral-700">
              No hay movimientos con los filtros seleccionados
            </p>
            <p className="text-xs text-neutral-500 mt-1 max-w-sm mx-auto">
              Puedes registrar un nuevo ingreso o egreso de dinero usando los botones directos a continuación:
            </p>
            <div className="flex items-center justify-center gap-3 mt-4">
              <Button
                variant="primary"
                size="sm"
                leftIcon={PlusCircle}
                onClick={() => {
                  setMovCategory('Venta Mostrador');
                  setIncomeModalOpen(true);
                }}
              >
                + Registrar Venta / Ingreso
              </Button>
              <Button
                variant="outline"
                size="sm"
                leftIcon={MinusCircle}
                onClick={() => {
                  setMovCategory('Gastos Varios');
                  setExpenseModalOpen(true);
                }}
              >
                - Registrar Egreso
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* --- MODAL: REGISTRAR INGRESO / VENTA --- */}
      <RegistrarIngresoModal
        isOpen={incomeModalOpen}
        onClose={() => setIncomeModalOpen(false)}
        products={products}
        customers={customers}
        onSaveDirectIncome={handleSaveDirectIncome}
        onSaveSale={handleSaveSale}
      />

      {/* --- MODAL: REGISTRAR EGRESO / GASTO --- */}
      <Modal
        isOpen={expenseModalOpen}
        onClose={() => setExpenseModalOpen(false)}
        title="Registrar Egreso o Gasto"
        subtitle="Registra salidas por compras a proveedores, alquiler, sueldos o servicios"
        maxWidth="max-w-md"
      >
        <form onSubmit={handleSaveExpense} className="space-y-4">
          <Input
            label="Monto del Egreso ($) *"
            type="number"
            min="1"
            placeholder="0.00"
            value={movAmount}
            onChange={(e) => setMovAmount(e.target.value)}
            required
            autoFocus
          />

          <Select
            label="Categoría del Gasto / Egreso *"
            value={movCategory}
            onChange={(e) => setMovCategory(e.target.value)}
            required
          >
            {EXPENSE_CATEGORIES.map((cat, i) => (
              <option key={i} value={cat}>
                {cat}
              </option>
            ))}
          </Select>

          <Select
            label="Medio de Salida *"
            value={movPaymentMethod}
            onChange={(e) => setMovPaymentMethod(e.target.value)}
          >
            {PAYMENT_METHODS.map((pm) => (
              <option key={pm.id} value={pm.id}>
                {pm.name}
              </option>
            ))}
          </Select>

          <Input
            label="Detalle / Motivo *"
            placeholder="Ej: Pago factura de luz local, compra de bolsas..."
            value={movDesc}
            onChange={(e) => setMovDesc(e.target.value)}
            required
          />

          <Input
            label="Fecha del Movimiento"
            type="date"
            value={movDate}
            onChange={(e) => setMovDate(e.target.value)}
          />

          <div className="flex justify-end gap-2 pt-3 border-t border-neutral-200">
            <Button type="button" variant="outline" size="sm" onClick={() => setExpenseModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" variant="danger" size="sm">
              Guardar Egreso
            </Button>
          </div>
        </form>
      </Modal>

      {/* --- MODAL: APERTURA DE CAJA --- */}
      <Modal
        isOpen={openModalOpen}
        onClose={() => setOpenModalOpen(false)}
        title="Apertura de Turno de Caja"
        subtitle="Ingresa el fondo inicial en efectivo disponible en el cajón"
        maxWidth="max-w-md"
      >
        <form onSubmit={handleOpenCash} className="space-y-4">
          <Input
            label="Fondo Inicial ($) *"
            type="number"
            min="0"
            value={initialAmount}
            onChange={(e) => setInitialAmount(e.target.value)}
            required
            autoFocus
          />
          <div className="flex justify-end gap-2 pt-3 border-t border-neutral-200">
            <Button type="button" variant="outline" size="sm" onClick={() => setOpenModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary" size="sm">
              Abrir Caja
            </Button>
          </div>
        </form>
      </Modal>

      {/* --- MODAL: CIERRE DE CAJA (ARQUEO) --- */}
      <Modal
        isOpen={closeModalOpen}
        onClose={() => setCloseModalOpen(false)}
        title="Cierre de Caja y Arqueo de Efectivo"
        subtitle={`Saldo teórico calculado en el sistema: ${formatCurrency(currentExpectedBalance)}`}
        maxWidth="max-w-md"
      >
        <form onSubmit={handleCloseCash} className="space-y-4">
          <Input
            label="Efectivo Real Contado en Cajón ($) *"
            type="number"
            min="0"
            value={actualClosingCash}
            onChange={(e) => setActualClosingCash(e.target.value)}
            placeholder={currentExpectedBalance.toString()}
            required
            autoFocus
          />
          {actualClosingCash && (
            <div className="p-3 rounded-xl bg-white text-xs flex justify-between items-center border border-neutral-200 shadow-2xs">
              <span className="font-semibold text-neutral-700">Diferencia de Arqueo:</span>
              <span
                className={`font-black text-sm ${
                  Number(actualClosingCash) - currentExpectedBalance >= 0
                    ? 'text-emerald-600'
                    : 'text-rose-600'
                }`}
              >
                {Number(actualClosingCash) - currentExpectedBalance >= 0 ? '+' : ''}
                {formatCurrency(Number(actualClosingCash) - currentExpectedBalance)}
              </span>
            </div>
          )}
          <Input
            label="Observaciones del Cierre"
            placeholder="Notas sobre el cierre o turno..."
            value={closingNotes}
            onChange={(e) => setClosingNotes(e.target.value)}
          />
          <div className="flex justify-end gap-2 pt-3 border-t border-neutral-200">
            <Button type="button" variant="outline" size="sm" onClick={() => setCloseModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" variant="danger" size="sm">
              Confirmar Cierre de Caja
            </Button>
          </div>
        </form>
      </Modal>

      {/* --- MODAL: EDITAR MOVIMIENTO --- */}
      <Modal
        isOpen={editModalOpen}
        onClose={() => !isSavingEdit && setEditModalOpen(false)}
        title="Editar Movimiento de Caja"
        subtitle="Modifica el monto, tipo, categoría o método de pago"
        maxWidth="max-w-md"
      >
        <form onSubmit={handleSaveEdit} className="space-y-4">
          {/* Tipo de Operación Toggle */}
          <div>
            <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1.5">
              Tipo de Operación *
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                id="btn-edit-type-ingreso"
                onClick={() => {
                  setEditType('INGRESO');
                  setEditCategory(INCOME_CATEGORIES[0]);
                  setEditCustomCategory('');
                }}
                className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                  editType === 'INGRESO'
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300 ring-1 ring-emerald-300'
                    : 'bg-white text-neutral-700 border-neutral-300 hover:bg-neutral-50'
                }`}
              >
                <ArrowUpRight className="w-4 h-4 text-emerald-600" />
                Ingreso de Dinero
              </button>
              <button
                type="button"
                id="btn-edit-type-egreso"
                onClick={() => {
                  setEditType('EGRESO');
                  setEditCategory(EXPENSE_CATEGORIES[0]);
                  setEditCustomCategory('');
                }}
                className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                  editType === 'EGRESO'
                    ? 'bg-rose-50 text-rose-800 border-rose-300 ring-1 ring-rose-300'
                    : 'bg-white text-neutral-700 border-neutral-300 hover:bg-neutral-50'
                }`}
              >
                <ArrowDownRight className="w-4 h-4 text-rose-600" />
                Egreso / Gasto
              </button>
            </div>
          </div>

          <Input
            label="Monto ($) *"
            type="number"
            min="1"
            placeholder="0.00"
            value={editAmount}
            onChange={(e) => setEditAmount(e.target.value)}
            required
            autoFocus
          />

          <Select
            label="Categoría / Concepto *"
            value={editCategory}
            onChange={(e) => setEditCategory(e.target.value)}
            required
          >
            {(editType === 'INGRESO' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES).map((cat, i) => (
              <option key={i} value={cat}>
                {cat}
              </option>
            ))}
            <option value="OTRO">Otra categoría (personalizada)...</option>
          </Select>

          {editCategory === 'OTRO' && (
            <Input
              label="Nombre de Categoría Personalizada *"
              placeholder="Ej: Devolución, Pago especial, etc."
              value={editCustomCategory}
              onChange={(e) => setEditCustomCategory(e.target.value)}
              required
            />
          )}

          <Select
            label="Método de Pago *"
            value={editPaymentMethod}
            onChange={(e) => setEditPaymentMethod(e.target.value)}
          >
            {PAYMENT_METHODS.map((pm) => (
              <option key={pm.id} value={pm.id}>
                {pm.name}
              </option>
            ))}
          </Select>

          <Input
            label="Detalle / Observación *"
            placeholder="Ej: Remera talle L, factura de luz, etc."
            value={editDesc}
            onChange={(e) => setEditDesc(e.target.value)}
            required
          />

          <Input
            label="Fecha del Movimiento"
            type="date"
            value={editDate}
            onChange={(e) => setEditDate(e.target.value)}
          />

          <div className="flex justify-end gap-2 pt-3 border-t border-neutral-200">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setEditModalOpen(false)}
              disabled={isSavingEdit}
            >
              Cancelar
            </Button>
            <Button type="submit" variant="primary" size="sm" loading={isSavingEdit}>
              Guardar Cambios
            </Button>
          </div>
        </form>
      </Modal>

      {/* --- MODAL: CONFIRMAR ELIMINACIÓN --- */}
      <Modal
        isOpen={deleteModalOpen}
        onClose={() => !isDeleting && setDeleteModalOpen(false)}
        title="Eliminar Movimiento"
        subtitle="Confirma si deseas anular o eliminar este movimiento de caja"
        maxWidth="max-w-md"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-rose-50/70 border border-rose-200">
            <div className="p-2 rounded-xl bg-rose-100 text-rose-700 shrink-0 mt-0.5">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div className="text-xs text-rose-900">
              <p className="font-bold mb-1">¿Estás seguro de eliminar este registro?</p>
              <p className="text-rose-700 leading-relaxed">
                Esta acción eliminará el movimiento y recalculará automáticamente los saldos,
                ingresos y egresos del período correspondiente.
              </p>
            </div>
          </div>

          {deletingMovement && (
            <div className="p-4 rounded-xl bg-white border border-neutral-200 space-y-2 text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-neutral-200">
                <span className="text-neutral-500 font-medium">Tipo:</span>
                <Badge
                  size="xs"
                  variant={
                    deletingMovement.type === 'INGRESO' ||
                    deletingMovement.type === 'VENTA' ||
                    deletingMovement.type === 'APERTURA_CAJA'
                      ? 'success'
                      : 'danger'
                  }
                >
                  {deletingMovement.type}
                </Badge>
              </div>
              <div className="flex items-center justify-between pb-2 border-b border-neutral-200">
                <span className="text-neutral-500 font-medium">Monto:</span>
                <span
                  className={`font-black text-sm ${
                    deletingMovement.type === 'INGRESO' ||
                    deletingMovement.type === 'VENTA' ||
                    deletingMovement.type === 'APERTURA_CAJA'
                      ? 'text-emerald-600'
                      : 'text-rose-600'
                  }`}
                >
                  {formatCurrency(deletingMovement.amount)}
                </span>
              </div>
              <div className="flex items-center justify-between pb-2 border-b border-neutral-200">
                <span className="text-neutral-500 font-medium">Categoría / Concepto:</span>
                <span className="font-bold text-neutral-800">{deletingMovement.category || 'General'}</span>
              </div>
              <div className="flex items-center justify-between pb-2 border-b border-neutral-200">
                <span className="text-neutral-500 font-medium">Descripción:</span>
                <span className="text-neutral-700 text-right max-w-[200px] truncate">
                  {deletingMovement.description || '-'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-neutral-500 font-medium">Fecha:</span>
                <span className="text-neutral-700 font-mono">
                  {formatDate(deletingMovement.date, 'full')}
                </span>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-3 border-t border-neutral-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setDeleteModalOpen(false)}
              disabled={isDeleting}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="danger"
              size="sm"
              onClick={handleConfirmDelete}
              loading={isDeleting}
              className="flex items-center gap-1.5"
            >
              <Trash2 className="w-4 h-4" />
              Eliminar Definitivamente
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
