import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Package, Users, CircleDollarSign, Boxes, ArrowRight } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { getCollection, getCachedCollection } from '../../services/firebase/firestore';
import { COLLECTIONS } from '../../constants/collections';
import { formatCurrency } from '../../utils/formatters';

export function GlobalSearch({ isOpen, onClose }) {
  const [queryText, setQueryText] = useState('');
  const [products, setProducts] = useState(() => getCachedCollection(COLLECTIONS.PRODUCTS) || []);
  const [customers, setCustomers] = useState(() => getCachedCollection(COLLECTIONS.CUSTOMERS) || []);
  const navigate = useNavigate();

  // Load searchable data when opened and bind global ESC listener
  useEffect(() => {
    if (isOpen) {
      setQueryText('');
      // Load or refresh searchable data
      getCollection(COLLECTIONS.PRODUCTS).then(setProducts).catch(console.error);
      getCollection(COLLECTIONS.CUSTOMERS).then(setCustomers).catch(console.error);

      const handleGlobalKeyDown = (e) => {
        if (e.key === 'Escape' || e.code === 'Escape') {
          e.preventDefault();
          e.stopPropagation();
          onClose();
        }
      };

      window.addEventListener('keydown', handleGlobalKeyDown, { capture: true });
      return () => {
        window.removeEventListener('keydown', handleGlobalKeyDown, { capture: true });
      };
    }
  }, [isOpen, onClose]);

  const filteredProducts = queryText.trim()
    ? products.filter((p) =>
        p.name?.toLowerCase().includes(queryText.toLowerCase()) ||
        p.sku?.toLowerCase().includes(queryText.toLowerCase()) ||
        p.barcode?.includes(queryText)
      ).slice(0, 5)
    : [];

  const filteredCustomers = queryText.trim()
    ? customers.filter((c) =>
        c.name?.toLowerCase().includes(queryText.toLowerCase()) ||
        c.dni?.includes(queryText) ||
        c.phone?.includes(queryText)
      ).slice(0, 4)
    : [];

  const handleSelectProduct = (product) => {
    onClose();
    navigate('/productos');
  };

  const handleSelectCustomer = (customer) => {
    onClose();
    navigate('/clientes');
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="max-w-2xl" showClose={false}>
      <div className="space-y-4">
        <div className="relative flex items-center border-b border-neutral-200 pb-3 gap-2">
          <Search className="w-5 h-5 text-neutral-400 ml-1 shrink-0" />
          <input
            autoFocus
            type="text"
            placeholder="Buscar por prenda, SKU, código de barras, cliente, DNI..."
            value={queryText}
            onChange={(e) => setQueryText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape' || e.code === 'Escape') {
                e.preventDefault();
                e.stopPropagation();
                onClose();
              }
            }}
            className="w-full bg-transparent text-base text-neutral-900 placeholder:text-neutral-400 focus:outline-none"
          />
          <button
            type="button"
            onClick={onClose}
            title="Cerrar buscador (ESC)"
            className="px-2.5 py-1 text-xs font-semibold text-neutral-600 bg-neutral-100 hover:bg-neutral-200 hover:text-neutral-900 border border-neutral-200 rounded-lg cursor-pointer transition-colors flex items-center gap-1 shrink-0"
          >
            <span>ESC</span>
          </button>
        </div>

        {/* Quick Links */}
        {!queryText.trim() && (
          <div className="py-2 space-y-2">
            <p className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
              Acceso Rápido
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => { onClose(); navigate('/caja'); }}
                className="flex items-center gap-2.5 p-3 rounded-xl hover:bg-neutral-100 transition-colors text-left"
              >
                <div className="p-2 rounded-lg bg-emerald-100 text-emerald-700">
                  <CircleDollarSign className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-neutral-800">Caja y Finanzas</p>
                  <p className="text-[10px] text-neutral-500">Ingresos por mes y semana</p>
                </div>
              </button>
              <button
                onClick={() => { onClose(); navigate('/stock'); }}
                className="flex items-center gap-2.5 p-3 rounded-xl hover:bg-neutral-100 transition-colors text-left"
              >
                <div className="p-2 rounded-lg bg-neutral-100 text-neutral-800">
                  <Boxes className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-neutral-800">Control de Stock</p>
                  <p className="text-[10px] text-neutral-500">Ajuste de talles y colores</p>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* Search Results */}
        {queryText.trim() && (
          <div className="space-y-4 max-h-80 overflow-y-auto">
            {filteredProducts.length > 0 && (
              <div>
                <p className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider mb-2">
                  Productos ({filteredProducts.length})
                </p>
                <div className="space-y-1">
                  {filteredProducts.map((prod) => (
                    <div
                      key={prod.id}
                      onClick={() => handleSelectProduct(prod)}
                      className="flex items-center justify-between p-2.5 rounded-xl hover:bg-neutral-100 cursor-pointer transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <img
                          src={prod.images?.[0] || 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=100&q=80'}
                          alt={prod.name}
                          className="w-9 h-9 rounded-lg object-cover bg-neutral-200"
                        />
                        <div>
                          <p className="text-xs font-semibold text-neutral-900">
                            {prod.name}
                          </p>
                          <p className="text-[10px] text-neutral-500">
                            SKU: {prod.sku} | Stock total: {prod.stock || 0}
                          </p>
                        </div>
                      </div>
                      <span className="text-xs font-bold text-neutral-900">
                        {formatCurrency(prod.salePrice)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {filteredCustomers.length > 0 && (
              <div>
                <p className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider mb-2">
                  Clientes ({filteredCustomers.length})
                </p>
                <div className="space-y-1">
                  {filteredCustomers.map((cust) => (
                    <div
                      key={cust.id}
                      onClick={() => handleSelectCustomer(cust)}
                      className="flex items-center justify-between p-2.5 rounded-xl hover:bg-neutral-100 cursor-pointer transition-colors"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-neutral-200 flex items-center justify-center text-xs font-bold text-neutral-800">
                          {cust.name.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-neutral-900">
                            {cust.name}
                          </p>
                          <p className="text-[10px] text-neutral-500">
                            DNI: {cust.dni || 'Sin DNI'} | Tel: {cust.phone || '-'}
                          </p>
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-neutral-400" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {filteredProducts.length === 0 && filteredCustomers.length === 0 && (
              <p className="text-center py-6 text-xs text-neutral-500">
                No se encontraron resultados para "{queryText}"
              </p>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
