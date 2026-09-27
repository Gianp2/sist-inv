import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Shirt,
  Mail,
  Lock,
  LogIn,
  ShieldCheck,
  UserCheck,
  Sparkles,
  Store,
  Layers,
  CheckCircle2,
  ArrowRight,
  TrendingUp,
  CreditCard,
  Package
} from 'lucide-react';
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
  const rawStoreName = settings?.businessName || 'Sistema Inv';
  const storeName = /dual/i.test(rawStoreName) ? 'Sistema Inv' : rawStoreName;
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
      'Campos completados. Haz clic en "Ingresar al Sistema" para continuar.'
    );
  };

  return (
    <div className="h-[100dvh] w-full flex flex-col lg:grid lg:grid-cols-12 bg-neutral-900 antialiased selection:bg-neutral-800 selection:text-white overflow-hidden">
      {/* LEFT COLUMN: Editorial Showcase (Visible on desktop & large tablets) */}
      <div className="relative hidden lg:flex lg:col-span-5 xl:col-span-5 flex-col justify-between p-10 xl:p-14 bg-neutral-950 text-white overflow-hidden border-r border-neutral-800/80">
        {/* Subtle background ambient gradients */}
        <div className="absolute top-0 right-0 -mr-24 -mt-24 w-96 h-96 rounded-full bg-neutral-800/30 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -ml-24 -mb-24 w-96 h-96 rounded-full bg-neutral-700/20 blur-3xl pointer-events-none" />
        <div
          className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, #ffffff 1px, transparent 0)`,
            backgroundSize: '24px 24px',
          }}
        />

        {/* Top Branding */}
        <div className="relative z-10 space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-neutral-800 via-neutral-900 to-neutral-700 p-0.5 shadow-xl flex items-center justify-center border border-neutral-700/60">
              <div className="w-full h-full rounded-[14px] bg-neutral-950 flex items-center justify-center text-white">
                <Shirt className="w-6 h-6 text-neutral-100" />
              </div>
            </div>
            <div>
              <span className="text-xl font-black tracking-tight text-white block">
                {storeName}
              </span>
            </div>
          </div>
        </div>

        {/* Central Value Proposition & Feature Highlights */}
        <div className="relative z-10 space-y-8 my-auto py-8">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-neutral-900/90 border border-neutral-800 text-[11px] font-medium text-neutral-300">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Plataforma de Gestión Integral de Tienda</span>
            </div>
            <h1 className="text-3xl xl:text-4xl font-extrabold tracking-tight text-white leading-tight">
              Control ágil y seguro para tu mostrador.
            </h1>
            <p className="text-sm text-neutral-400 leading-relaxed max-w-sm">
              Administración unificada de catálogo por talles y colores, caja diaria con múltiples medios de pago y cuentas corrientes de clientes.
            </p>
          </div>

          {/* Micro Feature Highlights */}
          <div className="space-y-3 pt-2">
            <div className="flex items-start gap-3.5 p-3.5 rounded-2xl bg-neutral-900/60 border border-neutral-800/80 backdrop-blur-sm">
              <div className="w-9 h-9 rounded-xl bg-neutral-800 flex items-center justify-center shrink-0 text-neutral-200">
                <Package className="w-4 h-4" />
              </div>
              <div className="space-y-0.5">
                <h4 className="text-xs font-bold text-neutral-200">Control de Stock y Talles</h4>
                <p className="text-[11px] text-neutral-400 leading-snug">
                  Matriz de talles y colores con alertas automáticas de reposición.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3.5 p-3.5 rounded-2xl bg-neutral-900/60 border border-neutral-800/80 backdrop-blur-sm">
              <div className="w-9 h-9 rounded-xl bg-neutral-800 flex items-center justify-center shrink-0 text-neutral-200">
                <CreditCard className="w-4 h-4" />
              </div>
              <div className="space-y-0.5">
                <h4 className="text-xs font-bold text-neutral-200">Caja Diaria &amp; Arqueos</h4>
                <p className="text-[11px] text-neutral-400 leading-snug">
                  Apertura y cierre por turnos con cobros en efectivo, transferencias y tarjetas.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3.5 p-3.5 rounded-2xl bg-neutral-900/60 border border-neutral-800/80 backdrop-blur-sm">
              <div className="w-9 h-9 rounded-xl bg-neutral-800 flex items-center justify-center shrink-0 text-neutral-200">
                <TrendingUp className="w-4 h-4" />
              </div>
              <div className="space-y-0.5">
                <h4 className="text-xs font-bold text-neutral-200">Cuentas Corrientes</h4>
                <p className="text-[11px] text-neutral-400 leading-snug">
                  Historial de saldos, pagos parciales y cuentas de clientes al día.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Trust & Operational Status */}
        <div className="relative z-10 pt-6 border-t border-neutral-800/80 flex items-center justify-between text-xs text-neutral-400">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-medium text-neutral-300">Base de datos en la nube activa</span>
          </div>
          <span className="text-[11px] text-neutral-500">v2.4 Pro</span>
        </div>
      </div>

      {/* RIGHT COLUMN: Authentication Form Panel */}
      <div className="h-[100dvh] lg:h-full lg:col-span-7 xl:col-span-7 flex flex-col justify-center items-center p-3.5 sm:p-6 lg:p-12 bg-neutral-100 overflow-hidden">
        <div className="w-full max-w-sm sm:max-w-md bg-white rounded-2xl sm:rounded-3xl border border-neutral-200/90 p-4.5 sm:p-8 shadow-xl shadow-neutral-900/5 space-y-3.5 sm:space-y-5">
          {/* Header without address */}
          <div className="text-center space-y-1">
            <div className="inline-flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-neutral-900 text-white shadow-sm mb-0.5 sm:mb-1">
              <Shirt className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div className="text-xs font-bold text-neutral-400 uppercase tracking-widest">
              {storeName}
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-neutral-900 tracking-tight">
              Inicio de sesión
            </h1>
            <p className="text-xs text-neutral-500 font-medium">
              Ingresa tus datos para acceder al sistema
            </p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
            <Input
              id="login-email-input"
              label="Correo Electrónico"
              type="email"
              placeholder="tu-correo@sistema.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              leftIcon={Mail}
              required
              disabled={loading}
              className="h-11 sm:h-12 text-base sm:text-sm rounded-xl"
            />
            <Input
              id="login-password-input"
              label="Contraseña"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              leftIcon={Lock}
              showPasswordToggle
              required
              disabled={loading}
              className="h-11 sm:h-12 text-base sm:text-sm rounded-xl"
            />

            <Button
              id="btn-submit-login"
              type="submit"
              variant="primary"
              className="w-full h-11 sm:h-12 text-sm sm:text-base font-bold rounded-xl mt-1 shadow-sm transition-all hover:shadow-md cursor-pointer active:scale-[0.99]"
              isLoading={loading}
              leftIcon={LogIn}
            >
              Ingresar al Sistema
            </Button>
          </form>

          {/* Quick Access Account for Employee only */}
          <div className="pt-2.5 sm:pt-3 border-t border-neutral-100">
            <div className="p-2.5 sm:p-3 rounded-xl sm:rounded-2xl border border-neutral-200/80 bg-neutral-50/90 hover:bg-neutral-50 flex items-center justify-between gap-2.5">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-lg sm:rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100">
                  <UserCheck className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="font-bold text-xs text-neutral-800 truncate">
                    Vendedora / Empleado
                  </div>
                  <p className="text-[10px] text-neutral-500 font-mono truncate">
                    vendedor@sistema.com
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleQuickFill('vendedor@sistema.com', 'vendedor2026', 'Vendedora')}
                className="inline-flex items-center justify-center gap-1 px-2.5 py-1.5 text-[11px] sm:text-xs font-bold rounded-lg sm:rounded-xl bg-white border border-neutral-300 text-neutral-800 hover:bg-neutral-900 hover:text-white hover:border-neutral-900 transition-colors shadow-2xs cursor-pointer shrink-0 active:scale-95"
              >
                <span>Autocompletar</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Security & Confidentiality Notice for Owner Account */}
          <div className="flex items-center justify-center gap-1.5 px-1 text-center">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span className="text-[11px] text-neutral-500 font-medium">
              Dueña: credencial manual por seguridad
            </span>
          </div>

          {/* System Footer Note */}
          <div className="text-center pt-0.5">
            <p className="text-[10px] text-neutral-400 font-medium">
              {storeName} · Conexión cifrada
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
