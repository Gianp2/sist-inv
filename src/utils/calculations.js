// Business calculation helpers

export const calculateProductProfit = (costPrice, salePrice) => {
  const cost = Number(costPrice) || 0;
  const sale = Number(salePrice) || 0;
  const profit = sale - cost;
  const marginPercentage = cost > 0 ? (profit / cost) * 100 : 100;
  return {
    profit,
    marginPercentage: Math.round(marginPercentage * 10) / 10,
  };
};

export const calculateTotalStock = (variants = [], fallbackStock = 0) => {
  if (!variants || variants.length === 0) {
    return Math.max(0, Number(fallbackStock) || 0);
  }
  return Math.max(0, variants.reduce((total, v) => total + Math.max(0, Number(v.stock) || 0), 0));
};

export const calculateCartTotals = (items = [], discountPercent = 0, taxPercent = 0) => {
  const subtotal = items.reduce((acc, item) => {
    const itemPrice = Number(item.price) || 0;
    const itemQty = Number(item.quantity) || 1;
    const itemDiscount = Number(item.discount) || 0;
    const linePrice = itemPrice * (1 - itemDiscount / 100);
    return acc + (linePrice * itemQty);
  }, 0);

  const globalDiscountAmount = (subtotal * (Number(discountPercent) || 0)) / 100;
  const subtotalAfterDiscount = Math.max(0, subtotal - globalDiscountAmount);
  const taxAmount = (subtotalAfterDiscount * (Number(taxPercent) || 0)) / 100;
  const total = subtotalAfterDiscount + taxAmount;

  const totalCost = items.reduce((acc, item) => {
    const itemCost = Number(item.costPrice) || 0;
    const itemQty = Number(item.quantity) || 1;
    return acc + (itemCost * itemQty);
  }, 0);

  const estimatedProfit = total - totalCost;

  return {
    subtotal: Math.round(subtotal * 100) / 100,
    globalDiscountAmount: Math.round(globalDiscountAmount * 100) / 100,
    taxAmount: Math.round(taxAmount * 100) / 100,
    total: Math.round(total * 100) / 100,
    totalCost: Math.round(totalCost * 100) / 100,
    estimatedProfit: Math.round(estimatedProfit * 100) / 100,
    itemCount: items.reduce((acc, i) => acc + (Number(i.quantity) || 1), 0),
  };
};

export const generateSKU = (categoryPrefix = 'ROP', brandPrefix = 'MOD') => {
  const cat = (categoryPrefix || 'ROP').substring(0, 3).toUpperCase();
  const brd = (brandPrefix || 'MOD').substring(0, 3).toUpperCase();
  const randomNum = Math.floor(1000 + Math.random() * 9000);
  return `${cat}-${brd}-${randomNum}`;
};

export const generateBarcode = () => {
  // Generate valid-looking 12 or 13 digit numeric barcode
  const prefix = '779'; // Common regional prefix
  const middle = Math.floor(100000000 + Math.random() * 900000000).toString();
  return `${prefix}${middle}`.substring(0, 13);
};
