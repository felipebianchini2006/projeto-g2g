'use client';

import Link from 'next/link';
import { ChevronLeft, ChevronRight, Instagram, MessageCircle } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import { ListingCard } from '../listings/listing-card';
import { fetchPublicListings, type PublicListing } from '../../lib/marketplace-public';
import { features, franchises } from '../../lib/site-data';

const HERO_DOT_COUNT = 3;
const FRANCHISE_DOT_COUNT = 3;

export const HomeContent = () => {
  const heroDots = useMemo(() => Array.from({ length: HERO_DOT_COUNT }), []);
  const franchiseDots = useMemo(
    () => Array.from({ length: FRANCHISE_DOT_COUNT }),
    [],
  );
  const [heroIndex, setHeroIndex] = useState(0);
  const [franchiseIndex, setFranchiseIndex] = useState(0);
  const [highlightState, setHighlightState] = useState<{
    status: 'loading' | 'ready';
    error?: string;
    source: 'api' | 'fallback';
    listings: PublicListing[];
  }>({
    status: 'loading',
    source: 'api',
    listings: [],
  });

  useEffect(() => {
    const intervalId = setInterval(() => {
      setHeroIndex((prev) => (prev + 1) % HERO_DOT_COUNT);
    }, 5000);

    return () => clearInterval(intervalId);
  }, []);

  useEffect(() => {
    let active = true;
    const loadHighlights = async () => {
      const response = await fetchPublicListings();
      if (!active) {
        return;
      }
      setHighlightState({
        status: 'ready',
        listings: response.listings.slice(0, 4),
        source: response.source,
        error: response.error,
      });
    };
    loadHighlights().catch(() => {
      if (active) {
        setHighlightState((prev) => ({
          ...prev,
          status: 'ready',
          error: 'Nao foi possivel carregar destaques.',
        }));
      }
    });
    return () => {
      active = false;
    };
  }, []);

  const formatCurrency = (value: number, currency = 'BRL') =>
    new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
    }).format(value / 100);

  return (
    <>
      <section className="relative py-10">
        <div className="mx-auto w-full max-w-[1280px] px-6">
          <div className="relative overflow-hidden rounded-3xl shadow-[0_24px_50px_rgba(240,98,146,0.2)]">
            <img
              src="/assets/meoow/banner.png"
              alt="Banner principal"
              className="h-[480px] w-full object-cover"
            />
            <div className="absolute bottom-6 left-1/2 flex -translate-x-1/2 gap-2">
              {heroDots.map((_, index) => (
                <button
                  key={`hero-dot-${index}`}
                  type="button"
                  aria-label={`Ir para o slide ${index + 1}`}
                  className={`h-2 w-2 rounded-full transition ${
                    heroIndex === index ? 'bg-meow-gold' : 'bg-white/40'
                  }`}
                  onClick={() => setHeroIndex(index)}
                />
              ))}
            </div>
            <a
              href="#"
              className="absolute bottom-6 left-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-[linear-gradient(45deg,_#f7b8d1_0%,_#f2a4c3_35%,_#d86b95_70%,_#b35c82_100%)] text-white shadow-lg transition hover:scale-105"
              aria-label="Instagram"
            >
              <Instagram size={20} aria-hidden />
            </a>
          </div>
        </div>
      </section>

      <section className="-mt-10">
        <div className="mx-auto w-full max-w-[1280px] px-6">
          <div className="rounded-3xl bg-white shadow-meow">
            <div className="grid gap-6 p-6 md:grid-cols-2 xl:grid-cols-4">
              {features.map((feature) => (
                <div
                  className="flex items-center gap-4 rounded-2xl px-2 py-3 transition hover:bg-meow-cream/60"
                  key={feature.title}
                >
                  <div className="h-14 w-14 rounded-2xl border border-meow-deep/20 bg-[linear-gradient(135deg,_#ffd1e6_0%,_#ff9fc6_100%)]" />
                  <div>
                    <h4 className="text-sm font-extrabold uppercase">
                      {feature.title}
                    </h4>
                    <p className="text-xs text-meow-muted">{feature.subtitle}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="py-16">
        <div className="mx-auto w-full max-w-[1280px] px-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="text-center font-display text-4xl font-black md:text-left">
                Destaques da semana
              </h2>
              <p className="mt-2 text-sm text-meow-muted">
                Selecao com entregas rapidas e preco exclusivo.
              </p>
            </div>
            <Link
              href="/produtos"
              className="inline-flex items-center justify-center rounded-full border border-meow-red/30 px-5 py-2 text-sm font-bold text-meow-deep transition hover:bg-meow-cream"
            >
              Ver catalogo
            </Link>
          </div>

          {highlightState.status === 'loading' ? (
            <div className="mt-6 rounded-2xl bg-white p-4 text-sm text-meow-muted shadow-meow">
              Carregando destaques...
            </div>
          ) : null}
          {highlightState.error ? (
            <div className="mt-4 rounded-2xl border border-meow-red/30 bg-meow-cream/70 p-4 text-sm text-meow-muted">
              {highlightState.error}
              {highlightState.source === 'fallback'
                ? ' Usando catalogo local.'
                : null}
            </div>
          ) : null}

          <div className="mt-8 grid gap-8 md:grid-cols-2 xl:grid-cols-4">
            {highlightState.listings.map((listing, index) => (
              <ListingCard
                key={listing.id}
                title={listing.title}
                price={formatCurrency(listing.priceCents, listing.currency)}
                image={listing.media?.[0]?.url ?? '/assets/meoow/highlight-01.webp'}
                isAuto={listing.deliveryType === 'AUTO'}
                href={`/anuncios/${listing.id}`}
                variant={index % 2 === 0 ? 'red' : 'dark'}
              />
            ))}
          </div>
        </div>
      </section>

      <section className="pb-16">
        <div className="mx-auto w-full max-w-[1280px] px-6">
          <h2 className="text-center font-display text-4xl font-black">
            Qual deles tem o seu coracao?
          </h2>

          <div className="mt-8 flex items-center gap-6">
            <button
              className="hidden h-11 w-11 items-center justify-center rounded-full bg-white text-meow-deep shadow-meow transition hover:-translate-y-0.5 md:flex"
              type="button"
              aria-label="Pagina anterior"
              onClick={() => setFranchiseIndex((prev) => Math.max(0, prev - 1))}
            >
              <ChevronLeft size={18} aria-hidden />
            </button>

            <div className="grid flex-1 gap-6 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6">
              {franchises.map((franchise) => (
                <a
                  href="#"
                  className="group text-center transition"
                  key={franchise.name}
                >
                  <div className="mx-auto flex h-28 w-28 items-center justify-center rounded-full bg-[linear-gradient(135deg,_#f2a4c3_0%,_#f7b8d1_100%)] shadow-[0_12px_30px_rgba(216,107,149,0.24)] transition group-hover:-translate-y-2">
                    <img
                      src={franchise.image}
                      alt={franchise.name}
                      className="h-full w-full rounded-full object-cover"
                    />
                  </div>
                  <span className="mt-3 block text-sm font-bold">
                    {franchise.name}
                  </span>
                </a>
              ))}
            </div>

            <button
              className="hidden h-11 w-11 items-center justify-center rounded-full bg-white text-meow-deep shadow-meow transition hover:-translate-y-0.5 md:flex"
              type="button"
              aria-label="Proxima pagina"
              onClick={() =>
                setFranchiseIndex((prev) =>
                  Math.min(franchiseDots.length - 1, prev + 1),
                )
              }
            >
              <ChevronRight size={18} aria-hidden />
            </button>
          </div>

          <div className="mt-6 flex justify-center gap-2">
            {franchiseDots.map((_, index) => (
              <button
                key={`franchise-dot-${index}`}
                type="button"
                aria-label={`Selecionar pagina ${index + 1}`}
                className={`h-2 w-2 rounded-full ${
                  franchiseIndex === index ? 'bg-meow-deep' : 'bg-[#f1d9d1]'
                }`}
                onClick={() => setFranchiseIndex(index)}
              />
            ))}
          </div>
        </div>
      </section>

      <a
        href="#"
        className="fixed bottom-6 right-6 flex h-14 w-14 items-center justify-center rounded-full bg-[#25d366] text-white shadow-[0_10px_24px_rgba(37,211,102,0.4)] transition hover:-translate-y-1"
        aria-label="WhatsApp"
      >
        <MessageCircle size={22} aria-hidden />
      </a>
    </>
  );
};
