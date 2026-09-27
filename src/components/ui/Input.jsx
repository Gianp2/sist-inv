import React from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { cn } from '../../utils/cn';
import { sanitizeNumericValue, handleNumericFocus } from '../../utils/numericUtils';

export const Input = React.forwardRef(
  (
    {
      label,
      error,
      helperText,
      leftIcon: LeftIcon,
      rightIcon: RightIcon,
      showPasswordToggle = false,
      className = '',
      id,
      type,
      value,
      onChange,
      onInput,
      onFocus,
      ...props
    },
    ref
  ) => {
    const [showPassword, setShowPassword] = React.useState(false);
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);
    const isNumeric = type === 'number';
    const isPassword = type === 'password';
    const effectiveType = isPassword && showPassword ? 'text' : type;

    const handleFocusInternal = (e) => {
      if (isNumeric) {
        handleNumericFocus(e);
      }
      if (onFocus) {
        onFocus(e);
      }
    };

    const handleChangeInternal = (e) => {
      if (isNumeric) {
        const raw = e.target.value;
        const sanitized = sanitizeNumericValue(raw);
        if (raw !== sanitized) {
          e.target.value = sanitized;
        }
      }
      if (onChange) {
        onChange(e);
      }
    };

    const handleInputInternal = (e) => {
      if (isNumeric) {
        const raw = e.target.value;
        const sanitized = sanitizeNumericValue(raw);
        if (raw !== sanitized) {
          e.target.value = sanitized;
        }
      }
      if (onInput) {
        onInput(e);
      }
    };

    // Si es numérico y se pasa un string con ceros sobrantes, formatearlo
    const displayValue = isNumeric && typeof value === 'string'
      ? sanitizeNumericValue(value)
      : value;

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
            type={effectiveType}
            value={displayValue}
            onChange={handleChangeInternal}
            onInput={handleInputInternal}
            onFocus={handleFocusInternal}
            className={cn(
              'w-full rounded-xl border bg-white px-3.5 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 transition-all duration-150',
              'focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent',
              LeftIcon ? 'pl-9' : 'pl-3.5',
              (RightIcon || (isPassword && showPasswordToggle)) ? 'pr-10' : 'pr-3.5',
              error
                ? 'border-rose-500 focus:ring-rose-500'
                : 'border-neutral-300 hover:border-neutral-400 focus:border-neutral-900',
              className
            )}
            {...props}
          />
          {isPassword && showPasswordToggle ? (
            <button
              type="button"
              tabIndex={-1}
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute right-3 p-0.5 text-neutral-400 hover:text-neutral-700 focus:outline-none cursor-pointer transition-colors"
              title={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
              aria-label={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
            >
              {showPassword ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </button>
          ) : RightIcon ? (
            <div className="absolute right-3 pointer-events-none text-neutral-400">
              <RightIcon className="w-4 h-4" />
            </div>
          ) : null}
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

