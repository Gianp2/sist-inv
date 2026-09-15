// Roles and Permissions definition for the Clothing Store System
// STRICT RULE: ONLY ONE (1) ADMINISTRATOR / OWNER IS ALLOWED IN THE SYSTEM
export const ROLES = {
  ADMIN: 'ADMIN',
  SUPERVISOR: 'SUPERVISOR',
  CAJERO: 'CAJERO',
  EMPLEADO: 'EMPLEADO',
};

export const ROLE_LABELS = {
  [ROLES.ADMIN]: 'Dueña / Administradora',
  [ROLES.SUPERVISOR]: 'Supervisor / Encargado',
  [ROLES.CAJERO]: 'Cajero',
  [ROLES.EMPLEADO]: 'Vendedora / Empleada',
};

// Complete module structure with granular action permissions (Ver, Crear, Editar, Eliminar)
export const SYSTEM_MODULES = [
  {
    id: 'products',
    name: 'Productos y Prendas',
    description: 'Catálogo de indumentaria, precios, talles y variantes de color',
    actions: ['view', 'create', 'edit', 'delete'],
    extraPermissions: [
      { id: 'costs.view', label: 'Ver Costos y Ganancias' },
      { id: 'pricing.manage', label: 'Gestionar Precios / Sugerencias' },
      { id: 'products.adjust_stock', label: 'Ajuste Rápido de Stock' },
    ],
  },
  {
    id: 'stock',
    name: 'Control de Stock',
    description: 'Inventario físico, alertas de stock mínimo y recuentos por talle',
    actions: ['view', 'create', 'edit', 'delete'],
  },
  {
    id: 'categories',
    name: 'Categorías',
    description: 'Clasificación de prendas (Remeras, Pantalones, Camperas, etc.)',
    actions: ['view', 'create', 'edit', 'delete'],
  },
  {
    id: 'brands',
    name: 'Marcas',
    description: 'Marcas y fabricantes de indumentaria',
    actions: ['view', 'create', 'edit', 'delete'],
  },
  {
    id: 'purchases',
    name: 'Compras de Stock',
    description: 'Ingresos de mercadería y compras a proveedores',
    actions: ['view', 'create', 'edit', 'delete'],
  },
  {
    id: 'suppliers',
    name: 'Proveedores',
    description: 'Talleres, fabricantes y distribuidores mayoristas',
    actions: ['view', 'create', 'edit', 'delete'],
  },
  {
    id: 'customers',
    name: 'Clientes',
    description: 'Directorio de compradores, historial y fidelización',
    actions: ['view', 'create', 'edit', 'delete'],
  },
  {
    id: 'current_accounts',
    name: 'Cuentas Corrientes',
    description: 'Control de fiados, deudas, cobros parciales y estados de cuenta',
    actions: ['view', 'create', 'edit', 'delete'],
  },
  {
    id: 'cash',
    name: 'Caja del Turno',
    description: 'Apertura y cierre de caja diaria, ingresos y retiros',
    actions: ['view', 'create', 'edit', 'delete'],
    extraPermissions: [
      { id: 'dashboard.financials', label: 'Ver Arqueo Total / Métricas Financieras' },
    ],
  },
  {
    id: 'sales',
    name: 'Ventas y Mostrador',
    description: 'Emisión de tickets de venta, punto de cobro y anulaciones',
    actions: ['view', 'create', 'edit', 'delete'],
  },
  {
    id: 'reports',
    name: 'Reportes de Gestión',
    description: 'Estadísticas, balances e informes contables',
    actions: ['view', 'create', 'edit', 'delete'],
    extraPermissions: [
      { id: 'reports.export', label: 'Exportar Informes a Excel / PDF' },
      { id: 'reports.financial', label: 'Ver Balances Financieros Detallados' },
    ],
  },
  {
    id: 'settings',
    name: 'Configuración',
    description: 'Datos del local comercial, moneda y parámetros del sistema',
    actions: ['view', 'create', 'edit', 'delete'],
  },
];

export const ROLE_PERMISSIONS = {
  [ROLES.ADMIN]: [
    'dashboard.view',
    'dashboard.financials',
    'products.view', 'products.create', 'products.edit', 'products.delete', 'products.adjust_stock', 'products.clear',
    'stock.view', 'stock.create', 'stock.edit', 'stock.delete',
    'costs.view',
    'pricing.manage',
    'categories.view', 'categories.create', 'categories.edit', 'categories.delete', 'categories.manage',
    'brands.view', 'brands.create', 'brands.edit', 'brands.delete', 'brands.manage',
    'customers.view', 'customers.create', 'customers.edit', 'customers.delete', 'clients.view', 'clients.manage',
    'current_accounts.view', 'current_accounts.create', 'current_accounts.edit', 'current_accounts.delete',
    'suppliers.view', 'suppliers.create', 'suppliers.edit', 'suppliers.delete',
    'purchases.view', 'purchases.create', 'purchases.edit', 'purchases.delete',
    'pos.access', 'pos.sell', 'pos.discount',
    'cash.view', 'cash.create', 'cash.edit', 'cash.delete', 'cash.open_close', 'cash.movements', 'cash.delete_movement', 'cash.financial_tabs',
    'sales.view', 'sales.create', 'sales.edit', 'sales.delete', 'sales.cancel', 'sales.refund',
    'reports.view', 'reports.create', 'reports.edit', 'reports.delete', 'reports.financial', 'reports.export',
    'users.view', 'users.create', 'users.edit', 'users.delete', 'users.manage',
    'settings.view', 'settings.create', 'settings.edit', 'settings.delete', 'settings.manage',
  ],
  [ROLES.SUPERVISOR]: [
    'dashboard.view',
    'products.view', 'products.create', 'products.edit', 'products.adjust_stock',
    'stock.view', 'stock.create', 'stock.edit',
    'costs.view',
    'pricing.manage',
    'categories.view', 'categories.create', 'categories.edit', 'categories.delete', 'categories.manage',
    'brands.view', 'brands.create', 'brands.edit', 'brands.delete', 'brands.manage',
    'customers.view', 'customers.create', 'customers.edit', 'clients.view',
    'current_accounts.view', 'current_accounts.create', 'current_accounts.edit',
    'suppliers.view', 'suppliers.create', 'suppliers.edit',
    'purchases.view', 'purchases.create',
    'pos.access', 'pos.sell', 'pos.discount',
    'cash.view', 'cash.create', 'cash.open_close', 'cash.movements',
    'sales.view', 'sales.create', 'sales.edit', 'sales.cancel', 'sales.refund',
    'reports.view',
  ],
  [ROLES.CAJERO]: [
    'dashboard.view',
    'products.view',
    'stock.view',
    'customers.view', 'customers.create', 'clients.view',
    'current_accounts.view', 'current_accounts.create',
    'pos.access', 'pos.sell',
    'cash.view', 'cash.create', 'cash.open_close', 'cash.movements',
    'sales.view', 'sales.create',
  ],
  [ROLES.EMPLEADO]: [
    'dashboard.view',
    'products.view',
    'stock.view',
    'customers.view', 'customers.create', 'clients.view',
    'current_accounts.view', 'current_accounts.create',
    'pos.access', 'pos.sell',
    'cash.view', 'cash.create', 'cash.open_close',
    'sales.view', 'sales.create',
  ],
};

/**
 * Checks whether a user with a given role and optional custom user-specific permissions
 * is granted a specific permission.
 * 
 * Evaluation order:
 * 1. ADMIN always gets true (total unrestricted access).
 * 2. If custom user permissions specify the permission (boolean), return that value.
 * 3. Fallback to default permissions defined for the role.
 */
export const hasPermission = (userRole, permission, customPermissions = null) => {
  if (!userRole) return false;
  // 1. ADMIN always has total access
  if (userRole === ROLES.ADMIN) return true;

  // 2. Custom User Permissions Override
  if (customPermissions && typeof customPermissions === 'object') {
    // Direct key match
    if (customPermissions[permission] !== undefined) {
      return Boolean(customPermissions[permission]);
    }

    // Alias resolution for custom permissions
    if (permission === 'clients.view' && customPermissions['customers.view'] !== undefined) {
      return Boolean(customPermissions['customers.view']);
    }
    if (permission === 'customers.view' && customPermissions['clients.view'] !== undefined) {
      return Boolean(customPermissions['clients.view']);
    }
    if (permission === 'categories.manage') {
      if (customPermissions['categories.edit'] !== undefined || customPermissions['categories.create'] !== undefined) {
        return Boolean(customPermissions['categories.edit'] || customPermissions['categories.create']);
      }
      if (customPermissions['categories.view'] !== undefined) {
        return Boolean(customPermissions['categories.view']);
      }
    }
    if (permission === 'brands.manage') {
      if (customPermissions['brands.edit'] !== undefined || customPermissions['brands.create'] !== undefined) {
        return Boolean(customPermissions['brands.edit'] || customPermissions['brands.create']);
      }
      if (customPermissions['brands.view'] !== undefined) {
        return Boolean(customPermissions['brands.view']);
      }
    }
    if (permission === 'settings.manage' && customPermissions['settings.edit'] !== undefined) {
      return Boolean(customPermissions['settings.edit']);
    }
    if (permission === 'settings.view' && customPermissions['settings.manage'] !== undefined) {
      return Boolean(customPermissions['settings.manage']);
    }
  }

  // 3. Fallback to Role Permissions
  const permissions = ROLE_PERMISSIONS[userRole] || [];
  if (permissions.includes(permission)) return true;

  // Fallback aliases for role definitions
  if (permission === 'categories.view' && permissions.includes('categories.manage')) return true;
  if (permission === 'brands.view' && permissions.includes('brands.manage')) return true;
  if (permission === 'clients.view' && permissions.includes('customers.view')) return true;
  if (permission === 'stock.view' && permissions.includes('products.view')) return true;
  if (permission === 'settings.view' && permissions.includes('settings.manage')) return true;

  return false;
};

/**
 * Returns an initial map of permissions according to a role defaults
 */
export const getDefaultRolePermissions = (role) => {
  if (role === ROLES.ADMIN) {
    const all = {};
    SYSTEM_MODULES.forEach((mod) => {
      mod.actions.forEach((act) => {
        all[`${mod.id}.${act}`] = true;
      });
      if (mod.extraPermissions) {
        mod.extraPermissions.forEach((extra) => {
          all[extra.id] = true;
        });
      }
    });
    return all;
  }

  const result = {};
  SYSTEM_MODULES.forEach((mod) => {
    mod.actions.forEach((act) => {
      const permKey = `${mod.id}.${act}`;
      result[permKey] = hasPermission(role, permKey);
    });
    if (mod.extraPermissions) {
      mod.extraPermissions.forEach((extra) => {
        result[extra.id] = hasPermission(role, extra.id);
      });
    }
  });
  return result;
};


