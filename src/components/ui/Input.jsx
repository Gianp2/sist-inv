import React from 'react';
import { cn } from '../../utils/cn';

export const Input = React.forwardRef(
  (
    {
      label,
      error,
      helperText,
      leftIcon: LeftIcon,
      rightIcon: RightIcon,
      className = '',
      id,
      ...props
    },
    ref
  ) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-xs font-bold text-neutral-700 uppercase tracking-wider"
          >
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {LeftIcon && (
            <div className="absolute left-3 pointer-events-none text-neutral-400">
              <LeftIcon className="w-4 h-4" />
            </div>
          )}
          <input
            id={inputId}
            ref={ref}
            className={cn(
              'w-full rounded-xl border bg-white px-3.5 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 transition-all duration-150',
              'focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent',
              LeftIcon ? 'pl-9' : 'pl-3.5',
              RightIcon ? 'pr-9' : 'pr-3.5',
              error
                ? 'border-rose-500 focus:ring-rose-500'
                : 'border-neutral-300 hover:border-neutral-400 focus:border-neutral-900',
              className
            )}
            {...props}
          />
          {RightIcon && (
            <div className="absolute right-3 pointer-events-none text-neutral-400">
              <RightIcon className="w-4 h-4" />
            </div>
          )}
        </div>
        {error && <p className="text-xs text-rose-600 font-semibold">{error}</p>}
        {helperText && !error && (
          <p className="text-xs text-neutral-500">{helperText}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

