// Generic, modular Firestore service with persistent localStorage mirror & multicast listeners in TypeScript
import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  QueryConstraint,
  Unsubscribe,
  DocumentData,
} from 'firebase/firestore';
import { db } from './config';
import {
  INITIAL_CATEGORIES,
  INITIAL_SETTINGS,
} from '../api/seedData';

const LOCAL_STORAGE_PREFIX = 'sistemainv_data_';

// Safety note: Automatic startup data deletion and purges have been completely disabled.
// Real operational data, collections, and existing documents in Firestore and local caches
// are strictly preserved across application refreshes and sessions.

// Build initial default datasets with assigned IDs
const getDefaultInitialData = (collectionName: string): any[] => {
  switch (collectionName) {
    case 'categories':
      return INITIAL_CATEGORIES.map((c: any, i: number) => ({ id: `cat_${i + 1}`, ...c }));
    case 'brands':
      return [];
    case 'products':
      return [];
    case 'customers':
      return [];
    case 'suppliers':
      return [];
    case 'settings':
      return [{ id: 'general', ...INITIAL_SETTINGS }];
    case 'users':
      return [
        {
          id: 'zvKPMDfIe0ZfwdikFBmhYCyq7w42',
          uid: 'zvKPMDfIe0ZfwdikFBmhYCyq7w42',
          email: 'admin@sistema.com',
          displayName: 'Administrador',
          role: 'ADMIN',
          active: true,
          createdAt: new Date().toISOString(),
        },
        {
          id: 'Y6zcr0uVafRbKFDkNG9RSOJeV9f1',
          uid: 'Y6zcr0uVafRbKFDkNG9RSOJeV9f1',
          email: 'vendedor@sistema.com',
          displayName: 'Vendedor Mostrador',
          role: 'EMPLEADO',
          active: true,
          createdAt: new Date().toISOString(),
        },
      ];
    case 'cashMovements':
      return [];
    case 'cashRegisters':
      return [];
    case 'sales':
      return [];
    case 'purchases':
      return [];
    case 'stockMovements':
      return [];
    default:
      return [];
  }
};

// Load saved data from localStorage or fallback
const loadStoredCollection = (collectionName: string): any[] => {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_PREFIX + collectionName);
    if (raw !== null) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (e) {
    // ignore json parse error
  }
  const defaultData = getDefaultInitialData(collectionName);
  saveStoredCollection(collectionName, defaultData);
  return defaultData;
};

// Save collection to localStorage with quota protection and payload slimming
export const saveStoredCollection = (collectionName: string, items: any[]): void => {
  if (!items || !Array.isArray(items)) return;
  try {
    const itemsToPersist = items.length > 250 ? items.slice(0, 250) : items;
    const sanitized = itemsToPersist.map((item: any) => {
      if (item && item.images && Array.isArray(item.images)) {
        const lightImages = item.images.map((img: any) =>
          typeof img === 'string' && img.startsWith('data:image') && img.length > 50000
            ? 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=300&q=80'
            : img
        );
        return { ...item, images: lightImages };
      }
      return item;
    });

    localStorage.setItem(LOCAL_STORAGE_PREFIX + collectionName, JSON.stringify(sanitized));
  } catch (e: any) {
    if (e && (e.name === 'QuotaExceededError' || e.code === 22)) {
      try {
        localStorage.removeItem(LOCAL_STORAGE_PREFIX + 'stockMovements');
        localStorage.removeItem(LOCAL_STORAGE_PREFIX + 'cashMovements');
      } catch (_) {}
    }
  }
};

// In-memory collection cache for zero-latency retrieval
const collectionCache = new Map<string, any[]>();

// Initialize warm cache from localStorage
const initWarmCache = (collectionName: string): any[] => {
  if (!collectionCache.has(collectionName)) {
    const data = loadStoredCollection(collectionName);
    collectionCache.set(collectionName, data);
  }
  return collectionCache.get(collectionName) || [];
};

interface MultiplexEntry {
  unsubscribe: Unsubscribe;
  listeners: Set<(items: any[]) => void>;
  errorListeners: Set<(err: any) => void>;
  cleanupTimer: any;
}

// Active subscription listeners multiplexer
const multiplexedSubscriptions = new Map<string, MultiplexEntry>();

/**
 * Synchronously get cached collection data if already loaded (0ms latency)
 */
export const getCachedCollection = <T = any>(collectionName: string): T[] => {
  return (collectionCache.get(collectionName) || initWarmCache(collectionName)) as T[];
};

/**
 * Notify all multiplexed subscribers of a collection
 */
const notifySubscribers = (collectionName: string, items: any[]): void => {
  collectionCache.set(collectionName, items);
  saveStoredCollection(collectionName, items);

  const entry = multiplexedSubscriptions.get(collectionName);
  if (entry && entry.listeners) {
    entry.listeners.forEach((listener) => {
      try {
        listener(items);
      } catch (err) {
        console.warn(`Error notifying listener for ${collectionName}:`, err);
      }
    });
  }
};

/**
 * Get all documents from a collection (with cache fallback & immediate promise)
 */
export const getCollection = async <T = any>(
  collectionName: string,
  constraints: QueryConstraint[] = []
): Promise<T[]> => {
  initWarmCache(collectionName);

  try {
    const colRef = collection(db, collectionName);
    const q = constraints.length > 0 ? query(colRef, ...constraints) : query(colRef);
    const snapshot = await getDocs(q);
    const items = snapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data(),
    })) as T[];

    if (items.length > 0 || constraints.length > 0) {
      if (constraints.length === 0) {
        notifySubscribers(collectionName, items);
      }
      return items;
    }
    return (collectionCache.get(collectionName) || []) as T[];
  } catch (error) {
    return (collectionCache.get(collectionName) || []) as T[];
  }
};

/**
 * Get a single document by ID (with fast cache lookup)
 */
export const getDocument = async <T = any>(
  collectionName: string,
  docId: string
): Promise<T | null> => {
  initWarmCache(collectionName);

  try {
    const cached = collectionCache.get(collectionName);
    if (cached) {
      const found = cached.find((item: any) => item.id === docId);
      if (found) return found as T;
    }

    const docRef = doc(db, collectionName, docId);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) return null;
    return { id: docSnap.id, ...docSnap.data() } as T;
  } catch (error) {
    const cached = collectionCache.get(collectionName) || [];
    return (cached.find((item: any) => item.id === docId) || null) as T | null;
  }
};

/**
 * Recursively sanitizes objects for Firestore by converting undefined to null,
 * handling Dates, and removing unallowed types.
 */
export const sanitizeForFirestore = (val: any): any => {
  if (val === undefined) return null;
  if (val === null) return null;
  if (typeof val !== 'object') return val;
  if (val instanceof Date) return val.toISOString();
  if (Array.isArray(val)) {
    return val.map(sanitizeForFirestore);
  }
  const result: Record<string, any> = {};
  for (const [k, v] of Object.entries(val)) {
    if (v === undefined) {
      result[k] = null;
    } else {
      result[k] = sanitizeForFirestore(v);
    }
  }
  return result;
};

/**
 * Add a new document with auto-generated ID & optimistic instant cache update
 */
export const addDocument = async <T = any>(collectionName: string, data: any): Promise<T> => {
  initWarmCache(collectionName);

  const newId = 'doc_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
  const nowIso = new Date().toISOString();
  const cleanData = sanitizeForFirestore(data);
  const newItem = {
    id: newId,
    ...cleanData,
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  // Immediate local update
  const existing = collectionCache.get(collectionName) || [];
  notifySubscribers(collectionName, [newItem, ...existing]);

  try {
    const colRef = collection(db, collectionName);
    const docData = {
      ...cleanData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    const docRef = await addDoc(colRef, docData);
    const finalItem = { id: docRef.id, ...docData };

    // Update with real Firestore ID if successful
    const current = collectionCache.get(collectionName) || [];
    const updated = current.map((item: any) => (item.id === newId ? { ...item, id: docRef.id } : item));
    notifySubscribers(collectionName, updated);

    return finalItem as T;
  } catch (error) {
    // Revert optimistic update to prevent ghost items
    const current = collectionCache.get(collectionName) || [];
    const reverted = current.filter((item: any) => item.id !== newId);
    notifySubscribers(collectionName, reverted);
    console.error(`[Firestore addDocument Error in "${collectionName}"]:`, error);
    throw error;
  }
};

/**
 * Set document with a specific ID & optimistic update
 */
export const setDocument = async <T = any>(
  collectionName: string,
  docId: string,
  data: any,
  merge: boolean = true
): Promise<T> => {
  initWarmCache(collectionName);

  const nowIso = new Date().toISOString();
  const cleanData = sanitizeForFirestore(data);
  const optimisticItem = {
    id: docId,
    ...cleanData,
    updatedAt: nowIso,
  };

  // Optimistic update
  const existing = collectionCache.get(collectionName) || [];
  const exists = existing.some((item: any) => item.id === docId);
  const previousItem = existing.find((item: any) => item.id === docId);
  const updatedList = exists
    ? existing.map((item: any) => (item.id === docId ? { ...item, ...optimisticItem } : item))
    : [optimisticItem, ...existing];
  notifySubscribers(collectionName, updatedList);

  try {
    const docRef = doc(db, collectionName, docId);
    const docData = {
      ...cleanData,
      updatedAt: serverTimestamp(),
    };
    await setDoc(docRef, docData, { merge });
    return { id: docId, ...docData } as T;
  } catch (error) {
    // Revert optimistic update on failure
    const current = collectionCache.get(collectionName) || [];
    const reverted = exists
      ? current.map((item: any) => (item.id === docId ? previousItem : item))
      : current.filter((item: any) => item.id !== docId);
    notifySubscribers(collectionName, reverted);
    console.error(`[Firestore setDocument Error in "${collectionName}/${docId}"]:`, error);
    throw error;
  }
};

/**
 * Update an existing document with instant optimistic cache propagation
 */
export const updateDocument = async <T = any>(
  collectionName: string,
  docId: string,
  data: any
): Promise<T> => {
  initWarmCache(collectionName);

  const cleanData = sanitizeForFirestore(data);
  const existing = collectionCache.get(collectionName) || [];
  const previousItem = existing.find((item: any) => item.id === docId);
  const updatedList = existing.map((item: any) =>
    item.id === docId ? { ...item, ...cleanData, updatedAt: new Date().toISOString() } : item
  );
  notifySubscribers(collectionName, updatedList);

  try {
    const docRef = doc(db, collectionName, docId);
    const updateData = {
      ...cleanData,
      updatedAt: serverTimestamp(),
    };
    await updateDoc(docRef, updateData);
    return { id: docId, ...updateData } as T;
  } catch (error) {
    // Revert optimistic update on failure
    if (previousItem) {
      const current = collectionCache.get(collectionName) || [];
      const reverted = current.map((item: any) => (item.id === docId ? previousItem : item));
      notifySubscribers(collectionName, reverted);
    }
    console.error(`[Firestore updateDocument Error in "${collectionName}/${docId}"]:`, error);
    throw error;
  }
};

/**
 * Delete a document by ID with instant optimistic removal
 */
export const deleteDocument = async (collectionName: string, docId: string): Promise<string> => {
  initWarmCache(collectionName);

  const existing = collectionCache.get(collectionName) || [];
  const previousItem = existing.find((item: any) => item.id === docId);
  const updatedList = existing.filter((item: any) => item.id !== docId);
  notifySubscribers(collectionName, updatedList);

  try {
    const docRef = doc(db, collectionName, docId);
    await deleteDoc(docRef);
    return docId;
  } catch (error) {
    // Revert optimistic removal on failure
    if (previousItem) {
      const current = collectionCache.get(collectionName) || [];
      notifySubscribers(collectionName, [previousItem, ...current]);
    }
    console.error(`[Firestore deleteDocument Error in "${collectionName}/${docId}"]:`, error);
    throw error;
  }
};

/**
 * High-performance, multiplexed real-time subscription for collections.
 * Avoids duplicate Firestore listeners and gives 0ms instant cached data on mount!
 */
export const subscribeCollection = <T = any>(
  collectionName: string,
  constraints: QueryConstraint[] = [],
  callback: (items: T[]) => void,
  errorCallback?: (err: any) => void
): Unsubscribe => {
  initWarmCache(collectionName);

  // Deliver instant cached/local data first
  const currentData = collectionCache.get(collectionName) || [];
  try {
    callback(currentData as T[]);
  } catch (e) {
    console.warn(`Error delivering initial cached data for ${collectionName}:`, e);
  }

  try {
    // If constraints are present, subscribe directly without multiplexing
    if (constraints.length > 0) {
      const colRef = collection(db, collectionName);
      const q = query(colRef, ...constraints);
      return onSnapshot(
        q,
        (snapshot) => {
          const items = snapshot.docs.map((docSnap) => ({
            id: docSnap.id,
            ...docSnap.data(),
          })) as T[];
          callback(items);
        },
        (error) => {
          console.warn(`Firestore subscription notice for ${collectionName}:`, error.message);
          if (errorCallback) errorCallback(error);
        }
      );
    }

    // Reuse existing Firestore listener if already active for this collection
    let entry = multiplexedSubscriptions.get(collectionName);

    if (entry) {
      if (entry.cleanupTimer) {
        clearTimeout(entry.cleanupTimer);
        entry.cleanupTimer = null;
      }
      entry.listeners.add(callback as (items: any[]) => void);
      if (errorCallback) entry.errorListeners.add(errorCallback);
    } else {
      const listeners = new Set<(items: any[]) => void>([callback as (items: any[]) => void]);
      const errorListeners = new Set<(err: any) => void>(errorCallback ? [errorCallback] : []);

      const colRef = collection(db, collectionName);
      const unsubscribe = onSnapshot(
        colRef,
        (snapshot) => {
          const items = snapshot.docs.map((docSnap) => ({
            id: docSnap.id,
            ...docSnap.data(),
          }));

          notifySubscribers(collectionName, items);
        },
        (error) => {
          console.warn(`Firestore subscription notice for ${collectionName}:`, error.message);
          const currentEntry = multiplexedSubscriptions.get(collectionName);
          if (currentEntry) {
            currentEntry.errorListeners.forEach((errCb) => {
              try {
                errCb(error);
              } catch (_) {}
            });
          }
        }
      );

      entry = {
        unsubscribe,
        listeners,
        errorListeners,
        cleanupTimer: null,
      };
      multiplexedSubscriptions.set(collectionName, entry);
    }

    // Return cleanup function
    return () => {
      const currentEntry = multiplexedSubscriptions.get(collectionName);
      if (!currentEntry) return;

      currentEntry.listeners.delete(callback as (items: any[]) => void);
      if (errorCallback) currentEntry.errorListeners.delete(errorCallback);

      if (currentEntry.listeners.size === 0) {
        currentEntry.cleanupTimer = setTimeout(() => {
          if (currentEntry.listeners.size === 0) {
            try {
              currentEntry.unsubscribe();
            } catch (e) {
              // Ignore
            }
            multiplexedSubscriptions.delete(collectionName);
          }
        }, 10000);
      }
    };
  } catch (error) {
    return () => {};
  }
};

/**
 * Unsubscribes and cleans up all active Firestore subscriptions (e.g. on user logout)
 */
export const clearAllFirestoreSubscriptions = (): void => {
  multiplexedSubscriptions.forEach((entry) => {
    try {
      if (entry.cleanupTimer) {
        clearTimeout(entry.cleanupTimer);
        entry.cleanupTimer = null;
      }
      entry.unsubscribe();
    } catch (_) {}
  });
  multiplexedSubscriptions.clear();
};

/**
 * Clear all cash movements and shifts (resets Caja to fresh zero state)
 */
export const clearAllMovementsAndShifts = async (): Promise<boolean> => {
  try {
    collectionCache.set('cashMovements', []);
    saveStoredCollection('cashMovements', []);
    notifySubscribers('cashMovements', []);

    collectionCache.set('cashRegisters', []);
    saveStoredCollection('cashRegisters', []);
    notifySubscribers('cashRegisters', []);

    collectionCache.set('sales', []);
    saveStoredCollection('sales', []);
    notifySubscribers('sales', []);

    return true;
  } catch (err) {
    console.error('Error clearing cash movements and shifts:', err);
    throw err;
  }
};

/**
 * Clear all products and garment catalog (sets 0 products in Firestore cloud & local)
 */
export const clearAllProducts = async (): Promise<boolean> => {
  try {
    collectionCache.set('products', []);
    saveStoredCollection('products', []);
    notifySubscribers('products', []);

    try {
      const colRef = collection(db, 'products');
      const snap = await getDocs(colRef);
      if (snap && snap.docs && snap.docs.length > 0) {
        const deletes = snap.docs.map((docSnap) => deleteDoc(doc(db, 'products', docSnap.id)));
        await Promise.all(deletes);
      }
    } catch (cloudErr) {
      console.warn('Note on Firestore cloud product deletion:', cloudErr);
    }

    return true;
  } catch (err) {
    console.error('Error in clearAllProducts:', err);
    throw err;
  }
};

/**
 * Completely reset entire system to brand new empty state (0 products, 0 movements, 0 customers, etc.)
 */
export const resetEntireSystemToFresh = async (): Promise<boolean> => {
  try {
    const collectionsToClean = [
      'products',
      'customers',
      'suppliers',
      'brands',
      'sales',
      'purchases',
      'stockMovements',
      'cashMovements',
      'cashRegisters',
    ];

    collectionsToClean.forEach((col) => {
      collectionCache.set(col, []);
      saveStoredCollection(col, []);
      notifySubscribers(col, []);
    });

    for (const col of collectionsToClean) {
      try {
        const colRef = collection(db, col);
        const snap = await getDocs(colRef);
        if (snap && snap.docs && snap.docs.length > 0) {
          const promises = snap.docs
            .filter((d) => d.id !== 'AiXg60MMBKvHmfPX8Q8Z')
            .map((d) => deleteDoc(doc(db, col, d.id)));
          await Promise.all(promises);
        }
      } catch (err) {
        // Continue cleaning other collections
      }
    }

    return true;
  } catch (err) {
    console.error('Error resetting entire system:', err);
    throw err;
  }
};
