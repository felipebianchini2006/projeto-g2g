'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, type ChangeEvent, type FormEvent } from 'react';
import { z } from 'zod';

import { useAuth } from '../../../components/auth/auth-provider';
import { FormField } from '../../../components/forms/form-field';
import { AuthApiError } from '../../../lib/auth-api';
import { mapZodErrors } from '../../../lib/zod-errors';

const schema = z.object({
  email: z.string().trim().email('Informe um e-mail valido.'),
  password: z.string().min(8, 'Senha deve ter ao menos 8 caracteres.'),
  role: z.enum(['USER', 'SELLER'], { required_error: 'Selecione um perfil.' }),
});

type FormState = z.infer<typeof schema>;

export default function Page() {
  const { register } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [formData, setFormData] = useState<FormState>({
    email: '',
    password: '',
    role: 'USER',
  });
  const [errors, setErrors] = useState<Partial<Record<keyof FormState | 'form', string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const rawNextPath = searchParams.get('next') ?? '/dashboard';
  const nextPath = rawNextPath.startsWith('/') ? rawNextPath : '/dashboard';

  const handleChange =
    (field: keyof FormState) =>
    (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
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
      await register(result.data);
      router.push(nextPath);
    } catch (error) {
      if (error instanceof AuthApiError) {
        setErrors({ form: error.message });
      } else {
        setErrors({ form: 'Nao foi possivel criar a conta. Tente novamente.' });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <span className="auth-kicker">Nova conta</span>
        <h1>Cadastro</h1>
        <p>Crie sua conta para acessar o dashboard.</p>
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
          <FormField label="Senha" htmlFor="password" error={errors.password}>
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
          <FormField label="Perfil" htmlFor="role" error={errors.role}>
            <select id="role" className="auth-input" value={formData.role} onChange={handleChange('role')}>
              <option value="USER">Comprador</option>
              <option value="SELLER">Vendedor</option>
            </select>
          </FormField>
          {errors.form ? <p className="auth-error">{errors.form}</p> : null}
          <button className="primary-button" type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Criando...' : 'Criar conta'}
          </button>
          <div className="auth-footer">
            <Link className="auth-link" href="/login">
              Ja tenho conta
            </Link>
          </div>
        </form>
        <Link className="ghost-button" href="/">
          Voltar para home
        </Link>
      </div>
    </div>
  );
}
