import { useState, useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { Sidebar } from '../components/layout/Sidebar';
import { Navbar } from '../components/layout/Navbar';
import { useAuth } from '../context/AuthContext';
import { useCashRegister } from '../context/CashContext';
import { toastAlert } from '../components/ui/Toast';
import { cn } from '../utils/cn';

export function MainLayout() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, isOwner } = useAuth();
  const { isCashOpen } = useCashRegister();
  const navigate = useNavigate();

  // Startup toast notification on session entry
  useEffect(() => {
    const hasNotifiedStartup = sessionStorage.getItem('sistema_startup_toast');
    if (!hasNotifiedStartup && user) {
      sessionStorage.setItem('sistema_startup_toast', 'true');
      const roleName = isOwner ? 'Dueña' : 'Vendedora';
      const userName = user.displayName || roleName;

      const timer = setTimeout(() => {
        if (!isCashOpen) {
          toastAlert.cashWarning(
            'La caja de hoy está cerrada. Puedes abrir el turno para registrar ventas y cobros.',
            () => navigate('/caja')
          );
        } else {
          toastAlert.sessionStartup(userName, roleName);
        }
      }, 600);

      return () => clearTimeout(timer);
    }
  }, [user, isOwner, isCashOpen, navigate]);

  // Lock body scroll when mobile hamburger menu is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden';
      document.body.style.touchAction = 'none';
    } else {
      document.body.style.overflow = '';
      document.body.style.touchAction = '';
    }
    return () => {
      document.body.style.overflow = '';
      document.body.style.touchAction = '';
    };
  }, [mobileOpen]);

  return (
    <div className="min-h-screen bg-white flex transition-colors duration-200 text-neutral-900">
      {/* Sidebar */}
      <Sidebar
        isCollapsed={isCollapsed}
        toggleSidebar={() => setIsCollapsed(!isCollapsed)}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
      />

      {/* Main Content Area */}
      <div
        className={cn(
          'flex-1 flex flex-col min-w-0 transition-all duration-300 ease-in-out bg-white',
          isCollapsed ? 'lg:pl-20' : 'lg:pl-64'
        )}
      >
        <Navbar onMenuClick={() => setMobileOpen(true)} />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto bg-white">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
