import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Shirt, Mail, Lock, LogIn, ShieldCheck, UserCheck, Crown, KeyRound } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useSettings } from '../../context/SettingsContext';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { toastAlert } from '../../components/ui/Toast';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, user } = useAuth();
  const { settings } = useSettings();
  const storeName = settings?.businessName || 'Sistema Inv';
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state?.from?.pathname && location.state?.from?.pathname !== '/login')
    ? location.state.from.pathname
    : '/';

  // If already logged in, redirect to intended page
  useEffect(() => {
    if (user) {
      navigate(from, { replace: true });
    }
  }, [user, navigate, from]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      toastAlert.error(
        'Campos obligatorios',
        'Por favor ingresa tu correo electrónico y contraseña para acceder.'
      );
      return;
    }

    setLoading(true);
    try {
      const loggedUser = await login(email, password);
      const isOwnerRole = email.toLowerCase().includes('admin') || loggedUser?.role === 'ADMIN' || loggedUser?.role === 'DUEÑA';
      const roleDisplayName = isOwnerRole ? 'Dueña / Administradora' : 'Vendedora';
      const userDisplayName = loggedUser?.displayName || (isOwnerRole ? 'Dueña' : 'Vendedora');

      sessionStorage.setItem('sistema_startup_toast', 'true');
      toastAlert.welcome(userDisplayName, storeName, roleDisplayName);
      navigate(from, { replace: true });
    } catch (error) {
      console.warn('Login attempt error:', error);
      toastAlert.error(
        'No pudimos iniciar sesión',
        error.message || 'Verifica que las credenciales ingresadas sean correctas.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleQuickFill = (fillEmail, fillPassword, roleName) => {
    setEmail(fillEmail);
    setPassword(fillPassword);
    toastAlert.info(
      `Credenciales de ${roleName} preparadas`,
      'Campos completados automáticamente. Presiona "Iniciar Sesión" para ingresar.'
    );
  };

  return (
    <div className="min-h-screen bg-neutral-100 flex items-center justify-center p-4 sm:p-6 text-neutral-900">
      <div className="w-full max-w-md bg-white rounded-3xl border border-neutral-200 p-7 sm:p-8 shadow-sm space-y-6">
        {/* Brand */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-neutral-900 text-white flex items-center justify-center mx-auto shadow-xs">
            <Shirt className="w-7 h-7" />
          </div>
          <h2 className="text-2xl font-black text-neutral-900 tracking-tight">
            {storeName}
          </h2>
          <p className="text-xs text-neutral-500 font-medium">
            {settings?.address || 'Control Integral de Inventario, Stock & Caja'}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            id="login-email-input"
            label="Correo Electrónico"
            type="email"
            placeholder="usuario@sistema.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            leftIcon={Mail}
            required
            disabled={loading}
          />
          <Input
            id="login-password-input"
            label="Contraseña"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            leftIcon={Lock}
            required
            disabled={loading}
          />
          <Button
            id="btn-submit-login"
            type="submit"
            variant="primary"
            className="w-full h-11 text-sm font-bold"
            isLoading={loading}
            leftIcon={LogIn}
          >
            Iniciar Sesión
          </Button>
        </form>

        {/* Quick Access Accounts */}
        <div className="pt-2 border-t border-neutral-100 space-y-2.5">
          <div className="flex items-center justify-between text-neutral-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">
              Acceso Rápido al Sistema
            </span>
            <KeyRound className="w-3.5 h-3.5 text-neutral-400" />
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => handleQuickFill('admin@sistema.com', 'sistema2002', 'Dueña / Administradora')}
              className="p-3 rounded-2xl border border-neutral-200 hover:border-neutral-900 bg-neutral-50 hover:bg-neutral-100 text-left transition-all cursor-pointer group shadow-2xs"
            >
              <div className="flex items-center gap-1.5 font-bold text-xs text-neutral-900">
                <Crown className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                <span>Dueña / Admin</span>
              </div>
              <p className="text-[10px] text-neutral-500 mt-1 truncate font-mono">admin@sistema.com</p>
            </button>
            <button
              type="button"
              onClick={() => handleQuickFill('vendedor@sistema.com', 'vendedor2026', 'Vendedora')}
              className="p-3 rounded-2xl border border-neutral-200 hover:border-neutral-900 bg-neutral-50 hover:bg-neutral-100 text-left transition-all cursor-pointer group shadow-2xs"
            >
              <div className="flex items-center gap-1.5 font-bold text-xs text-neutral-900">
                <UserCheck className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span>Vendedora</span>
              </div>
              <p className="text-[10px] text-neutral-500 mt-1 truncate font-mono">vendedor@sistema.com</p>
            </button>
          </div>
        </div>

        {/* Security & Confidentiality Notice */}
        <div className="pt-2 text-center space-y-1.5">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-neutral-100 text-neutral-700 text-xs font-semibold">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Acceso Seguro y Confidencial</span>
          </div>
          <p className="text-[11px] text-neutral-500 leading-relaxed max-w-xs mx-auto">
            Los perfiles de Dueño y Empleado requieren credenciales individuales para proteger datos financieros y de gestión.
          </p>
        </div>
      </div>
    </div>
  );
}
