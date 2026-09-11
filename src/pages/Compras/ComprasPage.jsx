import { useState } from 'react';
import { usePurchases } from '../../hooks/usePurchases';
import { useSuppliers } from '../../hooks/useContacts';
import { useProducts } from '../../hooks/useProducts';
import { NuevaCompraModal } from './NuevaCompraModal';
import { Button } from '../../components/ui/Button';
import { TableSkeleton } from '../../components/ui/Skeleton';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { Plus, ArrowDownLeft, Search } from 'lucide-react';

export function ComprasPage() {
  const { purchases, loading, createPurchase } = usePurchases();
  const { suppliers } = useSuppliers();
  const { products } = useProducts();

  const [searchTerm, setSearchTerm] = useState('');
  const [modalOpen, setModalOpen] = useState(false);

  const filtered = purchases.filter(
    (p) =>
      p.purchaseNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.supplierName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-neutral-900 tracking-tight">
            Compras a Proveedores
          </h1>
          <p className="text-xs text-neutral-500 mt-0.5 font-medium">
            Registro de reposiciones de mercadería e incremento automático de stock
          </p>
        </div>
        <Button
          variant="primary"
          size="sm"
          leftIcon={Plus}
          onClick={() => setModalOpen(true)}
        >
          Registrar Compra
        </Button>
      </div>

      {/* Table Container */}
      <div className="card-panel bg-white rounded-2xl border border-neutral-200 p-4 shadow-xs">
        <div className="relative max-w-md mb-4">
          <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Buscar por remito o proveedor..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-neutral-300 bg-white text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900"
          />
        </div>

        {loading ? (
          <TableSkeleton rows={5} cols={5} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-white text-neutral-800 font-bold border-b border-neutral-200">
                <tr>
                  <th className="p-3">Nº Compra</th>
                  <th className="p-3">Fecha</th>
                  <th className="p-3">Proveedor</th>
                  <th className="p-3">Items Recibidos</th>
                  <th className="p-3 text-right">Total Invertido</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {filtered.map((pur) => (
                  <tr key={pur.id} className="hover:bg-neutral-50/80 transition-colors">
                    <td className="p-3 font-mono font-bold text-neutral-900">
                      {pur.purchaseNumber}
                    </td>
                    <td className="p-3 text-neutral-600 font-medium">{formatDate(pur.date, 'full')}</td>
                    <td className="p-3 font-bold text-neutral-900">
                      {pur.supplierName}
                    </td>
                    <td className="p-3 text-neutral-700 font-medium">
                      {pur.items?.length || 0} prendas ({pur.items?.reduce((a, b) => a + (b.quantity || 0), 0)} u.)
                    </td>
                    <td className="p-3 text-right font-black text-neutral-900">
                      {formatCurrency(pur.total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* New Purchase Modal */}
      <NuevaCompraModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={createPurchase}
        suppliers={suppliers}
        products={products}
      />
    </div>
  );
}
