'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

import { ApiClientError } from '../../lib/api-client';
import {
  walletApi,
  type LedgerEntrySource,
  type LedgerEntryState,
  type WalletEntry,
} from '../../lib/wallet-api';
import { useAuth } from '../auth/auth-provider';

const formatCurrency = (value: number, currency = 'BRL') =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(value / 100);

const sourceLabel: Record<LedgerEntrySource, string> = {
  ORDER_PAYMENT: 'Pagamento',
  REFUND: 'Reembolso',
  FEE: 'Taxa',
  PAYOUT: 'Saque',
};

const stateLabel: Record<LedgerEntryState, string> = {
  HELD: 'A receber',
  AVAILABLE: 'Disponivel',
  REVERSED: 'Bloqueado',
};

type WalletEntriesState = {
  status: 'loading' | 'ready';
  entries: WalletEntry[];
  total: number;
  error?: string;
};

const take = 12;

export const WalletEntriesContent = () => {
  const { user, accessToken, loading } = useAuth();
  const [page, setPage] = useState(0);
  const [filters, setFilters] = useState({ from: '', to: '', source: '' });
  const [draftFilters, setDraftFilters] = useState(filters);
  const [state, setState] = useState<WalletEntriesState>({
    status: 'loading',
    entries: [],
    total: 0,
  });

  const accessAllowed = user?.role === 'USER' || user?.role === 'SELLER' || user?.role === 'ADMIN';

  const canPrev = page > 0;
  const canNext = (page + 1) * take < state.total;

  const loadEntries = async () => {
    if (!accessToken) {
      return;
    }
    setState((prev) => ({ ...prev, status: 'loading', error: undefined }));
    try {
      const result = await walletApi.listEntries(accessToken, {
        from: filters.from || undefined,
        to: filters.to || undefined,
        source: filters.source ? (filters.source as LedgerEntrySource) : undefined,
        skip: page * take,
        take,
      });
      setState({ status: 'ready', entries: result.items, total: result.total });
    } catch (error) {
      const message =
        error instanceof ApiClientError
          ? error.message
          : error instanceof Error
            ? error.message
            : 'Nao foi possivel carregar o extrato.';
      setState({ status: 'ready', entries: [], total: 0, error: message });
    }
  };

  useEffect(() => {
    if (accessToken && accessAllowed) {
      loadEntries();
    }
  }, [accessToken, accessAllowed, page, filters]);

  const summaryText = useMemo(() => {
    if (state.status === 'loading') {
      return 'Carregando movimentacoes...';
    }
    if (state.total === 0) {
      return 'Nenhuma movimentacao encontrada.';
    }
    return `${state.total} movimentacoes encontradas.`;
  }, [state]);

  const applyFilters = () => {
    setFilters(draftFilters);
    setPage(0);
  };

  const clearFilters = () => {
    const empty = { from: '', to: '', source: '' };
    setDraftFilters(empty);
    setFilters(empty);
    setPage(0);
  };

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
        <div className="state-card">Entre para acessar seu extrato.</div>
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
        <Link className="ghost-button" href="/conta">
          Voltar para conta
        </Link>
      </div>
    );
  }

  return (
    <section className="wallet-shell">
      <div className="wallet-header">
        <div>
          <h1>Extrato da carteira</h1>
          <p className="auth-helper">{summaryText}</p>
        </div>
        <div className="wallet-actions">
          <Link className="ghost-button" href="/conta/carteira">
            Ver carteira
          </Link>
          <Link className="ghost-button" href="/conta">
            Voltar para conta
          </Link>
        </div>
      </div>

      <div className="wallet-filters">
        <div className="wallet-filter-grid">
          <label className="form-field">
            De
            <input
              className="form-input"
              type="date"
              value={draftFilters.from}
              onChange={(event) =>
                setDraftFilters((prev) => ({ ...prev, from: event.target.value }))
              }
            />
          </label>
          <label className="form-field">
            Ate
            <input
              className="form-input"
              type="date"
              value={draftFilters.to}
              onChange={(event) =>
                setDraftFilters((prev) => ({ ...prev, to: event.target.value }))
              }
            />
          </label>
          <label className="form-field">
            Origem
            <select
              className="form-input"
              value={draftFilters.source}
              onChange={(event) =>
                setDraftFilters((prev) => ({ ...prev, source: event.target.value }))
              }
            >
              <option value="">Todas</option>
              <option value="ORDER_PAYMENT">Pagamento</option>
              <option value="REFUND">Reembolso</option>
              <option value="FEE">Taxa</option>
              <option value="PAYOUT">Saque</option>
            </select>
          </label>
        </div>
        <div className="wallet-actions">
          <button className="primary-button" type="button" onClick={applyFilters}>
            Aplicar filtros
          </button>
          <button className="ghost-button" type="button" onClick={clearFilters}>
            Limpar
          </button>
        </div>
      </div>

      {state.error ? <div className="state-card error">{state.error}</div> : null}

      <div className="wallet-table">
        <div className="wallet-row wallet-row--head">
          <span>Data</span>
          <span>Origem</span>
          <span>Estado</span>
          <span>Valor</span>
          <span>Referencia</span>
        </div>
        {state.entries.map((entry) => {
          const signedAmount = entry.type === 'DEBIT' ? -entry.amountCents : entry.amountCents;
          const amountClass = signedAmount < 0 ? 'wallet-amount negative' : 'wallet-amount positive';
          return (
            <div className="wallet-row" key={entry.id}>
              <span>{new Date(entry.createdAt).toLocaleString('pt-BR')}</span>
              <span className="tag-pill">{sourceLabel[entry.source]}</span>
              <span className={`status-pill status-${entry.state.toLowerCase()}`}>{stateLabel[entry.state]}</span>
              <span className={amountClass}>{formatCurrency(signedAmount, entry.currency)}</span>
              <span className="mono">
                {entry.orderId ? `#${entry.orderId.slice(0, 8)}` : entry.description ?? '--'}
              </span>
            </div>
          );
        })}
        {state.entries.length === 0 && state.status !== 'loading' ? (
          <div className="state-card">Nenhuma movimentacao encontrada.</div>
        ) : null}
        {state.status === 'loading' ? <div className="state-card">Carregando extrato...</div> : null}
      </div>

      <div className="wallet-actions">
        <button className="ghost-button" type="button" onClick={() => setPage((prev) => Math.max(prev - 1, 0))} disabled={!canPrev}>
          Anterior
        </button>
        <button className="ghost-button" type="button" onClick={() => setPage((prev) => prev + 1)} disabled={!canNext}>
          Proxima
        </button>
      </div>
    </section>
  );
};
