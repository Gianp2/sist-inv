import React from 'react';
import { cn } from '../../utils/cn';

export const Select = React.forwardRef(
  ({ label, error, helperText, options = [], className = '', id, children, ...props }, ref) => {
    const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label
            htmlFor={selectId}
            className="block text-xs font-bold text-neutral-700 uppercase tracking-wider"
          >
            {label}
          </label>
        )}
        <select
          id={selectId}
          ref={ref}
          className={cn(
            'w-full rounded-xl border bg-white px-3.5 py-2 text-sm text-neutral-900 transition-all duration-150 cursor-pointer',
            'focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent',
            error
              ? 'border-rose-500 focus:ring-rose-500'
              : 'border-neutral-300 hover:border-neutral-400 focus:border-neutral-900',
            className
          )}
          {...props}
        >
          {children ? (
            children
          ) : (
            options.map((opt, optIdx) => (
              <option
                key={opt.value ?? opt.id ?? `opt-${optIdx}`}
                value={opt.value ?? opt.id ?? opt}
              >
                {opt.label ?? opt.name ?? opt}
              </option>
            ))
          )}
        </select>
        {error && <p className="text-xs text-rose-600 font-semibold">{error}</p>}
        {helperText && !error && (
          <p className="text-xs text-neutral-500">{helperText}</p>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';

