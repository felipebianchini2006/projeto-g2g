'use client';

import Link from 'next/link';
import { useState, type ChangeEvent, type FormEvent } from 'react';
import { z } from 'zod';

import { FormField } from '../../../components/forms/form-field';
import { Button } from '../../../components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../../../components/ui/card';
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
    <div className="flex min-h-screen items-center justify-center bg-meow-gradient px-6 py-16">
      <Card className="w-full max-w-md">
        <CardHeader className="items-start">
          <span className="text-xs font-black uppercase tracking-[0.6px] text-meow-deep">
            Recuperacao
          </span>
          <CardTitle className="text-2xl">Esqueci minha senha</CardTitle>
          <CardDescription>
            Informe seu e-mail para receber instrucoes.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <form className="grid gap-4" onSubmit={handleSubmit}>
            <FormField label="E-mail" htmlFor="email" error={errors.email}>
              <input
                id="email"
                className="rounded-xl border border-meow-red/30 bg-meow-cream/60 px-4 py-3 text-sm text-meow-charcoal outline-none transition focus:border-meow-deep/50"
                type="email"
                value={formData.email}
                onChange={handleChange('email')}
                autoComplete="email"
                required
              />
            </FormField>
            {errors.form ? (
              <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-xs font-semibold text-red-700">
                {errors.form}
              </p>
            ) : null}
            {successMessage ? (
              <p className="rounded-xl border border-meow-red/20 bg-meow-cream/60 px-4 py-2 text-xs font-semibold text-meow-muted">
                {successMessage}
              </p>
            ) : null}
            {resetToken ? (
              <Link
                className="text-sm font-semibold text-meow-deep hover:underline"
                href={`/reset?token=${resetToken}`}
              >
                Ir para reset com token
              </Link>
            ) : null}
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Enviando...' : 'Enviar reset'}
            </Button>
            <div className="flex items-center justify-between text-sm">
              <Link className="font-semibold text-meow-deep hover:underline" href="/login">
                Voltar para login
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
