'use client';

import * as React from 'react';

import { cn } from '../../lib/utils';

type ToggleProps = {
  checked: boolean;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
};

export const Toggle = ({ checked, onCheckedChange, disabled, className }: ToggleProps) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    disabled={disabled}
    onClick={() => {
      if (!disabled) {
        onCheckedChange?.(!checked);
      }
    }}
    className={cn(
      'relative inline-flex h-7 w-12 items-center rounded-full border transition',
      checked
        ? 'border-meow-300 bg-meow-300 shadow-cute'
        : 'border-slate-200 bg-slate-200',
      disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer',
      className,
    )}
  >
    <span
      className={cn(
        'inline-block h-5 w-5 rounded-full bg-white shadow transition',
        checked ? 'translate-x-5' : 'translate-x-1',
      )}
    />
  </button>
);
