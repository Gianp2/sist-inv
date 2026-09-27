import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { COLLECTIONS } from '../constants/collections';
import {
  getDocument,
  setDocument,
  subscribeCollection,
  getCachedCollection,
} from '../services/firebase/firestore';
import { INITIAL_SETTINGS } from '../services/api/seedData';
import { toast } from 'sonner';

const SettingsContext = createContext(null);

const SETTINGS_STORAGE_KEY = 'sistemainv_settings_cache';

const cleanStoreSettings = (raw) => {
  if (!raw || typeof raw !== 'object') return raw;
  const cleaned = { ...raw };
  if (typeof cleaned.businessName === 'string' && /dual/i.test(cleaned.businessName)) {
    cleaned.businessName = 'Sistema Inv';
  }
  if (typeof cleaned.legalName === 'string' && /dual/i.test(cleaned.legalName)) {
    cleaned.legalName = 'Sistema Inv';
  }
  cleaned.address = '';
  return cleaned;
};

const getInitialCachedSettings = () => {
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        return cleanStoreSettings({ ...INITIAL_SETTINGS, ...parsed });
      }
    }
  } catch (e) {
    // ignore
  }
  return cleanStoreSettings(INITIAL_SETTINGS);
};

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(() => getInitialCachedSettings());
  const [loading, setLoading] = useState(true);

  // Subscribe to real-time settings changes in Firestore
  useEffect(() => {
    let isMounted = true;

    // First, deliver initial fetch or cache
    getDocument(COLLECTIONS.SETTINGS, 'general')
      .then((data) => {
        if (isMounted && data) {
          const rawMerged = { ...INITIAL_SETTINGS, ...data };
          const hadDual = /dual/i.test(rawMerged.businessName || '') || /dual/i.test(rawMerged.legalName || '');
          const hadAddress = Boolean(rawMerged.address && rawMerged.address.trim());
          const cleaned = cleanStoreSettings(rawMerged);
          setSettings(cleaned);
          try {
            localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(cleaned));
          } catch (_) {}
          // Silently clean Firestore document if it previously contained Dual or an address
          if (hadDual || hadAddress) {
            setDocument(COLLECTIONS.SETTINGS, 'general', cleaned).catch(() => {});
          }
        }
      })
      .catch((err) => {
        console.warn('Error fetching settings doc:', err);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    // Also subscribe to collection in case another tab or update modifies it
    const unsubscribe = subscribeCollection(
      COLLECTIONS.SETTINGS,
      [],
      (data) => {
        if (!isMounted) return;
        if (data && data.length > 0) {
          const generalDoc = data.find((d) => d.id === 'general') || data[0];
          if (generalDoc) {
            const cleaned = cleanStoreSettings({ ...INITIAL_SETTINGS, ...generalDoc });
            setSettings(cleaned);
            try {
              localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(cleaned));
            } catch (_) {}
          }
        }
        setLoading(false);
      },
      (err) => {
        console.warn('Settings subscription fallback:', err);
        if (isMounted) setLoading(false);
      }
    );

    return () => {
      isMounted = false;
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, []);

  // Synchronize browser tab title with current business name
  useEffect(() => {
    const titleName = (settings?.businessName && !/dual/i.test(settings.businessName))
      ? settings.businessName
      : 'Sistema Inv';
    document.title = `${titleName} - Sistema de Gestión`;
  }, [settings?.businessName]);

  // Persist updated settings to Firestore & Cache with instant optimistic update
  const saveSettings = useCallback(async (newSettings) => {
    try {
      const currencyCode = newSettings.currency || newSettings.currencyCode || 'ARS';
      let currencySymbol = '$';
      if (currencyCode === 'USD') currencySymbol = 'US$';
      else if (currencyCode === 'EUR') currencySymbol = '€';
      else if (currencyCode === 'MXN') currencySymbol = '$';
      else if (currencyCode === 'CLP') currencySymbol = '$';

      const enriched = cleanStoreSettings({
        ...INITIAL_SETTINGS,
        ...settings,
        ...newSettings,
        currency: currencyCode,
        currencyCode,
        currencySymbol,
        address: '', // address completely removed from system
        updatedAt: new Date().toISOString(),
      });

      // Optimistic instant state update across all components
      setSettings(enriched);
      try {
        localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(enriched));
      } catch (_) {}

      await setDocument(COLLECTIONS.SETTINGS, 'general', enriched);
      toast.success('¡Datos de la tienda guardados y actualizados en todo el sistema!');
      return enriched;
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Error al guardar la configuración');
      throw error;
    }
  }, [settings]);

  const cleanBusinessName = useMemo(() => {
    const raw = settings?.businessName;
    if (!raw || /dual/i.test(raw)) return 'Sistema Inv';
    return raw;
  }, [settings?.businessName]);

  const value = useMemo(
    () => ({
      settings,
      loading,
      saveSettings,
      businessName: cleanBusinessName,
      currencySymbol: settings?.currencySymbol || '$',
    }),
    [settings, loading, saveSettings, cleanBusinessName]
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) {
    // Return fallback if used outside provider during transition
    return {
      settings: getInitialCachedSettings(),
      loading: false,
      saveSettings: async () => {},
      businessName: 'Sistema Inv',
      currencySymbol: '$',
    };
  }
  return context;
}
