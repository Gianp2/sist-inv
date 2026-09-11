import { useState, useEffect } from 'react';
import { useSettings } from '../../hooks/useSettingsAndUsers';
import { Card, CardHeader } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { seedInitialData } from '../../services/api/seedData';
import { clearAllMovementsAndShifts, resetEntireSystemToFresh } from '../../services/firebase/firestore';
import { Store, Database, Save, PackagePlus, RotateCcw, Trash2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

export function ConfiguracionPage() {
  const { settings, loading, saveSettings } = useSettings();
  const [formData, setFormData] = useState(settings || {});
  const [isSaving, setIsSaving] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [isResettingAll, setIsResettingAll] = useState(false);
  const [confirmSeedOpen, setConfirmSeedOpen] = useState(false);
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);
  const [confirmResetAllOpen, setConfirmResetAllOpen] = useState(false);

  // Sync form data whenever settings finishes loading or updates in Firestore
  useEffect(() => {
    if (settings) {
      setFormData(settings);
    }
  }, [settings]);

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSaveStoreData = async (e) => {
    if (e) e.preventDefault();
    setIsSaving(true);
    try {
      await saveSettings(formData);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    await handleSaveStoreData();
  };

  const handleConfirmSeed = async () => {
    setIsSeeding(true);
    try {
      await seedInitialData();
      toast.success('¡Datos iniciales cargados exitosamente!');
      setConfirmSeedOpen(false);
      window.location.reload();
    } catch (err) {
      toast.error('Error al inicializar datos');
    } finally {
      setIsSeeding(false);
    }
  };

  const handleConfirmClearCash = async () => {
    setIsClearing(true);
    try {
      await clearAllMovementsAndShifts();
      toast.success('¡Caja y movimientos reseteados a cero! La tienda está limpia y lista para su uso.');
      setConfirmClearOpen(false);
    } catch (err) {
      toast.error('Error al resetear la caja');
    } finally {
      setIsClearing(false);
    }
  };

  const handleConfirmResetAll = async () => {
    setIsResettingAll(true);
    try {
      await resetEntireSystemToFresh();
      toast.success('¡Sistema completamente reiniciado! Se eliminaron todas las prendas, ventas, clientes y movimientos de prueba.');
      setConfirmResetAllOpen(false);
    } catch (err) {
      toast.error('Error al restablecer el sistema');
    } finally {
      setIsResettingAll(false);
    }
  };

  // Currency symbol preview helper
  const previewCurrencySymbol =
    formData.currency === 'USD' ? 'US$' : formData.currency === 'EUR' ? '€' : '$';

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-black text-neutral-900 tracking-tight">
          Configuración del Negocio
        </h1>
        <p className="text-xs text-neutral-500 mt-0.5 font-medium">
          Datos comerciales, identidad de marca, tickets de venta y base de datos
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Store profile */}
        <Card className="p-5 bg-white shadow-xs border-neutral-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-neutral-100">
            <div>
              <h2 className="text-base font-bold text-neutral-900 flex items-center gap-2">
                <Store className="w-5 h-5 text-neutral-800" />
                Datos de la Tienda de Ropa
              </h2>
              <p className="text-xs text-neutral-500 mt-0.5 font-medium">
                Esta información define el nombre del sistema, la barra lateral, los tickets impresos y los reportes PDF.
              </p>
            </div>
            <Button
              type="button"
              variant="primary"
              size="sm"
              leftIcon={Save}
              isLoading={isSaving}
              onClick={handleSaveStoreData}
            >
              Guardar Datos de la Tienda
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
            <Input
              label="Nombre Comercial de la Tienda *"
              value={formData.businessName || ''}
              onChange={(e) => handleChange('businessName', e.target.value)}
              placeholder="Ej: Modas & Tendencias, Urban Style..."
              required
            />
            <Input
              label="CUIT / RUT / Identificación Fiscal"
              value={formData.cuit || ''}
              onChange={(e) => handleChange('cuit', e.target.value)}
              placeholder="Ej: 30-71234567-8"
            />
            <Input
              label="Dirección del Local Físico"
              value={formData.address || ''}
              onChange={(e) => handleChange('address', e.target.value)}
              placeholder="Ej: Av. Santa Fe 1820, Local 4"
            />
            <Input
              label="Teléfono / WhatsApp de Contacto"
              value={formData.phone || ''}
              onChange={(e) => handleChange('phone', e.target.value)}
              placeholder="Ej: +54 9 11 4567-8901"
            />
            <Input
              label="Email de Contacto"
              type="email"
              value={formData.email || ''}
              onChange={(e) => handleChange('email', e.target.value)}
              placeholder="Ej: contacto@tienda.com"
            />
            <Select
              label="Moneda Principal del Negocio"
              value={formData.currency || formData.currencyCode || 'ARS'}
              onChange={(e) => handleChange('currency', e.target.value)}
            >
              <option value="ARS">ARS ($ - Peso Argentino)</option>
              <option value="USD">USD (US$ - Dólar Estadounidense)</option>
              <option value="EUR">EUR (€ - Euro)</option>
              <option value="MXN">MXN ($ - Peso Mexicano)</option>
              <option value="CLP">CLP ($ - Peso Chileno)</option>
            </Select>
          </div>

          <div className="mt-4">
            <Input
              label="Leyenda / Pie de Ticket de Venta"
              value={formData.receiptFooter || ''}
              onChange={(e) => handleChange('receiptFooter', e.target.value)}
              placeholder="Ej: ¡Gracias por su compra! Cambios dentro de los 30 días con este ticket."
            />
          </div>

          {/* Real-time Preview: How it appears on Tickets, Sidebar & Reports */}
          <div className="mt-6 pt-5 border-t border-neutral-100">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span className="text-xs font-bold text-neutral-800 uppercase tracking-wider">
                Vista previa en tiempo real: así se refleja en tus tickets y reportes
              </span>
            </div>

            <div className="bg-neutral-50 rounded-2xl p-4 border border-neutral-200/80 max-w-md mx-auto shadow-2xs font-mono text-xs text-neutral-800 select-none">
              <div className="text-center pb-3 border-b border-dashed border-neutral-300 space-y-1">
                <p className="font-extrabold text-sm text-neutral-900 tracking-wide uppercase">
                  {formData.businessName || 'NOMBRE DE TU TIENDA'}
                </p>
                {formData.cuit && (
                  <p className="text-[11px] text-neutral-600 font-semibold">
                    CUIT/RUT: {formData.cuit}
                  </p>
                )}
                {formData.address && (
                  <p className="text-[11px] text-neutral-600">
                    {formData.address}
                  </p>
                )}
                {(formData.phone || formData.email) && (
                  <p className="text-[10px] text-neutral-500">
                    {[formData.phone && `Tel: ${formData.phone}`, formData.email].filter(Boolean).join(' • ')}
                  </p>
                )}
              </div>

              <div className="py-2.5 border-b border-dashed border-neutral-300 text-[11px] space-y-1 text-neutral-600">
                <div className="flex justify-between">
                  <span>TICKET: #0001-000492</span>
                  <span>{new Date().toLocaleDateString('es-AR')}</span>
                </div>
                <div className="flex justify-between">
                  <span>VENDEDOR: Mostrador</span>
                  <span>PAGO: Efectivo</span>
                </div>
              </div>

              <div className="py-2.5 border-b border-dashed border-neutral-300 text-[11px] space-y-1.5">
                <div className="flex justify-between font-sans">
                  <span>1x Remera Oversize Algodón (Negro - L)</span>
                  <span className="font-mono font-bold">{previewCurrencySymbol} 14.500</span>
                </div>
                <div className="flex justify-between font-sans">
                  <span>1x Jean Clásico Denim (Azul - 42)</span>
                  <span className="font-mono font-bold">{previewCurrencySymbol} 38.000</span>
                </div>
                <div className="pt-2 flex justify-between font-bold text-xs text-neutral-900 border-t border-dotted border-neutral-300">
                  <span>TOTAL COBRADO:</span>
                  <span>{previewCurrencySymbol} 52.500</span>
                </div>
              </div>

              <div className="pt-3 text-center text-[10px] text-neutral-500 italic">
                {formData.receiptFooter || '¡Gracias por su compra! Cambios dentro de los 30 días con ticket.'}
              </div>
            </div>

            <p className="text-[11px] text-neutral-500 text-center mt-2.5 font-medium">
              Al guardar, se actualiza automáticamente el menú lateral, la barra superior, los reportes descargables y la pantalla de acceso.
            </p>
          </div>
        </Card>

        {/* Database initial bootstrap & reset */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="p-5 bg-white border-neutral-200 shadow-xs">
            <div className="flex flex-col justify-between h-full gap-3">
              <div className="flex items-start gap-3">
                <div className="p-2.5 rounded-xl bg-neutral-100 text-neutral-800 shrink-0 border border-neutral-200">
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-neutral-900">
                    Poblar Catálogo de Muestra
                  </h4>
                  <p className="text-xs text-neutral-600 mt-0.5 font-medium">
                    Genera productos, talles y categorías de indumentaria base si el catálogo está vacío.
                  </p>
                </div>
              </div>
              <div className="flex justify-end pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  leftIcon={PackagePlus}
                  onClick={() => setConfirmSeedOpen(true)}
                  isLoading={isSeeding}
                >
                  Cargar Catálogo Base
                </Button>
              </div>
            </div>
          </Card>

          <Card className="p-5 bg-white border-neutral-200 shadow-xs">
            <div className="flex flex-col justify-between h-full gap-3">
              <div className="flex items-start gap-3">
                <div className="p-2.5 rounded-xl bg-neutral-100 text-neutral-800 shrink-0 border border-neutral-200">
                  <RotateCcw className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-neutral-900">
                    Dejar Caja y Movimientos en Cero
                  </h4>
                  <p className="text-xs text-neutral-600 mt-0.5 font-medium">
                    Elimina todos los ingresos, egresos y turnos de ejemplo para dejar la caja limpia y nueva para usar.
                  </p>
                </div>
              </div>
              <div className="flex justify-end pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="text-rose-700 hover:bg-rose-50 border-neutral-200"
                  leftIcon={RotateCcw}
                  onClick={() => setConfirmClearOpen(true)}
                  isLoading={isClearing}
                >
                  Limpiar Caja a Cero
                </Button>
              </div>
            </div>
          </Card>
        </div>

        {/* Full System Factory Reset Card */}
        <Card className="p-5 bg-white border-neutral-200 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-neutral-100 text-neutral-800 shrink-0 border border-neutral-200">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-neutral-900">
                  Restablecer Todo el Sistema a Cero (Limpieza Total)
                </h4>
                <p className="text-xs text-neutral-600 mt-0.5 font-medium">
                  Elimina todas las prendas de muestra, clientes, proveedores, compras y ventas para dejar la tienda 100% nueva y vacía.
                </p>
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="text-neutral-900 hover:bg-neutral-50 border-neutral-200 whitespace-nowrap"
              leftIcon={Trash2}
              onClick={() => setConfirmResetAllOpen(true)}
              isLoading={isResettingAll}
            >
              Restablecer Sistema a Cero
            </Button>
          </div>
        </Card>

        <div className="flex justify-end gap-3 pt-2">
          <Button type="submit" variant="primary" size="md" leftIcon={Save} isLoading={isSaving}>
            Guardar Configuración
          </Button>
        </div>
      </form>

      {/* Confirm Seed Sample Data Dialog */}
      <ConfirmDialog
        isOpen={confirmSeedOpen}
        onClose={() => setConfirmSeedOpen(false)}
        onConfirm={handleConfirmSeed}
        title="¿Poblar datos de muestra?"
        description="Se cargarán productos, talles, variantes y categorías de indumentaria de ejemplo para comenzar a operar."
        confirmText="Sí, Cargar Muestra"
        variant="primary"
        isLoading={isSeeding}
      />

      {/* Confirm Clear Cash Movements Dialog */}
      <ConfirmDialog
        isOpen={confirmClearOpen}
        onClose={() => setConfirmClearOpen(false)}
        onConfirm={handleConfirmClearCash}
        title="¿Limpiar caja y movimientos a cero?"
        description="Se eliminarán todos los ingresos, egresos, turnos anteriores y ventas de prueba. La caja quedará cerrada en $0 y completamente lista para registrar tu primer turno real."
        confirmText="Sí, Dejar Caja en Cero"
        variant="danger"
        isLoading={isClearing}
      />

      {/* Confirm Reset Entire System Dialog */}
      <ConfirmDialog
        isOpen={confirmResetAllOpen}
        onClose={() => setConfirmResetAllOpen(false)}
        onConfirm={handleConfirmResetAll}
        title="¿Restablecer todo el sistema a cero?"
        description="Se eliminarán todas las prendas de muestra, talles, stock, ventas, compras, clientes y caja para dejar el sistema totalmente limpio y nuevo para su uso real."
        confirmText="Sí, Restablecer Todo a Cero"
        variant="danger"
        isLoading={isResettingAll}
      />
    </div>
  );
}
