// Roles and Permissions definition for the Clothing Store System
// STRICT RULE: ONLY ONE (1) ADMINISTRATOR IS ALLOWED IN THE SYSTEM
export const ROLES = {
  ADMIN: 'ADMIN',
  SUPERVISOR: 'SUPERVISOR',
  CAJERO: 'CAJERO',
  EMPLEADO: 'EMPLEADO',
};

export const ROLE_LABELS = {
  [ROLES.ADMIN]: 'Administrador (Único)',
  [ROLES.SUPERVISOR]: 'Supervisor / Encargado',
  [ROLES.CAJERO]: 'Cajero',
  [ROLES.EMPLEADO]: 'Vendedor',
};

export const ROLE_PERMISSIONS = {
  [ROLES.ADMIN]: [
    'dashboard.view',
    'products.view', 'products.create', 'products.edit', 'products.delete', 'products.adjust_stock',
    'categories.manage',
    'brands.manage',
    'customers.view', 'customers.create', 'customers.edit', 'customers.delete',
    'suppliers.view', 'suppliers.create', 'suppliers.edit', 'suppliers.delete',
    'purchases.view', 'purchases.create',
    'pos.access', 'pos.sell', 'pos.discount',
    'cash.view', 'cash.open_close', 'cash.movements',
    'sales.view', 'sales.cancel', 'sales.refund',
    'reports.view', 'reports.export',
    'users.manage',
    'settings.manage',
  ],
  [ROLES.SUPERVISOR]: [
    'dashboard.view',
    'products.view', 'products.create', 'products.edit', 'products.adjust_stock',
    'categories.manage',
    'brands.manage',
    'customers.view', 'customers.create', 'customers.edit',
    'suppliers.view', 'suppliers.create',
    'purchases.view', 'purchases.create',
    'pos.access', 'pos.sell', 'pos.discount',
    'cash.view', 'cash.open_close', 'cash.movements',
    'sales.view', 'sales.cancel', 'sales.refund',
    'reports.view', 'reports.export',
  ],
  [ROLES.CAJERO]: [
    'dashboard.view',
    'products.view',
    'customers.view', 'customers.create',
    'pos.access', 'pos.sell',
    'cash.view', 'cash.open_close', 'cash.movements',
    'sales.view',
  ],
  [ROLES.EMPLEADO]: [
    'dashboard.view',
    'products.view',
    'customers.view', 'customers.create',
    'pos.access', 'pos.sell',
    'sales.view',
  ],
};

export const hasPermission = (userRole, permission) => {
  if (!userRole) return false;
  if (userRole === ROLES.ADMIN) return true;
  const permissions = ROLE_PERMISSIONS[userRole] || [];
  return permissions.includes(permission);
};

