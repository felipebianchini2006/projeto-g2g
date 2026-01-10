'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

import { ApiClientError } from '../../lib/api-client';
import { walletApi, type WalletSummary } from '../../lib/wallet-api';
import { useAuth } from '../auth/auth-provider';
import { AccountShell } from '../account/account-shell';
import { Button } from '../ui/button';
import { Card } from '../ui/card';

const formatCurrency = (value: number, currency = 'BRL') =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(value / 100);

type WalletState = {
  status: 'loading' | 'ready';
  summary: WalletSummary | null;
  error?: string;
};

export const WalletSummaryContent = () => {
  const { user, accessToken, loading } = useAuth();
  const [state, setState] = useState<WalletState>({
    status: 'loading',
    summary: null,
  });

  const accessAllowed = user?.role === 'USER' || user?.role === 'SELLER' || user?.role === 'ADMIN';

  const subtitle = useMemo(() => {
    if (state.status === 'loading') {
      return 'Carregando saldos...';
    }
    if (!state.summary) {
      return 'Sem dados para exibir ainda.';
    }
    return 'Resumo dos seus saldos e movimentacoes.';
  }, [state.status, state.summary]);

  const loadSummary = async () => {
    if (!accessToken) {
      return;
    }
    setState((prev) => ({ ...prev, status: 'loading', error: undefined }));
    try {
      const summary = await walletApi.getSummary(accessToken);
      setState({ status: 'ready', summary });
    } catch (error) {
      const message =
        error instanceof ApiClientError
          ? error.message
          : error instanceof Error
            ? error.message
            : 'Nao foi possivel carregar a carteira.';
      setState({ status: 'ready', summary: null, error: message });
    }
  };

  useEffect(() => {
    if (accessToken && accessAllowed) {
      loadSummary();
    }
  }, [accessToken, accessAllowed]);

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
          <p className="text-sm text-meow-muted">Entre para acessar sua carteira.</p>
          <Link
            className="mt-4 inline-flex rounded-full bg-meow-linear px-6 py-2 text-sm font-bold text-white"
            href="/login"
          >
            Fazer login
          </Link>
        </div>
      </section>
    );
  }

  if (!accessAllowed) {
    return (
      <section className="bg-white px-6 py-12">
        <div className="mx-auto w-full max-w-[1200px] rounded-2xl border border-meow-red/20 bg-white px-6 py-6 text-center">
          <p className="text-sm text-meow-muted">Acesso restrito.</p>
          <Link
            className="mt-4 inline-flex rounded-full border border-meow-red/30 px-6 py-2 text-sm font-bold text-meow-deep"
            href="/conta"
          >
            Voltar para conta
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
        { label: 'Carteira' },
      ]}
    >
      <Card className="rounded-2xl border border-meow-red/20 p-6 shadow-[0_10px_24px_rgba(216,107,149,0.12)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-black text-meow-charcoal">Carteira</h1>
            <p className="mt-2 text-sm text-meow-muted">{subtitle}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link href="/conta/carteira/extrato" className="text-xs font-bold text-meow-deep">
              Ver extrato
            </Link>
            <Button variant="secondary" size="sm" type="button" onClick={loadSummary}>
              Atualizar
            </Button>
          </div>
        </div>
      </Card>

      {state.error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {state.error}
        </div>
      ) : null}

      {state.summary ? (
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="rounded-2xl border border-meow-red/20 p-5 shadow-[0_10px_24px_rgba(216,107,149,0.12)]">
            <p className="text-xs font-semibold uppercase tracking-[0.4px] text-meow-muted">
              A receber
            </p>
            <p className="mt-2 text-2xl font-black text-meow-charcoal">
              {formatCurrency(state.summary.heldCents, state.summary.currency)}
            </p>
            <p className="mt-2 text-xs text-meow-muted">
              Pedidos confirmados, aguardando liberacao.
            </p>
          </Card>
          <Card className="rounded-2xl border border-meow-red/20 p-5 shadow-[0_10px_24px_rgba(216,107,149,0.12)]">
            <p className="text-xs font-semibold uppercase tracking-[0.4px] text-meow-muted">
              Bloqueado
            </p>
            <p className="mt-2 text-2xl font-black text-meow-charcoal">
              {formatCurrency(state.summary.reversedCents, state.summary.currency)}
            </p>
            <p className="mt-2 text-xs text-meow-muted">Valores em disputa ou reembolso.</p>
          </Card>
          <Card className="rounded-2xl border border-meow-red/20 p-5 shadow-[0_10px_24px_rgba(216,107,149,0.12)]">
            <p className="text-xs font-semibold uppercase tracking-[0.4px] text-meow-muted">
              Disponivel
            </p>
            <p className="mt-2 text-2xl font-black text-meow-charcoal">
              {formatCurrency(state.summary.availableCents, state.summary.currency)}
            </p>
            <p className="mt-2 text-xs text-meow-muted">Pronto para sacar ou usar.</p>
          </Card>
        </div>
      ) : null}

      {state.status === 'loading' && !state.summary ? (
        <div className="rounded-xl border border-meow-red/20 bg-white px-4 py-3 text-sm text-meow-muted">
          Carregando carteira...
        </div>
      ) : null}
    </AccountShell>
  );
};
