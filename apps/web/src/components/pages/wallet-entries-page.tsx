'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

import { ApiClientError } from '../../lib/api-client';
import {
  walletApi,
  type LedgerEntrySource,
  type LedgerEntryState,
  type WalletEntry,
  type WalletSummary,
} from '../../lib/wallet-api';
import { useAuth } from '../auth/auth-provider';
import { AccountShell } from '../account/account-shell';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Input } from '../ui/input';
import { Select } from '../ui/select';

const formatCurrency = (value: number, currency = 'BRL') =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(value / 100);

const formatDateTime = (value?: string | null) =>
  value ? new Date(value).toLocaleString('pt-BR') : '--';

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

type SummaryState = {
  status: 'loading' | 'ready';
  summary: WalletSummary | null;
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
  const [summaryState, setSummaryState] = useState<SummaryState>({
    status: 'loading',
    summary: null,
  });

  const accessAllowed = user?.role === 'USER' || user?.role === 'SELLER' || user?.role === 'ADMIN';

  const canPrev = page > 0;
  const canNext = (page + 1) * take < state.total;

  const loadSummary = async () => {
    if (!accessToken) {
      return;
    }
    try {
      const summary = await walletApi.getSummary(accessToken);
      setSummaryState({ status: 'ready', summary });
    } catch {
      setSummaryState({ status: 'ready', summary: null });
    }
  };

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
            : 'Não foi possível carregar o extrato.';
      setState({ status: 'ready', entries: [], total: 0, error: message });
    }
  };

  useEffect(() => {
    if (accessToken && accessAllowed) {
      loadEntries();
      loadSummary();
    }
  }, [accessToken, accessAllowed, page, filters]);

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

  const summaryText = useMemo(() => {
    if (state.status === 'loading') {
      return 'Carregando movimentacoes...';
    }
    if (state.total === 0) {
      return 'Nenhuma movimentacao encontrada.';
    }
    return `${state.total} movimentacoes encontradas.`;
  }, [state]);

  if (loading) {
    return (
      <section className="bg-white px-6 py-12">
        <div className="mx-auto w-full max-w-[1200px] rounded-2xl border border-meow-red/20 bg-white px-6 py-4 text-sm text-meow-muted">
          Carregando sessão...
        </div>
      </section>
    );
  }

  if (!user) {
    return (
      <section className="bg-white px-6 py-12">
        <div className="mx-auto w-full max-w-[1200px] rounded-2xl border border-meow-red/20 bg-white px-6 py-6 text-center">
          <p className="text-sm text-meow-muted">Entre para acessar o extrato.</p>
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
        { label: 'Transacoes' },
      ]}
    >
      <div className="grid gap-4 lg:grid-cols-[1.2fr_repeat(2,1fr)]">
        <Card className="rounded-2xl border border-meow-red/20 p-5 shadow-[0_10px_24px_rgba(216,107,149,0.12)]">
          <p className="text-xs font-semibold uppercase tracking-[0.4px] text-meow-muted">
            Transacoes de credito
          </p>
          <p className="mt-2 text-sm text-meow-muted">{summaryText}</p>
        </Card>
        <Card className="rounded-2xl border border-meow-red/20 p-5 shadow-[0_10px_24px_rgba(216,107,149,0.12)]">
          <p className="text-xs font-semibold uppercase tracking-[0.4px] text-meow-muted">
            Saldo a liberar
          </p>
          <p className="mt-2 text-2xl font-black text-meow-charcoal">
            {formatCurrency(summaryState.summary?.heldCents ?? 0)}
          </p>
        </Card>
        <Card className="rounded-2xl border border-meow-red/20 p-5 shadow-[0_10px_24px_rgba(216,107,149,0.12)]">
          <p className="text-xs font-semibold uppercase tracking-[0.4px] text-meow-muted">
            Saldo disponivel
          </p>
          <p className="mt-2 text-2xl font-black text-meow-charcoal">
            {formatCurrency(summaryState.summary?.availableCents ?? 0)}
          </p>
        </Card>
      </div>

      <Card className="rounded-2xl border border-meow-red/20 p-4 shadow-[0_10px_24px_rgba(216,107,149,0.12)]">
        <div className="grid gap-3 md:grid-cols-[repeat(3,1fr)_auto]">
          <label className="grid gap-1 text-xs font-semibold text-meow-muted">
            De
            <Input
              className="rounded-xl border-meow-red/20 bg-white text-sm text-meow-charcoal"
              type="date"
              value={draftFilters.from}
              onChange={(event) =>
                setDraftFilters((prev) => ({ ...prev, from: event.target.value }))
              }
            />
          </label>
          <label className="grid gap-1 text-xs font-semibold text-meow-muted">
            Ate
            <Input
              className="rounded-xl border-meow-red/20 bg-white text-sm text-meow-charcoal"
              type="date"
              value={draftFilters.to}
              onChange={(event) =>
                setDraftFilters((prev) => ({ ...prev, to: event.target.value }))
              }
            />
          </label>
          <label className="grid gap-1 text-xs font-semibold text-meow-muted">
            Origem
            <Select
              className="rounded-xl border-meow-red/20 bg-white text-sm text-meow-charcoal"
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
            </Select>
          </label>
          <div className="flex flex-wrap items-end gap-2">
            <Button size="sm" type="button" onClick={applyFilters}>
              Aplicar
            </Button>
            <Button variant="secondary" size="sm" type="button" onClick={clearFilters}>
              Limpar
            </Button>
          </div>
        </div>
      </Card>

      {state.error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {state.error}
        </div>
      ) : null}

      <div className="rounded-2xl border border-meow-red/20 bg-white shadow-[0_10px_24px_rgba(216,107,149,0.12)]">
        <div className="hidden grid-cols-[1.1fr_1fr_0.9fr_0.9fr_0.8fr_1fr] gap-3 border-b border-meow-red/10 px-4 py-3 text-xs font-semibold text-meow-muted md:grid">
          <span>Data</span>
          <span>Recebimento</span>
          <span>Origem</span>
          <span>Estado</span>
          <span>Valor</span>
          <span>Referencia</span>
        </div>
        {state.entries.map((entry) => {
          const signedAmount = entry.type === 'DEBIT' ? -entry.amountCents : entry.amountCents;
          const amountClass = signedAmount < 0 ? 'text-red-600' : 'text-emerald-600';
          const receiveAt = entry.state === 'HELD' ? formatDateTime(entry.availableAt) : '--';
          return (
            <div
              key={entry.id}
              className="grid gap-3 border-b border-meow-red/10 px-4 py-4 text-xs text-meow-muted last:border-b-0 md:grid-cols-[1.1fr_1fr_0.9fr_0.9fr_0.8fr_1fr] md:py-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 md:hidden">
                <span className="text-[11px] font-semibold text-meow-muted">Data</span>
                <span className="text-[11px] text-meow-charcoal">
                  {new Date(entry.createdAt).toLocaleString('pt-BR')}
                </span>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2 md:hidden">
                <span className="text-[11px] font-semibold text-meow-muted">Recebimento</span>
                <span className="text-[11px] text-meow-charcoal">{receiveAt}</span>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2 md:hidden">
                <span className="text-[11px] font-semibold text-meow-muted">Origem</span>
                <span className="text-[11px] font-semibold text-meow-charcoal">
                  {sourceLabel[entry.source]}
                </span>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2 md:hidden">
                <span className="text-[11px] font-semibold text-meow-muted">Estado</span>
                <span className="text-[11px] font-semibold text-meow-charcoal">
                  {stateLabel[entry.state]}
                </span>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2 md:hidden">
                <span className="text-[11px] font-semibold text-meow-muted">Valor</span>
                <span className={`text-[11px] font-semibold ${amountClass}`}>
                  {formatCurrency(signedAmount, entry.currency)}
                </span>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2 md:hidden">
                <span className="text-[11px] font-semibold text-meow-muted">Referencia</span>
                <span className="font-mono text-[11px] text-meow-charcoal">
                  {entry.orderId ? `#${entry.orderId.slice(0, 8)}` : entry.description ?? '--'}
                </span>
              </div>
              <span className="hidden md:inline">
                {new Date(entry.createdAt).toLocaleString('pt-BR')}
              </span>
              <span className="hidden md:inline">{receiveAt}</span>
              <span className="hidden font-semibold text-meow-charcoal md:inline">
                {sourceLabel[entry.source]}
              </span>
              <span className="hidden text-xs font-semibold text-meow-charcoal md:inline">
                {stateLabel[entry.state]}
              </span>
              <span className={`hidden font-semibold md:inline ${amountClass}`}>
                {formatCurrency(signedAmount, entry.currency)}
              </span>
              <span className="hidden font-mono text-[11px] text-meow-charcoal md:inline">
                {entry.orderId ? `#${entry.orderId.slice(0, 8)}` : entry.description ?? '--'}
              </span>
            </div>
          );
        })}
        {state.entries.length === 0 && state.status !== 'loading' ? (
          <div className="px-4 py-3 text-sm text-meow-muted">
            Nenhuma movimentacao encontrada.
          </div>
        ) : null}
        {state.status === 'loading' ? (
          <div className="px-4 py-3 text-sm text-meow-muted">Carregando extrato...</div>
        ) : null}
      </div>

      <div className="flex items-center justify-end gap-2">
        <Button
          variant="secondary"
          size="sm"
          type="button"
          onClick={() => setPage((prev) => Math.max(prev - 1, 0))}
          disabled={!canPrev}
        >
          Anterior
        </Button>
        <Button
          variant="secondary"
          size="sm"
          type="button"
          onClick={() => setPage((prev) => prev + 1)}
          disabled={!canNext}
        >
          Proxima
        </Button>
      </div>
    </AccountShell>
  );
};
