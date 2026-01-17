'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Heart, Search, ShoppingCart, Star } from 'lucide-react';

import { AccountShell } from '../../../../components/account/account-shell';
import { HomeListingCard } from '../../../../components/listings/home-listing-card';
import { useSite } from '../../../../components/site-context';
import { Badge } from '../../../../components/ui/badge';
import { Button } from '../../../../components/ui/button';
import { Input } from '../../../../components/ui/input';
import {
  fetchPublicListings,
  type PublicListing,
} from '../../../../lib/marketplace-public';

const formatCurrency = (value: number, currency = 'BRL') =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(value / 100);

export default function Page() {
  const { favorites, toggleFavorite, addToCart } = useSite();
  const [searchTerm, setSearchTerm] = useState('');
  const [recommendations, setRecommendations] = useState<PublicListing[]>([]);

  useEffect(() => {
    let active = true;
    const loadRecommendations = async () => {
      const response = await fetchPublicListings({ take: 4 });
      if (!active) {
        return;
      }
      setRecommendations(response.listings.slice(0, 4));
    };
    loadRecommendations().catch(() => {
      if (active) {
        setRecommendations([]);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  const filteredFavorites = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();
    if (!search) {
      return favorites;
    }
    return favorites.filter((item) => item.title.toLowerCase().includes(search));
  }, [favorites, searchTerm]);

  return (
    <AccountShell
      breadcrumbs={[
        { label: 'Inicio', href: '/' },
        { label: 'Conta', href: '/conta' },
        { label: 'Favoritos' },
      ]}
    >
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/conta"
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-meow-charcoal shadow-card"
            >
              Voltar
            </Link>
            <h1 className="text-3xl font-black text-meow-charcoal">Meus favoritos</h1>
            <Badge variant="pink" className="px-4 py-2 text-xs">
              {favorites.length}
            </Badge>
          </div>
          <div className="relative flex-1 min-w-[220px] max-w-[360px]">
            <Search
              size={16}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
              aria-hidden
            />
            <Input
              className="pl-10"
              placeholder="Buscar favoritos..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
          </div>
        </div>

        {filteredFavorites.length === 0 ? (
          <div className="rounded-[26px] border border-slate-100 bg-meow-50 px-6 py-10 text-center">
            <p className="text-sm font-semibold text-meow-charcoal">
              Nenhum favorito salvo ainda.
            </p>
            <p className="mt-2 text-xs text-meow-muted">
              Explore anuncios e salve seus itens preferidos.
            </p>
            <Link
              href="/produtos"
              className="mt-4 inline-flex rounded-full bg-meow-linear px-5 py-2 text-xs font-bold text-white"
            >
              Explorar anuncios
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredFavorites.map((item) => (
              <article
                key={item.id}
                className="group relative overflow-hidden rounded-[26px] border border-slate-100 bg-white p-4 shadow-card"
              >
                <button
                  type="button"
                  onClick={() =>
                    toggleFavorite({
                      id: item.id,
                      title: item.title,
                      priceCents: item.priceCents,
                      currency: item.currency,
                      image: item.image ?? null,
                    })
                  }
                  className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-full bg-white text-meow-deep shadow-card"
                  aria-label="Remover favorito"
                >
                  <Heart size={16} className="fill-meow-deep" aria-hidden />
                </button>
                <Link href={`/anuncios/${item.id}`}>
                  <div className="h-44 overflow-hidden rounded-2xl bg-slate-100">
                    <img
                      src={item.image ?? '/assets/meoow/highlight-01.webp'}
                      alt={item.title}
                      className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                    />
                  </div>
                  <div className="mt-4">
                    <h3 className="text-base font-bold text-meow-charcoal">
                      {item.title}
                    </h3>
                    <div className="mt-2 flex items-center gap-1 text-amber-400">
                      {Array.from({ length: 5 }).map((_, index) => (
                        <Star key={`${item.id}-star-${index}`} size={14} fill="currentColor" />
                      ))}
                      <span className="ml-2 text-xs font-semibold text-slate-400">
                        5.0
                      </span>
                    </div>
                    <div className="mt-3 text-xl font-black text-meow-charcoal">
                      {formatCurrency(item.priceCents, item.currency)}
                    </div>
                  </div>
                </Link>
                <Button
                  className="mt-4 w-full justify-start gap-2 pl-4"
                  size="sm"
                  onClick={() =>
                    addToCart({
                      id: item.id,
                      title: item.title,
                      priceCents: item.priceCents,
                      currency: item.currency,
                      image: item.image ?? null,
                    })
                  }
                >
                  <ShoppingCart size={16} aria-hidden />
                  Adicionar ao carrinho
                </Button>
              </article>
            ))}
          </div>
        )}

        <section className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-black text-meow-charcoal">Destaques para voce</h2>
              <p className="text-xs text-meow-muted">
                Recomendacoes com base nos seus interesses.
              </p>
            </div>
            <Link href="/produtos" className="text-xs font-bold text-meow-deep">
              Ver mais
            </Link>
          </div>
          <div className="flex flex-wrap gap-4">
            {recommendations.map((listing) => (
              <HomeListingCard
                key={listing.id}
                listing={listing}
                image={listing.media?.[0]?.url ?? '/assets/meoow/highlight-02.webp'}
                href={`/anuncios/${listing.id}`}
              />
            ))}
          </div>
        </section>
      </div>
    </AccountShell>
  );
}
