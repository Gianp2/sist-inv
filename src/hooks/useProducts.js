import { useState, useEffect, useMemo, useCallback } from 'react';
import { COLLECTIONS } from '../constants/collections';
import {
  subscribeCollection,
  getCachedCollection,
  saveStoredCollection,
  addDocument,
  updateDocument,
  deleteDocument,
  clearAllProducts,
} from '../services/firebase/firestore';
import { calculateTotalStock } from '../utils/calculations';
import { toast } from 'sonner';

export function useProducts() {
  const [products, setProducts] = useState(() => getCachedCollection(COLLECTIONS.PRODUCTS) || []);
  const [loading, setLoading] = useState(() => !getCachedCollection(COLLECTIONS.PRODUCTS));

  useEffect(() => {
    const unsubProducts = subscribeCollection(
      COLLECTIONS.PRODUCTS,
      [],
      (data) => {
        setProducts(data || []);
        setLoading(false);
      },
      (err) => {
        console.warn('Notice fetching products:', err);
        setLoading(false);
      }
    );

    return () => {
      unsubProducts();
    };
  }, []);

  // Derive consolidated priceHistories from products (the authorized collection in Firestore)
  // and maintain local cache fallback
  const priceHistories = useMemo(() => {
    const list = [];
    products.forEach((p) => {
      if (Array.isArray(p.priceHistory) && p.priceHistory.length > 0) {
        p.priceHistory.forEach((h) => {
          list.push({ ...h, productId: p.id, productName: p.name || h.productName });
        });
      } else if (Number(p.salePrice ?? p.price ?? 0) > 0) {
        list.push({
          productId: p.id,
          productName: p.name,
          previousPrice: 0,
          newPrice: Number(p.salePrice ?? p.price ?? 0),
          date: p.priceLastUpdatedAt || p.createdAt || p.entryDate || new Date().toISOString(),
          time: '',
          reason: 'Precio actual',
        });
      }
    });

    const localCached = getCachedCollection(COLLECTIONS.PRICE_HISTORY) || [];
    localCached.forEach((h) => {
      if (!list.some((existing) => existing.productId === h.productId && existing.date === h.date)) {
        list.push(h);
      }
    });

    return list.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
  }, [products]);

  // Derive consolidated costHistories from products and local storage cache
  const costHistories = useMemo(() => {
    const list = [];
    products.forEach((p) => {
      if (Array.isArray(p.costHistory) && p.costHistory.length > 0) {
        p.costHistory.forEach((h) => {
          list.push({ ...h, productId: p.id, productName: p.name || h.productName });
        });
      } else if (Number(p.costPrice ?? p.cost ?? 0) > 0) {
        list.push({
          productId: p.id,
          productName: p.name,
          cost: Number(p.costPrice ?? p.cost ?? 0),
          date: p.entryDate || p.createdAt || new Date().toISOString(),
          time: '',
          quantity: Number(p.stock ?? 0),
          supplierId: p.supplierId || null,
          supplierName: p.supplierName || null,
          reason: 'Costo actual',
        });
      }
    });

    const localCached = getCachedCollection(COLLECTIONS.COST_HISTORY) || [];
    localCached.forEach((h) => {
      if (!list.some((existing) => existing.productId === h.productId && existing.date === h.date)) {
        list.push(h);
      }
    });

    return list.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
  }, [products]);

  const createProduct = useCallback(async (productData) => {
    try {
      const totalStock = calculateTotalStock(productData.variants, productData.stock);
      const normalizedPrice = Number(productData.salePrice ?? productData.price ?? 0);
      const normalizedCost = Number(productData.costPrice ?? productData.cost ?? 0);
      const nowIso = new Date().toISOString();
      const nowTime = new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });

      const priceHistory = normalizedPrice > 0 ? [{
        productId: '',
        productName: productData.name,
        previousPrice: 0,
        newPrice: normalizedPrice,
        date: nowIso,
        time: nowTime,
        reason: 'Precio inicial de creación',
      }] : [];

      const costHistory = normalizedCost > 0 ? [{
        productId: '',
        productName: productData.name,
        cost: normalizedCost,
        date: nowIso,
        time: nowTime,
        quantity: totalStock || 0,
        supplierId: productData.supplierId || null,
        supplierName: productData.supplierName || null,
        reason: 'Costo inicial de creación',
      }] : [];

      const res = await addDocument(COLLECTIONS.PRODUCTS, {
        ...productData,
        price: normalizedPrice,
        salePrice: normalizedPrice,
        cost: normalizedCost,
        costPrice: normalizedCost,
        stock: totalStock,
        entryDate: productData.entryDate || nowIso,
        priceLastUpdatedAt: nowIso,
        priceHistory,
        costHistory,
      });

      // Also update local cache for price and cost history
      if (priceHistory.length > 0) {
        priceHistory[0].productId = res.id;
        const currentPrices = getCachedCollection(COLLECTIONS.PRICE_HISTORY) || [];
        saveStoredCollection(COLLECTIONS.PRICE_HISTORY, [priceHistory[0], ...currentPrices]);
      }
      if (costHistory.length > 0) {
        costHistory[0].productId = res.id;
        const currentCosts = getCachedCollection(COLLECTIONS.COST_HISTORY) || [];
        saveStoredCollection(COLLECTIONS.COST_HISTORY, [costHistory[0], ...currentCosts]);
      }

      toast.success('Producto creado exitosamente');
      return res;
    } catch (error) {
      toast.error('Error al crear producto');
      throw error;
    }
  }, []);

  const editProduct = useCallback(async (id, productData) => {
    try {
      const existing = products.find((p) => p.id === id);
      const totalStock = calculateTotalStock(productData.variants, productData.stock);
      const normalizedPrice = Number(productData.salePrice ?? productData.price ?? 0);
      const normalizedCost = Number(productData.costPrice ?? productData.cost ?? 0);
      const oldPrice = Number(existing?.salePrice ?? existing?.price ?? 0);
      const oldCost = Number(existing?.costPrice ?? existing?.cost ?? 0);
      const nowIso = new Date().toISOString();
      const nowTime = new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });

      let updatedPriceHistory = productData.priceHistory || existing?.priceHistory || [];
      if (normalizedPrice > 0 && normalizedPrice !== oldPrice) {
        const newPriceEntry = {
          productId: id,
          productName: productData.name || existing?.name || '',
          previousPrice: oldPrice,
          newPrice: normalizedPrice,
          date: nowIso,
          time: nowTime,
          reason: productData.priceChangeReason || 'Actualización de producto',
        };
        updatedPriceHistory = [newPriceEntry, ...updatedPriceHistory];
        const currentPrices = getCachedCollection(COLLECTIONS.PRICE_HISTORY) || [];
        saveStoredCollection(COLLECTIONS.PRICE_HISTORY, [newPriceEntry, ...currentPrices]);
      }

      let updatedCostHistory = productData.costHistory || existing?.costHistory || [];
      if (normalizedCost > 0 && normalizedCost !== oldCost) {
        const newCostEntry = {
          productId: id,
          productName: productData.name || existing?.name || '',
          cost: normalizedCost,
          date: nowIso,
          time: nowTime,
          quantity: totalStock || 0,
          supplierId: productData.supplierId || existing?.supplierId || null,
          supplierName: productData.supplierName || existing?.supplierName || null,
          reason: 'Ajuste manual de costo',
        };
        updatedCostHistory = [newCostEntry, ...updatedCostHistory];
        const currentCosts = getCachedCollection(COLLECTIONS.COST_HISTORY) || [];
        saveStoredCollection(COLLECTIONS.COST_HISTORY, [newCostEntry, ...currentCosts]);
      }

      const updatePayload = {
        ...productData,
        price: normalizedPrice,
        salePrice: normalizedPrice,
        cost: normalizedCost,
        costPrice: normalizedCost,
        stock: totalStock,
        priceLastUpdatedAt: normalizedPrice !== oldPrice ? nowIso : (existing?.priceLastUpdatedAt || nowIso),
        priceHistory: updatedPriceHistory,
        costHistory: updatedCostHistory,
      };

      await updateDocument(COLLECTIONS.PRODUCTS, id, updatePayload);
      toast.success('Producto actualizado');
    } catch (error) {
      toast.error('Error al actualizar producto');
      throw error;
    }
  }, [products]);

  const updateProductPrice = useCallback(async (productId, newPrice, reason = 'Actualización de precios') => {
    try {
      const product = products.find((p) => p.id === productId);
      if (!product) throw new Error('Producto no encontrado');

      const numericNewPrice = Math.round(Number(newPrice));
      const previousPrice = Number(product.salePrice ?? product.price ?? 0);
      const nowIso = new Date().toISOString();
      const nowTime = new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });

      const priceEntry = {
        productId,
        productName: product.name,
        previousPrice,
        newPrice: numericNewPrice,
        date: nowIso,
        time: nowTime,
        reason: reason || 'Actualización de precios',
      };

      const existingHistory = Array.isArray(product.priceHistory) ? product.priceHistory : [];
      const updatedPriceHistory = [priceEntry, ...existingHistory];

      await updateDocument(COLLECTIONS.PRODUCTS, productId, {
        price: numericNewPrice,
        salePrice: numericNewPrice,
        priceLastUpdatedAt: nowIso,
        priceHistory: updatedPriceHistory,
      });

      const currentPrices = getCachedCollection(COLLECTIONS.PRICE_HISTORY) || [];
      saveStoredCollection(COLLECTIONS.PRICE_HISTORY, [priceEntry, ...currentPrices]);

      toast.success('Precio actualizado correctamente.');
      return true;
    } catch (error) {
      console.error(error);
      toast.error('Error al actualizar precio');
      throw error;
    }
  }, [products]);

  const batchUpdatePrices = useCallback(async (updates = [], batchReason = 'Actualización masiva') => {
    if (!updates || updates.length === 0) return;
    try {
      const nowIso = new Date().toISOString();
      const nowTime = new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });

      for (const update of updates) {
        const { productId, newPrice, reason } = update;
        const product = products.find((p) => p.id === productId);
        if (!product) continue;

        const numericNewPrice = Math.round(Number(newPrice));
        const previousPrice = Number(product.salePrice ?? product.price ?? 0);

        const priceEntry = {
          productId,
          productName: product.name,
          previousPrice,
          newPrice: numericNewPrice,
          date: nowIso,
          time: nowTime,
          reason: reason || batchReason,
        };

        const existingHistory = Array.isArray(product.priceHistory) ? product.priceHistory : [];
        const updatedPriceHistory = [priceEntry, ...existingHistory];

        await updateDocument(COLLECTIONS.PRODUCTS, productId, {
          price: numericNewPrice,
          salePrice: numericNewPrice,
          priceLastUpdatedAt: nowIso,
          priceHistory: updatedPriceHistory,
        });

        const currentPrices = getCachedCollection(COLLECTIONS.PRICE_HISTORY) || [];
        saveStoredCollection(COLLECTIONS.PRICE_HISTORY, [priceEntry, ...currentPrices]);
      }

      toast.success(`${updates.length} precios actualizados correctamente.`);
      return true;
    } catch (error) {
      console.error(error);
      toast.error('Error en la actualización masiva de precios');
      throw error;
    }
  }, [products]);

  const recordProductCost = useCallback(async (productId, costData) => {
    try {
      const product = products.find((p) => p.id === productId);
      if (!product) return;

      const numericCost = Number(costData.cost);
      const nowIso = new Date().toISOString();
      const nowTime = new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });

      const costEntry = {
        productId,
        productName: product.name,
        cost: numericCost,
        date: costData.date || nowIso,
        time: nowTime,
        supplierId: costData.supplierId || null,
        supplierName: costData.supplierName || null,
        purchaseId: costData.purchaseId || null,
        quantity: Number(costData.quantity) || 1,
        reason: costData.reason || 'Ingreso de costo',
      };

      const existingHistory = Array.isArray(product.costHistory) ? product.costHistory : [];
      const updatedCostHistory = [costEntry, ...existingHistory];

      await updateDocument(COLLECTIONS.PRODUCTS, productId, {
        cost: numericCost,
        costPrice: numericCost,
        costHistory: updatedCostHistory,
      });

      const currentCosts = getCachedCollection(COLLECTIONS.COST_HISTORY) || [];
      saveStoredCollection(COLLECTIONS.COST_HISTORY, [costEntry, ...currentCosts]);
    } catch (error) {
      console.error('Error recording product cost:', error);
    }
  }, [products]);

  const removeProduct = useCallback(async (id) => {
    try {
      await deleteDocument(COLLECTIONS.PRODUCTS, id);
      toast.success('Producto eliminado');
    } catch (error) {
      toast.error('Error al eliminar producto');
      throw error;
    }
  }, []);

  const adjustVariantStock = useCallback(async (productId, variantId, newStock, reason = 'Ajuste manual') => {
    const product = products.find((p) => p.id === productId);
    if (!product) return;

    let updatedVariants = [];
    if (product.variants && product.variants.length > 0) {
      updatedVariants = product.variants.map((v) =>
        v.id === variantId ? { ...v, stock: Math.max(0, Number(newStock)) } : v
      );
    }

    const totalStock = calculateTotalStock(updatedVariants, newStock);
    await updateDocument(COLLECTIONS.PRODUCTS, productId, {
      variants: updatedVariants,
      stock: totalStock,
    });

    // Record stock movement log
    await addDocument(COLLECTIONS.STOCK_MOVEMENTS, {
      productId,
      productName: product.name,
      variantId,
      newStock,
      reason,
      date: new Date().toISOString(),
    });

    toast.success('Stock actualizado');
  }, [products]);

  const clearProducts = useCallback(async () => {
    try {
      await clearAllProducts();
      toast.success('Catálogo de prendas vaciado correctamente');
    } catch (error) {
      toast.error('Error al vaciar catálogo');
      throw error;
    }
  }, []);

  const getProductPriceHistory = useCallback((productId) => {
    const prod = products.find((p) => p.id === productId);
    if (prod && Array.isArray(prod.priceHistory) && prod.priceHistory.length > 0) {
      return [...prod.priceHistory].sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
    }
    return priceHistories
      .filter((h) => h.productId === productId)
      .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
  }, [products, priceHistories]);

  const getProductCostHistory = useCallback((productId) => {
    const prod = products.find((p) => p.id === productId);
    if (prod && Array.isArray(prod.costHistory) && prod.costHistory.length > 0) {
      return [...prod.costHistory].sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
    }
    return costHistories
      .filter((h) => h.productId === productId)
      .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
  }, [products, costHistories]);

  return {
    products,
    loading,
    priceHistories,
    costHistories,
    createProduct,
    editProduct,
    removeProduct,
    adjustVariantStock,
    clearProducts,
    updateProductPrice,
    batchUpdatePrices,
    recordProductCost,
    getProductPriceHistory,
    getProductCostHistory,
  };
}

