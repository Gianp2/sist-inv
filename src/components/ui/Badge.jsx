import React from 'react';
import { cn } from '../../utils/cn';

export function Badge({ children, variant = 'neutral', size = 'md', className = '' }) {
  const variants = {
    neutral: 'bg-neutral-100 text-neutral-800 border-neutral-200',
    success: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    warning: 'bg-amber-50 text-amber-900 border-amber-200',
    danger: 'bg-rose-50 text-rose-800 border-rose-200',
    primary: 'bg-neutral-900 text-white border-neutral-900 shadow-2xs',
    info: 'bg-sky-50 text-sky-800 border-sky-200',
    admin: 'bg-neutral-900 text-amber-400 border-neutral-800 font-bold shadow-2xs',
  };

  const sizes = {
    xs: 'px-2 py-0.5 text-[10px] font-semibold',
    sm: 'px-2.5 py-0.5 text-[11px] font-semibold',
    md: 'px-3 py-1 text-xs font-semibold',
    lg: 'px-3.5 py-1.5 text-sm font-semibold',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border whitespace-nowrap transition-colors select-none tracking-tight',
        variants[variant],
        sizes[size],
        className
      )}
    >
      {children}
    </span>
  );
}

