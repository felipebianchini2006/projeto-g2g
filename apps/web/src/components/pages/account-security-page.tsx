'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, type FormEvent } from 'react';

import { ApiClientError } from '../../lib/api-client';
import { accountSecurityApi } from '../../lib/account-security-api';
import { useAuth } from '../auth/auth-provider';
import { AccountShell } from '../account/account-shell';
import { Skeleton } from '../ui/skeleton';
import { Toggle } from '../ui/toggle';

type SecurityState = {
  error?: string;
  success?: string;
  busy: boolean;
};

type FormState = {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};

export const AccountSecurityContent = () => {
  const { user, accessToken, loading, logout, refresh } = useAuth();
  const router = useRouter();
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [state, setState] = useState<SecurityState>({ busy: false });
  const [mfaState, setMfaState] = useState<{ busy: boolean; error?: string; success?: string }>({
    busy: false,
  });
  const [mfaChallengeId, setMfaChallengeId] = useState<string | null>(null);
  const [mfaCode, setMfaCode] = useState('');
  const [form, setForm] = useState<FormState>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (user?.mfaEnabled) {
      setMfaChallengeId(null);
      setMfaCode('');
    }
  }, [user?.mfaEnabled]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!accessToken || state.busy) {
      return;
    }
    if (!form.currentPassword || !form.newPassword) {
      setState({ busy: false, error: 'Preencha a senha atual e a nova senha.' });
      return;
    }
    if (form.newPassword.length < 8) {
      setState({ busy: false, error: 'A nova senha deve ter pelo menos 8 caracteres.' });
      return;
    }
    if (form.newPassword !== form.confirmPassword) {
      setState({ busy: false, error: 'As senhas não coincidem.' });
      return;
    }

    setState({ busy: true, error: undefined, success: undefined });
    try {
      await accountSecurityApi.changePassword(accessToken, {
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
      });
      setForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setState({
        busy: false,
        success: 'Senha atualizada. Você será redirecionado para o login.',
      });
      timeoutRef.current = setTimeout(async () => {
        await logout();
        router.push('/login');
      }, 1500);
    } catch (error) {
      const message =
        error instanceof ApiClientError
          ? error.message
          : error instanceof Error
            ? error.message
            : 'Não foi possível atualizar a senha.';
      setState({ busy: false, error: message });
    }
  };

  const handleMfaToggle = async () => {
    if (!accessToken || mfaState.busy || user?.mfaEnabled) {
      return;
    }
    setMfaState({ busy: true });
    try {
      const response = await accountSecurityApi.requestMfaEnable(accessToken);
      setMfaChallengeId(response.challengeId);
      setMfaState({
        busy: false,
        success: 'Enviamos um código de verificação para o seu e-mail.',
      });
    } catch (error) {
      const message =
        error instanceof ApiClientError
          ? error.message
          : error instanceof Error
            ? error.message
            : 'Não foi possível iniciar a verificação MFA.';
      setMfaState({ busy: false, error: message });
    }
  };

  const handleMfaConfirm = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!accessToken || !mfaChallengeId || mfaState.busy) {
      return;
    }
    if (!mfaCode || mfaCode.trim().length !== 6) {
      setMfaState({ busy: false, error: 'Informe o código de 6 dígitos enviado ao seu e-mail.' });
      return;
    }

    setMfaState({ busy: true });
    try {
      await accountSecurityApi.confirmMfaEnable(accessToken, {
        challengeId: mfaChallengeId,
        code: mfaCode.trim(),
      });
      setMfaCode('');
      setMfaChallengeId(null);
      await refresh();
      setMfaState({ busy: false, success: 'MFA ativado com sucesso.' });
    } catch (error) {
      const message =
        error instanceof ApiClientError
          ? error.message
          : error instanceof Error
            ? error.message
            : 'Não foi possível confirmar o código MFA.';
      setMfaState({ busy: false, error: message });
    }
  };

  if (loading) {
    return (
      <section className="bg-white px-6 py-12">
        <div className="mx-auto w-full max-w-[1200px]">
          <Skeleton className="h-24 w-full" />
        </div>
      </section>
    );
  }

  if (!user) {
    return (
      <section className="bg-white px-6 py-12">
        <div className="mx-auto w-full max-w-[1200px] rounded-2xl border border-meow-red/20 bg-white px-6 py-6 text-center">
          <p className="text-sm text-meow-muted">Entre para acessar a segurança da conta.</p>
          <Link
            href="/login"
            className="mt-4 inline-flex rounded-full bg-meow-linear px-6 py-2 text-sm font-bold text-white"
          >
            Fazer login
          </Link>
        </div>
      </section>
    );
  }

  return (
    <AccountShell
      breadcrumbs={[
        { label: 'Inicio', href: '/' },
        { label: 'Conta', href: '/conta' },
        { label: 'Segurança' },
      ]}
    >
      <div className="rounded-2xl border border-meow-red/20 bg-white p-6 shadow-[0_10px_24px_rgba(216,107,149,0.12)]">
        <div>
          <h1 className="text-xl font-black text-meow-charcoal">Segurança</h1>
          <p className="mt-2 text-sm text-meow-muted">
            Atualize sua senha para manter sua conta segura.
          </p>
        </div>

        <div className="mt-6 rounded-2xl border border-meow-red/20 bg-meow-ice px-5 py-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-sm font-bold text-meow-charcoal">Verificação por IP</h2>
              <p className="mt-1 text-xs text-meow-muted">
                Confirme novos acessos por e-mail. Revalidação obrigatória a cada 21 dias.
              </p>
              {user.mfaEnabled ? (
                <p className="mt-2 text-xs font-semibold text-emerald-600">
                  Ativo. Última verificação:{' '}
                  {user.mfaLastVerifiedAt
                    ? new Date(user.mfaLastVerifiedAt).toLocaleString('pt-BR')
                    : 'Não informada'}
                </p>
              ) : (
                <p className="mt-2 text-xs font-semibold text-meow-deep">Desativado</p>
              )}
            </div>
            <Toggle
              checked={Boolean(user.mfaEnabled || mfaChallengeId)}
              disabled={mfaState.busy || Boolean(user.mfaEnabled || mfaChallengeId)}
              onCheckedChange={handleMfaToggle}
            />
          </div>

          {mfaState.error ? (
            <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700">
              {mfaState.error}
            </div>
          ) : null}
          {mfaState.success ? (
            <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs text-emerald-700">
              {mfaState.success}
            </div>
          ) : null}

          {mfaChallengeId && !user.mfaEnabled ? (
            <form onSubmit={handleMfaConfirm} className="mt-4 grid gap-3">
              <label className="grid gap-1 text-xs font-semibold text-meow-muted">
                Código recebido por e-mail
                <input
                  className="rounded-xl border border-meow-red/20 bg-white px-3 py-2 text-center text-sm font-semibold tracking-[0.3em] text-meow-charcoal"
                  value={mfaCode}
                  onChange={(event) => setMfaCode(event.target.value.replace(/\\s/g, ''))}
                  maxLength={6}
                  inputMode="numeric"
                  placeholder="000000"
                />
              </label>
              <button
                type="submit"
                className="w-fit rounded-full bg-meow-linear px-6 py-2 text-xs font-bold text-white"
                disabled={mfaState.busy}
              >
                {mfaState.busy ? 'Confirmando...' : 'Confirmar código'}
              </button>
            </form>
          ) : null}
        </div>

        {state.error ? (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {state.error}
          </div>
        ) : null}
        {state.success ? (
          <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {state.success}
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="mt-6 grid gap-4">
          <label className="grid gap-1 text-xs font-semibold text-meow-muted">
            Senha atual
            <input
              className="rounded-xl border border-meow-red/20 bg-white px-3 py-2 text-sm text-meow-charcoal"
              type="password"
              value={form.currentPassword}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, currentPassword: event.target.value }))
              }
            />
          </label>
          <label className="grid gap-1 text-xs font-semibold text-meow-muted">
            Nova senha
            <input
              className="rounded-xl border border-meow-red/20 bg-white px-3 py-2 text-sm text-meow-charcoal"
              type="password"
              value={form.newPassword}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, newPassword: event.target.value }))
              }
            />
          </label>
          <label className="grid gap-1 text-xs font-semibold text-meow-muted">
            Confirmar nova senha
            <input
              className="rounded-xl border border-meow-red/20 bg-white px-3 py-2 text-sm text-meow-charcoal"
              type="password"
              value={form.confirmPassword}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, confirmPassword: event.target.value }))
              }
            />
          </label>

          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              className="rounded-full bg-meow-linear px-6 py-2 text-xs font-bold text-white"
              disabled={state.busy}
            >
              {state.busy ? 'Atualizando...' : 'Atualizar senha'}
            </button>
            <Link
              href="/conta"
              className="rounded-full border border-meow-red/30 px-4 py-2 text-xs font-bold text-meow-deep"
            >
              Voltar
            </Link>
          </div>
        </form>
      </div>
    </AccountShell>
  );
};
