import { useState, useEffect, useCallback } from 'react';
import { COLLECTIONS } from '../constants/collections';
import {
  subscribeCollection,
  getCachedCollection,
  addDocument,
  updateDocument,
  deleteDocument,
} from '../services/firebase/firestore';
import { toast } from 'sonner';

export function useCustomers() {
  const [customers, setCustomers] = useState(() => getCachedCollection(COLLECTIONS.CUSTOMERS) || []);
  const [loading, setLoading] = useState(() => !getCachedCollection(COLLECTIONS.CUSTOMERS));

  useEffect(() => {
    const unsubscribe = subscribeCollection(
      COLLECTIONS.CUSTOMERS,
      [],
      (data) => {
        setCustomers(data || []);
        setLoading(false);
      },
      () => setLoading(false)
    );
    return () => unsubscribe();
  }, []);

  const createCustomer = useCallback(async (data) => {
    const res = await addDocument(COLLECTIONS.CUSTOMERS, {
      ...data,
      totalPurchases: 0,
      purchaseCount: 0,
    });
    toast.success('Cliente registrado');
    return res;
  }, []);

  const editCustomer = useCallback(async (id, data) => {
    await updateDocument(COLLECTIONS.CUSTOMERS, id, data);
    toast.success('Cliente actualizado');
  }, []);

  const removeCustomer = useCallback(async (id) => {
    await deleteDocument(COLLECTIONS.CUSTOMERS, id);
    toast.success('Cliente eliminado');
  }, []);

  return { customers, loading, createCustomer, editCustomer, removeCustomer };
}

export function useSuppliers() {
  const [suppliers, setSuppliers] = useState(() => getCachedCollection(COLLECTIONS.SUPPLIERS) || []);
  const [loading, setLoading] = useState(() => !getCachedCollection(COLLECTIONS.SUPPLIERS));

  useEffect(() => {
    const unsubscribe = subscribeCollection(
      COLLECTIONS.SUPPLIERS,
      [],
      (data) => {
        setSuppliers(data || []);
        setLoading(false);
      },
      () => setLoading(false)
    );
    return () => unsubscribe();
  }, []);

  const createSupplier = useCallback(async (data) => {
    const res = await addDocument(COLLECTIONS.SUPPLIERS, data);
    toast.success('Proveedor registrado');
    return res;
  }, []);

  const editSupplier = useCallback(async (id, data) => {
    await updateDocument(COLLECTIONS.SUPPLIERS, id, data);
    toast.success('Proveedor actualizado');
  }, []);

  const removeSupplier = useCallback(async (id) => {
    await deleteDocument(COLLECTIONS.SUPPLIERS, id);
    toast.success('Proveedor eliminado');
  }, []);

  return { suppliers, loading, createSupplier, editSupplier, removeSupplier };
}

