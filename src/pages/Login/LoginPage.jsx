import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Lock,
  LogIn,
  Mail,
  ShieldCheck,
  Shirt,
  UserCheck,
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
  const navigate = useNavigate();
  const location = useLocation();

  const rawStoreName = settings?.businessName || 'Sistema Inv';
  const storeName = /dual/i.test(rawStoreName) ? 'Sistema Inv' : rawStoreName;

  const from =
    location.state?.from?.pathname && location.state.from.pathname !== '/login'
      ? location.state.from.pathname
      : '/';

  useEffect(() => {
    if (user) {
      navigate(from, { replace: true });
    }
  }, [user, navigate, from]);

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!email.trim() || !password) {
      toastAlert.error(
        'Campos obligatorios',
        'Ingresá tu correo electrónico y contraseña para continuar.'
      );
      return;
    }

    setLoading(true);

    try {
      const loggedUser = await login(email.trim(), password);

      const isOwnerRole =
        email.toLowerCase().includes('admin') ||
        loggedUser?.role === 'ADMIN' ||
        loggedUser?.role === 'DUEÑA';

      const roleDisplayName = isOwnerRole ? 'Dueña / Administradora' : 'Vendedora';
      const userDisplayName =
        loggedUser?.displayName || (isOwnerRole ? 'Dueña' : 'Vendedora');

      sessionStorage.setItem('sistema_startup_toast', 'true');

      toastAlert.welcome(userDisplayName, storeName, roleDisplayName);
      navigate(from, { replace: true });
    } catch (error) {
      console.warn('Login attempt error:', error);
      toastAlert.error(
        'No pudimos iniciar sesión',
        error?.message || 'Verificá que las credenciales ingresadas sean correctas.'
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
      'Revisá los datos y seleccioná "Ingresar al Sistema".'
    );
  };

  return (
    <main className="flex min-h-[100dvh] w-full items-center justify-center bg-neutral-100 px-4 py-10">
      <div className="w-full max-w-[400px]">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-neutral-900 text-white shadow-md">
            <Shirt className="h-6 w-6" strokeWidth={1.75} />
          </div>
          <p className="text-[16px] font-semibold text-neutral-900">{storeName}</p>
          <p className="mt-1 text-[13px] text-neutral-500">Sistema de gestión</p>
        </div>

        {/* Card */}
        <div className="rounded-3xl border border-neutral-200/80 bg-white p-7 shadow-sm sm:p-8">
          <div className="mb-8 text-center">
            <h2 className="text-[1.6rem] font-semibold tracking-tight text-neutral-900">
              Iniciar sesión
            </h2>
            <p className="mt-2 text-[14px] text-neutral-500">
              Ingresá tus datos para acceder al sistema
            </p>
          </div>

          {/* Formulario */}
          <form onSubmit={handleSubmit} className="space-y-4.5">
            <Input
              id="login-email-input"
              label="Correo electrónico"
              type="email"
              placeholder="tu-correo@sistema.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              leftIcon={Mail}
              required
              disabled={loading}
              autoComplete="email"
              className="h-12 rounded-xl text-[14px]"
            />

            <Input
              id="login-password-input"
              label="Contraseña"
              type="password"
              placeholder="Ingresá tu contraseña"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              leftIcon={Lock}
              showPasswordToggle
              required
              disabled={loading}
              autoComplete="current-password"
              className="h-12 rounded-xl text-[14px]"
            />

            <Button
              id="btn-submit-login"
              type="submit"
              variant="primary"
              className="mt-1 h-12 w-full rounded-xl text-[14px] font-semibold shadow-sm transition-all duration-200 hover:shadow-md active:scale-[0.98]"
              isLoading={loading}
              leftIcon={LogIn}
            >
              Ingresar al Sistema
            </Button>
          </form>

          {/* Acceso rápido */}
          <div className="mt-7 border-t border-neutral-100 pt-6">
            <div className="rounded-2xl border border-neutral-200 bg-neutral-50/70 p-3.5">
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-neutral-200 bg-white text-neutral-600">
                    <UserCheck className="h-4 w-4" strokeWidth={1.75} />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-semibold text-neutral-800">
                      Vendedora / Empleado
                    </p>
                    <p className="truncate font-mono text-[11.5px] text-neutral-500">
                      vendedor@sistema.com
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    handleQuickFill(
                      'vendedor@sistema.com',
                      'vendedor2026',
                      'Vendedora'
                    )
                  }
                  className="flex shrink-0 items-center gap-1.5 rounded-lg border border-neutral-300 bg-white px-3 py-2 text-[11.5px] font-semibold text-neutral-700 transition-all duration-200 hover:border-neutral-900 hover:bg-neutral-900 hover:text-white active:scale-95"
                >
                  Autocompletar
                  <ArrowRight className="h-3.5 w-3.5" strokeWidth={2} />
                </button>
              </div>
            </div>
          </div>

          {/* Seguridad */}
          <div className="mt-6 flex items-center justify-center gap-2">
            <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-emerald-600" strokeWidth={1.75} />
            <span className="text-[12px] font-medium text-neutral-500">
              Acceso protegido · Conexión segura
            </span>
          </div>
        </div>

        {/* Footer */}
        <p className="mt-6 text-center text-[12px] font-medium text-neutral-400">
          {storeName} · Sistema de gestión
        </p>
      </div>
    </main>
  );
}