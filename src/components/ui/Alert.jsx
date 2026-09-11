import {
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  Info,
  X,
} from 'lucide-react';

const VARIANT_CONFIGS = {
  info: {
    container: 'bg-sky-50/80 border-sky-200 text-sky-950',
    iconColor: 'text-sky-600',
    Icon: Info,
  },
  success: {
    container: 'bg-emerald-50/80 border-emerald-200 text-emerald-950',
    iconColor: 'text-emerald-600',
    Icon: CheckCircle2,
  },
  warning: {
    container: 'bg-amber-50/80 border-amber-200 text-amber-950',
    iconColor: 'text-amber-600',
    Icon: AlertTriangle,
  },
  error: {
    container: 'bg-rose-50/80 border-rose-200 text-rose-950',
    iconColor: 'text-rose-600',
    Icon: AlertCircle,
  },
  danger: {
    container: 'bg-rose-50/80 border-rose-200 text-rose-950',
    iconColor: 'text-rose-600',
    Icon: AlertCircle,
  },
  neutral: {
    container: 'bg-neutral-100/90 border-neutral-200 text-neutral-900',
    iconColor: 'text-neutral-700',
    Icon: Info,
  },
};

export function Alert({
  variant = 'info',
  title,
  children,
  icon: CustomIcon,
  onClose,
  action,
  className = '',
  id,
}) {
  const config = VARIANT_CONFIGS[variant] || VARIANT_CONFIGS.info;
  const IconComponent = CustomIcon || config.Icon;

  return (
    <div
      id={id}
      role="alert"
      className={`card-panel flex items-start gap-3 p-3.5 sm:p-4 rounded-2xl border transition-all text-xs ${config.container} ${className}`}
    >
      <div className={`p-1 shrink-0 rounded-lg ${config.iconColor}`}>
        <IconComponent className="w-4 h-4 sm:w-5 sm:h-5" />
      </div>

      <div className="flex-1 min-w-0 pt-0.5">
        {title && (
          <h4 className="font-bold text-xs sm:text-sm tracking-tight leading-snug mb-0.5">
            {title}
          </h4>
        )}
        {children && (
          <div className="font-medium text-neutral-700 leading-relaxed">
            {children}
          </div>
        )}
        {action && <div className="mt-2.5 flex items-center gap-2">{action}</div>}
      </div>

      {onClose && (
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar alerta"
          className="p-1 rounded-lg text-neutral-400 hover:text-neutral-800 hover:bg-black/5 transition-colors cursor-pointer shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
