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
    <label className="auth-field" htmlFor={htmlFor}>
      <span>{label}</span>
      {children}
      {error ? <span className="auth-error">{error}</span> : null}
      {!error && helper ? <span className="auth-helper">{helper}</span> : null}
    </label>
  );
};
