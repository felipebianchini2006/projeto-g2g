'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

import {
  catalogCategories,
  fetchPublicListings,
  type PublicListing,
} from '../../lib/marketplace-public';
import { useSite } from '../site-context';

type CatalogState = {
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

export const ProdutosContent = () => {
  const { addToCart } = useSite();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [state, setState] = useState<CatalogState>({
    status: 'loading',
    listings: [],
    source: 'api',
  });
  const initialTag = searchParams.get('tag');
  const isKnownCategory = catalogCategories.some((item) => item.slug === initialTag);
  const [query, setQuery] = useState(
    searchParams.get('q') ?? (!isKnownCategory && initialTag ? initialTag : ''),
  );
  const [category, setCategory] = useState(isKnownCategory && initialTag ? initialTag : 'all');
  const [deliveryType, setDeliveryType] = useState('all');
  const [sort, setSort] = useState('recent');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');

  useEffect(() => {
    const q = searchParams.get('q') ?? '';
    const tag = searchParams.get('tag');
    const knownCategory = catalogCategories.some((item) => item.slug === tag);
    setQuery(q || (!knownCategory && tag ? tag : ''));
    setCategory(knownCategory && tag ? tag : 'all');
  }, [searchParams]);

  useEffect(() => {
    let active = true;
    const loadListings = async () => {
      const response = await fetchPublicListings();
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
    loadListings().catch(() => {
      if (active) {
        setState((prev) => ({
          ...prev,
          status: 'ready',
          error: 'Nao foi possivel carregar o catalogo.',
        }));
      }
    });
    return () => {
      active = false;
    };
  }, []);

  const filteredListings = useMemo(() => {
    const search = query.trim().toLowerCase();
    const min = minPrice ? Number(minPrice) : 0;
    const max = maxPrice ? Number(maxPrice) : Number.POSITIVE_INFINITY;

    const filtered = state.listings.filter((listing) => {
      const text = `${listing.title} ${listing.description ?? ''}`.toLowerCase();
      const matchesSearch = search ? text.includes(search) : true;
      const matchesCategory =
        category === 'all' ? true : listing.categorySlug === category;
      const matchesDelivery =
        deliveryType === 'all' ? true : listing.deliveryType === deliveryType;
      const matchesPrice = listing.priceCents >= min && listing.priceCents <= max;

      return matchesSearch && matchesCategory && matchesDelivery && matchesPrice;
    });

    const sorted = [...filtered].sort((a, b) => {
      if (sort === 'price-asc') {
        return a.priceCents - b.priceCents;
      }
      if (sort === 'price-desc') {
        return b.priceCents - a.priceCents;
      }
      if (sort === 'recent') {
        const aDate = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bDate = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return bDate - aDate;
      }
      return a.title.localeCompare(b.title);
    });

    return sorted;
  }, [state.listings, query, category, deliveryType, minPrice, maxPrice, sort]);

  const applySearch = () => {
    const params = new URLSearchParams();
    if (query.trim()) {
      params.set('q', query.trim());
    }
    if (category !== 'all') {
      params.set('tag', category);
    }
    const queryString = params.toString();
    router.push(queryString ? `/produtos?${queryString}` : '/produtos');
  };

  return (
    <section className="catalog-shell">
      <div className="container">
        <div className="catalog-hero">
          <div>
            <h1>Catalogo completo</h1>
            <p>
              Descubra anuncios com entrega imediata, kits premium e vantagens
              exclusivas.
            </p>
          </div>
          <Link href="/" className="ghost-button">
            Voltar para home
          </Link>
        </div>

        <div className="catalog-content">
          <aside className="catalog-filters">
            <div className="filter-group">
              <label htmlFor="search">Busca</label>
              <input
                id="search"
                className="filter-input"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Digite palavras-chave"
              />
            </div>
            <div className="filter-group">
              <label htmlFor="category">Categoria</label>
              <select
                id="category"
                className="filter-input"
                value={category}
                onChange={(event) => setCategory(event.target.value)}
              >
                <option value="all">Todas</option>
                {catalogCategories.map((cat) => (
                  <option key={cat.slug} value={cat.slug}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="filter-group">
              <label htmlFor="delivery">Entrega</label>
              <select
                id="delivery"
                className="filter-input"
                value={deliveryType}
                onChange={(event) => setDeliveryType(event.target.value)}
              >
                <option value="all">Todas</option>
                <option value="AUTO">Auto</option>
                <option value="MANUAL">Manual</option>
              </select>
            </div>
            <div className="filter-group">
              <label>Faixa de preco (centavos)</label>
              <div className="filter-grid">
                <input
                  className="filter-input"
                  type="number"
                  min={0}
                  value={minPrice}
                  onChange={(event) => setMinPrice(event.target.value)}
                  placeholder="Min"
                />
                <input
                  className="filter-input"
                  type="number"
                  min={0}
                  value={maxPrice}
                  onChange={(event) => setMaxPrice(event.target.value)}
                  placeholder="Max"
                />
              </div>
            </div>
            <div className="filter-group">
              <label htmlFor="sort">Ordenacao</label>
              <select
                id="sort"
                className="filter-input"
                value={sort}
                onChange={(event) => setSort(event.target.value)}
              >
                <option value="recent">Mais recentes</option>
                <option value="price-asc">Menor preco</option>
                <option value="price-desc">Maior preco</option>
                <option value="title">Titulo A-Z</option>
              </select>
            </div>
            <button className="primary-button" type="button" onClick={applySearch}>
              Aplicar filtros
            </button>
          </aside>

          <div className="catalog-results">
            <div className="results-header">
              <div>
                <h2>Resultados</h2>
                <p className="auth-helper">
                  {filteredListings.length} anuncios encontrados.
                </p>
              </div>
              {state.error ? (
                <span className="state-pill">
                  {state.source === 'fallback' ? 'Modo offline' : 'API indisponivel'}
                </span>
              ) : null}
            </div>
            {state.error ? <div className="state-card info">{state.error}</div> : null}

            {state.status === 'loading' ? (
              <div className="state-card">Carregando catalogo...</div>
            ) : null}

            {filteredListings.length === 0 && state.status === 'ready' ? (
              <div className="state-card">Nenhum anuncio com esses filtros.</div>
            ) : null}

            <div className="listing-grid">
              {filteredListings.map((listing) => (
                <article className="listing-card" key={listing.id}>
                  <div className="listing-media">
                    <img
                      src={listing.media?.[0]?.url ?? '/assets/meoow/highlight-02.webp'}
                      alt={listing.title}
                    />
                    <span className={`badge badge-${listing.deliveryType.toLowerCase()}`}>
                      {listing.deliveryType === 'AUTO' ? 'Auto' : 'Manual'}
                    </span>
                  </div>
                  <div className="listing-body">
                    <h3>{listing.title}</h3>
                    <p>{listing.description}</p>
                    <div className="listing-meta">
                      <span>{listing.categoryLabel ?? listing.categorySlug ?? 'Marketplace'}</span>
                      <span>{listing.status}</span>
                    </div>
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
          </div>
        </div>
      </div>
    </section>
  );
};
