import { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { COLLECTIONS } from '../constants/collections';
import { MOVEMENT_TYPES } from '../constants/clothingConstants';
import { CASH_REGISTER_STATUS } from '../constants/status';
import {
  getCollection,
  addDocument,
  updateDocument,
  deleteDocument,
  subscribeCollection,
  getCachedCollection,
} from '../services/firebase/firestore';

const CashContext = createContext(null);

export function CashProvider({ children }) {
  const [shifts, setShifts] = useState(() => {
    const cached = getCachedCollection(COLLECTIONS.CASH_REGISTERS);
    if (!cached) return [];
    return [...cached].sort((a, b) => new Date(b.openedAt || 0) - new Date(a.openedAt || 0));
  });
  const [allMovements, setAllMovements] = useState(() => {
    const cached = getCachedCollection(COLLECTIONS.CASH_MOVEMENTS);
    if (!cached) return [];
    return [...cached].sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
  });
  const [loading, setLoading] = useState(() => !getCachedCollection(COLLECTIONS.CASH_REGISTERS));

  // Subscribe to all Cash Shifts
  useEffect(() => {
    const unsubscribeShifts = subscribeCollection(
      COLLECTIONS.CASH_REGISTERS,
      [],
      (data) => {
        // Sort newest first
        const sorted = (data || []).sort((a, b) => new Date(b.openedAt || 0) - new Date(a.openedAt || 0));
        setShifts(sorted);
        setLoading(false);
      },
      (err) => {
        console.warn('Cash registers subscription fallback:', err?.message || err);
        setLoading(false);
      }
    );

    // Subscribe to all Cash Movements
    const unsubscribeMovements = subscribeCollection(
      COLLECTIONS.CASH_MOVEMENTS,
      [],
      (data) => {
        const sorted = (data || []).sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
        setAllMovements(sorted);
      },
      (err) => {
        console.warn('Cash movements subscription fallback:', err?.message || err);
      }
    );

    return () => {
      unsubscribeShifts();
      unsubscribeMovements();
    };
  }, []);


  // Find current open shift
  const currentShift = useMemo(() => {
    return shifts.find((s) => s.status === CASH_REGISTER_STATUS.OPEN || s.status === 'open') || null;
  }, [shifts]);

  const isCashOpen = !!currentShift;

  // Movements belonging to current active shift
  const currentShiftMovements = useMemo(() => {
    if (!currentShift?.id) return [];
    return allMovements.filter((m) => m.cashRegisterId === currentShift.id);
  }, [allMovements, currentShift?.id]);

  /**
   * Open a new cash shift (Turno)
   * Allows opening multiple shifts per day independently
   */
  const openCash = useCallback(async (initialAmount = 0, cashierName = 'Administrador', notes = '') => {
    const numInitial = Number(initialAmount) || 0;
    const now = new Date();
    const todayIsoDate = now.toISOString().split('T')[0];

    // Calculate today's shift count for easy reference (Turno 1, Turno 2, etc.)
    const todayShifts = shifts.filter((s) => s.openedAt && s.openedAt.startsWith(todayIsoDate));
    const shiftNumber = todayShifts.length + 1;
    const shiftLabel = `Turno #${shiftNumber} (${now.toLocaleDateString('es-AR')})`;

    const newShift = {
      openedAt: now.toISOString(),
      closedAt: null,
      status: CASH_REGISTER_STATUS.OPEN,
      shiftNumber,
      shiftLabel,
      initialAmount: numInitial,
      totalIncome: 0,
      totalExpenses: 0,
      totalSales: 0,
      expectedAmount: numInitial,
      finalAmount: null,
      difference: 0,
      openedBy: cashierName,
      cashierName,
      closedBy: null,
      notes,
    };

    const docResult = await addDocument(COLLECTIONS.CASH_REGISTERS, newShift);

    // Initial opening movement
    await addDocument(COLLECTIONS.CASH_MOVEMENTS, {
      cashRegisterId: docResult.id,
      type: MOVEMENT_TYPES.INITIAL || 'APERTURA',
      category: 'Fondo Inicial',
      amount: numInitial,
      description: `Apertura ${shiftLabel} con fondo inicial de cambio`,
      paymentMethod: 'EFECTIVO',
      user: cashierName,
      date: now.toISOString(),
    });

    return docResult;
  }, [shifts]);

  /**
   * Close current cash shift (Arqueo de Caja)
   * Saves independent complete snapshot with date/time, user, expected/counted cash,
   * difference, all incomes, expenses, sales, and breakdown by payment method.
   */
  const closeCash = useCallback(async (finalCountedAmount = 0, notes = '', closedBy = 'Administrador') => {
    if (!currentShift?.id) throw new Error('No hay ninguna caja abierta en este momento.');

    // Shift movements
    const movementsInShift = allMovements.filter((m) => m.cashRegisterId === currentShift.id);

    // Calculate physical cash in drawer (only EFECTIVO)
    const cashIncomes = movementsInShift
      .filter(
        (m) =>
          (m.type === 'INGRESO' || m.type === 'VENTA') &&
          (m.paymentMethod === 'EFECTIVO' || !m.paymentMethod)
      )
      .reduce((acc, m) => acc + (Number(m.amount) || 0), 0);

    const cashExpenses = movementsInShift
      .filter(
        (m) =>
          (m.type === 'EGRESO' || m.type === 'RETIRO' || m.type === 'GASTO' || m.type === 'COMPRA') &&
          (m.paymentMethod === 'EFECTIVO' || !m.paymentMethod)
      )
      .reduce((acc, m) => acc + (Number(m.amount) || 0), 0);

    const initialCash = Number(currentShift.initialAmount) || 0;
    const expectedCash = initialCash + cashIncomes - cashExpenses;
    const finalAmount = Number(finalCountedAmount) || 0;
    const difference = finalAmount - expectedCash;

    // All incomes and expenses (across all payment channels)
    const allIncomes = movementsInShift
      .filter((m) => m.type === 'INGRESO' || m.type === 'VENTA')
      .reduce((acc, m) => acc + (Number(m.amount) || 0), 0);

    const allExpenses = movementsInShift
      .filter((m) => m.type === 'EGRESO' || m.type === 'RETIRO' || m.type === 'GASTO' || m.type === 'COMPRA')
      .reduce((acc, m) => acc + (Number(m.amount) || 0), 0);

    const salesMovements = movementsInShift.filter((m) => m.type === 'VENTA');
    const totalSalesAmount = salesMovements.reduce((acc, m) => acc + (Number(m.amount) || 0), 0);

    // Breakdown by payment method
    const breakdown = {
      EFECTIVO: movementsInShift
        .filter((m) => m.type === 'VENTA' && (m.paymentMethod === 'EFECTIVO' || !m.paymentMethod))
        .reduce((acc, m) => acc + (Number(m.amount) || 0), 0),
      TARJETA_DEBITO: movementsInShift
        .filter((m) => m.type === 'VENTA' && m.paymentMethod === 'TARJETA_DEBITO')
        .reduce((acc, m) => acc + (Number(m.amount) || 0), 0),
      TARJETA_CREDITO: movementsInShift
        .filter((m) => m.type === 'VENTA' && m.paymentMethod === 'TARJETA_CREDITO')
        .reduce((acc, m) => acc + (Number(m.amount) || 0), 0),
      TRANSFERENCIA: movementsInShift
        .filter((m) => m.type === 'VENTA' && m.paymentMethod === 'TRANSFERENCIA')
        .reduce((acc, m) => acc + (Number(m.amount) || 0), 0),
      CUENTA_CORRIENTE: movementsInShift
        .filter((m) => m.type === 'VENTA' && m.paymentMethod === 'CUENTA_CORRIENTE')
        .reduce((acc, m) => acc + (Number(m.amount) || 0), 0),
    };

    const closingData = {
      status: CASH_REGISTER_STATUS.CLOSED,
      closedAt: new Date().toISOString(),
      closedBy,
      initialAmount: initialCash,
      finalAmount,
      expectedAmount: expectedCash,
      difference,
      closingNotes: notes,
      totalIncome: allIncomes,
      totalExpenses: allExpenses,
      totalSales: totalSalesAmount,
      salesCount: salesMovements.length,
      movementsCount: movementsInShift.length,
      cashIncomes,
      cashExpenses,
      breakdown,
      movementsSummary: movementsInShift.map((m) => ({
        id: m.id,
        type: m.type,
        amount: m.amount,
        paymentMethod: m.paymentMethod || 'EFECTIVO',
        description: m.description,
        user: m.user,
        date: m.date,
      })),
    };

    await updateDocument(COLLECTIONS.CASH_REGISTERS, currentShift.id, closingData);
    return closingData;
  }, [currentShift, allMovements]);

  /**
   * Add a manual income or expense
   */
  const addMovement = useCallback(async ({
    type = 'INGRESO', // INGRESO or EGRESO
    category = 'Venta Directa',
    amount = 0,
    description = '',
    paymentMethod = 'EFECTIVO',
    user = 'Administrador',
    date = new Date().toISOString(),
  }) => {
    const numAmount = Math.abs(Number(amount)) || 0;
    if (numAmount <= 0) throw new Error('El monto debe ser mayor a 0');

    const movementData = {
      cashRegisterId: currentShift?.id || 'sin_turno',
      type,
      category: category || (type === 'INGRESO' ? 'Ingreso General' : 'Gasto General'),
      amount: numAmount,
      description: description || (type === 'INGRESO' ? 'Ingreso de dinero' : 'Egreso de dinero'),
      paymentMethod: paymentMethod || 'EFECTIVO',
      user,
      date: date || new Date().toISOString(),
    };

    const res = await addDocument(COLLECTIONS.CASH_MOVEMENTS, movementData);

    // If there's an active open shift, update its running totals
    if (currentShift?.id) {
      const updateData = {};
      if (type === 'INGRESO' || type === 'VENTA') {
        updateData.totalIncome = (currentShift.totalIncome || 0) + numAmount;
      } else {
        updateData.totalExpenses = (currentShift.totalExpenses || 0) + numAmount;
      }
      await updateDocument(COLLECTIONS.CASH_REGISTERS, currentShift.id, updateData);
    }

    return res;
  }, [currentShift]);

  /**
   * Update an existing movement (income, expense, etc.)
   */
  const updateMovement = useCallback(async (movementId, updatedFields) => {
    const oldMovement = allMovements.find((m) => m.id === movementId);
    const numAmount = Math.abs(Number(updatedFields.amount)) || 0;
    if (numAmount <= 0) throw new Error('El monto debe ser mayor a 0');

    const newType = updatedFields.type || oldMovement?.type || 'INGRESO';
    const cleanData = {
      ...updatedFields,
      amount: numAmount,
      type: newType,
      updatedAt: new Date().toISOString(),
    };

    await updateDocument(COLLECTIONS.CASH_MOVEMENTS, movementId, cleanData);

    // If belongs to current open shift, sync currentShift totals
    if (currentShift?.id && oldMovement?.cashRegisterId === currentShift.id) {
      const oldAmount = Number(oldMovement.amount) || 0;
      const oldIsIncome = oldMovement.type === 'INGRESO' || oldMovement.type === 'VENTA' || oldMovement.type === 'APERTURA_CAJA';
      const newIsIncome = newType === 'INGRESO' || newType === 'VENTA' || newType === 'APERTURA_CAJA';

      let totalIncome = currentShift.totalIncome || 0;
      let totalExpenses = currentShift.totalExpenses || 0;

      // Revert old amount
      if (oldIsIncome) {
        totalIncome = Math.max(0, totalIncome - oldAmount);
      } else {
        totalExpenses = Math.max(0, totalExpenses - oldAmount);
      }

      // Add new amount
      if (newIsIncome) {
        totalIncome += numAmount;
      } else {
        totalExpenses += numAmount;
      }

      await updateDocument(COLLECTIONS.CASH_REGISTERS, currentShift.id, {
        totalIncome,
        totalExpenses,
      });
    }

    return { id: movementId, ...(oldMovement || {}), ...cleanData };
  }, [allMovements, currentShift]);

  /**
   * Delete movement
   */
  const deleteMovement = useCallback(async (movementId) => {
    const oldMovement = allMovements.find((m) => m.id === movementId);
    await deleteDocument(COLLECTIONS.CASH_MOVEMENTS, movementId);

    if (oldMovement && currentShift?.id && oldMovement.cashRegisterId === currentShift.id) {
      const oldAmount = Number(oldMovement.amount) || 0;
      const isIncome = oldMovement.type === 'INGRESO' || oldMovement.type === 'VENTA' || oldMovement.type === 'APERTURA_CAJA';

      const updateData = {};
      if (isIncome) {
        updateData.totalIncome = Math.max(0, (currentShift.totalIncome || 0) - oldAmount);
      } else {
        updateData.totalExpenses = Math.max(0, (currentShift.totalExpenses || 0) - oldAmount);
      }
      await updateDocument(COLLECTIONS.CASH_REGISTERS, currentShift.id, updateData);
    }
  }, [allMovements, currentShift]);

  /**
   * Delete closed shift record (Admin only)
   */
  const deleteShift = useCallback(async (shiftId) => {
    await deleteDocument(COLLECTIONS.CASH_REGISTERS, shiftId);
  }, []);

  const value = {
    shifts,
    allMovements,
    currentShift,
    movements: currentShiftMovements,
    isCashOpen,
    loading,
    openCash,
    openCashRegister: openCash,
    closeCash,
    closeCashRegister: closeCash,
    deleteShift,
    addMovement,
    updateMovement,
    addManualMovement: (type, amount, description, user, category, paymentMethod) =>
      addMovement({ type, amount, description, user, category, paymentMethod }),
    recordMovement: ({ type, amount, description, user, category, paymentMethod }) =>
      addMovement({ type, amount, description, user, category, paymentMethod }),
    deleteMovement,
  };

  return <CashContext.Provider value={value}>{children}</CashContext.Provider>;
}

export const useCashRegister = () => {
  const context = useContext(CashContext);
  if (!context) {
    throw new Error('useCashRegister must be used within a CashProvider');
  }
  return context;
};
