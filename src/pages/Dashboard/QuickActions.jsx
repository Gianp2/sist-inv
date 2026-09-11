import { useNavigate } from 'react-router-dom';
import { PlusCircle, Boxes, CircleDollarSign, ArrowDownLeft, BarChart3 } from 'lucide-react';
import { Button } from '../../components/ui/Button';

export function QuickActions() {
  const navigate = useNavigate();

  const actions = [
    { label: 'Caja y Finanzas', icon: CircleDollarSign, variant: 'primary', onClick: () => navigate('/caja') },
    { label: 'Ajustar Stock', icon: Boxes, variant: 'outline', onClick: () => navigate('/stock') },
    { label: 'Nueva Prenda', icon: PlusCircle, variant: 'outline', onClick: () => navigate('/productos') },
    { label: 'Compras de Stock', icon: ArrowDownLeft, variant: 'outline', onClick: () => navigate('/compras') },
    { label: 'Reportes', icon: BarChart3, variant: 'outline', onClick: () => navigate('/reportes') },
  ];

  return (
    <div className="flex flex-wrap items-center gap-2">
      {actions.map((act, i) => (
        <Button
          key={i}
          variant={act.variant}
          size="sm"
          leftIcon={act.icon}
          onClick={act.onClick}
        >
          {act.label}
        </Button>
      ))}
    </div>
  );
}
