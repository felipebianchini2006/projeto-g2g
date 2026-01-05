'use client';

import Link from 'next/link';
import { useState, type ChangeEvent, type FormEvent } from 'react';
import { z } from 'zod';

import { FormField } from '../../../components/forms/form-field';
import { AuthApiError, authApi } from '../../../lib/auth-api';
import { mapZodErrors } from '../../../lib/zod-errors';

const schema = z.object({
  email: z.string().trim().email('Informe um e-mail valido.'),
});

type FormState = z.infer<typeof schema>;

export default function Page() {
  const [formData, setFormData] = useState<FormState>({ email: '' });
  const [errors, setErrors] = useState<Partial<Record<keyof FormState | 'form', string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [resetToken, setResetToken] = useState<string | null>(null);

  const handleChange =
    (field: keyof FormState) => (event: ChangeEvent<HTMLInputElement>) => {
      setFormData((prev) => ({ ...prev, [field]: event.target.value }));
    };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrors({});
    setSuccessMessage(null);
    setResetToken(null);

    const result = schema.safeParse(formData);
    if (!result.success) {
      setErrors(mapZodErrors(result.error));
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await authApi.forgotPassword(result.data.email);
      if (response.resetToken) {
        setResetToken(response.resetToken);
        setSuccessMessage('Token gerado para dev. Use o link abaixo para testar.');
      } else {
        setSuccessMessage('Se o e-mail existir, enviaremos instrucoes de reset.');
      }
    } catch (error) {
      if (error instanceof AuthApiError) {
        setErrors({ form: error.message });
      } else {
        setErrors({ form: 'Nao foi possivel enviar o reset. Tente novamente.' });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <span className="auth-kicker">Recuperacao</span>
        <h1>Esqueci minha senha</h1>
        <p>Informe seu e-mail para receber instrucoes.</p>
        <form className="auth-form" onSubmit={handleSubmit}>
          <FormField label="E-mail" htmlFor="email" error={errors.email}>
            <input
              id="email"
              className="auth-input"
              type="email"
              value={formData.email}
              onChange={handleChange('email')}
              autoComplete="email"
              required
            />
          </FormField>
          {errors.form ? <p className="auth-error">{errors.form}</p> : null}
          {successMessage ? <p className="auth-helper">{successMessage}</p> : null}
          {resetToken ? (
            <Link className="auth-link" href={`/reset?token=${resetToken}`}>
              Ir para reset com token
            </Link>
          ) : null}
          <button className="primary-button" type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Enviando...' : 'Enviar reset'}
          </button>
          <div className="auth-footer">
            <Link className="auth-link" href="/login">
              Voltar para login
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
