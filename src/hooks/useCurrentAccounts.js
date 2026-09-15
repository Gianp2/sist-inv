import { useState, useEffect, useMemo, useCallback } from 'react';
import { COLLECTIONS } from '../constants/collections';
import {
  subscribeCollection,
  addDocument,
  updateDocument,
  getCachedCollection,
} from '../services/firebase/firestore';
import { useCashRegister } from '../context/CashContext';
import { toastAlert } from '../components/ui/Toast';

export function useCurrentAccounts() {
  const { addMovement } = useCashRegister();

  const [movements, setMovements] = useState(() => {
    const cached = getCachedCollection(COLLECTIONS.CURRENT_ACCOUNTS);
    if (!cached) return [];
    return [...cached].sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
  });

  const [customers, setCustomers] = useState(() => {
    const cached = getCachedCollection(COLLECTIONS.CUSTOMERS);
    if (!cached) return [];
    return [...cached];
  });

  const [loading, setLoading] = useState(
    () => !getCachedCollection(COLLECTIONS.CURRENT_ACCOUNTS)
  );

  useEffect(() => {
    const unsubscribeAcc = subscribeCollection(
      COLLECTIONS.CURRENT_ACCOUNTS,
      [],
      (data) => {
        const sorted = (data || []).sort(
          (a, b) => new Date(b.date || 0) - new Date(a.date || 0)
        );
        setMovements(sorted);
        setLoading(false);
      },
      (err) => {
        console.warn('Current accounts subscription fallback:', err);
        setLoading(false);
      }
    );

    const unsubscribeCust = subscribeCollection(
      COLLECTIONS.CUSTOMERS,
      [],
      (data) => {
        setCustomers(data || []);
      },
      (err) => {
        console.warn('Customers subscription fallback in accounts:', err);
      }
    );

    return () => {
      unsubscribeAcc();
      unsubscribeCust();
    };
  }, []);

  // Summary Metrics
  const metrics = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const currentMonthStr = todayStr.substring(0, 7);

    // Sum total outstanding balance from customers
    const totalDebt = customers.reduce(
      (sum, c) => sum + (Math.max(0, Number(c.currentBalance) || 0)),
      0
    );

    const debtorCustomers = customers.filter(
      (c) => (Number(c.currentBalance) || 0) > 0
    );

    const payments = movements.filter((m) => m.type === 'PAGO' || m.type === 'ENTREGA');

    const totalCollectedMonth = payments
      .filter((m) => m.date && m.date.startsWith(currentMonthStr))
      .reduce((sum, m) => sum + (Number(m.amount) || 0), 0);

    const totalCollectedToday = payments
      .filter((m) => m.date && m.date.startsWith(todayStr))
      .reduce((sum, m) => sum + (Number(m.amount) || 0), 0);

    return {
      totalDebt,
      debtorsCount: debtorCustomers.length,
      totalCustomers: customers.length,
      totalCollectedMonth,
      totalCollectedToday,
    };
  }, [customers, movements]);

  /**
   * Register a payment or partial payment from a customer
   * Automatically:
   * 1. Updates customer's debt in customers collection
   * 2. Appends chronological record in currentAccounts collection
   * 3. Registers money entry into active Cash Register / Turno
   */
  const registerPayment = useCallback(
    async ({
      customerId,
      amount,
      paymentMethod = 'EFECTIVO',
      notes = '',
      user = 'Administrador',
      date = new Date().toISOString(),
    }) => {
      const numAmount = Math.abs(Number(amount)) || 0;
      if (numAmount <= 0) {
        throw new Error('El importe del pago debe ser mayor a $ 0.');
      }

      const customer = customers.find((c) => c.id === customerId);
      if (!customer) {
        throw new Error('Cliente no encontrado.');
      }

      const currentDebt = Number(customer.currentBalance) || 0;
      const newDebt = Math.max(0, currentDebt - numAmount);
      const totalPaidUpdated = (Number(customer.totalPaid) || 0) + numAmount;

      // 1. Update customer balance in Firestore & local cache
      await updateDocument(COLLECTIONS.CUSTOMERS, customerId, {
        currentBalance: newDebt,
        totalPaid: totalPaidUpdated,
        lastPaymentDate: date,
        lastPaymentAmount: numAmount,
      });

      // 2. Append movement in currentAccounts
      const paymentDoc = await addDocument(COLLECTIONS.CURRENT_ACCOUNTS, {
        customerId,
        customerName: customer.name,
        customerPhone: customer.phone || '',
        type: 'PAGO',
        amount: numAmount,
        paymentMethod,
        notes: notes || 'Entrega / Pago de cuenta corriente',
        user,
        date,
        previousBalance: currentDebt,
        balanceAfter: newDebt,
      });

      // 3. Register cash movement in active cash register
      try {
        await addMovement({
          type: 'INGRESO',
          category: 'Cobro de Cuenta Corriente',
          amount: numAmount,
          description: `Cobro Cta. Cte. - ${customer.name}${notes ? ` (${notes})` : ''}`,
          paymentMethod,
          user,
          date,
        });
      } catch (err) {
        console.warn('Notice adding cash movement for account payment:', err);
      }

      return paymentDoc;
    },
    [customers, addMovement]
  );

  /**
   * Register a new debt on customer account (e.g. from credit sale or manual adjustment)
   */
  const registerDebt = useCallback(
    async ({
      customerId,
      amount,
      saleId = null,
      saleNumber = null,
      itemsSummary = '',
      notes = '',
      user = 'Administrador',
      date = new Date().toISOString(),
    }) => {
      const numAmount = Math.abs(Number(amount)) || 0;
      if (numAmount <= 0) {
        throw new Error('El importe de la deuda debe ser mayor a $ 0.');
      }

      const customer = customers.find((c) => c.id === customerId);
      if (!customer) {
        throw new Error('Cliente no encontrado.');
      }

      const currentDebt = Number(customer.currentBalance) || 0;
      const newDebt = currentDebt + numAmount;
      const totalCreditPurchases = (Number(customer.totalCreditPurchases) || 0) + numAmount;

      // Update customer balance
      await updateDocument(COLLECTIONS.CUSTOMERS, customerId, {
        currentBalance: newDebt,
        totalCreditPurchases,
        lastPurchaseDate: date,
      });

      // Record in currentAccounts
      const debtDoc = await addDocument(COLLECTIONS.CURRENT_ACCOUNTS, {
        customerId,
        customerName: customer.name,
        customerPhone: customer.phone || '',
        type: 'DEUDA',
        amount: numAmount,
        saleId,
        saleNumber,
        itemsSummary,
        notes: notes || `Venta a Crédito ${saleNumber || ''}`,
        user,
        date,
        previousBalance: currentDebt,
        balanceAfter: newDebt,
      });

      return debtDoc;
    },
    [customers]
  );

  /**
   * Get all chronological movements for a single customer
   */
  const getCustomerMovements = useCallback(
    (customerId) => {
      if (!customerId) return [];
      return movements.filter((m) => m.customerId === customerId);
    },
    [movements]
  );

  return {
    movements,
    customers,
    loading,
    metrics,
    registerPayment,
    registerDebt,
    getCustomerMovements,
  };
}
