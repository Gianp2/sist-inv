/**
 * Utilidades centralizadas para el manejo de campos numéricos (precios, costos, stock, cantidades, etc.).
 *
 * Reglas de comportamiento:
 * - Si el campo contiene únicamente "0" y el usuario escribe un número distinto de 0,
 *   se elimina automáticamente el "0" inicial ("0" -> escribo "10" -> queda "10", NO "010").
 * - Si escribe "5" -> queda "5".
 * - Si escribe "1000" -> queda "1000".
 * - Múltiples ceros iniciales ("00", "000") colapsan a "0".
 * - No elimina ceros que formen parte de números válidos ("10", "100", "1050").
 * - Mantiene enteros y decimales válidos que inician con cero ("0.", "0.5", "0,5", "0.05").
 * - Permite borrar completamente con retroceso (deja "" para que el usuario pueda escribir libremente).
 */

/**
 * Sanitiza un valor numérico ingresado o tipeado por el usuario eliminando ceros no significativos a la izquierda.
 *
 * @param {string|number|null|undefined} val
 * @returns {string}
 */
export function sanitizeNumericValue(val) {
  if (val === '' || val === null || val === undefined) return '';
  const str = String(val).trim();
  if (str === '') return '';

  // Conservar números decimales válidos como "0.", "0.5", "0,5", "0.05" o el cero simple "0"
  if (str === '0' || /^0[.,]/.test(str)) {
    return str;
  }

  // Eliminar ceros a la izquierda que estén seguidos de otro dígito:
  // "01" -> "1", "010" -> "10", "05" -> "5", "01000" -> "1000", "005" -> "5", "00" -> "0", "-05" -> "-5"
  return str.replace(/^(-?)0+(?=\d)/, '$1');
}

/**
 * Selecciona automáticamente el texto al hacer foco si el valor actual es 0,
 * permitiendo que al tipear un nuevo valor se reemplace de inmediato.
 *
 * @param {FocusEvent} e
 */
export function handleNumericFocus(e) {
  try {
    if (e?.target) {
      const val = e.target.value;
      if (val === '0' || val === 0) {
        e.target.select();
      }
    }
  } catch (_) {
    // Si el navegador no permite select() en un tipo específico, falla silenciosamente
  }
}

/**
 * Convierte un valor (que puede ser string numérico o vacío) a Number garantizando que no sea NaN.
 *
 * @param {any} val
 * @param {number} [fallback=0]
 * @returns {number}
 */
export function parseNumericValue(val, fallback = 0) {
  if (val === '' || val === null || val === undefined) return fallback;
  const parsed = Number(val);
  return isNaN(parsed) ? fallback : parsed;
}
