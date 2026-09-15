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
  const [categories, setCategories] = useState(() => {
    const raw = getCachedCollection(COLLECTIONS.CATEGORIES) || [];
    const seen = new Set();
    return raw.filter((c) => {
      if (!c || !c.id || seen.has(c.id)) return false;
      seen.add(c.id);
      return true;
    });
  });
  const [loading, setLoading] = useState(() => !getCachedCollection(COLLECTIONS.CATEGORIES));

  useEffect(() => {
    const unsubscribe = subscribeCollection(
      COLLECTIONS.CATEGORIES,
      [],
      (data) => {
        const seen = new Set();
        const unique = (data || []).filter((c) => {
          if (!c || !c.id || seen.has(c.id)) return false;
          seen.add(c.id);
          return true;
        });
        setCategories(unique);
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
  const [brands, setBrands] = useState(() => {
    const raw = getCachedCollection(COLLECTIONS.BRANDS) || [];
    const seen = new Set();
    return raw.filter((b) => {
      if (!b || !b.id || seen.has(b.id)) return false;
      seen.add(b.id);
      return true;
    });
  });
  const [loading, setLoading] = useState(() => !getCachedCollection(COLLECTIONS.BRANDS));

  useEffect(() => {
    const unsubscribe = subscribeCollection(
      COLLECTIONS.BRANDS,
      [],
      (data) => {
        const seen = new Set();
        const unique = (data || []).filter((b) => {
          if (!b || !b.id || seen.has(b.id)) return false;
          seen.add(b.id);
          return true;
        });
        setBrands(unique);
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

