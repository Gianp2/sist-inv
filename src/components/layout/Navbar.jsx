import { useState, useEffect, useRef } from 'react';
import { Menu, Search, CircleDollarSign, ShieldCheck, Bell, AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useSettings } from '../../context/SettingsContext';
import { useCashRegister } from '../../context/CashContext';
import { useProducts } from '../../hooks/useProducts';
import { Breadcrumbs } from './Breadcrumbs';
import { GlobalSearch } from './GlobalSearch';
import { Badge } from '../ui/Badge';

export function Navbar({ onMenuClick }) {
  const { user } = useAuth();
  const { settings } = useSettings();
  const { isCashOpen } = useCashRegister();
  const { products } = useProducts();
  const [searchOpen, setSearchOpen] = useState(false);
  const [alertsOpen, setAlertsOpen] = useState(false);
  const alertsRef = useRef(null);
  const navigate = useNavigate();

  // Low stock and out of stock calculations
  const lowStockItems = products.filter(
    (p) => (p.stock || 0) <= (p.stockMin || 5) && (p.stock || 0) > 0
  );
  const outOfStockItems = products.filter((p) => (p.stock || 0) === 0);
  const totalAlertsCount =
    (lowStockItems.length > 0 ? 1 : 0) +
    (outOfStockItems.length > 0 ? 1 : 0) +
    (!isCashOpen ? 1 : 0);

  // Alert signature to track if current alerts have been seen
  const currentAlertSignature = `${!isCashOpen ? 'cash-closed|' : ''}low:${lowStockItems.length}|out:${outOfStockItems.length}`;
  const [seenSignature, setSeenSignature] = useState(() => {
    try {
      return localStorage.getItem('inv_alerts_seen_signature') || '';
    } catch {
      return '';
    }
  });

  // Badge only shows if there are alerts AND the user hasn't seen them yet
  const hasUnreadAlerts = totalAlertsCount > 0 && seenSignature !== currentAlertSignature;

  // Toggle alerts popover and mark as seen when opening
  const handleToggleAlerts = () => {
    setAlertsOpen((prev) => {
      const willOpen = !prev;
      if (willOpen) {
        setSeenSignature(currentAlertSignature);
        try {
          localStorage.setItem('inv_alerts_seen_signature', currentAlertSignature);
        } catch {
          // ignore
        }
      }
      return willOpen;
    });
  };

  const handleMarkAsRead = () => {
    setSeenSignature(currentAlertSignature);
    try {
      localStorage.setItem('inv_alerts_seen_signature', currentAlertSignature);
    } catch {
      // ignore
    }
  };

  // Close alerts popover on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (alertsRef.current && !alertsRef.current.contains(e.target)) {
        setAlertsOpen(false);
      }
    };
    if (alertsOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [alertsOpen]);

  // Global keyboard shortcut for search (⌘K or Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <>
      <header className="card-panel sticky top-0 z-30 h-16 bg-white border-b border-neutral-200 px-4 sm:px-6 flex items-center justify-between gap-4 text-neutral-900">
        {/* Left Section: Mobile Menu & Breadcrumbs */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <button
            onClick={onMenuClick}
            className="lg:hidden p-2 rounded-xl text-neutral-800 hover:bg-neutral-100 transition-colors cursor-pointer shrink-0"
            aria-label="Abrir menú de navegación"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="lg:hidden flex items-center min-w-0">
            <span className="text-xs font-bold text-neutral-900 truncate max-w-[130px]" title={settings?.businessName || 'Sistema Inv'}>
              {settings?.businessName || 'Sistema Inv'}
            </span>
          </div>
          <div className="hidden sm:block">
            <Breadcrumbs />
          </div>
        </div>

        {/* Middle Section: Global Search trigger */}
        <div className="flex-1 max-w-md">
          <button
            onClick={() => setSearchOpen(true)}
            className="w-full flex items-center justify-between px-3.5 py-2 rounded-xl bg-white hover:bg-neutral-50 text-neutral-700 text-xs transition-colors cursor-pointer border border-neutral-200 shadow-2xs"
          >
            <div className="flex items-center gap-2.5">
              <Search className="w-4 h-4 text-neutral-400" />
              <span className="text-neutral-700 font-medium">Buscar prendas, SKU, marcas...</span>
            </div>
            <kbd className="hidden md:inline-block px-1.5 py-0.5 text-[10px] font-semibold bg-white border border-neutral-200 rounded-md text-neutral-500 shadow-2xs">
              ⌘K
            </kbd>
          </button>
        </div>

        {/* Right Section: Alerts Notification, Admin badge, Cash status */}
        <div className="flex items-center gap-2.5">
          {/* Alerts & Toasts Center Bell */}
          <div className="relative" ref={alertsRef}>
            <button
              onClick={handleToggleAlerts}
              aria-label="Alertas y Notificaciones"
              className="relative p-2 rounded-xl text-neutral-700 hover:text-neutral-900 hover:bg-neutral-100 transition-colors cursor-pointer border border-neutral-200/80 shadow-2xs bg-white"
            >
              <Bell className="w-4 h-4" />
              {hasUnreadAlerts && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-600 text-[9px] font-black text-white ring-2 ring-white animate-in zoom-in-50">
                  {totalAlertsCount}
                </span>
              )}
            </button>

            {/* Alerts Dropdown Panel */}
            {alertsOpen && (
              <div className="card-panel absolute right-0 top-12 z-50 w-80 sm:w-96 rounded-2xl bg-white border border-neutral-200 shadow-xl p-4 space-y-3.5 text-neutral-900 animate-in fade-in zoom-in-95 duration-150">
                <div className="flex items-center justify-between border-b border-neutral-100 pb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs uppercase tracking-wider text-neutral-800">
                      Centro de Notificaciones
                    </span>
                    {hasUnreadAlerts ? (
                      <span className="px-1.5 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[10px] font-black">
                        {totalAlertsCount} nuevas
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                        Al día
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    {hasUnreadAlerts && (
                      <button
                        onClick={handleMarkAsRead}
                        className="text-[10px] font-bold text-neutral-500 hover:text-neutral-900 px-1.5 py-0.5 rounded hover:bg-neutral-100 cursor-pointer transition-colors"
                      >
                        Marcar leídas
                      </button>
                    )}
                    <button
                      onClick={() => setAlertsOpen(false)}
                      className="p-1 text-neutral-400 hover:text-neutral-700 rounded-lg hover:bg-neutral-100 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Real-time System Alerts List */}
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {!isCashOpen && (
                    <div className="flex items-start justify-between gap-2 p-2.5 rounded-xl bg-rose-50/70 border border-rose-200/80 text-xs">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-bold text-rose-950">Caja cerrada</p>
                          <p className="text-[11px] text-rose-800">
                            Abre un turno para registrar ingresos y ventas.
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          setAlertsOpen(false);
                          navigate('/caja');
                        }}
                        className="px-2 py-1 rounded-lg text-[10px] font-bold bg-rose-600 text-white hover:bg-rose-700 transition-colors shrink-0 cursor-pointer"
                      >
                        Abrir
                      </button>
                    </div>
                  )}

                  {lowStockItems.length > 0 && (
                    <div className="flex items-start justify-between gap-2 p-2.5 rounded-xl bg-amber-50/70 border border-amber-200/80 text-xs">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-bold text-amber-950">
                            {lowStockItems.length} prenda(s) con stock bajo
                          </p>
                          <p className="text-[11px] text-amber-800">
                            {lowStockItems.slice(0, 2).map((i) => i.name).join(', ')}
                            {lowStockItems.length > 2 ? ' y más...' : ''}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          setAlertsOpen(false);
                          navigate('/stock');
                        }}
                        className="px-2 py-1 rounded-lg text-[10px] font-bold bg-amber-600 text-white hover:bg-amber-700 transition-colors shrink-0 cursor-pointer"
                      >
                        Ver Stock
                      </button>
                    </div>
                  )}

                  {outOfStockItems.length > 0 && (
                    <div className="flex items-start justify-between gap-2 p-2.5 rounded-xl bg-neutral-100 border border-neutral-200 text-xs">
                      <div className="flex items-start gap-2">
                        <Info className="w-4 h-4 text-neutral-600 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-bold text-neutral-900">
                            {outOfStockItems.length} prenda(s) agotada(s)
                          </p>
                          <p className="text-[11px] text-neutral-600">
                            Inventario en 0 unidades.
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          setAlertsOpen(false);
                          navigate('/stock');
                        }}
                        className="px-2 py-1 rounded-lg text-[10px] font-bold bg-neutral-800 text-white hover:bg-neutral-900 transition-colors shrink-0 cursor-pointer"
                      >
                        Revisar
                      </button>
                    </div>
                  )}

                  {totalAlertsCount === 0 && (
                    <div className="p-4 text-center text-xs text-neutral-500 font-medium">
                      <CheckCircle2 className="w-6 h-6 text-emerald-600 mx-auto mb-1.5" />
                      Todo al día. No hay alertas críticas de stock ni de caja.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Admin Pill */}
          <div className="hidden sm:flex items-center gap-1.5">
            <Badge variant="neutral" size="sm" className="bg-neutral-900 text-white font-bold">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              {user?.displayName || 'Administrador'}
            </Badge>
          </div>

          {/* Cash Shift Status Badge */}
          <button
            onClick={() => navigate('/caja')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer shadow-2xs ${
              isCashOpen
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100'
                : 'bg-rose-50 text-rose-800 border border-rose-200 hover:bg-rose-100'
            }`}
          >
            <CircleDollarSign className="w-3.5 h-3.5" />
            <span>{isCashOpen ? 'Caja Abierta' : 'Caja Cerrada'}</span>
          </button>
        </div>
      </header>

      {/* Global Search Dialog */}
      <GlobalSearch isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}

