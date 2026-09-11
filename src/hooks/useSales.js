import { useState, useEffect, useCallback } from 'react';
import { COLLECTIONS } from '../constants/collections';
import { MOVEMENT_TYPES } from '../constants/clothingConstants';
import { SALE_STATUS } from '../constants/status';
import {
  subscribeCollection,
  getCachedCollection,
  addDocument,
  updateDocument,
  getDocument,
} from '../services/firebase/firestore';
import { calculateTotalStock } from '../utils/calculations';
import { toast } from 'sonner';

export function useSales() {
  const [sales, setSales] = useState(() => {
    const cached = getCachedCollection(COLLECTIONS.SALES);
    if (!cached) return [];
    return [...cached].sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
  });
  const [loading, setLoading] = useState(() => !getCachedCollection(COLLECTIONS.SALES));

  useEffect(() => {
    const unsubscribe = subscribeCollection(
      COLLECTIONS.SALES,
      [],
      (data) => {
        // Sort descending by date
        const sorted = (data || []).sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
        setSales(sorted);
        setLoading(false);
      },
      () => setLoading(false)
    );
    return () => unsubscribe();
  }, []);

  /**
   * Process a sale: creates sale document, deducts variant stock, records cash flow
   */
  const processSale = useCallback(async ({
    items,
    totals,
    paymentMethod,
    amountPaid,
    customer,
    user,
    cashRegisterId,
    notes,
  }) => {
    try {
      const saleNumber = `VTA-${Date.now().toString().slice(-6)}`;
      const saleData = {
        saleNumber,
        date: new Date().toISOString(),
        items,
        subtotal: totals.subtotal,
        discountPercent: totals.globalDiscountAmount > 0 ? totals.discountPercent : 0,
        discountAmount: totals.globalDiscountAmount,
        taxAmount: totals.taxAmount,
        total: totals.total,
        totalCost: totals.totalCost,
        profit: totals.estimatedProfit,
        paymentMethod,
        amountPaid: Number(amountPaid) || totals.total,
        changeDue: Math.max(0, (Number(amountPaid) || totals.total) - totals.total),
        customerId: customer?.id || null,
        customerName: customer?.name || 'Consumidor Final',
        sellerId: user?.uid || null,
        sellerName: user?.displayName || 'Vendedor',
        cashRegisterId: cashRegisterId || null,
        status: SALE_STATUS.COMPLETED,
        notes: notes || '',
      };

      // 1. Create Sale record
      const saleDoc = await addDocument(COLLECTIONS.SALES, saleData);

      // 2. Decrement stock for each item / variant
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
            const totalStock = calculateTotalStock(updatedVariants, Math.max(0, (Number(product.stock) || 0) - Number(item.quantity)));
            await updateDocument(COLLECTIONS.PRODUCTS, item.productId, {
              variants: updatedVariants,
              stock: Math.max(0, totalStock),
              lastSaleDate: new Date().toISOString(),
            });

            // Log stock movement
            await addDocument(COLLECTIONS.STOCK_MOVEMENTS, {
              productId: item.productId,
              productName: item.productName,
              variantId: item.variantId,
              size: item.size,
              color: item.color,
              quantity: -item.quantity,
              type: 'VENTA',
              referenceId: saleDoc.id,
              date: new Date().toISOString(),
            });
          }
        } catch (err) {
          console.error('Error updating product stock:', err);
        }
      }

      // 3. Update customer purchase stats if registered
      if (customer?.id) {
        try {
          const currentCust = await getDocument(COLLECTIONS.CUSTOMERS, customer.id);
          if (currentCust) {
            await updateDocument(COLLECTIONS.CUSTOMERS, customer.id, {
              totalPurchases: (Number(currentCust.totalPurchases) || 0) + totals.total,
              purchaseCount: (Number(currentCust.purchaseCount) || 0) + 1,
              lastPurchaseDate: new Date().toISOString(),
            });
          }
        } catch (err) {
          console.error('Error updating customer record:', err);
        }
      }

      // 4. Record Cash Register movement if cash and active shift
      if (cashRegisterId) {
        try {
          await addDocument(COLLECTIONS.CASH_MOVEMENTS, {
            cashRegisterId,
            type: MOVEMENT_TYPES.SALE,
            amount: totals.total,
            description: `Venta ${saleNumber} (${paymentMethod})`,
            paymentMethod: paymentMethod || 'EFECTIVO',
            user: user?.displayName || 'Vendedor',
            saleId: saleDoc.id,
            date: new Date().toISOString(),
          });
        } catch (err) {
          console.error('Error adding cash movement for sale:', err);
        }
      }

      toast.success(`Venta ${saleNumber} registrada con éxito`);
      return { id: saleDoc.id, ...saleData };
    } catch (error) {
      console.error('Error processing sale:', error);
      toast.error('Error al registrar la venta');
      throw error;
    }
  }, []);

  /**
   * Cancel sale and restore stock
   */
  const cancelSale = useCallback(async (saleId, reason = 'Cancelación') => {
    try {
      const sale = sales.find((s) => s.id === saleId);
      if (!sale) return;

      // Restore stock
      for (const item of sale.items || []) {
        if (!item.productId) continue;
        const product = await getDocument(COLLECTIONS.PRODUCTS, item.productId);
        if (product) {
          let updatedVariants = product.variants || [];
          if (updatedVariants.length > 0) {
            updatedVariants = updatedVariants.map((v) => {
              const isMatch =
                (item.variantId && v.id === item.variantId) ||
                (v.color === item.color && v.size === item.size);
              if (isMatch) {
                return { ...v, stock: (Number(v.stock) || 0) + (Number(item.quantity) || 0) };
              }
              return v;
            });
          }
          const totalStock = calculateTotalStock(updatedVariants, (Number(product.stock) || 0) + (Number(item.quantity) || 0));
          await updateDocument(COLLECTIONS.PRODUCTS, item.productId, {
            variants: updatedVariants,
            stock: totalStock,
          });

          // Log stock movement for cancellation
          try {
            await addDocument(COLLECTIONS.STOCK_MOVEMENTS, {
              productId: item.productId,
              productName: item.productName || product.name,
              variantId: item.variantId || null,
              size: item.size || 'Único',
              color: item.color || 'Único',
              quantity: Number(item.quantity) || 1,
              type: 'CANCELACION_VENTA',
              referenceId: saleId,
              date: new Date().toISOString(),
            });
          } catch (_) {}
        }
      }

      await updateDocument(COLLECTIONS.SALES, saleId, {
        status: 'CANCELADA',
        cancelReason: reason,
        cancelledAt: new Date().toISOString(),
      });

      toast.success('Venta cancelada y stock restaurado');
    } catch (error) {
      toast.error('Error al cancelar la venta');
      throw error;
    }
  }, [sales]);

  return { sales, loading, processSale, cancelSale };
}

