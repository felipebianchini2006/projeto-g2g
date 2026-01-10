'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react';
import { z } from 'zod';

import { FormField } from '../../../components/forms/form-field';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
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
    <div className="flex min-h-screen items-center justify-center bg-meow-gradient px-6 py-16">
      <Card className="w-full max-w-md">
        <CardHeader className="items-start">
          <span className="text-xs font-black uppercase tracking-[0.6px] text-meow-deep">
            Nova senha
          </span>
          <CardTitle className="text-2xl">Reset de senha</CardTitle>
          <CardDescription>
            Informe o token recebido e defina sua nova senha.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <form className="grid gap-4" onSubmit={handleSubmit}>
            <FormField label="Token" htmlFor="token" error={errors.token}>
              <Input
                id="token"
                className="border-meow-red/30 bg-meow-cream/60"
                type="text"
                value={formData.token}
                onChange={handleChange('token')}
                required
              />
            </FormField>
            <FormField label="Nova senha" htmlFor="password" error={errors.password}>
              <Input
                id="password"
                className="border-meow-red/30 bg-meow-cream/60"
                type="password"
                value={formData.password}
                onChange={handleChange('password')}
                autoComplete="new-password"
                required
              />
            </FormField>
            {errors.form ? (
              <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-xs font-semibold text-red-700">
                {errors.form}
              </p>
            ) : null}
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Salvando...' : 'Atualizar senha'}
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
