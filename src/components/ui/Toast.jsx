import { toast } from 'sonner';

/**
 * Enhanced Toast Alert utility for Sistema Inv.
 * Provides consistent typography, descriptions, and action triggers.
 */
export const toastAlert = {
  success: (title, description = '', options = {}) => {
    return toast.success(title, {
      description: description || undefined,
      duration: 3500,
      ...options,
    });
  },

  error: (title, description = '', options = {}) => {
    return toast.error(title, {
      description: description || undefined,
      duration: 4500,
      ...options,
    });
  },

  warning: (title, description = '', options = {}) => {
    return toast.warning(title, {
      description: description || undefined,
      duration: 4000,
      ...options,
    });
  },

  info: (title, description = '', options = {}) => {
    return toast.info(title, {
      description: description || undefined,
      duration: 3500,
      ...options,
    });
  },

  stockWarning: (productName, currentStock, minStock, onAction) => {
    return toast.warning(`Alerta de Stock Bajo: ${productName}`, {
      description: `Quedan solo ${currentStock} unidades disponibles (mínimo configurado: ${minStock}).`,
      duration: 5000,
      action: onAction
        ? {
            label: 'Ver Stock',
            onClick: onAction,
          }
        : undefined,
    });
  },

  cashWarning: (message, onAction) => {
    return toast.warning('Aviso de Caja Registradora', {
      description: message,
      duration: 4500,
      action: onAction
        ? {
            label: 'Abrir Caja',
            onClick: onAction,
          }
        : undefined,
    });
  },

  dismiss: (toastId) => {
    toast.dismiss(toastId);
  },
};

export { toast };
export default toastAlert;
