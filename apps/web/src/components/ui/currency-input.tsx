'use client';

import * as React from 'react';

import { cn } from '../../lib/utils';

type CurrencyInputProps = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  'value' | 'onChange' | 'inputMode'
> & {
  valueCents: number;
  onValueChange: (cents: number) => void;
  maxCents?: number;
  currency?: string;
};

const formatCurrency = (cents: number, currency: string) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);

const normalizeDigits = (value: string) => {
  const digits = value.replace(/\D/g, '');
  return digits.length > 0 ? digits.replace(/^0+(?=\d)/, '') : '0';
};

const clampDigits = (digits: string, maxCents?: number) => {
  if (!maxCents) {
    return digits;
  }
  const numeric = Number(digits);
  if (Number.isNaN(numeric)) {
    return digits;
  }
  return numeric > maxCents ? String(maxCents) : digits;
};

export const CurrencyInput = React.forwardRef<HTMLInputElement, CurrencyInputProps>(
  ({ valueCents, onValueChange, maxCents, currency = 'BRL', className, ...props }, ref) => {
    const innerRef = React.useRef<HTMLInputElement | null>(null);
    const mergedRef = (node: HTMLInputElement | null) => {
      innerRef.current = node;
      if (typeof ref === 'function') {
        ref(node);
      } else if (ref) {
        ref.current = node;
      }
    };

    const [digits, setDigits] = React.useState(() =>
      normalizeDigits(String(Math.max(0, Math.floor(valueCents || 0)))),
    );

    React.useEffect(() => {
      const nextDigits = normalizeDigits(String(Math.max(0, Math.floor(valueCents || 0))));
      if (nextDigits !== digits) {
        setDigits(nextDigits);
      }
    }, [valueCents, digits]);

    React.useEffect(() => {
      const input = innerRef.current;
      if (!input) {
        return;
      }
      const length = input.value.length;
      input.setSelectionRange(length, length);
    }, [digits]);

    const applyDigits = (nextDigits: string) => {
      const clamped = clampDigits(normalizeDigits(nextDigits), maxCents);
      setDigits(clamped);
      onValueChange(Number(clamped));
    };

    const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.ctrlKey || event.metaKey || event.altKey) {
        return;
      }
      if (event.key >= '0' && event.key <= '9') {
        event.preventDefault();
        const nextDigits = digits === '0' ? event.key : `${digits}${event.key}`;
        applyDigits(nextDigits);
        return;
      }
      if (event.key === 'Backspace' || event.key === 'Delete') {
        event.preventDefault();
        const nextDigits = digits.length > 1 ? digits.slice(0, -1) : '0';
        applyDigits(nextDigits);
      }
    };

    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      applyDigits(event.target.value);
    };

    const handlePaste = (event: React.ClipboardEvent<HTMLInputElement>) => {
      event.preventDefault();
      const text = event.clipboardData.getData('text');
      if (!text) {
        return;
      }
      const pastedDigits = normalizeDigits(text);
      applyDigits(pastedDigits);
    };

    return (
      <input
        ref={mergedRef}
        inputMode="numeric"
        value={formatCurrency(Number(digits), currency)}
        onKeyDown={handleKeyDown}
        onChange={handleChange}
        onPaste={handlePaste}
        className={cn(
          'h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-slate-700 shadow-[0_8px_20px_rgba(15,23,42,0.04)] outline-none placeholder:text-slate-400 focus:border-meow-red/60 focus:ring-4 focus:ring-meow-red/15 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400',
          className,
        )}
        {...props}
      />
    );
  },
);

CurrencyInput.displayName = 'CurrencyInput';
