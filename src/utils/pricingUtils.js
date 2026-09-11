// Utility functions for Price History, Cost History, Stock Aging and Smart Pricing Suggestions

export const DEFAULT_AGE_THRESHOLDS = {
  RECENT: 90,
  OLD: 180,
  VERY_OLD: 365,
};

export const AGE_STATUS = {
  RECENT: {
    key: 'RECIENTE',
    label: 'Reciente',
    badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    dotClass: 'bg-emerald-500',
    description: '0 a 90 días en stock',
  },
  OLD: {
    key: 'ANTIGUO',
    label: 'Antiguo',
    badgeClass: 'bg-blue-100 text-blue-800 border-blue-200',
    dotClass: 'bg-blue-500',
    description: '91 a 180 días en stock',
  },
  VERY_OLD: {
    key: 'MUY_ANTIGUO',
    label: 'Muy antiguo',
    badgeClass: 'bg-amber-100 text-amber-800 border-amber-200',
    dotClass: 'bg-amber-500',
    description: '181 a 365 días en stock',
  },
  STAGNANT: {
    key: 'ESTANCADO',
    label: 'Estancado',
    badgeClass: 'bg-rose-100 text-rose-800 border-rose-200',
    dotClass: 'bg-rose-500',
    description: 'Más de 365 días en stock',
  },
  UNKNOWN: {
    key: 'SIN_FECHA',
    label: 'Sin registrar',
    badgeClass: 'bg-neutral-100 text-neutral-600 border-neutral-200',
    dotClass: 'bg-neutral-400',
    description: 'Fecha de ingreso no registrada',
  },
};

/**
 * Parses any date format (Firestore Timestamp, ISO string, Date object) safely
 */
export function parseDateSafe(dateVal) {
  if (!dateVal) return null;
  if (typeof dateVal?.toDate === 'function') {
    return dateVal.toDate();
  }
  if (dateVal instanceof Date) {
    return isNaN(dateVal.getTime()) ? null : dateVal;
  }
  const parsed = new Date(dateVal);
  return isNaN(parsed.getTime()) ? null : parsed;
}

/**
 * Computes the number of days between a given date and now
 */
export function getDaysDifference(dateVal) {
  const date = parseDateSafe(dateVal);
  if (!date) return null;
  const now = new Date();
  const diffTime = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
}

/**
 * Returns the stock entry date for a product
 */
export function getProductEntryDate(product) {
  if (!product) return null;
  return (
    product.entryDate ||
    product.stockEntryDate ||
    product.firstEntryDate ||
    product.createdAt ||
    null
  );
}

/**
 * Computes product aging statistics
 */
export function getProductAging(product, thresholds = DEFAULT_AGE_THRESHOLDS) {
  const entryDateRaw = getProductEntryDate(product);
  const entryDate = parseDateSafe(entryDateRaw);

  if (!entryDate) {
    return {
      daysInStock: null,
      entryDate: null,
      status: AGE_STATUS.UNKNOWN,
      isStagnant: false,
      formattedAge: 'No registrado',
    };
  }

  const daysInStock = getDaysDifference(entryDate);

  let status = AGE_STATUS.RECENT;
  if (daysInStock > thresholds.VERY_OLD) {
    status = AGE_STATUS.STAGNANT;
  } else if (daysInStock > thresholds.OLD) {
    status = AGE_STATUS.VERY_OLD;
  } else if (daysInStock > thresholds.RECENT) {
    status = AGE_STATUS.OLD;
  }

  return {
    daysInStock,
    entryDate,
    status,
    isStagnant: daysInStock > thresholds.VERY_OLD,
    formattedAge: `${daysInStock} ${daysInStock === 1 ? 'día' : 'días'} en stock`,
  };
}

/**
 * Computes friendly info about the last sale
 */
export function getLastSaleInfo(product) {
  const lastSaleDate = parseDateSafe(product?.lastSaleDate);
  if (!lastSaleDate) {
    return {
      hasSales: false,
      lastSaleDate: null,
      daysWithoutSales: null,
      formatted: 'Sin ventas registradas',
    };
  }

  const days = getDaysDifference(lastSaleDate);
  let formatted = '';
  if (days === 0) formatted = 'Hoy';
  else if (days === 1) formatted = 'Ayer';
  else if (days < 30) formatted = `Hace ${days} días`;
  else {
    const months = Math.floor(days / 30);
    formatted = months === 1 ? 'Hace 1 mes' : `Hace ${months} meses`;
  }

  return {
    hasSales: true,
    lastSaleDate,
    daysWithoutSales: days,
    formatted,
  };
}

/**
 * Calculate margin and profit safely
 */
export function calculateProfitability(cost, price) {
  const numCost = Number(cost);
  const numPrice = Number(price);

  if (isNaN(numCost) || isNaN(numPrice) || numCost <= 0 || numPrice <= 0) {
    return {
      profit: 0,
      marginOnSales: 0,
      markupOnCost: 0,
      isLoss: false,
      isValid: false,
    };
  }

  const profit = numPrice - numCost;
  // Margin on sale: (Profit / Price) * 100
  const marginOnSales = (profit / numPrice) * 100;
  // Markup on cost: (Profit / Cost) * 100
  const markupOnCost = (profit / numCost) * 100;

  return {
    profit,
    marginOnSales: Number(marginOnSales.toFixed(2)),
    markupOnCost: Number(markupOnCost.toFixed(2)),
    isLoss: profit < 0,
    isValid: true,
  };
}

/**
 * Calculate cost metrics from cost history or single cost
 */
export function calculateCostMetrics(costHistory = [], fallbackCost = 0) {
  const validCosts = costHistory
    .map((item) => Number(item?.cost))
    .filter((c) => !isNaN(c) && c > 0);

  if (validCosts.length === 0) {
    const singleCost = Number(fallbackCost);
    if (!isNaN(singleCost) && singleCost > 0) {
      return {
        lastCost: singleCost,
        minCost: singleCost,
        maxCost: singleCost,
        avgCost: singleCost,
        costCount: 1,
        hasHistory: false,
      };
    }
    return {
      lastCost: null,
      minCost: null,
      maxCost: null,
      avgCost: null,
      costCount: 0,
      hasHistory: false,
    };
  }

  const minCost = Math.min(...validCosts);
  const maxCost = Math.max(...validCosts);
  const sumCost = validCosts.reduce((acc, curr) => acc + curr, 0);
  const avgCost = Math.round(sumCost / validCosts.length);
  // Last cost is the latest entry
  const sorted = [...costHistory].sort((a, b) => {
    const timeA = parseDateSafe(a.date || a.createdAt)?.getTime() || 0;
    const timeB = parseDateSafe(b.date || b.createdAt)?.getTime() || 0;
    return timeB - timeA;
  });
  const lastCost = Number(sorted[0]?.cost) || validCosts[validCosts.length - 1];

  return {
    lastCost,
    minCost,
    maxCost,
    avgCost,
    costCount: validCosts.length,
    hasHistory: validCosts.length > 1,
  };
}

/**
 * Smart Price Suggestion Engine
 * NEVER invents missing data. Clearly states missing info.
 */
export function calculateSuggestedPrice(product, options = {}) {
  const targetMargin = Number(options.targetMargin ?? 80); // 80% markup default
  const costMetrics = options.costMetrics || calculateCostMetrics([], product?.cost);

  const cost = Number(costMetrics.lastCost ?? product?.cost);
  const currentPrice = Number(product?.price);

  // Missing cost verification
  if (isNaN(cost) || cost <= 0) {
    return {
      canCalculate: false,
      suggestedPrice: null,
      missingInfo: 'Falta registrar el costo del producto.',
      reasons: ['No es posible calcular un precio sugerido sin conocer el costo unitario de la prenda.'],
      action: 'REGISTRAR_COSTO',
      actionLabel: 'Registrar costo',
      needsReview: true,
      reviewReason: 'Sin costo registrado',
    };
  }

  // Base calculation with target markup: Cost * (1 + targetMargin / 100)
  const rawSuggestedPrice = cost * (1 + targetMargin / 100);
  // Round cleanly to nearest 50 or 100
  const suggestedPrice = Math.round(rawSuggestedPrice / 100) * 100;

  const aging = getProductAging(product);
  const saleInfo = getLastSaleInfo(product);
  const profit = calculateProfitability(cost, currentPrice);

  const reasons = [];
  reasons.push(`Costo base: $${cost.toLocaleString('es-AR')} con margen objetivo del ${targetMargin}%`);

  let action = 'MANTENER';
  let actionLabel = 'Mantener precio';
  let needsReview = false;
  let reviewReason = '';

  // Evaluate flags
  if (!currentPrice || currentPrice <= 0) {
    needsReview = true;
    reviewReason = 'Sin precio de venta';
    action = 'AUMENTAR';
    actionLabel = 'Establecer precio';
    reasons.push('El producto no tiene un precio de venta configurado actualmente.');
  } else if (currentPrice < cost) {
    needsReview = true;
    reviewReason = 'Venta a pérdida';
    action = 'AUMENTAR';
    actionLabel = 'Aumentar precio urgente';
    reasons.push(`El precio actual ($${currentPrice.toLocaleString('es-AR')}) es inferior al costo ($${cost.toLocaleString('es-AR')}).`);
  } else if (profit.markupOnCost < 30) {
    needsReview = true;
    reviewReason = 'Margen muy bajo (< 30%)';
    action = 'AUMENTAR';
    actionLabel = 'Aumentar margen';
    reasons.push(`El margen actual sobre costo es de solo ${profit.markupOnCost.toFixed(1)}%.`);
  }

  // Evaluate aging & stagnation
  if (aging.isStagnant) {
    needsReview = true;
    if (!reviewReason) reviewReason = 'Producto estancado';
    if (product.stock > 0) {
      if (!saleInfo.hasSales || (saleInfo.daysWithoutSales && saleInfo.daysWithoutSales > 180)) {
        action = 'LIQUIDAR';
        actionLabel = 'Liquidar stock';
        reasons.push(`Lleva ${aging.daysInStock} días en stock sin ventas recientes. Se recomienda liquidar o aplicar promoción para recuperar capital.`);
      } else {
        action = 'APLICAR_DESCUENTO';
        actionLabel = 'Aplicar descuento';
        reasons.push(`Producto de alta permanencia (${aging.daysInStock} días). Se sugiere incentivar rotación.`);
      }
    }
  } else if (aging.status.key === 'MUY_ANTIGUO') {
    if (!reviewReason && (!saleInfo.hasSales || saleInfo.daysWithoutSales > 120)) {
      needsReview = true;
      reviewReason = 'Baja rotación';
      action = 'APLICAR_DESCUENTO';
      actionLabel = 'Revisar promoción';
      reasons.push(`Lleva más de 6 meses en inventario (${aging.daysInStock} días).`);
    }
  }

  // Price discrepancy with target suggestion (>20% difference)
  if (currentPrice > 0 && Math.abs(suggestedPrice - currentPrice) / currentPrice > 0.25) {
    needsReview = true;
    if (!reviewReason) {
      reviewReason = suggestedPrice > currentPrice ? 'Precio desactualizado' : 'Precio por encima del objetivo';
    }
    reasons.push(`Existe una variación del ${Math.round(((suggestedPrice - currentPrice) / currentPrice) * 100)}% respecto al precio objetivo.`);
  }

  return {
    canCalculate: true,
    suggestedPrice,
    rawSuggestedPrice,
    cost,
    currentPrice,
    targetMargin,
    difference: currentPrice ? suggestedPrice - currentPrice : suggestedPrice,
    differencePercent: currentPrice ? ((suggestedPrice - currentPrice) / currentPrice) * 100 : 100,
    action,
    actionLabel,
    needsReview,
    reviewReason: reviewReason || 'En rango esperado',
    reasons,
    aging,
    saleInfo,
    profit,
  };
}
