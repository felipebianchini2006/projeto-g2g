'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Eye, Filter, Megaphone, MoreHorizontal, Plus, Search, ShoppingCart } from 'lucide-react';

import { ApiClientError } from '../../lib/api-client';
import { marketplaceApi, type Listing, type ListingStatus } from '../../lib/marketplace-api';
import { ordersApi } from '../../lib/orders-api';
import { useAuth } from '../auth/auth-provider';
import { AccountShell } from '../account/account-shell';
import { Badge } from '../ui/badge';
import { Card } from '../ui/card';
import { Input } from '../ui/input';
import { Select } from '../ui/select';
import { Tabs, TabsList, TabsTrigger } from '../ui/tabs';

type ListingsState = {
  status: 'loading' | 'ready';
  listings: Listing[];
  error?: string;
};

type SortOption = 'recent' | 'price-asc' | 'price-desc' | 'title';

const statusLabel: Record<ListingStatus, string> = {
  DRAFT: 'Rascunho',
  PENDING: 'Em analise',
  PUBLISHED: 'Publicado',
  SUSPENDED: 'Pausado',
};

const statusTone: Record<
  ListingStatus,
  'success' | 'warning' | 'info' | 'danger' | 'neutral'
> = {
  DRAFT: 'neutral',
  PENDING: 'warning',
  PUBLISHED: 'success',
  SUSPENDED: 'danger',
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
  const [statusFilter, setStatusFilter] = useState<ListingStatus | 'ALL' | 'SOLD'>(
    'ALL',
  );
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOption, setSortOption] = useState<SortOption>('recent');
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [actionBusy, setActionBusy] = useState<string | null>(null);
  const [salesCount, setSalesCount] = useState(0);
  const [salesError, setSalesError] = useState<string | null>(null);

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
  }, [accessAllowed, accessToken]);

  useEffect(() => {
    if (!accessToken || !accessAllowed) {
      return;
    }
    let active = true;
    const loadOrders = async () => {
      try {
        const orders = await ordersApi.listOrders(accessToken, 'seller');
        if (!active) {
          return;
        }
        const total = orders.reduce(
          (acc, order) =>
            acc + order.items.reduce((sum, item) => sum + (item.quantity ?? 0), 0),
          0,
        );
        setSalesCount(total);
      } catch (error) {
        if (!active) {
          return;
        }
        const message =
          error instanceof ApiClientError
            ? error.message
            : 'Nao foi possivel carregar as vendas.';
        setSalesError(message);
      }
    };
    loadOrders();
    return () => {
      active = false;
    };
  }, [accessAllowed, accessToken]);

  const resolveInventoryAvailable = (listing: Listing) => {
    const inventory = (listing as Listing & { inventoryAvailableCount?: number })
      .inventoryAvailableCount;
    if (listing.deliveryType !== 'AUTO') {
      return null;
    }
    return typeof inventory === 'number' ? inventory : null;
  };

  const filteredListings = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();
    const filtered = state.listings.filter((listing) => {
      const matchesSearch = search
        ? listing.title.toLowerCase().includes(search)
        : true;
      if (!matchesSearch) {
        return false;
      }
      if (statusFilter === 'ALL') {
        return true;
      }
      if (statusFilter === 'SOLD') {
        const available = resolveInventoryAvailable(listing);
        return typeof available === 'number' ? available === 0 : false;
      }
      return listing.status === statusFilter;
    });

    const sorted = [...filtered].sort((a, b) => {
      if (sortOption === 'price-asc') {
        return a.priceCents - b.priceCents;
      }
      if (sortOption === 'price-desc') {
        return b.priceCents - a.priceCents;
      }
      if (sortOption === 'title') {
        return a.title.localeCompare(b.title);
      }
      const aDate = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bDate = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return bDate - aDate;
    });

    return sorted;
  }, [searchTerm, sortOption, state.listings, statusFilter]);

  const activeCount = useMemo(
    () => state.listings.filter((listing) => listing.status === 'PUBLISHED').length,
    [state.listings],
  );
  const totalCount = state.listings.length;
  const viewsCount = 0;
  const summaryCards = [
    {
      label: 'Anuncios ativos',
      value: activeCount,
      description: 'Status publicados.',
      icon: Megaphone,
      tone: 'from-emerald-500 via-emerald-500 to-emerald-600',
    },
    {
      label: 'Total de vendas',
      value: salesCount,
      description: salesError ? salesError : 'Baseado nos pedidos do vendedor.',
      icon: ShoppingCart,
      tone: 'from-blue-500 via-blue-500 to-indigo-500',
    },
    {
      label: 'Visualizacoes',
      value: viewsCount,
      description: 'Pronto para integrar.',
      icon: Eye,
      tone: 'from-fuchsia-500 via-pink-500 to-rose-500',
    },
  ];

  const handleSubmitListing = async (listingId: string) => {
    if (!accessToken) {
      return;
    }
    setActionBusy(listingId);
    setNotice(null);
    try {
      const updated = await marketplaceApi.submitListing(accessToken, listingId);
      setState((prev) => ({
        ...prev,
        listings: prev.listings.map((item) => (item.id === updated.id ? updated : item)),
      }));
      setNotice('Anuncio enviado para analise.');
    } catch (error) {
      const message =
        error instanceof ApiClientError
          ? error.message
          : 'Nao foi possivel ativar o anuncio.';
      setNotice(message);
    } finally {
      setActionBusy(null);
    }
  };

  const handleArchiveListing = async (listingId: string) => {
    if (!accessToken) {
      return;
    }
    setActionBusy(listingId);
    setNotice(null);
    try {
      const updated = await marketplaceApi.archiveListing(accessToken, listingId);
      setState((prev) => ({
        ...prev,
        listings: prev.listings.map((item) => (item.id === updated.id ? updated : item)),
      }));
      setNotice('Anuncio pausado.');
    } catch (error) {
      const message =
        error instanceof ApiClientError
          ? error.message
          : 'Nao foi possivel pausar o anuncio.';
      setNotice(message);
    } finally {
      setActionBusy(null);
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

  const tabs: { label: string; value: ListingStatus | 'ALL' | 'SOLD' }[] = [
    { label: 'Todos', value: 'ALL' },
    { label: 'Ativos', value: 'PUBLISHED' },
    { label: 'Pausados', value: 'SUSPENDED' },
    { label: 'Em analise', value: 'PENDING' },
    { label: 'Vendidos', value: 'SOLD' },
  ];

  return (
    <AccountShell
      breadcrumbs={[
        { label: 'Inicio', href: '/' },
        { label: 'Conta', href: '/conta' },
        { label: 'Meus anuncios' },
      ]}
    >
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-black text-meow-charcoal">Meus anuncios</h1>
            <Badge variant="pink" className="px-4 py-2 text-xs">
              {totalCount}
            </Badge>
          </div>
          <Link
            href="/anunciar"
            className="inline-flex items-center gap-2 rounded-full bg-meow-300 px-5 py-2 text-sm font-black text-white shadow-cute"
          >
            <Plus size={16} aria-hidden />
            Novo anuncio
          </Link>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {summaryCards.map((card) => {
            const Icon = card.icon;
            return (
              <Card
                key={card.label}
                className={`relative overflow-hidden rounded-[26px] border-0 bg-gradient-to-br ${card.tone} p-5 text-white shadow-[0_18px_40px_rgba(15,23,42,0.18)]`}
              >
                <div className="absolute -right-6 -top-6 h-16 w-16 rounded-full bg-white/15" />
                <div className="absolute right-8 top-6 h-10 w-10 rounded-full bg-white/10" />
                <div className="relative z-10">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/20">
                    <Icon size={18} aria-hidden />
                  </div>
                  <p className="mt-4 text-xs font-semibold uppercase tracking-[0.3px] text-white/80">
                    {card.label}
                  </p>
                  <p className="mt-2 text-3xl font-black">{card.value}</p>
                  <p className="mt-1 text-xs text-white/80">{card.description}</p>
                </div>
              </Card>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <Tabs
            value={statusFilter}
            onValueChange={(value) =>
              setStatusFilter(value as ListingStatus | 'ALL' | 'SOLD')
            }
          >
            <TabsList className="flex flex-wrap gap-2">
              {tabs.map((tab) => (
                <TabsTrigger key={tab.value} value={tab.value}>
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="relative flex-1 min-w-[220px]">
            <Search
              size={16}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
              aria-hidden
            />
            <Input
              className="pl-10"
              placeholder="Buscar anuncios..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
          </div>
          <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 shadow-card">
            <Filter size={16} className="text-slate-400" aria-hidden />
            <Select
              className="h-auto border-0 bg-transparent px-0 text-xs font-semibold text-slate-500 shadow-none focus:ring-0"
              value={sortOption}
              onChange={(event) => setSortOption(event.target.value as SortOption)}
            >
              <option value="recent">Ordenar: recentes</option>
              <option value="price-asc">Ordenar: menor preco</option>
              <option value="price-desc">Ordenar: maior preco</option>
              <option value="title">Ordenar: titulo</option>
            </Select>
          </div>
        </div>

        {state.error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {state.error}
          </div>
        ) : null}

        {notice ? (
          <div className="rounded-xl border border-meow-red/20 bg-meow-cream/60 px-4 py-3 text-sm text-meow-muted">
            {notice}
          </div>
        ) : null}

        {state.status === 'loading' ? (
          <div className="grid gap-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div
                key={`loading-${index}`}
                className="h-20 rounded-2xl border border-slate-100 bg-meow-50/70"
              />
            ))}
          </div>
        ) : null}

        {state.status === 'ready' && filteredListings.length === 0 ? (
          <div className="rounded-[26px] border border-slate-100 bg-meow-50 px-6 py-8 text-center">
            <p className="text-sm font-semibold text-meow-charcoal">
              Nenhum anuncio encontrado
            </p>
            <p className="mt-2 text-xs text-meow-muted">
              Ajuste os filtros ou crie seu primeiro anuncio agora.
            </p>
            <Link
              href="/anunciar"
              className="mt-4 inline-flex items-center gap-2 rounded-full bg-meow-300 px-5 py-2 text-xs font-bold text-white shadow-cute"
            >
              <Plus size={14} aria-hidden />
              Criar meu primeiro anuncio
            </Link>
          </div>
        ) : null}

        <div className="grid gap-4">
          {filteredListings.map((listing) => {
            const isPublished = listing.status === 'PUBLISHED';
            const isDraft = listing.status === 'DRAFT';
            const inventoryAvailable = resolveInventoryAvailable(listing);
            const showActivate = listing.status === 'SUSPENDED' || isDraft;
            return (
              <Card
                key={listing.id}
                className="rounded-[26px] border border-slate-100 p-5 shadow-card"
              >
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl bg-slate-100 text-lg font-black text-meow-charcoal">
                      <img
                        src={listing.media?.[0]?.url ?? '/assets/meoow/highlight-02.webp'}
                        alt={listing.title}
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-meow-charcoal">
                        {listing.title}
                      </p>
                      <p className="text-xs text-meow-muted">
                        {formatCurrency(listing.priceCents, listing.currency)}
                        {typeof inventoryAvailable === 'number'
                          ? ` | Estoque: ${inventoryAvailable}`
                          : ''}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <Badge variant={statusTone[listing.status]}>
                      {statusLabel[listing.status] ?? listing.status}
                    </Badge>
                    <div className="relative">
                      <button
                        type="button"
                        className="grid h-9 w-9 place-items-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:border-meow-200 hover:text-meow-deep"
                        onClick={() =>
                          setMenuOpenId((prev) => (prev === listing.id ? null : listing.id))
                        }
                        aria-label="Acoes"
                      >
                        <MoreHorizontal size={16} aria-hidden />
                      </button>
                      {menuOpenId === listing.id ? (
                        <div className="absolute right-0 top-11 z-10 w-44 rounded-2xl border border-slate-100 bg-white p-2 text-sm shadow-[0_18px_32px_rgba(15,23,42,0.12)]">
                          <Link
                            href={`/conta/anuncios/${listing.id}`}
                            className="block rounded-xl px-3 py-2 text-sm font-semibold text-meow-charcoal hover:bg-meow-50"
                            onClick={() => setMenuOpenId(null)}
                          >
                            Editar
                          </Link>
                          {isPublished ? (
                            <button
                              type="button"
                              className="w-full rounded-xl px-3 py-2 text-left text-sm font-semibold text-meow-charcoal hover:bg-meow-50"
                              onClick={() => {
                                setMenuOpenId(null);
                                handleArchiveListing(listing.id);
                              }}
                              disabled={actionBusy === listing.id}
                            >
                              {actionBusy === listing.id ? 'Pausando...' : 'Pausar'}
                            </button>
                          ) : null}
                          {showActivate ? (
                            <button
                              type="button"
                              className="w-full rounded-xl px-3 py-2 text-left text-sm font-semibold text-meow-charcoal hover:bg-meow-50"
                              onClick={() => {
                                setMenuOpenId(null);
                                handleSubmitListing(listing.id);
                              }}
                              disabled={actionBusy === listing.id}
                            >
                              {actionBusy === listing.id ? 'Ativando...' : 'Ativar'}
                            </button>
                          ) : null}

                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </AccountShell>
  );
};
