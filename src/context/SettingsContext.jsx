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

const getInitialCachedSettings = () => {
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        return { ...INITIAL_SETTINGS, ...parsed };
      }
    }
  } catch (e) {
    // ignore
  }
  return INITIAL_SETTINGS;
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
          const merged = { ...INITIAL_SETTINGS, ...data };
          setSettings(merged);
          try {
            localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(merged));
          } catch (_) {}
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
            const merged = { ...INITIAL_SETTINGS, ...generalDoc };
            setSettings(merged);
            try {
              localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(merged));
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
    if (settings?.businessName) {
      document.title = `${settings.businessName} - Sistema de Gestión`;
    }
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

      const enriched = {
        ...INITIAL_SETTINGS,
        ...settings,
        ...newSettings,
        currency: currencyCode,
        currencyCode,
        currencySymbol,
        updatedAt: new Date().toISOString(),
      };

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

  const value = useMemo(
    () => ({
      settings,
      loading,
      saveSettings,
      businessName: settings?.businessName || 'Sistema Inv',
      currencySymbol: settings?.currencySymbol || '$',
    }),
    [settings, loading, saveSettings]
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
