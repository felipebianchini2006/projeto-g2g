'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Heart, Star } from 'lucide-react';

import { fetchPublicListing, type PublicListing } from '../../lib/marketplace-public';
import { useSite } from '../site-context';
import { buttonVariants } from '../ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';

type ListingDetailState = {
  status: 'loading' | 'ready';
  listing: PublicListing | null;
  source: 'api' | 'fallback';
  error?: string;
};

const formatCurrency = (value: number, currency = 'BRL') =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(value / 100);

export const ListingDetailContent = ({ listingId }: { listingId: string }) => {
  const { addToCart, isFavorite, toggleFavorite } = useSite();
  const [state, setState] = useState<ListingDetailState>({
    status: 'loading',
    listing: null,
    source: 'api',
  });
  const [activeMedia, setActiveMedia] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    const loadListing = async () => {
      const response = await fetchPublicListing(listingId);
      if (!active) {
        return;
      }
      setState({
        status: 'ready',
        listing: response.listing,
        source: response.source,
        error: response.error,
      });
      if (response.listing?.media?.[0]?.url) {
        setActiveMedia(response.listing.media[0].url);
      } else {
        setActiveMedia(null);
      }
    };
    loadListing().catch(() => {
      if (active) {
        setState((prev) => ({
          ...prev,
          status: 'ready',
          error: 'Nao foi possivel carregar o anuncio.',
        }));
      }
    });
    return () => {
      active = false;
    };
  }, [listingId]);

  if (state.status === 'loading') {
    return (
      <section className="listing-detail">
        <div className="container">
          <div className="state-card">Carregando anuncio...</div>
        </div>
      </section>
    );
  }

  if (!state.listing) {
    return (
      <section className="listing-detail">
        <div className="container">
          <div className="state-card">Anuncio nao encontrado.</div>
          <Link className="ghost-button" href="/produtos">
            Voltar ao catalogo
          </Link>
        </div>
      </section>
    );
  }

  const listing = state.listing;
  const categoryLabel = listing.categoryLabel ?? listing.categorySlug ?? 'Marketplace';
  const rating = 5.0;
  const reviews = 42;
  const oldPriceCents = Math.round(listing.priceCents * 1.28);
  const discountPercent = Math.max(
    Math.round(((oldPriceCents - listing.priceCents) / oldPriceCents) * 100),
    5,
  );
  const favoriteActive = isFavorite(listing.id);
  const tabs = [
    { id: 'descricao', label: 'Descricao' },
    { id: 'avaliacoes', label: `Avaliacoes (${reviews})` },
    { id: 'duvidas', label: 'Duvidas' },
  ] as const;

  return (
    <section className="bg-meow-50/60 pb-16 pt-10">
      <div className="mx-auto w-full max-w-[1200px] px-6">
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs font-semibold text-meow-muted">
          <div>
            <Link href="/" className="text-meow-deep">
              Inicio
            </Link>{' '}
            &gt;{' '}
            <Link href="/categoria" className="text-meow-deep">
              {categoryLabel}
            </Link>{' '}
            &gt; {listing.title}
          </div>
          <Link
            href="/produtos"
            className="rounded-full border border-meow-200 bg-white px-4 py-2 text-xs font-bold text-meow-deep"
          >
            Voltar ao catalogo
          </Link>
        </div>

        {state.error ? (
          <div className="mt-4 rounded-2xl border border-meow-200 bg-white px-4 py-3 text-sm text-meow-muted shadow-card">
            {state.error}
          </div>
        ) : null}

        <div className="mt-6 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-[28px] border border-slate-100 bg-white p-6 shadow-card">
            <div className="relative rounded-[24px] bg-slate-50 p-6">
              <span className="inline-flex rounded-full bg-meow-300 px-4 py-1 text-[11px] font-bold uppercase text-white shadow-cute">
                Exclusivo
              </span>
              <button
                type="button"
                className="absolute right-6 top-6 grid h-10 w-10 place-items-center rounded-full bg-white text-meow-deep shadow-card"
                onClick={() =>
                  toggleFavorite({
                    id: listing.id,
                    title: listing.title,
                    priceCents: listing.priceCents,
                    currency: listing.currency,
                    image: listing.media?.[0]?.url ?? null,
                  })
                }
                aria-pressed={favoriteActive}
              >
                <Heart size={18} fill={favoriteActive ? 'currentColor' : 'none'} />
              </button>
              <div className="mt-6 flex min-h-[320px] items-center justify-center">
                <img
                  src={activeMedia ?? listing.media?.[0]?.url ?? '/assets/meoow/highlight-01.webp'}
                  alt={listing.title}
                  className="max-h-[280px] object-contain drop-shadow-2xl"
                />
              </div>
            </div>
            <div className="mt-5 flex flex-wrap gap-3">
              {(listing.media ?? []).map((media) => (
                <button
                  key={media.id}
                  type="button"
                  className={`grid h-20 w-20 place-items-center rounded-2xl border bg-slate-50 ${
                    activeMedia === media.url
                      ? 'border-meow-300 shadow-cute'
                      : 'border-slate-100'
                  }`}
                  onClick={() => setActiveMedia(media.url)}
                >
                  <img src={media.url} alt={media.type} className="h-14 w-14 object-cover" />
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-[28px] border border-slate-100 bg-white p-6 shadow-card">
            <h1 className="text-2xl font-black text-meow-charcoal">{listing.title}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-meow-muted">
              <div className="flex items-center gap-1 text-amber-400">
                {Array.from({ length: 5 }).map((_, index) => (
                  <Star key={`star-${index}`} size={14} fill="currentColor" />
                ))}
              </div>
              <span className="font-semibold text-meow-charcoal">
                {rating.toFixed(1)}
              </span>
              <span className="text-meow-muted">({reviews})</span>
              <span className="text-emerald-600">
                {listing.deliveryType === 'AUTO' ? 'Entrega automatica' : 'Entrega manual'}
              </span>
            </div>

            <div className="mt-6 rounded-2xl border border-meow-200 bg-meow-50 px-4 py-4">
              <span className="text-xs font-bold uppercase text-meow-muted">
                Escolha a edicao
              </span>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {[
                  { id: 'padrao', label: 'Padrao', price: listing.priceCents },
                  { id: 'deluxe', label: 'Deluxe (+1k V)', price: listing.priceCents },
                ].map((edition) => (
                  <button
                    key={edition.id}
                    type="button"
                    className={`rounded-2xl border px-4 py-3 text-sm font-semibold ${
                      edition.id === 'padrao'
                        ? 'border-meow-300 text-meow-deep shadow-cute'
                        : 'border-slate-100 text-meow-charcoal'
                    }`}
                  >
                    <div>{edition.label}</div>
                    <div className="text-xs text-meow-muted">
                      {formatCurrency(edition.price, listing.currency)}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-6">
              <div className="text-xs font-semibold text-meow-muted line-through">
                {formatCurrency(oldPriceCents, listing.currency)}
              </div>
              <div className="mt-1 flex items-center gap-2">
                <div className="text-3xl font-black text-meow-300">
                  {formatCurrency(listing.priceCents, listing.currency)}
                </div>
                <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">
                  -{discountPercent}%
                </span>
              </div>
            </div>

            <div className="mt-6 grid gap-3">
              <Link
                className={buttonVariants({ variant: 'primary', size: 'lg', className: 'w-full' })}
                href={`/checkout/${listing.id}`}
              >
                Comprar agora
              </Link>
              <button
                type="button"
                className={buttonVariants({ variant: 'secondary', size: 'lg', className: 'w-full' })}
                onClick={() =>
                  addToCart({
                    id: listing.id,
                    title: listing.title,
                    priceCents: listing.priceCents,
                    currency: listing.currency,
                    image: listing.media?.[0]?.url ?? null,
                  })
                }
              >
                Adicionar ao carrinho
              </button>
            </div>

            <div className="mt-6 grid gap-3 text-sm text-meow-muted">
              <div className="flex items-center justify-between rounded-2xl border border-slate-100 px-4 py-3">
                <span>SLA</span>
                <strong className="text-meow-charcoal">{listing.deliverySlaHours ?? 24}h</strong>
              </div>
              <div className="flex items-center justify-between rounded-2xl border border-slate-100 px-4 py-3">
                <span>Categoria</span>
                <strong className="text-meow-charcoal">{categoryLabel}</strong>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-10 rounded-[28px] border border-slate-100 bg-white p-6 shadow-card">
          <Tabs defaultValue="descricao">
            <TabsList>
              {tabs.map((tab) => (
                <TabsTrigger key={tab.id} value={tab.id}>
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value="descricao">
              <p>{listing.description ?? 'Descricao nao informada.'}</p>
            </TabsContent>
            <TabsContent value="avaliacoes">
              <p>Este anuncio ainda nao possui avaliacoes.</p>
            </TabsContent>
            <TabsContent value="duvidas">
              <p>Envie sua duvida no chat apos a compra.</p>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </section>
  );
};
