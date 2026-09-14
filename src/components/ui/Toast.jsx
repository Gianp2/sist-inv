import { toast } from 'sonner';

/**
 * Enhanced Toast Alert utility for Sistema Inv.
 * Provides consistent typography, descriptions, aesthetic styling, and action triggers.
 */
export const toastAlert = {
  success: (title, description = '', options = {}) => {
    return toast.success(title, {
      description: description || undefined,
      duration: 3800,
      ...options,
    });
  },

  error: (title, description = '', options = {}) => {
    return toast.error(title, {
      description: description || undefined,
      duration: 4800,
      ...options,
    });
  },

  warning: (title, description = '', options = {}) => {
    return toast.warning(title, {
      description: description || undefined,
      duration: 4200,
      ...options,
    });
  },

  info: (title, description = '', options = {}) => {
    return toast.info(title, {
      description: description || undefined,
      duration: 3600,
      ...options,
    });
  },

  // --- Auth & Session Toasts ---
  welcome: (userName, storeName, roleLabel) => {
    return toast.success(`¡Bienvenida/o, ${userName || 'Usuario'}!`, {
      description: `Sesión iniciada con éxito en ${storeName || 'Sistema Inv'} como ${roleLabel || 'Usuario'}.`,
      duration: 4200,
    });
  },

  logoutSuccess: () => {
    return toast.info('Sesión cerrada correctamente', {
      description: 'Has salido del sistema de forma segura. ¡Hasta la próxima!',
      duration: 4000,
    });
  },

  accountSwitched: (targetRoleName) => {
    return toast.success('Perfil actualizado', {
      description: `Ahora estás operando en el sistema como ${targetRoleName}.`,
      duration: 3500,
    });
  },

  sessionStartup: (userName, roleLabel) => {
    return toast.info(`Sistema iniciado`, {
      description: `Conectado como ${userName} (${roleLabel}). Datos sincronizados.`,
      duration: 3200,
    });
  },

  // --- Inventory & Stock Toasts ---
  stockWarning: (productName, currentStock, minStock, onAction) => {
    return toast.warning(`Alerta de Stock: ${productName}`, {
      description: `Quedan solo ${currentStock} unidades disponibles (mínimo: ${minStock}).`,
      duration: 5000,
      action: onAction
        ? {
            label: 'Ver Stock',
            onClick: onAction,
          }
        : undefined,
    });
  },

  stockCriticalAlert: (count, onAction) => {
    return toast.warning('Atención de Inventario', {
      description: `Tienes ${count} ${count === 1 ? 'prenda' : 'prendas'} con stock bajo o agotado.`,
      duration: 5500,
      action: onAction
        ? {
            label: 'Revisar Stock',
            onClick: onAction,
          }
        : undefined,
    });
  },

  // --- Cash & POS Toasts ---
  cashWarning: (message, onAction) => {
    return toast.warning('Aviso de Caja Registradora', {
      description: message,
      duration: 5000,
      action: onAction
        ? {
            label: 'Abrir Caja',
            onClick: onAction,
          }
        : undefined,
    });
  },

  cashOpenSuccess: (amountFormatted) => {
    return toast.success('¡Caja del turno abierta!', {
      description: `Fondo inicial registrado: ${amountFormatted}. Lista para ventas.`,
      duration: 4000,
    });
  },

  cashCloseSuccess: () => {
    return toast.success('¡Cierre de caja completado!', {
      description: 'Arqueo diario y balance de movimientos guardados correctamente.',
      duration: 4500,
    });
  },

  saleSuccess: (saleNumber, totalFormatted) => {
    return toast.success(`¡Venta ${saleNumber} registrada!`, {
      description: `Cobro de ${totalFormatted} procesado y stock descontado automáticamente.`,
      duration: 4200,
    });
  },

  // --- Clipboard & Quick Helpers ---
  copySuccess: (label = 'Texto') => {
    return toast.success('Copiado al portapapeles', {
      description: `${label} copiado exitosamente.`,
      duration: 2500,
    });
  },

  dismiss: (toastId) => {
    toast.dismiss(toastId);
  },
};

export { toast };
export default toastAlert;

