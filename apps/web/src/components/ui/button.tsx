'use client';

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '../../lib/utils';

export const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-xl text-sm font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-meow-deep/40 disabled:pointer-events-none disabled:opacity-60',
  {
    variants: {
      variant: {
        primary:
          'bg-meow-linear text-white shadow-cute hover:-translate-y-0.5 hover:shadow-meow',
        secondary:
          'border border-meow-red/30 bg-white text-meow-deep shadow-card hover:bg-meow-cream',
        ghost: 'text-meow-deep hover:bg-meow-cream/80',
        danger:
          'bg-red-500 text-white shadow-cute hover:-translate-y-0.5 hover:bg-red-600',
        default:
          'bg-meow-linear text-white shadow-cute hover:-translate-y-0.5 hover:shadow-meow',
        outline:
          'border border-meow-red/30 bg-white text-meow-deep shadow-card hover:bg-meow-cream',
      },
      size: {
        default: 'h-11 px-6',
        sm: 'h-9 px-4 text-xs',
        lg: 'h-12 px-7 text-base',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'default',
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, type = 'button', ...props }, ref) => {
    return (
      <button
        type={type}
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);

Button.displayName = 'Button';
