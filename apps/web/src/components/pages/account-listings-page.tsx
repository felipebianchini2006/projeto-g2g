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

  return (
    <AccountShell
      breadcrumbs={[
        { label: 'Inicio', href: '/' },
        { label: 'Conta', href: '/conta' },
        { label: 'Meus anuncios' },
      ]}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-meow-red/20 bg-white p-4 shadow-[0_10px_24px_rgba(216,107,149,0.12)]">
        <label className="grid gap-1 text-xs font-semibold text-meow-muted">
          Status
          <select
            className="rounded-xl border border-meow-red/20 bg-white px-3 py-2 text-sm text-meow-charcoal"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as ListingStatus | 'ALL')}
          >
            <option value="ALL">Todos</option>
            {Object.entries(statusLabel).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="rounded-full border border-meow-red/30 px-4 py-2 text-xs font-bold text-meow-deep"
            onClick={() => setStatusFilter('ALL')}
          >
            Limpar
          </button>
          <Link
            href="/anunciar"
            className="rounded-full bg-meow-linear px-4 py-2 text-xs font-bold text-white"
          >
            Criar anuncio
          </Link>
        </div>
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

      <div className="grid gap-4">
        {filteredListings.map((listing) => (
          <div
            key={listing.id}
            className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-meow-red/20 bg-white p-5 shadow-[0_10px_24px_rgba(216,107,149,0.12)]"
          >
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 overflow-hidden rounded-xl bg-meow-cream">
                <img
                  src={listing.media?.[0]?.url ?? '/assets/meoow/highlight-02.webp'}
                  alt={listing.title}
                  className="h-full w-full object-cover"
                />
              </div>
              <div>
                <p className="text-sm font-semibold text-meow-charcoal">{listing.title}</p>
                <p className="text-xs text-meow-muted">
                  {formatCurrency(listing.priceCents, listing.currency)}
                </p>
                <span className="mt-2 inline-flex rounded-full bg-meow-cream px-3 py-1 text-[11px] font-bold text-meow-charcoal">
                  {statusLabel[listing.status] ?? listing.status}
                </span>
              </div>
            </div>
            <Link
              href={`/anuncios/${listing.id}`}
              className="rounded-full border border-meow-red/30 px-4 py-2 text-xs font-bold text-meow-deep"
            >
              Ver anuncio
            </Link>
          </div>
        ))}
      </div>
    </AccountShell>
  );
};
