import { useNavigate } from 'react-router-dom';
import { Boxes, CircleDollarSign, ArrowDownLeft, BarChart3, Users, Shirt } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { useAuth } from '../../context/AuthContext';

export function QuickActions() {
  const navigate = useNavigate();
  const { can } = useAuth();

  const allActions = [
    { label: 'Caja del Turno', icon: CircleDollarSign, variant: 'primary', onClick: () => navigate('/caja'), permission: 'cash.view' },
    { label: 'Consultar Stock', icon: Boxes, variant: 'outline', onClick: () => navigate('/stock'), permission: 'stock.view' },
    { label: 'Catálogo Prendas', icon: Shirt, variant: 'outline', onClick: () => navigate('/productos'), permission: 'products.view' },
    { label: 'Clientes', icon: Users, variant: 'outline', onClick: () => navigate('/clientes'), permission: 'clients.manage' },
    { label: 'Compras Proveedor', icon: ArrowDownLeft, variant: 'outline', onClick: () => navigate('/compras'), permission: 'purchases.view' },
    { label: 'Reportes y Balances', icon: BarChart3, variant: 'outline', onClick: () => navigate('/reportes'), permission: 'reports.view' },
  ];

  const visibleActions = allActions.filter((act) => !act.permission || can(act.permission));

  return (
    <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center justify-center sm:justify-start gap-2 w-full sm:w-auto">
      {visibleActions.map((act, i) => (
        <Button
          key={i}
          variant={act.variant}
          size="sm"
          leftIcon={act.icon}
          onClick={act.onClick}
          className="w-full sm:w-auto justify-center text-xs h-11 sm:h-9.5 font-bold"
        >
          {act.label}
        </Button>
      ))}
    </div>
  );
}
