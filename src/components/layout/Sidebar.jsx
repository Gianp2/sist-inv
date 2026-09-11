import { useEffect } from 'react';
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
  X,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useSettings } from '../../context/SettingsContext';
import { cn } from '../../utils/cn';

export function Sidebar({ isCollapsed, toggleSidebar, mobileOpen, setMobileOpen }) {
  const { user, logout } = useAuth();
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
        { name: 'Caja y Finanzas', path: '/caja', icon: CircleDollarSign, badge: 'Mes / Sem' },
      ],
    },
    {
      title: 'Inventario y Stock',
      items: [
        { name: 'Productos y Prendas', path: '/productos', icon: Shirt },
        { name: 'Revisión de Precios', path: '/revision-precios', icon: TrendingUp, badge: 'Sugerencias' },
        { name: 'Control de Stock', path: '/stock', icon: Boxes },
        { name: 'Categorías', path: '/categorias', icon: Tags },
        { name: 'Marcas', path: '/marcas', icon: Bookmark },
      ],
    },
    {
      title: 'Operaciones y Contactos',
      items: [
        { name: 'Compras de Stock', path: '/compras', icon: ShoppingBag },
        { name: 'Proveedores', path: '/proveedores', icon: Truck },
        { name: 'Clientes', path: '/clientes', icon: Users },
      ],
    },
    {
      title: 'Administración',
      items: [
        { name: 'Reportes de Gestión', path: '/reportes', icon: BarChart3 },
        { name: 'Configuración', path: '/configuracion', icon: Settings },
      ],
    },
  ];

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
              className="lg:hidden p-2 rounded-xl text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100 transition-colors cursor-pointer shrink-0"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation links scrollable area */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-5 scrollbar-thin scrollbar-thumb-neutral-200">
          {navigationSections.map((section, idx) => (
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

        {/* User Footer Profile */}
        <div className="p-3 border-t border-neutral-200 bg-white shrink-0">
          <div className={cn('flex items-center gap-3', isCollapsed && 'lg:justify-center')}>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 bg-neutral-900 text-white shadow-2xs">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
            </div>
            <div className={cn('truncate flex-1 min-w-0', isCollapsed && 'lg:hidden')}>
              <p className="text-xs font-bold text-neutral-900 truncate">
                {user?.displayName || 'Administrador'}
              </p>
              <p className="text-[10px] text-neutral-500 truncate flex items-center gap-1 font-semibold">
                Administrador Único
              </p>
            </div>
            <button
              onClick={logout}
              title="Cerrar Sesión"
              className={cn(
                'p-1.5 text-neutral-400 hover:text-rose-600 rounded-lg hover:bg-neutral-200/60 transition-colors cursor-pointer',
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
