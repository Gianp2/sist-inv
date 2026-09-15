import { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Shirt,
  Tags,
  Bookmark,
  Users,
  Truck,
  ShoppingBag,
  CircleDollarSign,
  BarChart3,
  Settings,
  Boxes,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
  LogOut,
  ShieldCheck,
  UserCheck,
  BookOpen,
  X,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useSettings } from '../../context/SettingsContext';
import { cn } from '../../utils/cn';
import { ROLES, ROLE_LABELS } from '../../constants/roles';

export function Sidebar({ isCollapsed, toggleSidebar, mobileOpen, setMobileOpen }) {
  const { user, role, roleLabel, isOwner, isEmployee, can, logout } = useAuth();
  const { settings } = useSettings();
  const storeName = settings?.businessName || 'Sistema Inv';
  const storeSubtitle = settings?.address || 'Control de Stock & Caja';

  // Mobile background scroll locking logic
  useEffect(() => {
    if (mobileOpen) {
      const originalOverflow = document.body.style.overflow;
      const originalTouchAction = document.body.style.touchAction;

      // Lock background scroll
      document.body.style.overflow = 'hidden';
      document.body.style.touchAction = 'none';

      // Handle ESC key to close
      const handleKeyDown = (e) => {
        if (e.key === 'Escape') {
          setMobileOpen(false);
        }
      };

      // Handle window resize (auto-unlock if resized to desktop breakpoint)
      const handleResize = () => {
        if (window.innerWidth >= 1024) {
          setMobileOpen(false);
        }
      };

      window.addEventListener('keydown', handleKeyDown);
      window.addEventListener('resize', handleResize);

      return () => {
        document.body.style.overflow = originalOverflow;
        document.body.style.touchAction = originalTouchAction;
        window.removeEventListener('keydown', handleKeyDown);
        window.removeEventListener('resize', handleResize);
      };
    }
  }, [mobileOpen, setMobileOpen]);

  const navigationSections = [
    {
      title: 'Principal',
      items: [
        { name: 'Dashboard', path: '/', end: true, icon: LayoutDashboard },
        { name: 'Caja del Turno', path: '/caja', icon: CircleDollarSign, badge: 'Caja', permission: 'cash.view' },
      ],
    },
    {
      title: 'Inventario y Stock',
      items: [
        { name: 'Productos y Prendas', path: '/productos', icon: Shirt, permission: 'products.view' },
        { name: 'Revisión de Precios', path: '/revision-precios', icon: TrendingUp, badge: 'Sugerencias', permission: 'pricing.manage' },
        { name: 'Control de Stock', path: '/stock', icon: Boxes, permission: 'stock.view' },
        { name: 'Categorías', path: '/categorias', icon: Tags, permission: 'categories.view' },
        { name: 'Marcas', path: '/marcas', icon: Bookmark, permission: 'brands.view' },
      ],
    },
    {
      title: 'Operaciones y Contactos',
      items: [
        { name: 'Compras de Stock', path: '/compras', icon: ShoppingBag, permission: 'purchases.view' },
        { name: 'Cuentas Corrientes', path: '/cuentas-corrientes', icon: BookOpen, permission: 'current_accounts.view' },
        { name: 'Proveedores', path: '/proveedores', icon: Truck, permission: 'suppliers.view' },
        { name: 'Clientes', path: '/clientes', icon: Users, permission: 'customers.view' },
      ],
    },
    {
      title: 'Administración',
      items: [
        { name: 'Reportes de Gestión', path: '/reportes', icon: BarChart3, permission: 'reports.view' },
        { name: 'Usuarios y Permisos', path: '/usuarios', icon: ShieldCheck, permission: 'users.manage' },
        { name: 'Configuración', path: '/configuracion', icon: Settings, permission: 'settings.view' },
      ],
    },
  ];

  const visibleSections = navigationSections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => !item.permission || can(item.permission)),
    }))
    .filter((section) => section.items.length > 0);

  return (
    <>
      {/* Mobile backdrop with smooth transition */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
          className="fixed inset-0 bg-neutral-900/40 z-40 lg:hidden backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
        />
      )}

      <aside
        aria-label="Menú principal de navegación"
        className={cn(
          'card-panel fixed top-0 bottom-0 left-0 z-50 lg:z-40 flex flex-col bg-white border-r border-neutral-200 shadow-xl lg:shadow-none transition-all duration-300 ease-in-out select-none',
          'w-72 max-w-[85vw]',
          isCollapsed ? 'lg:w-20' : 'lg:w-64',
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        {/* Brand Header */}
        <div
          className={cn(
            'h-16 flex items-center border-b border-neutral-200 shrink-0 transition-all duration-300 px-4',
            isCollapsed ? 'lg:justify-center lg:px-2 justify-between' : 'justify-between'
          )}
        >
          {/* Desktop Collapsed View (only visible on large screens when collapsed) */}
          {isCollapsed && (
            <div className="hidden lg:flex items-center justify-center w-full">
              <button
                onClick={toggleSidebar}
                title={`${storeName} - Expandir menú`}
                className="w-10 h-10 rounded-xl bg-neutral-900 text-white flex items-center justify-center font-black tracking-tight shrink-0 shadow-xs hover:bg-neutral-800 transition-colors cursor-pointer group relative"
              >
                <Shirt className="w-5 h-5 shrink-0" />
              </button>
            </div>
          )}

          {/* Full Brand View (always visible on mobile, and on desktop when not collapsed) */}
          <div
            className={cn(
              'flex items-center justify-between w-full min-w-0 gap-2',
              isCollapsed && 'lg:hidden'
            )}
          >
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="w-10 h-10 rounded-xl bg-neutral-900 text-white flex items-center justify-center font-black tracking-tight shrink-0 shadow-xs">
                <Shirt className="w-5 h-5 shrink-0" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="font-extrabold text-sm tracking-tight text-neutral-900 block leading-tight truncate" title={storeName}>
                  {storeName}
                </span>
                <span className="text-[11px] text-neutral-500 font-semibold block leading-tight truncate" title={storeSubtitle}>
                  {storeSubtitle}
                </span>
              </div>
            </div>

            {/* Desktop collapse toggle button */}
            {!isCollapsed && (
              <button
                onClick={toggleSidebar}
                aria-label="Colapsar barra lateral"
                className="hidden lg:flex p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors cursor-pointer shrink-0"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            )}

            {/* Mobile close button with optimal touch target */}
            <button
              onClick={() => setMobileOpen(false)}
              aria-label="Cerrar menú"
              className="lg:hidden min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 transition-colors cursor-pointer shrink-0"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation links scrollable area */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-5 scrollbar-thin scrollbar-thumb-neutral-200">
          {visibleSections.map((section, idx) => (
            <div key={idx} className="space-y-1">
              <p
                className={cn(
                  'px-3 text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1.5',
                  isCollapsed && 'lg:hidden'
                )}
              >
                {section.title}
              </p>
              {section.items.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    end={item.end}
                    onClick={() => setMobileOpen(false)}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150 relative group',
                        isActive
                          ? 'bg-neutral-900 text-white shadow-2xs font-bold'
                          : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900',
                        isCollapsed && 'lg:justify-center lg:px-0'
                      )
                    }
                    title={isCollapsed ? item.name : undefined}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span className={cn('truncate', isCollapsed && 'lg:hidden')}>
                      {item.name}
                    </span>
                    {item.badge && (
                      <span
                        className={cn(
                          'ml-auto px-2 py-0.5 text-[9px] font-bold rounded-full bg-emerald-600 text-white shadow-2xs',
                          isCollapsed && 'lg:hidden'
                        )}
                      >
                        {item.badge}
                      </span>
                    )}
                  </NavLink>
                );
              })}
            </div>
          ))}
        </nav>

        {/* User Footer Profile & Account Switcher */}
        <div className="p-3 border-t border-neutral-200 bg-white shrink-0 space-y-2">
          <div className={cn('flex items-center gap-3', isCollapsed && 'lg:justify-center')}>
            <div
              className={cn(
                'w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs',
                isOwner
                  ? 'bg-neutral-900 text-white'
                  : 'bg-blue-600 text-white'
              )}
            >
              {isOwner ? (
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
              ) : (
                <UserCheck className="w-4 h-4 text-blue-100" />
              )}
            </div>
            <div className={cn('truncate flex-1 min-w-0', isCollapsed && 'lg:hidden')}>
              <p className="text-xs font-bold text-neutral-900 truncate">
                {user?.displayName || (isOwner ? 'Dueña' : 'Empleada')}
              </p>
              <span
                className={cn(
                  'inline-flex items-center text-[10px] font-bold px-1.5 py-0.5 rounded-md mt-0.5',
                  isOwner
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-blue-50 text-blue-800 border border-blue-200'
                )}
              >
                {roleLabel}
              </span>
            </div>
            <button
              onClick={logout}
              title="Cerrar Sesión"
              className={cn(
                'p-1.5 text-neutral-400 hover:text-rose-600 rounded-lg hover:bg-neutral-100 transition-colors cursor-pointer',
                isCollapsed && 'lg:hidden'
              )}
              aria-label="Cerrar Sesión"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
