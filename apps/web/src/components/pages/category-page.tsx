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
import { useSite } from '../site-context';

type CategoryContentProps = {
  slug: string;
};

type CategoryState = {
  status: 'loading' | 'ready';
  listings: PublicListing[];
  source: 'api' | 'fallback';
  error?: string;
};

const formatCurrency = (value: number, currency = 'BRL') =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(value / 100);

export const CategoryContent = ({ slug }: CategoryContentProps) => {
  const { addToCart } = useSite();
  const [categories, setCategories] = useState<CatalogCategory[]>(catalogCategories);
  const [state, setState] = useState<CategoryState>({
    status: 'loading',
    listings: [],
    source: 'api',
  });

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
      const response = await fetchPublicListings({ category: slug });
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
          error: 'Nao foi possivel carregar a categoria.',
        }));
      }
    });
    return () => {
      active = false;
    };
  }, [slug]);

  return (
    <section className="catalog-shell">
      <div className="container">
        <div className="category-hero">
          <div>
            <h1>{category?.label ?? 'Categoria'}</h1>
            <p>{category?.description ?? 'Explore anuncios selecionados.'}</p>
          </div>
          <img src={category?.highlight ?? '/assets/meoow/banner.png'} alt={slug} />
        </div>

        <div className="catalog-actions">
          <Link href="/produtos" className="ghost-button">
            Voltar ao catalogo
          </Link>
        </div>

        {state.status === 'loading' ? (
          <div className="state-card">Carregando anuncios...</div>
        ) : null}
        {state.error ? (
          <div className="state-card info">
            {state.error}
            {state.source === 'fallback' ? ' Usando catalogo local.' : null}
          </div>
        ) : null}

        <div className="listing-grid">
          {state.listings.map((listing) => (
            <article className="listing-card" key={listing.id}>
              <div className="listing-media">
                <img
                  src={listing.media?.[0]?.url ?? '/assets/meoow/highlight-01.webp'}
                  alt={listing.title}
                />
                <span className={`badge badge-${listing.deliveryType.toLowerCase()}`}>
                  {listing.deliveryType === 'AUTO' ? 'Auto' : 'Manual'}
                </span>
              </div>
              <div className="listing-body">
                <h3>{listing.title}</h3>
                <p>{listing.description}</p>
                <div className="listing-price">
                  {formatCurrency(listing.priceCents, listing.currency)}
                </div>
                <div className="listing-actions">
                  <Link className="ghost-button" href={`/anuncios/${listing.id}`}>
                    Ver anuncio
                  </Link>
                  <button
                    className="primary-button"
                    type="button"
                    onClick={() => addToCart(listing.title)}
                  >
                    Comprar
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>

        {state.listings.length === 0 && state.status === 'ready' ? (
          <div className="state-card">Nenhum anuncio nessa categoria.</div>
        ) : null}
      </div>
    </section>
  );
};
