import { useState, useMemo } from 'react';
import { useCashRegister } from '../../context/CashContext';
import { useAuth } from '../../hooks/useAuth';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { exportToExcel } from '../../utils/exportUtils';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
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
  Wallet,
  Building2,
  CreditCard,
  Banknote,
  Smartphone,
  CheckCircle2,
  Clock,
  User,
  FileText,
  AlertTriangle,
  Receipt,
  Scale,
  Pencil,
  Trash2,
} from 'lucide-react';
import {
  PAYMENT_METHODS,
  INCOME_CATEGORIES,
  EXPENSE_CATEGORIES,
} from '../../constants/clothingConstants';
import { toast } from 'sonner';

export function Caja() {
  const {
    currentShift,
    isCashOpen,
    movements: shiftMovements,
    allMovements,
    openCash,
    closeCash,
    addMovement,
    updateMovement,
    deleteMovement,
  } = useCashRegister();
  const { user } = useAuth();

  // Modals state
  const [openModalOpen, setOpenModalOpen] = useState(false);
  const [closeModalOpen, setCloseModalOpen] = useState(false);
  const [incomeModalOpen, setIncomeModalOpen] = useState(false);
  const [expenseModalOpen, setExpenseModalOpen] = useState(false);

  // Edit / Delete Movement State
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

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deletingMovement, setDeletingMovement] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Form states - Open / Close
  const [initialAmount, setInitialAmount] = useState('5000');
  const [actualClosingCash, setActualClosingCash] = useState('');
  const [closingNotes, setClosingNotes] = useState('');

  // Form states - Movement (Ingreso / Egreso)
  const [movAmount, setMovAmount] = useState('');
  const [movCategory, setMovCategory] = useState('');
  const [movDesc, setMovDesc] = useState('');
  const [movPaymentMethod, setMovPaymentMethod] = useState('EFECTIVO');
  const [movDate, setMovDate] = useState(() => new Date().toISOString().split('T')[0]);

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [paymentFilter, setPaymentFilter] = useState('ALL');

  // --- Handlers ---
  const handleOpenCash = async (e) => {
    e.preventDefault();
    try {
      const amount = Number(initialAmount) || 0;
      await openCash(amount, user?.displayName || 'Administrador');
      toast.success('¡Caja abierta exitosamente!');
      setOpenModalOpen(false);
      setInitialAmount('5000');
    } catch (err) {
      toast.error(err.message || 'Error al abrir caja');
    }
  };

  const handleCloseCash = async (e) => {
    e.preventDefault();
    try {
      const actualCash = Number(actualClosingCash) || 0;
      await closeCash(actualCash, closingNotes, user?.displayName || 'Administrador');
      toast.success('¡Cierre de caja completado!');
      setCloseModalOpen(false);
      setActualClosingCash('');
      setClosingNotes('');
    } catch (err) {
      toast.error(err.message || 'Error al cerrar caja');
    }
  };

  const handleSaveIncome = async (e) => {
    e.preventDefault();
    const amount = Number(movAmount);
    if (!amount || amount <= 0) {
      toast.error('Por favor ingresa un monto válido mayor a 0');
      return;
    }
    try {
      await addMovement({
        type: 'INGRESO',
        category: movCategory || 'Venta Mostrador',
        amount: amount,
        description: movDesc || 'Ingreso manual de caja',
        paymentMethod: movPaymentMethod,
        user: user?.displayName || 'Administrador',
        date: movDate ? new Date(movDate + 'T12:00:00').toISOString() : new Date().toISOString(),
      });
      toast.success('Ingreso registrado correctamente');
      setIncomeModalOpen(false);
      setMovAmount('');
      setMovDesc('');
      setMovCategory('');
      setMovPaymentMethod('EFECTIVO');
    } catch (err) {
      toast.error(err.message || 'Error al registrar ingreso');
    }
  };

  const handleSaveExpense = async (e) => {
    e.preventDefault();
    const amount = Number(movAmount);
    if (!amount || amount <= 0) {
      toast.error('Por favor ingresa un monto válido mayor a 0');
      return;
    }
    try {
      await addMovement({
        type: 'EGRESO',
        category: movCategory || 'Gastos Varios',
        amount: amount,
        description: movDesc || 'Egreso / Gasto manual',
        paymentMethod: movPaymentMethod,
        user: user?.displayName || 'Administrador',
        date: movDate ? new Date(movDate + 'T12:00:00').toISOString() : new Date().toISOString(),
      });
      toast.success('Egreso registrado correctamente');
      setExpenseModalOpen(false);
      setMovAmount('');
      setMovDesc('');
      setMovCategory('');
      setMovPaymentMethod('EFECTIVO');
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

  // --- Calculations for Current Shift ---
  const activeMovements = isCashOpen ? (shiftMovements || []) : ((allMovements || []).slice(0, 50));

  const shiftIncomes = useMemo(() => {
    return (isCashOpen ? shiftMovements : []).filter(
      (m) => m.type === 'INGRESO' || m.type === 'VENTA'
    );
  }, [isCashOpen, shiftMovements]);

  const shiftExpenses = useMemo(() => {
    return (isCashOpen ? shiftMovements : []).filter(
      (m) => m.type === 'EGRESO' || m.type === 'RETIRO' || m.type === 'GASTO' || m.type === 'COMPRA'
    );
  }, [isCashOpen, shiftMovements]);

  const totalIncomes = useMemo(() => {
    return shiftIncomes.reduce((acc, m) => acc + (Number(m.amount) || 0), 0);
  }, [shiftIncomes]);

  const totalExpenses = useMemo(() => {
    return shiftExpenses.reduce((acc, m) => acc + (Number(m.amount) || 0), 0);
  }, [shiftExpenses]);

  const expectedCashInHand = useMemo(() => {
    if (!isCashOpen || !currentShift) return 0;
    const cashIncomes = shiftIncomes
      .filter((m) => m.paymentMethod === 'EFECTIVO' || !m.paymentMethod)
      .reduce((acc, m) => acc + (Number(m.amount) || 0), 0);
    const cashExpenses = shiftExpenses
      .filter((m) => m.paymentMethod === 'EFECTIVO' || !m.paymentMethod)
      .reduce((acc, m) => acc + (Number(m.amount) || 0), 0);
    return (Number(currentShift.initialAmount) || 0) + cashIncomes - cashExpenses;
  }, [isCashOpen, currentShift, shiftIncomes, shiftExpenses]);

  const expectedTotalBalance = useMemo(() => {
    if (!isCashOpen || !currentShift) return 0;
    return (Number(currentShift.initialAmount) || 0) + totalIncomes - totalExpenses;
  }, [isCashOpen, currentShift, totalIncomes, totalExpenses]);

  // Payment Breakdown
  const paymentBreakdown = useMemo(() => {
    const methods = {
      EFECTIVO: 0,
      MERCADOPAGO: 0,
      TRANSFERENCIA: 0,
      TARJETA_DEBITO: 0,
      TARJETA_CREDITO: 0,
    };
    (isCashOpen ? shiftMovements : []).forEach((m) => {
      const pm = m.paymentMethod || 'EFECTIVO';
      const amt = Number(m.amount) || 0;
      const isPositive = m.type === 'INGRESO' || m.type === 'VENTA';
      if (methods[pm] !== undefined) {
        methods[pm] += isPositive ? amt : -amt;
      }
    });
    return methods;
  }, [isCashOpen, shiftMovements]);

  // Filtered movements for the table
  const filteredMovements = useMemo(() => {
    return activeMovements.filter((m) => {
      const matchesSearch =
        m.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.user?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesType =
        typeFilter === 'ALL'
          ? true
          : typeFilter === 'INGRESO'
          ? m.type === 'INGRESO' || m.type === 'VENTA'
          : m.type === 'EGRESO' || m.type === 'GASTO' || m.type === 'RETIRO' || m.type === 'COMPRA';

      const matchesPayment =
        paymentFilter === 'ALL' ? true : (m.paymentMethod || 'EFECTIVO') === paymentFilter;

      return matchesSearch && matchesType && matchesPayment;
    });
  }, [activeMovements, searchTerm, typeFilter, paymentFilter]);

  // Export handler
  const handleExportMovements = () => {
    if (filteredMovements.length === 0) {
      toast.error('No hay movimientos para exportar');
      return;
    }
    const dataToExport = filteredMovements.map((m) => ({
      Fecha: formatDate(m.date),
      Tipo: m.type,
      Categoría: m.category || '-',
      Descripción: m.description || '-',
      Monto: Number(m.amount) || 0,
      'Método de Pago': m.paymentMethod || 'EFECTIVO',
      Usuario: m.user || 'Sistema',
    }));
    exportToExcel(dataToExport, `Movimientos_Caja_${new Date().toISOString().split('T')[0]}`);
    toast.success('Archivo exportado con éxito');
  };

  // Difference calculation during closing modal
  const closingDifference = (Number(actualClosingCash) || 0) - expectedCashInHand;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header with Title & Quick Action Buttons */}
      <div className="card-panel flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-neutral-200/90 shadow-xs">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-neutral-900">
              Gestión de Caja Diaria
            </h1>
            <Badge variant={isCashOpen ? 'success' : 'neutral'} className="text-xs px-2.5 py-1">
              {isCashOpen ? (
                <span className="flex items-center gap-1.5 font-semibold">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  Caja Abierta
                </span>
              ) : (
                <span className="flex items-center gap-1.5 font-semibold">
                  <Lock className="w-3 h-3 text-neutral-500" />
                  Caja Cerrada
                </span>
              )}
            </Badge>
          </div>
          <p className="text-sm text-neutral-500 mt-1">
            {isCashOpen && currentShift
              ? `Turno iniciado por ${currentShift.openedBy} el ${formatDate(currentShift.openedAt)}`
              : 'Abre la caja diaria para registrar ventas, ingresos y egresos'}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          {!isCashOpen ? (
            <Button
              onClick={() => setOpenModalOpen(true)}
              className="bg-neutral-900 hover:bg-neutral-800 text-white font-semibold shadow-xs"
            >
              <Unlock className="w-4 h-4 mr-2" />
              Abrir Caja
            </Button>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={() => setIncomeModalOpen(true)}
                className="border-emerald-200 text-emerald-700 hover:bg-emerald-50 hover:border-emerald-300 font-semibold"
              >
                <PlusCircle className="w-4 h-4 mr-1.5 text-emerald-600" />
                Registrar Ingreso
              </Button>
              <Button
                variant="outline"
                onClick={() => setExpenseModalOpen(true)}
                className="border-rose-200 text-rose-700 hover:bg-rose-50 hover:border-rose-300 font-semibold"
              >
                <MinusCircle className="w-4 h-4 mr-1.5 text-rose-600" />
                Registrar Egreso
              </Button>
              <Button
                onClick={() => {
                  setActualClosingCash(expectedCashInHand.toString());
                  setCloseModalOpen(true);
                }}
                className="bg-neutral-900 hover:bg-neutral-800 text-white font-semibold shadow-xs"
              >
                <Lock className="w-4 h-4 mr-2" />
                Cerrar Caja
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Main KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Monto Inicial */}
        <Card className="bg-white border border-neutral-200/90 shadow-xs">
          <div className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                Monto Inicial
              </span>
              <div className="w-9 h-9 rounded-xl bg-neutral-100 text-neutral-700 flex items-center justify-center">
                <Wallet className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-2xl font-bold text-neutral-900 tracking-tight">
                {isCashOpen && currentShift
                  ? formatCurrency(currentShift.initialAmount)
                  : formatCurrency(0)}
              </span>
              <p className="text-xs text-neutral-500 mt-1">Fondo de cambio al abrir</p>
            </div>
          </div>
        </Card>

        {/* Card 2: Ingresos del Turno */}
        <Card className="bg-white border border-neutral-200/90 shadow-xs">
          <div className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">
                Ingresos Totales
              </span>
              <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <ArrowUpRight className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-2xl font-bold text-emerald-600 tracking-tight">
                +{formatCurrency(totalIncomes)}
              </span>
              <p className="text-xs text-neutral-500 mt-1">
                {shiftIncomes.length} movimiento(s) de ingreso
              </p>
            </div>
          </div>
        </Card>

        {/* Card 3: Egresos del Turno */}
        <Card className="bg-white border border-neutral-200/90 shadow-xs">
          <div className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-rose-700 uppercase tracking-wider">
                Egresos / Gastos
              </span>
              <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                <ArrowDownRight className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-2xl font-bold text-rose-600 tracking-tight">
                -{formatCurrency(totalExpenses)}
              </span>
              <p className="text-xs text-neutral-500 mt-1">
                {shiftExpenses.length} retiro(s) y gasto(s)
              </p>
            </div>
          </div>
        </Card>

        {/* Card 4: Efectivo Esperado en Mano */}
        <Card className="bg-white border border-neutral-200/90 shadow-xs">
          <div className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-neutral-900 uppercase tracking-wider">
                Efectivo en Caja
              </span>
              <div className="w-9 h-9 rounded-xl bg-neutral-900 text-white flex items-center justify-center">
                <CircleDollarSign className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-2xl font-bold text-neutral-900 tracking-tight">
                {formatCurrency(expectedCashInHand)}
              </span>
              <p className="text-xs text-neutral-500 mt-1">
                Total neto esperado: {formatCurrency(expectedTotalBalance)}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Methods of Payment Distribution */}
      {isCashOpen && (
        <div className="card-panel bg-white p-5 rounded-2xl border border-neutral-200/90 shadow-xs">
          <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-500 mb-3">
            Desglose por Medio de Pago en el Turno
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <div className="p-3 rounded-xl bg-neutral-50 border border-neutral-100">
              <div className="flex items-center gap-1.5 text-xs text-neutral-600 font-medium mb-1">
                <Banknote className="w-3.5 h-3.5 text-emerald-600" />
                Efectivo
              </div>
              <span className="text-base font-bold text-neutral-900">
                {formatCurrency(paymentBreakdown.EFECTIVO)}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-neutral-50 border border-neutral-100">
              <div className="flex items-center gap-1.5 text-xs text-neutral-600 font-medium mb-1">
                <Smartphone className="w-3.5 h-3.5 text-sky-600" />
                Mercado Pago
              </div>
              <span className="text-base font-bold text-neutral-900">
                {formatCurrency(paymentBreakdown.MERCADOPAGO)}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-neutral-50 border border-neutral-100">
              <div className="flex items-center gap-1.5 text-xs text-neutral-600 font-medium mb-1">
                <Building2 className="w-3.5 h-3.5 text-indigo-600" />
                Transferencia
              </div>
              <span className="text-base font-bold text-neutral-900">
                {formatCurrency(paymentBreakdown.TRANSFERENCIA)}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-neutral-50 border border-neutral-100">
              <div className="flex items-center gap-1.5 text-xs text-neutral-600 font-medium mb-1">
                <CreditCard className="w-3.5 h-3.5 text-violet-600" />
                Débito
              </div>
              <span className="text-base font-bold text-neutral-900">
                {formatCurrency(paymentBreakdown.TARJETA_DEBITO)}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-neutral-50 border border-neutral-100">
              <div className="flex items-center gap-1.5 text-xs text-neutral-600 font-medium mb-1">
                <CreditCard className="w-3.5 h-3.5 text-amber-600" />
                Crédito
              </div>
              <span className="text-base font-bold text-neutral-900">
                {formatCurrency(paymentBreakdown.TARJETA_CREDITO)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Movements Table Section */}
      <Card className="bg-white border border-neutral-200/90 shadow-xs">
        <CardHeader className="p-5 border-b border-neutral-100">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-neutral-900">
                {isCashOpen ? 'Movimientos del Turno Actual' : 'Últimos Movimientos Registrados'}
              </h2>
              <p className="text-xs text-neutral-500 mt-0.5">
                {filteredMovements.length} registro(s) encontrado(s)
              </p>
            </div>

            {/* Filters Bar */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative min-w-[200px]">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input
                  type="text"
                  placeholder="Buscar movimiento..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl bg-neutral-50 border border-neutral-200 focus:outline-none focus:ring-1 focus:ring-neutral-900 focus:bg-white"
                />
              </div>

              {/* Type Filter */}
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="px-3 py-1.5 text-xs rounded-xl bg-neutral-50 border border-neutral-200 focus:outline-none focus:ring-1 focus:ring-neutral-900 text-neutral-700 font-medium"
              >
                <option value="ALL">Todos los tipos</option>
                <option value="INGRESO">Solo Ingresos / Ventas</option>
                <option value="EGRESO">Solo Egresos / Gastos</option>
              </select>

              {/* Payment Method Filter */}
              <select
                value={paymentFilter}
                onChange={(e) => setPaymentFilter(e.target.value)}
                className="px-3 py-1.5 text-xs rounded-xl bg-neutral-50 border border-neutral-200 focus:outline-none focus:ring-1 focus:ring-neutral-900 text-neutral-700 font-medium"
              >
                <option value="ALL">Todos los medios</option>
                {PAYMENT_METHODS.map((pm) => (
                  <option key={pm.id} value={pm.id}>
                    {pm.label}
                  </option>
                ))}
              </select>

              {/* Export Button */}
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportMovements}
                className="text-xs font-semibold text-neutral-700"
              >
                <Download className="w-3.5 h-3.5 mr-1" />
                Exportar
              </Button>
            </div>
          </div>
        </CardHeader>

        {/* Table Content */}
        <div className="overflow-x-auto">
          {filteredMovements.length === 0 ? (
            <div className="py-12 text-center">
              <Receipt className="w-10 h-10 text-neutral-300 mx-auto mb-2" />
              <p className="text-sm font-semibold text-neutral-700">
                No hay movimientos registrados
              </p>
              <p className="text-xs text-neutral-400 mt-1 max-w-sm mx-auto">
                {isCashOpen
                  ? 'Registra ingresos o egresos manuales utilizando los botones superiores.'
                  : 'Abre la caja para comenzar a registrar operaciones.'}
              </p>
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="bg-neutral-50/80 text-neutral-500 font-semibold border-b border-neutral-100">
                <tr>
                  <th className="py-3 px-4">Fecha y Hora</th>
                  <th className="py-3 px-4">Tipo</th>
                  <th className="py-3 px-4">Categoría</th>
                  <th className="py-3 px-4">Descripción</th>
                  <th className="py-3 px-4">Medio de Pago</th>
                  <th className="py-3 px-4">Usuario</th>
                  <th className="py-3 px-4 text-right">Monto</th>
                  <th className="py-3 px-4 text-center w-24">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {filteredMovements.map((mov) => {
                  const isIncome = mov.type === 'INGRESO' || mov.type === 'VENTA';
                  return (
                    <tr
                      key={mov.id}
                      className="hover:bg-neutral-50/60 transition-colors duration-100"
                    >
                      <td className="py-3 px-4 text-neutral-600 font-medium whitespace-nowrap">
                        {formatDate(mov.date || mov.createdAt)}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold ${
                            isIncome
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}
                        >
                          {isIncome ? (
                            <ArrowUpRight className="w-3 h-3 text-emerald-600" />
                          ) : (
                            <ArrowDownRight className="w-3 h-3 text-rose-600" />
                          )}
                          {mov.type}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-neutral-700 font-medium">
                        {mov.category || '-'}
                      </td>
                      <td className="py-3 px-4 text-neutral-900 font-medium max-w-xs truncate">
                        {mov.description || '-'}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <Badge variant="outline" className="text-[10px] font-semibold py-0.5">
                          {mov.paymentMethod || 'EFECTIVO'}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-neutral-600">{mov.user || 'Sistema'}</td>
                      <td
                        className={`py-3 px-4 text-right font-bold text-sm whitespace-nowrap ${
                          isIncome ? 'text-emerald-600' : 'text-rose-600'
                        }`}
                      >
                        {isIncome ? '+' : '-'}
                        {formatCurrency(mov.amount)}
                      </td>
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(mov)}
                            title="Editar movimiento"
                            className="p-1.5 rounded-lg text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 transition-colors cursor-pointer"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenDelete(mov)}
                            title="Eliminar movimiento"
                            className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </Card>

      {/* ========================================================================= */}
      {/* MODAL 1: APERTURA DE CAJA */}
      {/* ========================================================================= */}
      <Modal
        isOpen={openModalOpen}
        onClose={() => setOpenModalOpen(false)}
        title="Apertura de Caja Diaria"
        size="md"
      >
        <form onSubmit={handleOpenCash} className="space-y-4">
          <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200 text-xs text-neutral-600">
            Ingresa el monto de efectivo con el que se inicia el turno (fondo de cambio).
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-700 mb-1">
              Monto Inicial de Efectivo ($) *
            </label>
            <Input
              type="number"
              min="0"
              step="any"
              required
              value={initialAmount}
              onChange={(e) => setInitialAmount(e.target.value)}
              placeholder="Ej: 5000"
              className="text-base font-bold"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-neutral-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpenModalOpen(false)}
              className="text-xs"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="bg-neutral-900 hover:bg-neutral-800 text-white font-semibold text-xs shadow-xs"
            >
              <Unlock className="w-3.5 h-3.5 mr-1.5" />
              Confirmar y Abrir Turno
            </Button>
          </div>
        </form>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL 2: CIERRE DE CAJA (ARQUEO) */}
      {/* ========================================================================= */}
      <Modal
        isOpen={closeModalOpen}
        onClose={() => setCloseModalOpen(false)}
        title="Cierre de Caja & Arqueo"
        size="lg"
      >
        <form onSubmit={handleCloseCash} className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4 bg-neutral-50 rounded-xl border border-neutral-200 text-xs">
            <div>
              <span className="text-neutral-500 block">Fondo Inicial</span>
              <span className="font-bold text-neutral-900 text-sm">
                {formatCurrency(currentShift?.initialAmount || 0)}
              </span>
            </div>
            <div>
              <span className="text-neutral-500 block">Ingresos en Efectivo</span>
              <span className="font-bold text-emerald-600 text-sm">
                +{formatCurrency(paymentBreakdown.EFECTIVO)}
              </span>
            </div>
            <div>
              <span className="text-neutral-500 block">Efectivo Esperado</span>
              <span className="font-bold text-neutral-900 text-sm">
                {formatCurrency(expectedCashInHand)}
              </span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-700 mb-1">
              Efectivo Real Contado en Caja ($) *
            </label>
            <Input
              type="number"
              min="0"
              step="any"
              required
              value={actualClosingCash}
              onChange={(e) => setActualClosingCash(e.target.value)}
              placeholder="Ingresa el dinero físico contado"
              className="text-base font-bold"
            />
          </div>

          {/* Difference notice */}
          {actualClosingCash !== '' && (
            <div
              className={`p-3 rounded-xl border text-xs flex items-center justify-between ${
                Math.abs(closingDifference) < 0.01
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : closingDifference > 0
                  ? 'bg-amber-50 border-amber-200 text-amber-800'
                  : 'bg-rose-50 border-rose-200 text-rose-800'
              }`}
            >
              <div className="flex items-center gap-2">
                <Scale className="w-4 h-4" />
                <span>
                  {Math.abs(closingDifference) < 0.01
                    ? 'Arqueo perfecto: Sin diferencias.'
                    : closingDifference > 0
                    ? 'Sobrante en caja:'
                    : 'Faltante en caja:'}
                </span>
              </div>
              <span className="font-bold text-sm">
                {closingDifference > 0 ? '+' : ''}
                {formatCurrency(closingDifference)}
              </span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-neutral-700 mb-1">
              Observaciones / Notas de Cierre (Opcional)
            </label>
            <textarea
              rows={2}
              value={closingNotes}
              onChange={(e) => setClosingNotes(e.target.value)}
              placeholder="Detalle de retiro de dinero, observaciones de turno..."
              className="w-full px-3 py-2 text-xs rounded-xl bg-white border border-neutral-200 focus:outline-none focus:ring-1 focus:ring-neutral-900"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-neutral-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => setCloseModalOpen(false)}
              className="text-xs"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="bg-neutral-900 hover:bg-neutral-800 text-white font-semibold text-xs shadow-xs"
            >
              <Lock className="w-3.5 h-3.5 mr-1.5" />
              Finalizar y Cerrar Turno
            </Button>
          </div>
        </form>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL 3: REGISTRO DE INGRESO MANUAL */}
      {/* ========================================================================= */}
      <Modal
        isOpen={incomeModalOpen}
        onClose={() => setIncomeModalOpen(false)}
        title="Registrar Ingreso Manual"
        size="md"
      >
        <form onSubmit={handleSaveIncome} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">
                Monto ($) *
              </label>
              <Input
                type="number"
                min="1"
                step="any"
                required
                value={movAmount}
                onChange={(e) => setMovAmount(e.target.value)}
                placeholder="0.00"
                className="font-bold"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">
                Medio de Pago
              </label>
              <select
                value={movPaymentMethod}
                onChange={(e) => setMovPaymentMethod(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl bg-white border border-neutral-200 focus:outline-none focus:ring-1 focus:ring-neutral-900"
              >
                {PAYMENT_METHODS.map((pm) => (
                  <option key={pm.id} value={pm.id}>
                    {pm.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-700 mb-1">
              Categoría del Ingreso
            </label>
            <select
              value={movCategory}
              onChange={(e) => setMovCategory(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl bg-white border border-neutral-200 focus:outline-none focus:ring-1 focus:ring-neutral-900"
            >
              <option value="">Selecciona categoría...</option>
              {INCOME_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-700 mb-1">
              Descripción / Motivo *
            </label>
            <Input
              type="text"
              required
              value={movDesc}
              onChange={(e) => setMovDesc(e.target.value)}
              placeholder="Ej: Cobro de seña, ajuste de caja, etc."
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-700 mb-1">Fecha</label>
            <Input
              type="date"
              value={movDate}
              onChange={(e) => setMovDate(e.target.value)}
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-neutral-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIncomeModalOpen(false)}
              className="text-xs"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-xs"
            >
              <PlusCircle className="w-3.5 h-3.5 mr-1.5" />
              Guardar Ingreso
            </Button>
          </div>
        </form>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL 4: REGISTRO DE EGRESO MANUAL */}
      {/* ========================================================================= */}
      <Modal
        isOpen={expenseModalOpen}
        onClose={() => setExpenseModalOpen(false)}
        title="Registrar Egreso / Gasto"
        size="md"
      >
        <form onSubmit={handleSaveExpense} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">
                Monto ($) *
              </label>
              <Input
                type="number"
                min="1"
                step="any"
                required
                value={movAmount}
                onChange={(e) => setMovAmount(e.target.value)}
                placeholder="0.00"
                className="font-bold"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">
                Medio de Pago
              </label>
              <select
                value={movPaymentMethod}
                onChange={(e) => setMovPaymentMethod(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl bg-white border border-neutral-200 focus:outline-none focus:ring-1 focus:ring-neutral-900"
              >
                {PAYMENT_METHODS.map((pm) => (
                  <option key={pm.id} value={pm.id}>
                    {pm.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-700 mb-1">
              Categoría del Egreso
            </label>
            <select
              value={movCategory}
              onChange={(e) => setMovCategory(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl bg-white border border-neutral-200 focus:outline-none focus:ring-1 focus:ring-neutral-900"
            >
              <option value="">Selecciona categoría...</option>
              {EXPENSE_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-700 mb-1">
              Motivo / Detalle *
            </label>
            <Input
              type="text"
              required
              value={movDesc}
              onChange={(e) => setMovDesc(e.target.value)}
              placeholder="Ej: Pago de flete, insumos de limpieza, viáticos..."
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-700 mb-1">Fecha</label>
            <Input
              type="date"
              value={movDate}
              onChange={(e) => setMovDate(e.target.value)}
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-neutral-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => setExpenseModalOpen(false)}
              className="text-xs"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs shadow-xs"
            >
              <MinusCircle className="w-3.5 h-3.5 mr-1.5" />
              Guardar Egreso
            </Button>
          </div>
        </form>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL 5: EDITAR MOVIMIENTO */}
      {/* ========================================================================= */}
      <Modal
        isOpen={editModalOpen}
        onClose={() => !isSavingEdit && setEditModalOpen(false)}
        title="Editar Movimiento de Caja"
        size="md"
      >
        <form onSubmit={handleSaveEdit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-neutral-700 mb-1.5">
              Tipo de Movimiento *
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setEditType('INGRESO');
                  setEditCategory(INCOME_CATEGORIES[0]);
                  setEditCustomCategory('');
                }}
                className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                  editType === 'INGRESO'
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300 ring-1 ring-emerald-300'
                    : 'bg-white text-neutral-600 border-neutral-200 hover:bg-neutral-50'
                }`}
              >
                <ArrowUpRight className="w-4 h-4 text-emerald-600" />
                Ingreso de Dinero
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditType('EGRESO');
                  setEditCategory(EXPENSE_CATEGORIES[0]);
                  setEditCustomCategory('');
                }}
                className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                  editType === 'EGRESO'
                    ? 'bg-rose-50 text-rose-800 border-rose-300 ring-1 ring-rose-300'
                    : 'bg-white text-neutral-600 border-neutral-200 hover:bg-neutral-50'
                }`}
              >
                <ArrowDownRight className="w-4 h-4 text-rose-600" />
                Egreso / Gasto
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">
                Monto ($) *
              </label>
              <Input
                type="number"
                min="1"
                step="any"
                required
                value={editAmount}
                onChange={(e) => setEditAmount(e.target.value)}
                placeholder="0.00"
                autoFocus
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">
                Medio de Pago *
              </label>
              <select
                value={editPaymentMethod}
                onChange={(e) => setEditPaymentMethod(e.target.value)}
                className="w-full text-xs rounded-lg border border-neutral-200 px-3 py-2 bg-white text-neutral-800"
              >
                {PAYMENT_METHODS.map((method) => (
                  <option key={method.id} value={method.id}>
                    {method.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-700 mb-1">
              Categoría *
            </label>
            <select
              value={editCategory}
              onChange={(e) => setEditCategory(e.target.value)}
              className="w-full text-xs rounded-lg border border-neutral-200 px-3 py-2 bg-white text-neutral-800"
              required
            >
              {(editType === 'INGRESO' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES).map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
              <option value="OTRO">Otra categoría (personalizada)...</option>
            </select>
          </div>

          {editCategory === 'OTRO' && (
            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">
                Nombre de Categoría *
              </label>
              <Input
                type="text"
                required
                value={editCustomCategory}
                onChange={(e) => setEditCustomCategory(e.target.value)}
                placeholder="Ej: Devolución, Pago especial, etc."
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-neutral-700 mb-1">
              Motivo / Detalle *
            </label>
            <Input
              type="text"
              required
              value={editDesc}
              onChange={(e) => setEditDesc(e.target.value)}
              placeholder="Ej: Remera talle L, factura de luz, etc."
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-700 mb-1">Fecha</label>
            <Input
              type="date"
              value={editDate}
              onChange={(e) => setEditDate(e.target.value)}
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-neutral-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => setEditModalOpen(false)}
              className="text-xs"
              disabled={isSavingEdit}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="bg-neutral-900 hover:bg-neutral-800 text-white font-semibold text-xs shadow-xs"
              loading={isSavingEdit}
            >
              Guardar Cambios
            </Button>
          </div>
        </form>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL 6: CONFIRMAR ELIMINACIÓN */}
      {/* ========================================================================= */}
      <Modal
        isOpen={deleteModalOpen}
        onClose={() => !isDeleting && setDeleteModalOpen(false)}
        title="Eliminar Movimiento"
        size="md"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-rose-50/70 border border-rose-200">
            <div className="p-2 rounded-xl bg-rose-100 text-rose-700 shrink-0 mt-0.5">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div className="text-xs text-rose-900">
              <p className="font-bold mb-1">¿Estás seguro de eliminar este movimiento?</p>
              <p className="text-rose-700 leading-relaxed">
                Esta acción eliminará el registro y recalculará automáticamente los saldos de caja.
              </p>
            </div>
          </div>

          {deletingMovement && (
            <div className="p-3.5 rounded-xl bg-neutral-50 border border-neutral-200 space-y-2 text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-neutral-200">
                <span className="text-neutral-500 font-medium">Tipo:</span>
                <span className="font-bold text-neutral-800">{deletingMovement.type}</span>
              </div>
              <div className="flex items-center justify-between pb-2 border-b border-neutral-200">
                <span className="text-neutral-500 font-medium">Monto:</span>
                <span className="font-black text-sm text-neutral-900">
                  {formatCurrency(deletingMovement.amount)}
                </span>
              </div>
              <div className="flex items-center justify-between pb-2 border-b border-neutral-200">
                <span className="text-neutral-500 font-medium">Categoría:</span>
                <span className="font-semibold text-neutral-800">{deletingMovement.category || '-'}</span>
              </div>
              <div className="flex items-center justify-between pb-2 border-b border-neutral-200">
                <span className="text-neutral-500 font-medium">Descripción:</span>
                <span className="text-neutral-700">{deletingMovement.description || '-'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-neutral-500 font-medium">Fecha:</span>
                <span className="text-neutral-700 font-mono">
                  {formatDate(deletingMovement.date || deletingMovement.createdAt)}
                </span>
              </div>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-neutral-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteModalOpen(false)}
              className="text-xs"
              disabled={isDeleting}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleConfirmDelete}
              loading={isDeleting}
              className="bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs shadow-xs flex items-center gap-1"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Eliminar Definitivamente
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default Caja;
