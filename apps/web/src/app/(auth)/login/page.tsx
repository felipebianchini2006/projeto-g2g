'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useState, type ChangeEvent, type FormEvent } from 'react';
import { z } from 'zod';
import { Mail, Lock, Eye, EyeOff, X } from 'lucide-react';

import { useAuth } from '../../../components/auth/auth-provider';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
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
});

type FormState = z.infer<typeof schema>;

export default function Page() {
  const router = useRouter();
  const { login, verifyMfa } = useAuth();
  const [formData, setFormData] = useState<FormState>({ email: '', password: '' });
  const [errors, setErrors] = useState<Partial<Record<keyof FormState | 'form', string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [mfaChallengeId, setMfaChallengeId] = useState<string | null>(null);
  const [mfaCode, setMfaCode] = useState('');
  const [isResending, setIsResending] = useState(false);

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
      const response = await login(result.data);
      if ('mfaRequired' in response) {
        setMfaChallengeId(response.challengeId);
        return;
      }
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

  const handleMfaSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrors({});
    if (!mfaChallengeId) {
      return;
    }
    if (!mfaCode || mfaCode.trim().length !== 6) {
      setErrors({ form: 'Informe o código de 6 dígitos enviado ao seu e-mail.' });
      return;
    }

    setIsSubmitting(true);
    try {
      await verifyMfa({ challengeId: mfaChallengeId, code: mfaCode.trim() });
      router.push(nextPath);
    } catch (error) {
      if (error instanceof AuthApiError) {
        setErrors({ form: error.message });
      } else {
        setErrors({ form: 'Não foi possível verificar o código. Tente novamente.' });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMfaResend = async () => {
    if (isSubmitting || isResending) {
      return;
    }
    setErrors({});
    setIsResending(true);
    try {
      const response = await login({ email: formData.email, password: formData.password });
      if ('mfaRequired' in response) {
        setMfaChallengeId(response.challengeId);
        setMfaCode('');
        return;
      }
      router.push(nextPath);
    } catch (error) {
      if (error instanceof AuthApiError) {
        setErrors({ form: error.message });
      } else {
        setErrors({ form: 'Não foi possível reenviar o código. Tente novamente.' });
      }
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50/50 p-4">
      <Card className="relative w-full max-w-[420px] rounded-[32px] border-none bg-white shadow-[0_20px_40px_-10px_rgba(0,0,0,0.1)]">
        <button
          onClick={() => router.push('/')}
          className="absolute right-5 top-5 flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition hover:bg-slate-200"
        >
          <X size={18} />
        </button>

        <CardHeader className="flex flex-col items-center pb-2 pt-10 text-center">
          <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-pink-400 to-rose-500 shadow-lg shadow-pink-500/30">
            <Image
              src="/assets/meoow/cat-02.png"
              alt="Meoww"
              width={40}
              height={40}
              className="object-contain brightness-0 invert"
            />
          </div>
          <CardTitle className="text-2xl font-black text-slate-800">
            Entrar na Meoww
          </CardTitle>
          <CardDescription className="text-base font-medium text-slate-500">
            Acesse sua conta para comprar e vender.
          </CardDescription>
        </CardHeader>

        <CardContent className="grid gap-5 px-8 pb-10">
          <div className="grid gap-3">
            <Button
              variant="outline"
              className="relative flex h-12 w-full items-center justify-center gap-3 rounded-xl border-slate-200 bg-white font-bold text-slate-700 hover:bg-slate-50"
              onClick={() => router.push(googleStartUrl)}
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.24.81-.6z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              Continuar com Google
            </Button>

            <Button
              className="relative flex h-12 w-full items-center justify-center gap-3 rounded-xl bg-[#5865F2] font-bold text-white hover:bg-[#4752C4]"
              onClick={() => router.push(discordStartUrl)}
            >
              <svg className="h-5 w-5 fill-current" viewBox="0 -28.5 256 256">
                <path d="M216.856339,16.5966031 C200.285002,8.84328665 182.566144,3.2084988 163.911404,0 C161.766523,4.11318106 159.108624,9.64549348 157.301554,13.910427 C137.940421,11.0049831 118.002942,11.0049831 99.0063074,13.910427 C97.2217296,9.64549348 94.5139546,4.11318106 92.2844575,0 C73.5550009,3.2084988 55.7754132,8.84328665 39.049356,16.5966031 C5.29055424,67.0913055 -3.81232822,116.764515 8.3582315,164.711516 C29.4975549,180.334759 49.9577749,189.756263 69.8519639,195.828552 C74.8817346,189.027038 79.4452175,181.82193 83.3364966,174.226877 C76.0694156,171.519097 69.052613,168.082989 62.4093933,164.093153 C64.1956101,162.779198 65.9127813,161.402283 67.5753905,159.959952 C107.031575,178.070624 150.045051,178.070624 188.940407,159.959952 C190.640192,161.402283 192.357158,162.779198 194.09756,164.093153 C187.498867,168.082989 180.526279,171.519097 173.204558,174.226877 C177.129379,181.82193 181.716174,189.027038 186.74412,195.828552 C206.638309,189.756263 227.098864,180.334759 248.216688,164.711516 C261.64213,113.896796 248.69467,65.3468897 216.856339,16.5966031 V16.5966031 Z M85.4738752,135.09489 C72.8290281,135.09489 62.4592217,123.290155 62.4592217,108.914901 C62.4592217,94.5396472 72.607595,82.714576 85.4738752,82.714576 C98.5595357,82.714576 108.930419,94.5396472 108.706731,108.914901 C108.706731,123.290155 98.4553258,135.09489 85.4738752,135.09489 V135.09489 Z M170.525237,135.09489 C157.88039,135.09489 147.510584,123.290155 147.510584,108.914901 C147.510584,94.5396472 157.658957,82.714576 170.525237,82.714576 C183.610897,82.714576 193.98178,94.5396472 193.758092,108.914901 C193.758092,123.290155 183.506687,135.09489 170.525237,135.09489 V135.09489 Z" />
              </svg>
              Continuar com Discord
            </Button>
          </div>

          <div className="flex items-center gap-4 py-1">
            <div className="h-px flex-1 bg-slate-200" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
              Ou entre com e-mail
            </span>
            <div className="h-px flex-1 bg-slate-200" />
          </div>

          <form className="grid gap-5" onSubmit={mfaChallengeId ? handleMfaSubmit : handleSubmit}>
            <div className="space-y-1.5">
              <label htmlFor="email" className="ml-1 text-xs font-bold uppercase tracking-wide text-slate-500">
                E-mail
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <Input
                  id="email"
                  className="h-12 rounded-xl border-slate-200 bg-slate-50 pl-12 font-medium text-slate-900 transition-all focus:bg-white focus:ring-4 focus:ring-meow-red/10"
                  type="email"
                  placeholder="seu@email.com"
                  value={formData.email}
                  onChange={handleChange('email')}
                  autoComplete="email"
                  required
                  disabled={Boolean(mfaChallengeId)}
                />
              </div>
              {errors.email && <p className="ml-1 text-xs font-semibold text-red-500">{errors.email}</p>}
            </div>

            <div className="space-y-1.5">
              <label htmlFor="password" className="ml-1 text-xs font-bold uppercase tracking-wide text-slate-500">
                Senha
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <Input
                  id="password"
                  className="h-12 rounded-xl border-slate-200 bg-slate-50 pl-12 pr-12 font-medium text-slate-900 transition-all focus:bg-white focus:ring-4 focus:ring-meow-primary/10"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={handleChange('password')}
                  autoComplete="current-password"
                  required
                  disabled={Boolean(mfaChallengeId)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-600"
                  disabled={Boolean(mfaChallengeId)}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              {errors.password && <p className="ml-1 text-xs font-semibold text-red-500">{errors.password}</p>}
            </div>

            {mfaChallengeId ? (
              <div className="space-y-1.5">
                <label htmlFor="mfa-code" className="ml-1 text-xs font-bold uppercase tracking-wide text-slate-500">
                  Código de verificação
                </label>
                <Input
                  id="mfa-code"
                  className="h-12 rounded-xl border-slate-200 bg-slate-50 text-center text-lg font-semibold tracking-[0.3em] text-slate-900"
                  placeholder="000000"
                  inputMode="numeric"
                  maxLength={6}
                  value={mfaCode}
                  onChange={(event) => setMfaCode(event.target.value.replace(/\\s/g, ''))}
                  required
                />
                <p className="ml-1 text-xs text-slate-500">
                  Enviamos um código para seu e-mail. Ele expira em 10 minutos.
                </p>
                <button
                  type="button"
                  onClick={handleMfaResend}
                  disabled={isSubmitting || isResending}
                  className="ml-1 text-xs font-semibold text-pink-500 hover:text-pink-600 disabled:cursor-not-allowed disabled:text-slate-400"
                >
                  {isResending ? 'Reenviando c?digo...' : 'Reenviar c?digo'}
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    className="h-5 w-5 rounded border-slate-300 text-pink-500 focus:ring-pink-500/20"
                  />
                  <span className="text-sm font-semibold text-slate-600">Lembrar de mim</span>
                </label>
                <Link
                  href="/forgot"
                  className="text-sm font-bold text-pink-500 hover:underline hover:text-pink-600"
                >
                  Esqueceu a senha?
                </Link>
              </div>
            )}

            {errors.form && (
              <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                {errors.form}
              </p>
            )}

            <Button
              type="submit"
              disabled={isSubmitting}
              className="h-12 w-full rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 text-lg font-bold text-white shadow-lg shadow-pink-500/25 transition-all hover:opacity-90 hover:shadow-pink-500/40"
            >
              {isSubmitting ? 'Entrando...' : mfaChallengeId ? 'Confirmar código' : 'Entrar na Conta'}
            </Button>

            {mfaChallengeId && (
              <button
                type="button"
                className="text-sm font-semibold text-slate-500 hover:text-slate-700"
                onClick={() => {
                  setMfaChallengeId(null);
                  setMfaCode('');
                }}
              >
                Voltar para login
              </button>
            )}
          </form>

          <div className="mt-2 border-t border-slate-100 pt-6 text-center text-sm font-semibold text-slate-600">
            Não tem uma conta?{' '}
            <Link href="/register" className="font-bold text-pink-500 hover:underline">
              Cadastre-se
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
