'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

import {
  catalogCategories,
  fetchPublicCategories,
  fetchPublicListings,
  type CatalogCategory,
  type PublicListing,
} from '../../lib/marketplace-public';
import { ListingCard } from '../listings/listing-card';
import { Button } from '../ui/button';

type CategoryContentProps = {
  slug: string;
};

type CategoryState = {
  status: 'loading' | 'ready';
  listings: PublicListing[];
  source: 'api' | 'fallback';
  error?: string;
};

const PAGE_SIZE = 8;

export const CategoryContent = ({ slug }: CategoryContentProps) => {
  const [categories, setCategories] = useState<CatalogCategory[]>(catalogCategories);
  const [state, setState] = useState<CategoryState>({
    status: 'loading',
    listings: [],
    source: 'api',
  });
  const [page, setPage] = useState(1);

  const category = useMemo(
    () => categories.find((item) => item.slug === slug),
    [categories, slug],
  );

  useEffect(() => {
    let active = true;
    const loadCategory = async () => {
      const response = await fetchPublicCategories();
      if (!active) {
        return;
      }
      setCategories(response.categories);
    };
    const loadListings = async () => {
      const skip = (page - 1) * PAGE_SIZE;
      const response = await fetchPublicListings({ category: slug, skip, take: PAGE_SIZE });
      if (!active) {
        return;
      }
      setState({
        status: 'ready',
        listings: response.listings,
        source: response.source,
        error: response.error,
      });
    };
    loadCategory().catch(() => {
      if (active) {
        setCategories(catalogCategories);
      }
    });
    loadListings().catch(() => {
      if (active) {
        setState((prev) => ({
          ...prev,
          status: 'ready',
          error: 'Não foi possível carregar a categoria.',
        }));
      }
    });
    return () => {
      active = false;
    };
  }, [page, slug]);

  useEffect(() => {
    setPage(1);
  }, [slug]);

  const hasNextPage = state.listings.length === PAGE_SIZE;

  return (
    <section className="bg-meow-gradient pb-16">
      <div className="mx-auto w-full max-w-[1240px] px-6 pt-10">
        <div className="rounded-3xl border border-meow-red/10 bg-white p-6 shadow-card">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-black text-meow-charcoal">
                {category?.label ?? 'Categoria'}
              </h1>
              <p className="mt-2 text-sm text-meow-muted">
                {category?.description ?? 'Explore anúncios selecionados.'}
              </p>
            </div>
            <img
              src={category?.highlight ?? '/assets/meoow/banner.png'}
              alt={slug}
              className="h-24 w-36 rounded-2xl object-cover"
            />
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between">
          <Link
            href="/produtos"
            className="rounded-full border border-meow-red/20 bg-white px-5 py-2 text-sm font-bold text-meow-deep shadow-card"
          >
            Voltar ao catalogo
          </Link>
          {state.error ? (
            <span className="rounded-full bg-meow-100 px-3 py-1 text-xs font-bold text-meow-deep">
              {state.source === 'fallback' ? 'Modo offline' : 'API indisponivel'}
            </span>
          ) : null}
        </div>

        {state.status === 'loading' ? (
          <div className="mt-4 rounded-2xl border border-meow-red/20 bg-white px-4 py-3 text-sm text-meow-muted shadow-card">
            Carregando anúncios...
          </div>
        ) : null}
        {state.error ? (
          <div className="mt-4 rounded-2xl border border-meow-red/20 bg-white px-4 py-3 text-sm text-meow-muted shadow-card">
            {state.error}
            {state.source === 'fallback' ? ' Usando catalogo local.' : null}
          </div>
        ) : null}

        <div className="mt-8 grid gap-8 sm:grid-cols-2 xl:grid-cols-3">
          {state.listings.map((listing, index) => (
            <ListingCard
              key={listing.id}
              id={listing.id}
              title={listing.title}
              description={listing.description}
              priceCents={listing.priceCents}
              oldPriceCents={listing.oldPriceCents}
              currency={listing.currency}
              image={listing.media?.[0]?.url ?? '/assets/meoow/highlight-01.webp'}
              isAuto={listing.deliveryType === 'AUTO'}
              href={`/anuncios/${listing.id}`}
              variant={index % 2 === 0 ? 'red' : 'dark'}
            />
          ))}
        </div>

        {state.listings.length === 0 && state.status === 'ready' ? (
          <div className="mt-4 rounded-2xl border border-meow-red/20 bg-white px-4 py-3 text-sm text-meow-muted shadow-card">
            Nenhum anúncio nessa categoria.
          </div>
        ) : null}

        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <Button variant="secondary" disabled={page <= 1} onClick={() => setPage(page - 1)}>
            Anterior
          </Button>
          <span className="text-xs font-semibold text-meow-muted">Página {page}</span>
          <Button
            variant="secondary"
            disabled={!hasNextPage}
            onClick={() => setPage(page + 1)}
          >
            Proxima
          </Button>
        </div>
      </div>
    </section>
  );
};
