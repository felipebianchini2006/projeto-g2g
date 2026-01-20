'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import {
  BadgePercent,
  ChevronLeft,
  ChevronRight,
  Package,
  ShieldCheck,
  Truck,
} from 'lucide-react';

import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import {
  fetchPublicCategories,
  fetchPublicListings,
  type CatalogCategory,
  type PublicListing,
} from '../../lib/marketplace-public';
import { HomeListingCard } from '../listings/home-listing-card';

const benefits = [
  {
    icon: Truck,
    title: 'Entrega garantida',
    description: 'Receba seu produto',
  },
  {
    icon: ShieldCheck,
    title: 'Segurança',
    description: 'Site seguro',
  },
  {
    icon: Package,
    title: 'Entrega rapida',
    description: 'Receba rapidamente',
  },
  {
    icon: ShieldCheck,
    title: 'Variedade',
    description: 'Compre e venda',
  },
];


const promoBanners = [
  {
    title: 'Xbox',
    href: '/produtos?category=xbox',
    image: null,
    tone: 'from-[#0b3d1f] via-[#0f5a2f] to-[#0b3d1f]',
    categorySlug: 'xbox',
  },
  {
    title: 'PlayStation',
    href: '/produtos?category=playstation',
    image: null,
    tone: 'from-[#0a1f44] via-[#10346b] to-[#0a1f44]',
    categorySlug: 'playstation',
  },
  {
    title: 'Nintendo',
    href: '/produtos?category=nintendo',
    image: null,
    tone: 'from-[#9b1720] via-[#d32330] to-[#9b1720]',
    categorySlug: 'nintendo',
  },
  {
    title: 'WhatsApp',
    href: '/conta/ajuda',
    image: null,
    tone: 'from-[#0f5a2f] via-[#1f9d55] to-[#0f5a2f]',
    categorySlug: 'whatsapp',
  },
];

const getListingImage = (listing: PublicListing) =>
  listing.media?.[0]?.url ?? '/assets/meoow/highlight-01.webp';

export const HomeContent = () => {
  const [featuredListings, setFeaturedListings] = useState<PublicListing[]>([]);
  const [mustHaveListings, setMustHaveListings] = useState<PublicListing[]>([]);
  const [featuredStatus, setFeaturedStatus] = useState<'idle' | 'loading' | 'ready'>(
    'idle',
  );
  const [mustHaveStatus, setMustHaveStatus] = useState<'idle' | 'loading' | 'ready'>(
    'idle',
  );
  const [heartCategories, setHeartCategories] = useState<CatalogCategory[]>([]);
  const [heartsStatus, setHeartsStatus] = useState<'idle' | 'loading' | 'ready'>(
    'idle',
  );

  const heartsRef = useRef<HTMLDivElement | null>(null);
  const featuredRef = useRef<HTMLDivElement | null>(null);
  const mustHaveRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let active = true;
    const loadListings = async () => {
      setFeaturedStatus('loading');
      setMustHaveStatus('loading');
      setHeartsStatus('loading');

      const [categoriesResponse, featuredResponse, mustHaveResponse] = await Promise.all([
        fetchPublicCategories(),
        fetchPublicListings({ take: 8, featured: true }),
        fetchPublicListings({ take: 8, mustHave: true }),
      ]);

      if (!active) {
        return;
      }

      setHeartCategories(categoriesResponse.categories);
      setHeartsStatus('ready');

      setFeaturedListings(
        featuredResponse.source === 'api' ? featuredResponse.listings : [],
      );
      setMustHaveListings(
        mustHaveResponse.source === 'api' ? mustHaveResponse.listings : [],
      );
      setFeaturedStatus('ready');
      setMustHaveStatus('ready');
    };
    loadListings().catch(() => {
      if (active) {
        setHeartCategories([]);
        setHeartsStatus('ready');
        setFeaturedListings([]);
        setMustHaveListings([]);
        setFeaturedStatus('ready');
        setMustHaveStatus('ready');
      }
    });
    return () => {
      active = false;
    };
  }, []);

  const scrollRow = (ref: RefObject<HTMLDivElement | null>, amount: number) => {
    ref.current?.scrollBy({ left: amount, behavior: 'smooth' });
  };

  const featuredCards = useMemo(
    () =>
      featuredListings.map((listing) => (
        <HomeListingCard
          key={listing.id}
          listing={listing}
          image={getListingImage(listing)}
          href={`/anuncios/${listing.id}`}
        />
      )),
    [featuredListings],
  );

  const mustHaveCards = useMemo(
    () =>
      mustHaveListings.map((listing) => (
        <HomeListingCard
          key={`${listing.id}-must`}
          listing={listing}
          image={getListingImage(listing)}
          href={`/anuncios/${listing.id}`}
        />
      )),
    [mustHaveListings],
  );

  const promoBannersToShow = useMemo(() => {
    if (!heartCategories.length) {
      return [];
    }
    const categorySlugs = new Set(heartCategories.map((category) => category.slug));
    return promoBanners.filter((banner) => categorySlugs.has(banner.categorySlug));
  }, [heartCategories]);

  return (
    <div className="pb-16">
      <section className="pb-10 pt-6">
        <div className="w-full">
          <div className="relative overflow-hidden bg-[#f5d6e5]">
            <div className="flex h-[52vw] min-h-[180px] max-h-[560px] items-center justify-center sm:h-[38vw] lg:h-[28vw]">
              <img
                src="/assets/meoow/banner.png"
                alt="Personagens em destaque"
                className="h-full w-full object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      <section className="px-6 pb-10">
        <div className="mx-auto w-full max-w-[1280px]">
          <div className="grid gap-4 rounded-2xl border border-meow-red/10 bg-white px-6 py-5 shadow-[0_14px_34px_rgba(216,107,149,0.12)] sm:grid-cols-2 lg:grid-cols-4">
            {benefits.map((item, index) => (
              <div key={index} className="flex flex-col items-center gap-3 text-center">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-meow-cream/70 text-meow-deep">
                  <item.icon size={22} aria-hidden />
                </span>
                <div className="space-y-1">
                  <p className="text-sm font-bold leading-snug text-meow-charcoal">{item.title}</p>
                  <p className="text-xs leading-relaxed text-meow-muted">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 pb-12">
        <div className="mx-auto w-full max-w-[1280px]">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h2 className="text-2xl font-black text-meow-charcoal">
              Qual deles tem o seu coracao?
            </h2>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="icon"
                aria-label="Voltar"
                onClick={() => scrollRow(heartsRef, -280)}
              >
                <ChevronLeft size={16} aria-hidden />
              </Button>
              <Button
                variant="secondary"
                size="icon"
                aria-label="Avancar"
                onClick={() => scrollRow(heartsRef, 280)}
              >
                <ChevronRight size={16} aria-hidden />
              </Button>
            </div>
          </div>
          {heartsStatus === 'ready' && heartCategories.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-meow-red/10 bg-white px-5 py-4 text-sm text-meow-muted">
              Nenhuma categoria disponivel no momento.
            </div>
          ) : (
            <div
              ref={heartsRef}
              className="mt-6 flex gap-5 overflow-x-auto pb-3 pt-1 scroll-smooth"
            >
              {heartCategories.map((item) => {
                const initials = item.label
                  .split(' ')
                  .map((part) => part[0])
                  .join('')
                  .slice(0, 2)
                  .toUpperCase();
                return (
                  <div
                    key={item.id ?? item.slug}
                    className="flex min-w-[144px] flex-col items-center gap-4"
                  >
                    <div className="flex h-32 w-32 items-center justify-center rounded-full bg-meow-deep text-3xl font-black text-white shadow-[0_16px_30px_rgba(255,107,149,0.35)] transition duration-300 hover:scale-105">
                      {initials}
                    </div>
                    <span className="text-sm font-bold text-meow-charcoal">
                      {item.label}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      <section className="px-6 pb-8">
        <div className="mx-auto w-full max-w-[1280px]">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h2 className="text-2xl font-black text-meow-charcoal">Destaques</h2>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="icon"
                aria-label="Voltar"
                onClick={() => scrollRow(featuredRef, -320)}
              >
                <ChevronLeft size={16} aria-hidden />
              </Button>
              <Button
                variant="secondary"
                size="icon"
                aria-label="Avancar"
                onClick={() => scrollRow(featuredRef, 320)}
              >
                <ChevronRight size={16} aria-hidden />
              </Button>
            </div>
          </div>
          {featuredStatus === 'ready' && featuredListings.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-meow-red/10 bg-white px-5 py-4 text-sm text-meow-muted">
              Nenhum destaque disponivel no momento.
            </div>
          ) : (
            <div
              ref={featuredRef}
              className="mt-6 flex gap-5 overflow-x-auto pb-4 pt-1 scroll-smooth mx-auto w-fit max-w-full"
            >
              {featuredCards}
            </div>
          )}
        </div>
      </section>

      <div className="px-6">
        <div className="mx-auto w-full max-w-[1280px]">
          <div className="h-3 w-full rounded-full bg-gradient-to-r from-[#f39abc] via-[#f6b6cf] to-[#f39abc]" />
        </div>
      </div>

      <section className="px-6 pb-10 pt-8">
        <div className="mx-auto w-full max-w-[1280px]">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h2 className="text-2xl font-black text-meow-charcoal">Imperdiveis</h2>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="icon"
                aria-label="Voltar"
                onClick={() => scrollRow(mustHaveRef, -320)}
              >
                <ChevronLeft size={16} aria-hidden />
              </Button>
              <Button
                variant="secondary"
                size="icon"
                aria-label="Avancar"
                onClick={() => scrollRow(mustHaveRef, 320)}
              >
                <ChevronRight size={16} aria-hidden />
              </Button>
            </div>
          </div>
          {mustHaveStatus === 'ready' && mustHaveListings.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-meow-red/10 bg-white px-5 py-4 text-sm text-meow-muted">
              Nenhum item imperdivel no momento.
            </div>
          ) : (
            <div
              ref={mustHaveRef}
              className="mt-6 flex gap-5 overflow-x-auto pb-4 pt-1 scroll-smooth"
            >
              {mustHaveCards}
            </div>
          )}
        </div>
      </section>

      {promoBannersToShow.length ? (
        <section className="px-6 pb-12">
          <div className="mx-auto w-full max-w-[1280px]">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {promoBannersToShow.map((item) => (
                <Link
                  key={item.title}
                  href={item.href}
                  className={`group relative flex min-h-[160px] flex-col justify-between overflow-hidden rounded-[26px] bg-gradient-to-br ${item.tone} p-5 text-white shadow-[0_16px_32px_rgba(0,0,0,0.2)] transition hover:-translate-y-1`}
                >
                  <div className="absolute inset-0 opacity-25">
                    {item.image ? (
                      <img
                        src={item.image}
                        alt={item.title}
                        className="h-full w-full object-cover"
                      />
                    ) : null}
                  </div>
                  <div className="relative z-10">
                    <span className="text-xs uppercase tracking-[0.6px] text-white/80">
                      Categoria
                    </span>
                    <h3 className="mt-2 text-2xl font-black">{item.title}</h3>
                  </div>
                  <Badge
                    variant="neutral"
                    className="relative z-10 w-fit bg-white/90 text-[11px] font-bold uppercase tracking-[0.4px] text-slate-800"
                  >
                    Ver ofertas
                  </Badge>
                </Link>
              ))}
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
};
