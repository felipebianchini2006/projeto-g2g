'use client';

type FormFieldProps = {
  label: string;
  htmlFor: string;
  error?: string;
  helper?: string;
  children: React.ReactNode;
};

export const FormField = ({ label, htmlFor, error, helper, children }: FormFieldProps) => {
  return (
    <label className="grid gap-2 text-sm font-semibold text-meow-charcoal" htmlFor={htmlFor}>
      <span className="text-xs font-bold uppercase tracking-[0.4px] text-meow-muted">
        {label}
      </span>
      {children}
      {error ? <span className="text-xs font-semibold text-red-600">{error}</span> : null}
      {!error && helper ? (
        <span className="text-xs text-meow-muted">{helper}</span>
      ) : null}
    </label>
  );
};
