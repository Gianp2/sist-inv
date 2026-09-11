import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Shirt, Mail, Lock, LogIn, Crown, ShoppingBag } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useSettings } from '../../context/SettingsContext';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { toast } from 'sonner';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const { settings } = useSettings();
  const storeName = settings?.businessName || 'Sistema Inv';
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Completa tu correo y contraseña');
      return;
    }

    setLoading(true);
    try {
      await login(email, password);
      toast.success(`¡Bienvenido a ${storeName}!`);
      navigate(from, { replace: true });
    } catch (error) {
      console.warn('Login attempt error:', error);
      toast.error(error.message || 'Error al iniciar sesión. Verifica tus credenciales.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = (roleEmail, rolePass) => {
    setEmail(roleEmail);
    setPassword(rolePass);
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4 sm:p-6 text-neutral-900">
      <div className="card-panel w-full max-w-md bg-white rounded-3xl border border-neutral-200 p-8 shadow-xs space-y-6">
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
            label="Correo Electrónico"
            type="email"
            placeholder="admin@sistema.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            leftIcon={Mail}
            required
          />
          <Input
            label="Contraseña"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            leftIcon={Lock}
            required
          />
          <Button
            type="submit"
            variant="primary"
            className="w-full h-11 text-sm font-bold"
            isLoading={loading}
            leftIcon={LogIn}
          >
            Iniciar Sesión
          </Button>
        </form>

        {/* Quick Demo Credentials */}
        <div className="pt-5 border-t border-neutral-100 space-y-2.5">
          <p className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider text-center">
            Acceso Rápido
          </p>
          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => handleQuickLogin('admin@sistema.com', 'sistema2002')}
              className="p-3 rounded-xl border border-neutral-200 bg-white hover:bg-neutral-50 text-left transition-colors cursor-pointer group shadow-2xs"
            >
              <div className="flex items-center gap-1.5 mb-1">
                <Crown className="w-3.5 h-3.5 text-amber-600" />
                <span className="text-xs font-bold text-neutral-900">
                  Administrador
                </span>
              </div>
              <span className="block text-[10px] text-neutral-500 font-medium">Acceso Total (Único)</span>
            </button>
            <button
              type="button"
              onClick={() => handleQuickLogin('vendedor@sistema.com', 'vendedor2026')}
              className="p-3 rounded-xl border border-neutral-200 bg-white hover:bg-neutral-50 text-left transition-colors cursor-pointer group shadow-2xs"
            >
              <div className="flex items-center gap-1.5 mb-1">
                <ShoppingBag className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-xs font-bold text-neutral-900">
                  Vendedor
                </span>
              </div>
              <span className="block text-[10px] text-neutral-500 font-medium">POS, Caja y Ventas</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
