'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, type FormEvent } from 'react';

import { ApiClientError } from '../../lib/api-client';
import { accountSecurityApi } from '../../lib/account-security-api';
import { usersApi } from '../../lib/users-api';
import { useAuth } from '../auth/auth-provider';
import { AccountShell } from '../account/account-shell';
import { Button, buttonVariants } from '../ui/button';
import { Card } from '../ui/card';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';

type SecurityState = {
  error?: string;
  success?: string;
  busy: boolean;
};

type PasswordForm = {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};

const roleLabel: Record<string, string> = {
  ADMIN: 'ADMINISTRADOR',
  SELLER: 'VENDEDOR',
  USER: 'CLIENTE',
};

const roleTone: Record<string, 'success' | 'warning' | 'info' | 'danger' | 'neutral'> = {
  ADMIN: 'info',
  SELLER: 'success',
  USER: 'neutral',
};

export const AccountProfileContent = () => {
  const { user, loading, accessToken, logout, refresh } = useAuth();
  const router = useRouter();
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [state, setState] = useState<SecurityState>({ busy: false });
  const [upgradeState, setUpgradeState] = useState<SecurityState>({ busy: false });
  const [form, setForm] = useState<PasswordForm>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const initials = user?.email ? user.email.slice(0, 2).toUpperCase() : 'MC';

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

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
      setState({ busy: false, error: 'As senhas nao coincidem.' });
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
        success: 'Senha atualizada. Voce sera redirecionado para o login.',
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
            : 'Nao foi possivel atualizar a senha.';
      setState({ busy: false, error: message });
    }
  };

  const handleUpgradeSeller = async () => {
    if (!accessToken || upgradeState.busy) {
      return;
    }
    if (!window.confirm('Deseja ativar o perfil de vendedor?')) {
      return;
    }
    setUpgradeState({ busy: true, error: undefined, success: undefined });
    try {
      await usersApi.upgradeToSeller(accessToken);
      await refresh();
      setUpgradeState({ busy: false, success: 'Perfil atualizado para vendedor.' });
    } catch (error) {
      const message =
        error instanceof ApiClientError
          ? error.message
          : error instanceof Error
            ? error.message
            : 'Nao foi possivel atualizar o perfil.';
      setUpgradeState({ busy: false, error: message });
    }
  };

  if (loading) {
    return (
      <section className="bg-white px-6 py-12">
        <div className="mx-auto w-full max-w-[1200px] rounded-2xl border border-meow-red/20 bg-white px-6 py-4 text-sm text-meow-muted">
          Carregando sessao...
        </div>
      </section>
    );
  }

  if (!user) {
    return (
      <section className="bg-white px-6 py-12">
        <div className="mx-auto w-full max-w-[1200px] rounded-2xl border border-meow-red/20 bg-white px-6 py-6 text-center">
          <p className="text-sm text-meow-muted">Entre para acessar sua conta.</p>
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
        { label: 'Minha conta' },
      ]}
    >
      <div className="space-y-6">
        <Card className="rounded-3xl border border-slate-100 p-6 shadow-card">
          <div className="flex flex-wrap items-center justify-between gap-6">
            <div className="flex flex-wrap items-center gap-5">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-meow-cream text-2xl font-black text-meow-charcoal">
                {initials}
              </div>
              <div>
                <p className="text-lg font-bold text-meow-charcoal">{user.email}</p>
                <p className="text-xs text-slate-400">ID: {user.id}</p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <Badge variant={roleTone[user.role]}>{roleLabel[user.role]}</Badge>
                  <span className="text-xs text-slate-400">
                    Usuario: {user.email.split('@')[0]}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href="/conta"
                className={buttonVariants({ variant: 'secondary', size: 'sm' })}
              >
                Ver meu perfil
              </Link>
              <Link
                href={`/perfil/${user.id}`}
                className={buttonVariants({ variant: 'outline', size: 'sm' })}
              >
                Ver perfil publico
              </Link>
            </div>
          </div>
        </Card>

        {state.error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {state.error}
          </div>
        ) : null}
        {state.success ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {state.success}
          </div>
        ) : null}
        {upgradeState.error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {upgradeState.error}
          </div>
        ) : null}
        {upgradeState.success ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {upgradeState.success}
          </div>
        ) : null}

        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="rounded-2xl border border-slate-100 p-6 shadow-card">
            <div>
              <h2 className="text-lg font-black text-meow-charcoal">Dados de acesso</h2>
              <p className="mt-2 text-sm text-meow-muted">
                Atualize sua senha sempre que necessario.
              </p>
            </div>

            <form className="mt-6 grid gap-4" onSubmit={handleSubmit}>
              <label className="grid gap-1 text-xs font-semibold text-meow-muted">
                Usuario
                <Input
                  className="border-slate-200 bg-slate-50 text-sm text-meow-charcoal"
                  value={user.email.split('@')[0]}
                  readOnly
                />
              </label>
              <label className="grid gap-1 text-xs font-semibold text-meow-muted">
                Email
                <Input
                  className="border-slate-200 bg-slate-50 text-sm text-meow-charcoal"
                  value={user.email}
                  readOnly
                />
              </label>
              <label className="grid gap-1 text-xs font-semibold text-meow-muted">
                Senha atual
                <Input
                  className="border-slate-200 bg-white text-sm text-meow-charcoal"
                  type="password"
                  value={form.currentPassword}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, currentPassword: event.target.value }))
                  }
                  placeholder="Digite sua senha atual"
                />
              </label>
              <label className="grid gap-1 text-xs font-semibold text-meow-muted">
                Nova senha
                <Input
                  className="border-slate-200 bg-white text-sm text-meow-charcoal"
                  type="password"
                  value={form.newPassword}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, newPassword: event.target.value }))
                  }
                  placeholder="Nova senha"
                />
              </label>
              <label className="grid gap-1 text-xs font-semibold text-meow-muted">
                Confirmar senha
                <Input
                  className="border-slate-200 bg-white text-sm text-meow-charcoal"
                  type="password"
                  value={form.confirmPassword}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, confirmPassword: event.target.value }))
                  }
                  placeholder="Confirme a nova senha"
                />
              </label>

              <div className="flex justify-center pt-2">
                <Button type="submit" size="sm" disabled={state.busy}>
                  {state.busy ? 'Alterando...' : 'Alterar senha'}
                </Button>
              </div>
            </form>
          </Card>

          <Card className="rounded-2xl border border-slate-100 p-6 shadow-card">
            <h2 className="text-lg font-black text-meow-charcoal">Desativação</h2>
            <p className="mt-2 text-sm text-meow-muted">
              Para desativar ou excluir sua conta, vamos validar pedidos em andamento
              antes de concluir a solicitação.
            </p>
            <div className="mt-6 grid gap-3">
              <Button variant="secondary" type="button" disabled>
                Desativar conta
              </Button>
              <Button type="button" disabled>
                Excluir conta permanentemente
              </Button>
              <Link
                href="/conta/ajuda"
                className={buttonVariants({ variant: 'outline' })}
              >
                Falar com suporte
              </Link>
            </div>
          </Card>
          <Card className="rounded-2xl border border-slate-100 p-6 shadow-card">
            <h2 className="text-lg font-black text-meow-charcoal">Vender na plataforma</h2>
            <p className="mt-2 text-sm text-meow-muted">
              Ative seu perfil de vendedor para publicar anuncios e receber pagamentos.
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-3">
              {user.role === 'USER' ? (
                <Button
                  type="button"
                  size="sm"
                  onClick={handleUpgradeSeller}
                  disabled={upgradeState.busy}
                >
                  {upgradeState.busy ? 'Ativando...' : 'Quero vender'}
                </Button>
              ) : (
                <>
                  <Badge variant="success">Perfil de vendedor ativo</Badge>
                  <Link
                    href="/conta/anuncios"
                    className={buttonVariants({ variant: 'secondary', size: 'sm' })}
                  >
                    Criar anúncio
                  </Link>
                </>
              )}
            </div>
          </Card>

        </div>
      </div>
    </AccountShell>
  );
};
