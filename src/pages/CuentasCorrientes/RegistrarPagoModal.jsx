import { useState, useEffect } from 'react';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { PAYMENT_METHODS } from '../../constants/clothingConstants';
import { formatCurrency } from '../../utils/formatters';
import { useAuth } from '../../hooks/useAuth';
import { toastAlert } from '../../components/ui/Toast';
import { CircleDollarSign, CheckCircle2, AlertCircle } from 'lucide-react';

export function RegistrarPagoModal({
  isOpen,
  onClose,
  customers = [],
  initialCustomer = null,
  onSavePayment,
}) {
  const { user } = useAuth();
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('EFECTIVO');
  const [notes, setNotes] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (initialCustomer?.id) {
      setSelectedCustomerId(initialCustomer.id);
      // Default to paying the full debt or empty
      if (initialCustomer.currentBalance > 0) {
        setAmount(String(initialCustomer.currentBalance));
      }
    } else {
      setSelectedCustomerId('');
      setAmount('');
    }
  }, [initialCustomer, isOpen]);

  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId);
  const currentDebt = Number(selectedCustomer?.currentBalance) || 0;
  const numAmount = Number(amount) || 0;
  const balanceAfter = Math.max(0, currentDebt - numAmount);
  const isOverpaying = numAmount > currentDebt && currentDebt > 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedCustomerId) {
      toastAlert.warning('Selecciona un cliente', 'Elige el cliente que está realizando el pago.');
      return;
    }
    if (numAmount <= 0) {
      toastAlert.warning('Importe inválido', 'El monto a cobrar debe ser mayor a $ 0.');
      return;
    }

    setLoading(true);
    try {
      await onSavePayment({
        customerId: selectedCustomerId,
        amount: numAmount,
        paymentMethod,
        notes,
        user: user?.displayName || 'Administrador',
        date: date ? new Date(date + 'T12:00:00').toISOString() : new Date().toISOString(),
      });
      toastAlert.success(
        'Cobro Registrado',
        `${formatCurrency(numAmount)} ingresado a la caja y descontado de la deuda de ${selectedCustomer?.name}.`
      );
      onClose();
    } catch (err) {
      toastAlert.error('Error al registrar pago', err.message || 'Intente nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Registrar Cobro / Entrega de Cuenta Corriente"
      subtitle="El dinero ingresa automáticamente a la caja diaria y se descuenta de la deuda"
      maxWidth="max-w-md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Customer select */}
        <Select
          label="Cliente *"
          value={selectedCustomerId}
          onChange={(e) => {
            setSelectedCustomerId(e.target.value);
            const found = customers.find((c) => c.id === e.target.value);
            if (found && found.currentBalance > 0) {
              setAmount(String(found.currentBalance));
            }
          }}
          disabled={!!initialCustomer}
          required
        >
          <option value="">-- Seleccionar Cliente --</option>
          {customers.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} {c.phone ? `(${c.phone})` : ''} - Deuda: {formatCurrency(c.currentBalance || 0)}
            </option>
          ))}
        </Select>

        {/* Customer balance preview pill */}
        {selectedCustomer && (
          <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200 text-xs flex justify-between items-center">
            <div>
              <p className="text-neutral-500 text-[11px] font-semibold uppercase">Deuda Actual Pendiente</p>
              <p className="text-base font-black text-rose-600 mt-0.5">
                {formatCurrency(currentDebt)}
              </p>
            </div>
            {currentDebt === 0 && (
              <span className="px-2 py-1 rounded-lg bg-emerald-50 text-emerald-700 font-bold text-[11px]">
                Al día (Sin deuda)
              </span>
            )}
          </div>
        )}

        {/* Amount to pay */}
        <div className="space-y-1">
          <Input
            label="Monto a Cobrar ($) *"
            type="number"
            min="1"
            step="any"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
            autoFocus
          />
          {selectedCustomer && currentDebt > 0 && (
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setAmount(String(currentDebt))}
                className="text-[11px] text-blue-600 hover:text-blue-800 font-bold underline cursor-pointer"
              >
                Pagar total ({formatCurrency(currentDebt)})
              </button>
              <span className="text-neutral-300">|</span>
              <button
                type="button"
                onClick={() => setAmount(String(Math.round(currentDebt / 2)))}
                className="text-[11px] text-neutral-600 hover:text-neutral-900 font-medium cursor-pointer"
              >
                Pagar mitad ({formatCurrency(Math.round(currentDebt / 2))})
              </button>
            </div>
          )}
        </div>

        {/* Projected balance preview */}
        {numAmount > 0 && selectedCustomer && (
          <div className="p-3 rounded-xl bg-blue-50/60 border border-blue-200/60 flex items-center justify-between text-xs">
            <span className="text-blue-900 font-medium">Saldo Restante Proyectado:</span>
            <span className="font-extrabold text-blue-950 text-sm">
              {formatCurrency(balanceAfter)}
            </span>
          </div>
        )}

        {isOverpaying && (
          <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-2 text-xs text-amber-900">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>El monto ingresado es superior a la deuda actual del cliente.</span>
          </div>
        )}

        {/* Payment Method & Date */}
        <div className="grid grid-cols-2 gap-3">
          <Select
            label="Medio de Cobro *"
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value)}
            required
          >
            {PAYMENT_METHODS.filter((pm) => pm.id !== 'CUENTA_CORRIENTE').map((pm) => (
              <option key={pm.id} value={pm.id}>
                {pm.name}
              </option>
            ))}
          </Select>

          <Input
            label="Fecha"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />
        </div>

        {/* Observations */}
        <Input
          label="Observaciones o Comprobante (opcional)"
          placeholder="Ej: Entrega a cuenta, transferencia comprobante #123..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />

        {/* Notice of cash impact */}
        <p className="text-[11px] text-neutral-500 leading-relaxed">
          * Este pago se registrará como ingreso inmediato en el turno de caja abierto actual.
        </p>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-neutral-200">
          <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="sm"
            leftIcon={CircleDollarSign}
            loading={loading}
            disabled={!selectedCustomerId || numAmount <= 0}
          >
            Confirmar Cobro
          </Button>
        </div>
      </form>
    </Modal>
  );
}
