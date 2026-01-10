'use client';

import * as React from 'react';

import { cn } from '../../lib/utils';

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      'min-h-[120px] w-full resize-y rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 shadow-[0_8px_20px_rgba(15,23,42,0.04)] outline-none placeholder:text-slate-400 focus:border-meow-300 focus:ring-4 focus:ring-meow-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400',
      className,
    )}
    {...props}
  />
));

Textarea.displayName = 'Textarea';
