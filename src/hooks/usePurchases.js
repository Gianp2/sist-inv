import { useState, useEffect, useCallback } from 'react';
import { COLLECTIONS } from '../constants/collections';
import {
  subscribeCollection,
  getCachedCollection,
  saveStoredCollection,
  addDocument,
  getDocument,
  updateDocument,
} from '../services/firebase/firestore';
import { calculateTotalStock } from '../utils/calculations';
import { toast } from 'sonner';

export function usePurchases() {
  const [purchases, setPurchases] = useState(() => {
    const cached = getCachedCollection(COLLECTIONS.PURCHASES);
    if (!cached) return [];
    return [...cached].sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
  });
  const [loading, setLoading] = useState(() => !getCachedCollection(COLLECTIONS.PURCHASES));

  useEffect(() => {
    const unsubscribe = subscribeCollection(
      COLLECTIONS.PURCHASES,
      [],
      (data) => {
        const sorted = (data || []).sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
        setPurchases(sorted);
        setLoading(false);
      },
      () => setLoading(false)
    );
    return () => unsubscribe();
  }, []);

  /**
   * Register purchase and automatically increment stock in product variants
   */
  const createPurchase = useCallback(async (purchaseData) => {
    try {
      const purchaseNumber = `COM-${Date.now().toString().slice(-6)}`;
      const docData = {
        ...purchaseData,
        purchaseNumber,
        date: new Date().toISOString(),
      };

      const res = await addDocument(COLLECTIONS.PURCHASES, docData);

      // Increment stock for each purchased item & variant
      for (const item of purchaseData.items || []) {
        if (!item.productId) continue;
        try {
          const product = await getDocument(COLLECTIONS.PRODUCTS, item.productId);
          if (product) {
            let updatedVariants = product.variants || [];
            if (updatedVariants.length > 0) {
              updatedVariants = updatedVariants.map((v) => {
                const isMatch = (item.variantId && v.id === item.variantId) || (v.color === item.color && v.size === item.size);
                if (isMatch) {
                  return { ...v, stock: Math.max(0, (Number(v.stock) || 0) + (Number(item.quantity) || 0)) };
                }
                return v;
              });
            }
            const totalStock = calculateTotalStock(updatedVariants, (Number(product.stock) || 0) + Number(item.quantity));
            
            // Update cost, stock and entry dates
            const nowIso = new Date().toISOString();
            const nowTime = new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
            const updatePayload = {
              variants: updatedVariants,
              stock: totalStock,
              entryDate: product.entryDate || nowIso,
              lastStockEntryDate: nowIso,
            };
            if (item.costPrice && Number(item.costPrice) > 0) {
              const numericCost = Number(item.costPrice);
              updatePayload.costPrice = numericCost;
              updatePayload.cost = numericCost;

              // Record cost history inside the product document
              const costRecord = {
                productId: item.productId,
                productName: item.productName || product.name,
                cost: numericCost,
                quantity: Number(item.quantity) || 1,
                supplierId: purchaseData.supplierId || null,
                supplierName: purchaseData.supplierName || null,
                purchaseId: res.id,
                purchaseNumber,
                date: nowIso,
                time: nowTime,
                reason: `Ingreso por Compra ${purchaseNumber}`,
              };
              updatePayload.costHistory = [costRecord, ...(Array.isArray(product.costHistory) ? product.costHistory : [])];

              // Save to local cache safely
              const currentCosts = getCachedCollection(COLLECTIONS.COST_HISTORY) || [];
              saveStoredCollection(COLLECTIONS.COST_HISTORY, [costRecord, ...currentCosts]);
            }

            await updateDocument(COLLECTIONS.PRODUCTS, item.productId, updatePayload);

            // Log stock movement
            await addDocument(COLLECTIONS.STOCK_MOVEMENTS, {
              productId: item.productId,
              productName: item.productName,
              variantId: item.variantId,
              size: item.size,
              color: item.color,
              quantity: item.quantity,
              type: 'COMPRA',
              referenceId: res.id,
              date: new Date().toISOString(),
            });
          }
        } catch (err) {
          console.error('Error updating stock on purchase:', err);
        }
      }

      toast.success(`Compra ${purchaseNumber} registrada y stock actualizado`);

      // Optionally record cash expense in Caja
      if (purchaseData.registerCashExpense && Number(purchaseData.total) > 0) {
        try {
          await addDocument(COLLECTIONS.CASH_MOVEMENTS, {
            type: 'EGRESO',
            category: 'Compra de Mercadería / Proveedor',
            amount: Number(purchaseData.total),
            description: `Compra ${purchaseNumber} - ${purchaseData.supplierName || 'Proveedor'}`,
            paymentMethod: purchaseData.paymentMethod || 'EFECTIVO',
            date: new Date().toISOString(),
            referenceId: res.id,
            user: purchaseData.user || 'Administrador',
          });
        } catch (movErr) {
          console.error('Error logging cash expense for purchase:', movErr);
        }
      }

      return res;
    } catch (error) {
      console.error('Error creating purchase:', error);
      toast.error('Error al registrar compra');
      throw error;
    }
  }, []);

  return { purchases, loading, createPurchase };
}

