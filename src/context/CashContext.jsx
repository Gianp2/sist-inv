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
   * Open a new cash shift
   */
  const openCash = useCallback(async (initialAmount = 0, cashierName = 'Administrador', notes = '') => {
    const numInitial = Number(initialAmount) || 0;
    const newShift = {
      openedAt: new Date().toISOString(),
      closedAt: null,
      status: CASH_REGISTER_STATUS.OPEN,
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
      description: 'Apertura de turno con fondo inicial de cambio',
      paymentMethod: 'EFECTIVO',
      user: cashierName,
      date: new Date().toISOString(),
    });

    return docResult;
  }, []);

  /**
   * Close current cash shift (Arqueo)
   */
  const closeCash = useCallback(async (finalCountedAmount = 0, notes = '', closedBy = 'Administrador') => {
    if (!currentShift?.id) throw new Error('No hay ninguna caja abierta en este momento.');

    // Sum positive movements and negative movements in this shift
    const shiftIncomes = currentShiftMovements
      .filter((m) => m.type === 'INGRESO' || m.type === 'VENTA' || m.type === 'APERTURA_CAJA')
      .reduce((acc, m) => acc + (Number(m.amount) || 0), 0);

    const shiftExpenses = currentShiftMovements
      .filter((m) => m.type === 'EGRESO' || m.type === 'RETIRO' || m.type === 'COMPRA' || m.type === 'GASTO')
      .reduce((acc, m) => acc + (Number(m.amount) || 0), 0);

    const expected = (currentShift.initialAmount || 0) + (shiftIncomes - (currentShift.initialAmount || 0)) - shiftExpenses;
    const finalAmount = Number(finalCountedAmount) || 0;
    const difference = finalAmount - expected;

    const closingData = {
      status: CASH_REGISTER_STATUS.CLOSED,
      closedAt: new Date().toISOString(),
      closedBy,
      finalAmount,
      expectedAmount: expected,
      difference,
      closingNotes: notes,
      totalIncome: shiftIncomes,
      totalExpenses: shiftExpenses,
    };

    await updateDocument(COLLECTIONS.CASH_REGISTERS, currentShift.id, closingData);
  }, [currentShift, currentShiftMovements]);

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
