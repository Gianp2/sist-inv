import { Link } from 'react-router-dom';
import { Shirt, ArrowLeft } from 'lucide-react';
import { Button } from '../../components/ui/Button';

export function NotFoundPage() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center p-6 space-y-4">
      <div className="w-16 h-16 rounded-2xl bg-neutral-100 flex items-center justify-center text-neutral-400 border border-neutral-200">
        <Shirt className="w-8 h-8" />
      </div>
      <h2 className="text-3xl font-extrabold text-neutral-900">404</h2>
      <p className="text-sm text-neutral-500 max-w-sm">
        La página que buscas no existe o fue movida a otra ubicación.
      </p>
      <Link to="/dashboard">
        <Button variant="primary" size="sm" leftIcon={ArrowLeft}>
          Volver al Dashboard
        </Button>
      </Link>
    </div>
  );
}
