'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { ApiClientError } from '../../lib/api-client';
import { walletApi, type WalletSummary } from '../../lib/wallet-api';
import { useAuth } from '../auth/auth-provider';
import { AccountShell } from '../account/account-shell';

type SummaryState = {
  status: 'loading' | 'ready';
  summary: WalletSummary | null;
  error?: string;
};

const formatCurrency = (value: number, currency = 'BRL') =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(value / 100);

export const AccountOverviewContent = () => {
  const { user, accessToken, loading } = useAuth();
  const [summaryState, setSummaryState] = useState<SummaryState>({
    status: 'loading',
    summary: null,
  });

  useEffect(() => {
    if (!accessToken) {
      return;
    }
    let active = true;
    const loadSummary = async () => {
      try {
        const summary = await walletApi.getSummary(accessToken);
        if (!active) {
          return;
        }
        setSummaryState({ status: 'ready', summary });
      } catch (error) {
        if (!active) {
          return;
        }
        const message =
          error instanceof ApiClientError
            ? error.message
            : 'Nao foi possivel carregar sua carteira.';
        setSummaryState({ status: 'ready', summary: null, error: message });
      }
    };
    loadSummary();
    return () => {
      active = false;
    };
  }, [accessToken]);

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
        { label: 'Conta' },
      ]}
    >
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-meow-red/20 bg-white p-5 shadow-[0_10px_24px_rgba(216,107,149,0.12)]">
          <p className="text-xs font-semibold uppercase tracking-[0.4px] text-meow-muted">
            Saldo a liberar
          </p>
          <p className="mt-2 text-2xl font-black text-meow-charcoal">
            {formatCurrency(summaryState.summary?.heldCents ?? 0)}
          </p>
        </div>
        <div className="rounded-2xl border border-meow-red/20 bg-white p-5 shadow-[0_10px_24px_rgba(216,107,149,0.12)]">
          <p className="text-xs font-semibold uppercase tracking-[0.4px] text-meow-muted">
            Saldo bloqueado
          </p>
          <p className="mt-2 text-2xl font-black text-meow-charcoal">
            {formatCurrency(summaryState.summary?.reversedCents ?? 0)}
          </p>
        </div>
        <div className="rounded-2xl border border-meow-red/20 bg-white p-5 shadow-[0_10px_24px_rgba(216,107,149,0.12)]">
          <p className="text-xs font-semibold uppercase tracking-[0.4px] text-meow-muted">
            Saldo disponivel
          </p>
          <p className="mt-2 text-2xl font-black text-meow-charcoal">
            {formatCurrency(summaryState.summary?.availableCents ?? 0)}
          </p>
          <Link
            href="/conta/carteira/extrato"
            className="mt-3 inline-flex rounded-full border border-meow-red/30 px-3 py-1 text-[11px] font-bold text-meow-deep"
          >
            Ver transacoes
          </Link>
        </div>
      </div>

      {summaryState.error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {summaryState.error}
        </div>
      ) : null}

      <div className="rounded-2xl border border-meow-red/20 bg-white p-6 shadow-[0_10px_24px_rgba(216,107,149,0.12)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-black text-meow-charcoal">
              Ola, {user.email}
            </h1>
            <p className="mt-2 text-sm text-meow-muted">
              Aqui voce acompanha pedidos, anuncios e sua carteira.
            </p>
          </div>
          <Link
            href="/conta/minha-conta"
            className="rounded-full bg-meow-linear px-4 py-2 text-xs font-bold text-white"
          >
            Ver meu perfil
          </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-meow-red/20 bg-meow-cream/50 p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.4px] text-meow-muted">
            Minhas compras
          </p>
          <p className="mt-2 text-sm text-meow-charcoal">
            Acompanhe entregas e pagamentos pendentes.
          </p>
          <Link
            href="/conta/pedidos"
            className="mt-4 inline-flex rounded-full bg-meow-linear px-4 py-2 text-xs font-bold text-white"
          >
            Ver compras
          </Link>
        </div>
        <div className="rounded-2xl border border-meow-red/20 bg-meow-cream/50 p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.4px] text-meow-muted">
            Meus anuncios
          </p>
          <p className="mt-2 text-sm text-meow-charcoal">
            Gerencie anuncios ativos e pendentes.
          </p>
          <Link
            href="/conta/anuncios"
            className="mt-4 inline-flex rounded-full border border-meow-red/30 px-4 py-2 text-xs font-bold text-meow-deep"
          >
            Ver anuncios
          </Link>
        </div>
      </div>
    </AccountShell>
  );
};
