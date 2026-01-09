'use client';

import Link from 'next/link';
import { CheckCircle } from 'lucide-react';

import { useAuth } from '../auth/auth-provider';
import { AccountShell } from '../account/account-shell';

export const AccountDataContent = () => {
  const { user, loading } = useAuth();

  const isVerified = user?.role === 'SELLER' || user?.role === 'ADMIN';

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
          <p className="text-sm text-meow-muted">Entre para acessar seus dados.</p>
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
        { label: 'Meus dados' },
      ]}
    >
      <div className="rounded-2xl border border-meow-red/20 bg-white p-6 shadow-[0_10px_24px_rgba(216,107,149,0.12)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-black text-meow-charcoal">Dados pessoais</h1>
            <p className="mt-2 text-sm text-meow-muted">
              Complete suas informacoes para agilizar compras e vendas.
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-full bg-meow-cream px-3 py-1 text-xs font-semibold text-meow-charcoal">
            {isVerified ? (
              <>
                <CheckCircle size={14} className="text-sky-500" />
                Verificado
              </>
            ) : (
              'Nao verificado'
            )}
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-[2fr_1fr_1fr]">
          <label className="grid gap-1 text-xs font-semibold text-meow-muted">
            Nome completo
            <input
              className="rounded-xl border border-meow-red/20 bg-white px-3 py-2 text-sm text-meow-charcoal"
              placeholder="Digite seu nome completo"
              disabled
            />
          </label>
          <label className="grid gap-1 text-xs font-semibold text-meow-muted">
            CPF
            <input
              className="rounded-xl border border-meow-red/20 bg-white px-3 py-2 text-sm text-meow-charcoal"
              placeholder="000.000.000-00"
              disabled
            />
          </label>
          <label className="grid gap-1 text-xs font-semibold text-meow-muted">
            Nascimento
            <input
              className="rounded-xl border border-meow-red/20 bg-white px-3 py-2 text-sm text-meow-charcoal"
              placeholder="00/00/0000"
              disabled
            />
          </label>
        </div>

        <div className="mt-8 border-t border-meow-red/10 pt-6">
          <h2 className="text-lg font-black text-meow-charcoal">Endereco</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <label className="grid gap-1 text-xs font-semibold text-meow-muted">
              CEP
              <input
                className="rounded-xl border border-meow-red/20 bg-white px-3 py-2 text-sm text-meow-charcoal"
                placeholder="00000-000"
                disabled
              />
            </label>
            <label className="grid gap-1 text-xs font-semibold text-meow-muted md:col-span-2">
              Endereco
              <input
                className="rounded-xl border border-meow-red/20 bg-white px-3 py-2 text-sm text-meow-charcoal"
                placeholder="Rua, avenida, etc"
                disabled
              />
            </label>
            <label className="grid gap-1 text-xs font-semibold text-meow-muted">
              Numero
              <input
                className="rounded-xl border border-meow-red/20 bg-white px-3 py-2 text-sm text-meow-charcoal"
                placeholder="Sem numero"
                disabled
              />
            </label>
            <label className="grid gap-1 text-xs font-semibold text-meow-muted">
              Complemento
              <input
                className="rounded-xl border border-meow-red/20 bg-white px-3 py-2 text-sm text-meow-charcoal"
                placeholder="Opcional"
                disabled
              />
            </label>
            <label className="grid gap-1 text-xs font-semibold text-meow-muted">
              Bairro
              <input
                className="rounded-xl border border-meow-red/20 bg-white px-3 py-2 text-sm text-meow-charcoal"
                placeholder="Seu bairro"
                disabled
              />
            </label>
            <label className="grid gap-1 text-xs font-semibold text-meow-muted">
              Cidade
              <input
                className="rounded-xl border border-meow-red/20 bg-white px-3 py-2 text-sm text-meow-charcoal"
                placeholder="Sua cidade"
                disabled
              />
            </label>
            <label className="grid gap-1 text-xs font-semibold text-meow-muted">
              Estado
              <input
                className="rounded-xl border border-meow-red/20 bg-white px-3 py-2 text-sm text-meow-charcoal"
                placeholder="UF"
                disabled
              />
            </label>
            <label className="grid gap-1 text-xs font-semibold text-meow-muted">
              Pais
              <input
                className="rounded-xl border border-meow-red/20 bg-white px-3 py-2 text-sm text-meow-charcoal"
                placeholder="Brasil"
                disabled
              />
            </label>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            className="rounded-full border border-meow-red/30 px-4 py-2 text-xs font-bold text-meow-deep"
            type="button"
            disabled
          >
            Salvar
          </button>
        </div>
      </div>
    </AccountShell>
  );
};
