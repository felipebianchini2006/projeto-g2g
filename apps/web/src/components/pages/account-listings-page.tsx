'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

import { ApiClientError } from '../../lib/api-client';
import {
  marketplaceApi,
  type Listing,
  type ListingStatus,
} from '../../lib/marketplace-api';
import { useAuth } from '../auth/auth-provider';
import { AccountShell } from '../account/account-shell';

type ListingsState = {
  status: 'loading' | 'ready';
  listings: Listing[];
  error?: string;
};

const statusLabel: Record<ListingStatus, string> = {
  DRAFT: 'Rascunho',
  PENDING: 'Em analise',
  PUBLISHED: 'Publicado',
  SUSPENDED: 'Suspenso',
};

const formatCurrency = (value: number, currency = 'BRL') =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(value / 100);

export const AccountListingsContent = () => {
  const { user, accessToken, loading } = useAuth();
  const [state, setState] = useState<ListingsState>({
    status: 'loading',
    listings: [],
  });
  const [statusFilter, setStatusFilter] = useState<ListingStatus | 'ALL'>('ALL');

  const accessAllowed = user?.role === 'SELLER' || user?.role === 'ADMIN';

  useEffect(() => {
    if (!accessToken || !accessAllowed) {
      return;
    }
    let active = true;
    const load = async () => {
      try {
        const listings = await marketplaceApi.listSellerListings(accessToken);
        if (!active) {
          return;
        }
        setState({ status: 'ready', listings });
      } catch (error) {
        if (!active) {
          return;
        }
        const message =
          error instanceof ApiClientError
            ? error.message
            : 'Nao foi possivel carregar seus anuncios.';
        setState({ status: 'ready', listings: [], error: message });
      }
    };
    load();
    return () => {
      active = false;
    };
  }, [accessToken, accessAllowed]);

  const filteredListings = useMemo(() => {
    if (statusFilter === 'ALL') {
      return state.listings;
    }
    return state.listings.filter((listing) => listing.status === statusFilter);
  }, [state.listings, statusFilter]);

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
          <p className="text-sm text-meow-muted">Entre para acessar seus anuncios.</p>
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

  if (!accessAllowed) {
    return (
      <section className="bg-white px-6 py-12">
        <div className="mx-auto w-full max-w-[1200px] rounded-2xl border border-meow-red/20 bg-white px-6 py-6 text-center">
          <p className="text-sm text-meow-muted">
            Seu perfil nao possui acesso ao painel de anuncios.
          </p>
          <Link
            href="/conta"
            className="mt-4 inline-flex rounded-full border border-meow-red/30 px-6 py-2 text-sm font-bold text-meow-deep"
          >
            Voltar para conta
          </Link>
        </div>
      </section>
    );
  }

  const tabs: { label: string; value: ListingStatus | 'ALL' }[] = [
    { label: 'Todos', value: 'ALL' },
    { label: 'Ativos', value: 'PUBLISHED' },
    { label: 'Pausados', value: 'SUSPENDED' },
    { label: 'Em analise', value: 'PENDING' },
    { label: 'Rascunhos', value: 'DRAFT' },
  ];

  return (
    <AccountShell
      breadcrumbs={[
        { label: 'Inicio', href: '/' },
        { label: 'Conta', href: '/conta' },
        { label: 'Meus anuncios' },
      ]}
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-meow-charcoal">Meus anuncios</h1>
          <p className="text-sm text-meow-muted">
            Gerencie anuncios ativos, pendentes ou pausados.
          </p>
        </div>
        <Link
          href="/anunciar"
          className="rounded-full bg-meow-300 px-5 py-2 text-sm font-black text-white shadow-cute"
        >
          + Novo anuncio
        </Link>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        {tabs.map((tab) => (
          <button
            key={tab.value}
            type="button"
            className={`rounded-full px-4 py-2 text-xs font-bold ${
              statusFilter === tab.value
                ? 'bg-meow-charcoal text-white'
                : 'border border-slate-200 bg-white text-meow-muted'
            }`}
            onClick={() => setStatusFilter(tab.value)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {state.error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {state.error}
        </div>
      ) : null}

      {state.status === 'loading' ? (
        <div className="rounded-xl border border-meow-red/20 bg-white px-4 py-3 text-sm text-meow-muted">
          Carregando anuncios...
        </div>
      ) : null}

      {state.status === 'ready' && filteredListings.length === 0 ? (
        <div className="rounded-xl border border-meow-red/20 bg-white px-4 py-3 text-sm text-meow-muted">
          Nenhum anuncio encontrado com esses filtros.
        </div>
      ) : null}

      <div className="mt-6 grid gap-4">
        {filteredListings.map((listing) => (
          <div
            key={listing.id}
            className="flex flex-wrap items-center justify-between gap-4 rounded-[26px] border border-slate-100 bg-white p-5 shadow-card"
          >
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl bg-slate-100 text-lg font-black text-meow-charcoal">
                <img
                  src={listing.media?.[0]?.url ?? '/assets/meoow/highlight-02.webp'}
                  alt={listing.title}
                  className="h-full w-full object-cover"
                />
              </div>
              <div>
                <p className="text-sm font-semibold text-meow-charcoal">{listing.title}</p>
                <p className="text-xs text-meow-muted">
                  Visualizacoes: {Math.max(1200 - listing.title.length * 13, 180)} - Vendas:
                  {listing.status === 'PUBLISHED' ? ' 0' : ' 0'}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <span className="rounded-full bg-meow-100 px-3 py-1 text-xs font-bold text-meow-deep">
                {statusLabel[listing.status] ?? listing.status}
              </span>
              <div className="text-sm font-black text-meow-charcoal">
                {formatCurrency(listing.priceCents, listing.currency)}
                <span className="ml-2 text-xs font-semibold text-meow-muted">
                  Estoque: 1
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  href={`/anuncios/${listing.id}`}
                  className="rounded-full border border-slate-200 px-3 py-2 text-xs font-bold text-meow-charcoal"
                >
                  Ver
                </Link>
                <Link
                  href="/dashboard"
                  className="rounded-full border border-slate-200 px-3 py-2 text-xs font-bold text-meow-charcoal"
                >
                  Editar
                </Link>
                <button
                  type="button"
                  className="rounded-full border border-red-100 px-3 py-2 text-xs font-bold text-red-500"
                >
                  Pausar
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </AccountShell>
  );
};
