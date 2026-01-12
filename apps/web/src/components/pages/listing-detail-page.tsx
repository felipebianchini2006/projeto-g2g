'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Heart, ShoppingBag, ShoppingCart, Star } from 'lucide-react';

import { fetchPublicListing, type PublicListing } from '../../lib/marketplace-public';
import { useSite } from '../site-context';
import { Badge } from '../ui/badge';
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
  const [selectedEdition, setSelectedEdition] = useState<'standard' | 'deluxe'>(
    'standard',
  );
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
      const nextMedia = response.listing?.media?.[0]?.url ?? fallbackImage;
      setActiveMedia(nextMedia);
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
    { id: 'avaliacoes', label: 'Avaliacoes (42)' },
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
  const thumbnailItems = mediaItems.slice(0, 4);
  const remainingCount = Math.max(0, mediaItems.length - thumbnailItems.length);
  const editionDeltaCents = 1000;
  const editionLabel = selectedEdition === 'deluxe' ? 'Deluxe (+1k V)' : 'Padrão';
  const priceCents =
    selectedEdition === 'deluxe'
      ? listing.priceCents + editionDeltaCents
      : listing.priceCents;
  const oldPriceCents =
    typeof listing.oldPriceCents === 'number'
      ? listing.oldPriceCents +
        (selectedEdition === 'deluxe' ? editionDeltaCents : 0)
      : null;
  const discountPercent =
    oldPriceCents && oldPriceCents > priceCents
      ? Math.round((1 - priceCents / oldPriceCents) * 100)
      : null;

  return (
    <section className="bg-meow-50/60 pb-16 pt-10">
      <div className="mx-auto w-full max-w-[1200px] px-6">
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
          <div className="font-semibold">
            <Link href="/" className="text-slate-500 hover:text-meow-deep">
              Inicio
            </Link>{' '}
            &gt;{' '}
            <Link href="/categoria" className="text-slate-500 hover:text-meow-deep">
              {categoryLabel}
            </Link>{' '}
            &gt; <span className="text-slate-500">{listing.title}</span>
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
              <Badge
                variant="pink"
                className="absolute left-6 top-6 bg-[#f7a8c3] text-[10px] font-black uppercase text-white"
              >
                Exclusivo
              </Badge>
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
              <div className="mt-10 flex min-h-[320px] items-center justify-center">
                <img
                  src={activeMedia ?? fallbackImage}
                  alt={listing.title}
                  className="max-h-[280px] object-contain drop-shadow-2xl"
                />
              </div>
            </div>
            <div className="mt-5 flex flex-wrap gap-3">
              {thumbnailItems.map((media) => (
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
              {remainingCount > 0 ? (
                <div className="grid h-20 w-20 place-items-center rounded-2xl border border-slate-100 bg-white text-sm font-bold text-meow-muted">
                  +{remainingCount}
                </div>
              ) : null}
            </div>
          </div>

          <div className="rounded-[28px] border border-slate-100 bg-white p-6 shadow-card">
            <h1 className="text-2xl font-black text-meow-charcoal">{listing.title}</h1>
            <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-meow-muted">
              <div className="flex items-center gap-1 text-amber-400">
                {Array.from({ length: 5 }).map((_, index) => (
                  <Star key={`star-${index}`} size={16} fill="currentColor" />
                ))}
              </div>
              <span className="text-xs font-semibold text-slate-500">5.0 (42)</span>
              {listing.deliveryType === 'AUTO' ? (
                <Badge variant="success" className="bg-emerald-100 text-emerald-700">
                  Entrega automática
                </Badge>
              ) : null}
            </div>

            <div className="mt-6">
              <p className="text-sm font-semibold text-slate-500">Escolha a Edição:</p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {[
                  { id: 'standard', label: 'Padrão' },
                  { id: 'deluxe', label: 'Deluxe (+1k V)' },
                ].map((edition) => {
                  const isActive = selectedEdition === edition.id;
                  return (
                    <button
                      key={edition.id}
                      type="button"
                      onClick={() =>
                        setSelectedEdition(edition.id as 'standard' | 'deluxe')
                      }
                      className={`rounded-2xl border px-4 py-3 text-left text-sm font-semibold transition ${
                        isActive
                          ? 'border-meow-300 bg-meow-100/70 text-meow-deep'
                          : 'border-slate-100 bg-white text-meow-charcoal hover:border-meow-200'
                      }`}
                    >
                      <span className="block text-sm font-bold">{edition.label}</span>
                      <span className="mt-1 block text-xs text-slate-500">
                        {edition.id === 'deluxe'
                          ? 'Itens bonus para colecionar.'
                          : 'Conteudo base incluso.'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mt-6">
              <div className="flex flex-wrap items-center gap-2 text-sm text-slate-400">
                {oldPriceCents ? (
                  <span className="line-through">
                    De {formatCurrency(oldPriceCents, listing.currency)}
                  </span>
                ) : null}
                {discountPercent ? (
                  <Badge variant="success" className="text-[9px]">
                    -{discountPercent}%
                  </Badge>
                ) : null}
              </div>
              <div className="mt-2 text-3xl font-black text-meow-300">
                {formatCurrency(priceCents, listing.currency)}
              </div>
              <p className="mt-1 text-xs text-slate-500">{editionLabel}</p>
            </div>

            <div className="mt-6 grid gap-3">
              <Link
                className={buttonVariants({
                  variant: 'primary',
                  size: 'lg',
                  className: 'w-full gap-2 text-xs sm:text-sm',
                })}
                href={`/checkout/${listing.id}?variant=${selectedEdition}`}
              >
                <ShoppingBag size={18} aria-hidden />
                COMPRAR AGORA
              </Link>
              <button
                type="button"
                className={buttonVariants({
                  variant: 'secondary',
                  size: 'lg',
                  className: 'w-full gap-2 text-xs sm:text-sm',
                })}
                onClick={() =>
                  addToCart({
                    id: listing.id,
                    title: `${listing.title} - ${editionLabel}`,
                    priceCents,
                    currency: listing.currency,
                    image: listing.media?.[0]?.url ?? null,
                  })
                }
              >
                <ShoppingCart size={18} aria-hidden />
                Adicionar ao Carrinho
              </button>
            </div>
          </div>
        </div>

        <div className="mt-10 rounded-[28px] border border-slate-100 bg-white p-6 shadow-card">
          <Tabs defaultValue="descricao">
            <TabsList className="gap-2">
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
