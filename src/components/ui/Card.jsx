import { cn } from '../../utils/cn';

export function Card({ children, className = '', hover = false, ...props }) {
  return (
    <div
      className={cn(
        'card-panel bg-white border border-neutral-200 rounded-2xl p-5 shadow-xs transition-all duration-200 text-neutral-900',
        hover && 'hover:shadow-md hover:border-neutral-300',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ title, subtitle, action, className = '' }) {
  return (
    <div className={cn('flex items-center justify-between pb-4 mb-4 border-b border-neutral-200', className)}>
      <div>
        <h3 className="text-base font-bold text-neutral-900">{title}</h3>
        {subtitle && <p className="text-xs text-neutral-600 mt-0.5 font-medium">{subtitle}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}

