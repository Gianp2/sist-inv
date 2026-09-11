import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Skeleton } from '../components/ui/Skeleton';

export function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white p-6 space-y-4 text-neutral-900">
        <div className="w-12 h-12 rounded-2xl bg-neutral-900 flex items-center justify-center animate-bounce shadow-md">
          <span className="text-white font-black text-xl">SI</span>
        </div>
        <p className="text-xs font-semibold text-neutral-700">Iniciando Sistema Inv...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}
