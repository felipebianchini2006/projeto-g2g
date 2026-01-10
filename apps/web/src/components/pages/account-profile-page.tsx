'use client';

import Link from 'next/link';

import { useAuth } from '../auth/auth-provider';
import { AccountShell } from '../account/account-shell';

export const AccountProfileContent = () => {
  const { user, loading } = useAuth();

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
      <div className="rounded-2xl border border-meow-red/20 bg-white p-6 shadow-[0_10px_24px_rgba(216,107,149,0.12)]">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-meow-cream text-sm font-bold text-meow-charcoal">
              {user.email.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-semibold text-meow-charcoal">{user.email}</p>
              <Link href="/conta" className="text-xs font-semibold text-meow-deep">
                Ver meu perfil
              </Link>
            </div>
          </div>
          <div className="text-xs text-meow-muted">ID: {user.id.slice(0, 8)}</div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <label className="grid gap-1 text-xs font-semibold text-meow-muted">
            Usuario
            <input
              className="rounded-xl border border-meow-red/20 bg-meow-cream/50 px-3 py-2 text-sm text-meow-charcoal"
              value={user.email.split('@')[0]}
              readOnly
            />
          </label>
          <label className="grid gap-1 text-xs font-semibold text-meow-muted">
            Email
            <input
              className="rounded-xl border border-meow-red/20 bg-meow-cream/50 px-3 py-2 text-sm text-meow-charcoal"
              value={user.email}
              readOnly
            />
          </label>
          <label className="grid gap-1 text-xs font-semibold text-meow-muted">
            Senha
            <input
              className="rounded-xl border border-meow-red/20 bg-white px-3 py-2 text-sm text-meow-charcoal"
              type="password"
              placeholder="Nova senha"
              disabled
            />
          </label>
          <label className="grid gap-1 text-xs font-semibold text-meow-muted">
            Confirme a senha
            <input
              className="rounded-xl border border-meow-red/20 bg-white px-3 py-2 text-sm text-meow-charcoal"
              type="password"
              placeholder="Confirme a nova senha"
              disabled
            />
          </label>
        </div>

        <div className="mt-4 flex justify-end">
          <Link
            href="/conta/seguranca"
            className="rounded-full border border-meow-red/30 px-4 py-2 text-xs font-bold text-meow-deep"
          >
            Alterar senha
          </Link>
        </div>

        <div className="mt-8 rounded-2xl border border-meow-red/20 bg-meow-cream/40 px-5 py-4">
          <h2 className="text-base font-bold text-meow-charcoal">Desativacao de conta</h2>
          <p className="mt-2 text-sm text-meow-muted">
            Para desativar ou excluir sua conta, fale com o suporte. Vamos validar pedidos em
            andamento antes de finalizar a solicitacao.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              className="rounded-full border border-meow-red/30 px-4 py-2 text-xs font-bold text-meow-deep"
              type="button"
              disabled
            >
              Desativar conta
            </button>
            <button
              className="rounded-full border border-red-300 px-4 py-2 text-xs font-bold text-red-600"
              type="button"
              disabled
            >
              Excluir conta
            </button>
            <Link
              href="/conta/ajuda"
              className="rounded-full bg-meow-linear px-4 py-2 text-xs font-bold text-white"
            >
              Falar com suporte
            </Link>
          </div>
        </div>
      </div>
    </AccountShell>
  );
};
