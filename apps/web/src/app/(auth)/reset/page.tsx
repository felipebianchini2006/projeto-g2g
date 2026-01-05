'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react';
import { z } from 'zod';

import { FormField } from '../../../components/forms/form-field';
import { AuthApiError, authApi } from '../../../lib/auth-api';
import { mapZodErrors } from '../../../lib/zod-errors';

const schema = z.object({
  token: z.string().min(10, 'Token invalido.'),
  password: z.string().min(8, 'Senha deve ter ao menos 8 caracteres.'),
});

type FormState = z.infer<typeof schema>;

export default function Page() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [formData, setFormData] = useState<FormState>({ token: '', password: '' });
  const [errors, setErrors] = useState<Partial<Record<keyof FormState | 'form', string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const tokenFromQuery = searchParams.get('token');
    if (tokenFromQuery) {
      setFormData((prev) => ({ ...prev, token: tokenFromQuery }));
    }
  }, [searchParams]);

  const handleChange =
    (field: keyof FormState) => (event: ChangeEvent<HTMLInputElement>) => {
      setFormData((prev) => ({ ...prev, [field]: event.target.value }));
    };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrors({});

    const result = schema.safeParse(formData);
    if (!result.success) {
      setErrors(mapZodErrors(result.error));
      return;
    }

    setIsSubmitting(true);
    try {
      await authApi.resetPassword(result.data);
      router.push('/login');
    } catch (error) {
      if (error instanceof AuthApiError) {
        setErrors({ form: error.message });
      } else {
        setErrors({ form: 'Nao foi possivel atualizar a senha. Tente novamente.' });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <span className="auth-kicker">Nova senha</span>
        <h1>Reset de senha</h1>
        <p>Informe o token recebido e defina sua nova senha.</p>
        <form className="auth-form" onSubmit={handleSubmit}>
          <FormField label="Token" htmlFor="token" error={errors.token}>
            <input
              id="token"
              className="auth-input"
              type="text"
              value={formData.token}
              onChange={handleChange('token')}
              required
            />
          </FormField>
          <FormField label="Nova senha" htmlFor="password" error={errors.password}>
            <input
              id="password"
              className="auth-input"
              type="password"
              value={formData.password}
              onChange={handleChange('password')}
              autoComplete="new-password"
              required
            />
          </FormField>
          {errors.form ? <p className="auth-error">{errors.form}</p> : null}
          <button className="primary-button" type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Salvando...' : 'Atualizar senha'}
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
