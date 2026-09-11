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

export function useCategories() {
  const [categories, setCategories] = useState(() => getCachedCollection(COLLECTIONS.CATEGORIES) || []);
  const [loading, setLoading] = useState(() => !getCachedCollection(COLLECTIONS.CATEGORIES));

  useEffect(() => {
    const unsubscribe = subscribeCollection(
      COLLECTIONS.CATEGORIES,
      [],
      (data) => {
        setCategories(data || []);
        setLoading(false);
      },
      () => setLoading(false)
    );
    return () => unsubscribe();
  }, []);

  const createCategory = useCallback(async (data) => {
    const res = await addDocument(COLLECTIONS.CATEGORIES, data);
    toast.success('Categoría creada');
    return res;
  }, []);

  const editCategory = useCallback(async (id, data) => {
    await updateDocument(COLLECTIONS.CATEGORIES, id, data);
    toast.success('Categoría actualizada');
  }, []);

  const removeCategory = useCallback(async (id) => {
    await deleteDocument(COLLECTIONS.CATEGORIES, id);
    toast.success('Categoría eliminada');
  }, []);

  return { categories, loading, createCategory, editCategory, removeCategory };
}

export function useBrands() {
  const [brands, setBrands] = useState(() => getCachedCollection(COLLECTIONS.BRANDS) || []);
  const [loading, setLoading] = useState(() => !getCachedCollection(COLLECTIONS.BRANDS));

  useEffect(() => {
    const unsubscribe = subscribeCollection(
      COLLECTIONS.BRANDS,
      [],
      (data) => {
        setBrands(data || []);
        setLoading(false);
      },
      () => setLoading(false)
    );
    return () => unsubscribe();
  }, []);

  const createBrand = useCallback(async (data) => {
    const res = await addDocument(COLLECTIONS.BRANDS, data);
    toast.success('Marca creada');
    return res;
  }, []);

  const editBrand = useCallback(async (id, data) => {
    await updateDocument(COLLECTIONS.BRANDS, id, data);
    toast.success('Marca actualizada');
  }, []);

  const removeBrand = useCallback(async (id) => {
    await deleteDocument(COLLECTIONS.BRANDS, id);
    toast.success('Marca eliminada');
  }, []);

  return { brands, loading, createBrand, editBrand, removeBrand };
}

