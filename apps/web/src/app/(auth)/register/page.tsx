'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type ChangeEvent, type FormEvent } from 'react';
import { z } from 'zod';

import { useAuth } from '../../../components/auth/auth-provider';
import { FormField } from '../../../components/forms/form-field';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Select } from '../../../components/ui/select';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../../../components/ui/card';
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
  const [formData, setFormData] = useState<FormState>({
    email: '',
    password: '',
    role: 'USER',
  });
  const [errors, setErrors] = useState<Partial<Record<keyof FormState | 'form', string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const nextPath = '/';

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
    <div className="flex min-h-screen items-center justify-center bg-meow-gradient px-6 py-16">
      <Card className="w-full max-w-md">
        <CardHeader className="items-start">
          <span className="text-xs font-black uppercase tracking-[0.6px] text-meow-deep">
            Nova conta
          </span>
          <CardTitle className="text-2xl">Cadastro</CardTitle>
          <CardDescription>Crie sua conta para acessar a plataforma.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
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
                autoComplete="new-password"
                required
              />
            </FormField>
            <FormField label="Perfil" htmlFor="role" error={errors.role}>
              <Select
                id="role"
                className="border-meow-red/30 bg-meow-cream/60"
                value={formData.role}
                onChange={handleChange('role')}
              >
                <option value="USER">Comprador</option>
                <option value="SELLER">Vendedor</option>
              </Select>
            </FormField>
            {errors.form ? (
              <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-xs font-semibold text-red-700">
                {errors.form}
              </p>
            ) : null}
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Criando...' : 'Criar conta'}
            </Button>
            <div className="flex items-center justify-between text-sm">
              <Link className="font-semibold text-meow-deep hover:underline" href="/login">
                Ja tenho conta
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
