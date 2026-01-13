'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type ChangeEvent, type FormEvent } from 'react';
import { z } from 'zod';

import { useAuth } from '../../../components/auth/auth-provider';
import { FormField } from '../../../components/forms/form-field';
import { Button, buttonVariants } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../../../components/ui/card';
import { AuthApiError } from '../../../lib/auth-api';
import { cn } from '../../../lib/utils';
import { mapZodErrors } from '../../../lib/zod-errors';

const schema = z.object({
  email: z.string().trim().email('Informe um e-mail valido.'),
  password: z.string().min(8, 'Senha deve ter ao menos 8 caracteres.'),
});

type FormState = z.infer<typeof schema>;

export default function Page() {
  const router = useRouter();
  const { login } = useAuth();
  const [formData, setFormData] = useState<FormState>({ email: '', password: '' });
  const [errors, setErrors] = useState<Partial<Record<keyof FormState | 'form', string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const nextPath = '/';
  const googleStartUrl = `/api/auth/google/start?next=${encodeURIComponent(nextPath)}`;
  const discordStartUrl = `/api/auth/discord/start?next=${encodeURIComponent(nextPath)}`;

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
      await login(result.data);
      router.push(nextPath);
    } catch (error) {
      if (error instanceof AuthApiError) {
        setErrors({ form: error.message });
      } else {
        setErrors({ form: 'Não foi possível autenticar. Tente novamente.' });
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
            Area restrita
          </span>
          <CardTitle className="text-2xl">Login</CardTitle>
          <CardDescription>
            Use seu e-mail cadastrado para continuar.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <Link
            href={googleStartUrl}
            className={cn(buttonVariants({ variant: 'secondary' }), 'w-full')}
          >
            Continuar com Google
          </Link>
          <Link
            href={discordStartUrl}
            className={cn(buttonVariants({ variant: 'secondary' }), 'w-full')}
          >
            Continuar com Discord
          </Link>
          <div className="flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.24em] text-meow-deep/50">
            <span className="h-px flex-1 bg-meow-red/20" />
            ou
            <span className="h-px flex-1 bg-meow-red/20" />
          </div>
          <form className="grid gap-4" onSubmit={handleSubmit}>
            <FormField label="E-mail" htmlFor="email" error={errors.email}>
              <Input
                id="email"
                className="border-meow-red/30 bg-meow-cream/60"
                type="email"
                value={formData.email}
                onChange={handleChange('email')}
                autoComplete="email"
                required
              />
            </FormField>
            <FormField label="Senha" htmlFor="password" error={errors.password}>
              <Input
                id="password"
                className="border-meow-red/30 bg-meow-cream/60"
                type="password"
                value={formData.password}
                onChange={handleChange('password')}
                autoComplete="current-password"
                required
              />
            </FormField>
            {errors.form ? (
              <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-xs font-semibold text-red-700">
                {errors.form}
              </p>
            ) : null}
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Entrando...' : 'Entrar'}
            </Button>
            <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
              <Link className="font-semibold text-meow-deep hover:underline" href="/forgot">
                Esqueci minha senha
              </Link>
              <Link className="font-semibold text-meow-deep hover:underline" href="/register">
                Criar conta
              </Link>
            </div>
          </form>
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-full border border-meow-red/30 px-5 py-2 text-sm font-bold text-meow-deep transition hover:bg-meow-cream"
          >
            Voltar para home
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
