'use client';

import * as React from 'react';

import { cn } from '../../lib/utils';

export const Select = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(({ className, children, ...props }, ref) => (
  <select
    ref={ref}
    className={cn(
      'h-11 w-full cursor-pointer appearance-none rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-slate-700 shadow-[0_8px_20px_rgba(15,23,42,0.04)] outline-none focus:border-meow-red/60 focus:ring-4 focus:ring-meow-red/15 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400',
      className,
    )}
    {...props}
  >
    {children}
  </select>
));

Select.displayName = 'Select';
