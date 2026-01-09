'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

import { ApiClientError } from '../../lib/api-client';
import { walletApi, type WalletSummary } from '../../lib/wallet-api';
import { useAuth } from '../auth/auth-provider';

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
      <div className="wallet-shell">
        <div className="state-card">Carregando sessao...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="wallet-shell">
        <div className="state-card">Entre para acessar sua carteira.</div>
        <Link className="primary-button" href="/login">
          Fazer login
        </Link>
      </div>
    );
  }

  if (!accessAllowed) {
    return (
      <div className="wallet-shell">
      <div className="state-card">Acesso restrito.</div>
        <Link className="ghost-button" href="/dashboard">
          Voltar ao dashboard
        </Link>
      </div>
    );
  }

  return (
    <section className="wallet-shell">
      <div className="wallet-header">
        <div>
          <h1>Carteira</h1>
          <p className="auth-helper">{subtitle}</p>
        </div>
        <div className="wallet-actions">
          <Link className="ghost-button" href="/dashboard/carteira/extrato">
            Ver extrato
          </Link>
          <button className="ghost-button" type="button" onClick={loadSummary}>
            Atualizar
          </button>
          <Link className="ghost-button" href="/dashboard">
            Voltar ao dashboard
          </Link>
        </div>
      </div>

      {state.error ? <div className="state-card error">{state.error}</div> : null}

      {state.summary ? (
        <div className="wallet-cards">
          <div className="wallet-card">
            <span>A receber</span>
            <strong>{formatCurrency(state.summary.heldCents, state.summary.currency)}</strong>
            <small>Pedidos confirmados, aguardando liberacao.</small>
          </div>
          <div className="wallet-card">
            <span>Bloqueado</span>
            <strong>{formatCurrency(state.summary.reversedCents, state.summary.currency)}</strong>
            <small>Valores em disputa ou reembolso.</small>
          </div>
          <div className="wallet-card">
            <span>Disponivel</span>
            <strong>{formatCurrency(state.summary.availableCents, state.summary.currency)}</strong>
            <small>Pronto para saque ou envio automatico.</small>
          </div>
        </div>
      ) : null}

      {state.status === 'loading' && !state.summary ? (
        <div className="state-card">Carregando carteira...</div>
      ) : null}
    </section>
  );
};
