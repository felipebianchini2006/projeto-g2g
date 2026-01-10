'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Heart } from 'lucide-react';

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
      const fallbackImage = '/assets/meoow/highlight-01.webp';
      const nextMedia = response.listing?.media?.[0]?.url ?? null;
      setActiveMedia(nextMedia ?? fallbackImage);
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
  const favoriteActive = isFavorite(listing.id);
  const tabs = [
    { id: 'descricao', label: 'Descricao' },
    { id: 'avaliacoes', label: 'Avaliacoes' },
    { id: 'duvidas', label: 'Duvidas' },
  ] as const;
  const fallbackImage = '/assets/meoow/highlight-01.webp';
  const mediaItems =
    listing.media && listing.media.length > 0
      ? listing.media.map((media) => ({
          id: media.id,
          url: media.url,
          type: media.type,
        }))
      : [{ id: 'fallback', url: fallbackImage, type: 'IMAGE' }];

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
              {state.source === 'fallback' ? (
                <span className="inline-flex rounded-full bg-meow-300 px-4 py-1 text-[11px] font-bold uppercase text-white shadow-cute">
                  Exclusivo
                </span>
              ) : null}
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
                  src={activeMedia ?? fallbackImage}
                  alt={listing.title}
                  className="max-h-[280px] object-contain drop-shadow-2xl"
                />
              </div>
            </div>
            <div className="mt-5 flex flex-wrap gap-3">
              {mediaItems.map((media) => (
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
            <div className="mt-2 text-sm text-meow-muted">
              {listing.deliveryType === 'AUTO' ? (
                <span className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">
                  Entrega automatica
                </span>
              ) : (
                <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                  Entrega manual
                </span>
              )}
            </div>

            <div className="mt-6">
              <div className="text-3xl font-black text-meow-300">
                {formatCurrency(listing.priceCents, listing.currency)}
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
              <p>Em breve.</p>
            </TabsContent>
            <TabsContent value="duvidas">
              <p>Em breve.</p>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </section>
  );
};
