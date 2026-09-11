import { Link, useLocation } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';

const ROUTE_NAMES = {
  dashboard: 'Dashboard',
  pos: 'Punto de Venta (POS)',
  productos: 'Productos y Prendas',
  categorias: 'Categorías',
  marcas: 'Marcas',
  clientes: 'Clientes',
  proveedores: 'Proveedores',
  compras: 'Compras de Stock',
  caja: 'Caja y Finanzas',
  ventas: 'Ventas e Historial',
  stock: 'Control de Stock',
  reportes: 'Reportes y Analíticas',
  usuarios: 'Usuarios del Sistema',
  configuracion: 'Configuración',
};

export function Breadcrumbs() {
  const location = useLocation();
  const pathnames = location.pathname.split('/').filter((x) => x);

  return (
    <nav className="flex items-center space-x-1.5 text-xs text-neutral-500">
      <Link
        to="/"
        className="flex items-center hover:text-neutral-900 transition-colors"
        title="Inicio / Dashboard"
      >
        <Home className="w-3.5 h-3.5" />
      </Link>
      {pathnames.map((segment, index) => {
        const routeTo = `/${pathnames.slice(0, index + 1).join('/')}`;
        const isLast = index === pathnames.length - 1;
        const name = ROUTE_NAMES[segment] || decodeURIComponent(segment);

        return (
          <div key={routeTo} className="flex items-center space-x-1.5">
            <ChevronRight className="w-3.5 h-3.5 text-neutral-300" />
            {isLast ? (
              <span className="font-semibold text-neutral-900">{name}</span>
            ) : (
              <Link
                to={routeTo}
                className="hover:text-neutral-900 transition-colors capitalize"
              >
                {name}
              </Link>
            )}
          </div>
        );
      })}
    </nav>
  );
}
