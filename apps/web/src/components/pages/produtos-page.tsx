'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

import {
  catalogCategories,
  fetchPublicCategories,
  fetchPublicListings,
  type CatalogCategory,
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
  const [categories, setCategories] = useState<CatalogCategory[]>(catalogCategories);
  const [state, setState] = useState<CatalogState>({
    status: 'loading',
    listings: [],
    source: 'api',
  });
  const initialTag = searchParams.get('tag');
  const isKnownCategory = categories.some((item) => item.slug === initialTag);
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
    const knownCategory = categories.some((item) => item.slug === tag);
    const delivery = searchParams.get('delivery') ?? 'all';
    const sortParam = searchParams.get('sort') ?? 'recent';
    const min = searchParams.get('minPriceCents') ?? '';
    const max = searchParams.get('maxPriceCents') ?? '';
    setQuery(q || (!knownCategory && tag ? tag : ''));
    setCategory(knownCategory && tag ? tag : 'all');
    setDeliveryType(delivery);
    setSort(sortParam);
    setMinPrice(min);
    setMaxPrice(max);
  }, [categories, searchParams]);

  useEffect(() => {
    let active = true;
    const loadCategories = async () => {
      const response = await fetchPublicCategories();
      if (!active) {
        return;
      }
      setCategories(response.categories);
    };
    const loadListings = async () => {
      const categoryParam = searchParams.get('tag');
      const deliveryParam = searchParams.get('delivery');
      const min = searchParams.get('minPriceCents');
      const max = searchParams.get('maxPriceCents');
      const response = await fetchPublicListings({
        q: searchParams.get('q') ?? undefined,
        category: categoryParam && categoryParam !== 'all' ? categoryParam : undefined,
        deliveryType:
          deliveryParam && deliveryParam !== 'all'
            ? (deliveryParam as PublicListing['deliveryType'])
            : undefined,
        minPriceCents: min ? Number(min) : undefined,
        maxPriceCents: max ? Number(max) : undefined,
        sort: (searchParams.get('sort') as 'recent' | 'price-asc' | 'price-desc' | 'title') ?? 'recent',
      });
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
    loadCategories().catch(() => {
      if (active) {
        setCategories(catalogCategories);
      }
    });
    setState((prev) => ({ ...prev, status: 'loading' }));
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
  }, [searchParams]);

  const applySearch = () => {
    const params = new URLSearchParams();
    if (query.trim()) {
      params.set('q', query.trim());
    }
    if (category !== 'all') {
      params.set('tag', category);
    }
    if (deliveryType !== 'all') {
      params.set('delivery', deliveryType);
    }
    if (sort !== 'recent') {
      params.set('sort', sort);
    }
    if (minPrice) {
      params.set('minPriceCents', minPrice);
    }
    if (maxPrice) {
      params.set('maxPriceCents', maxPrice);
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
                {categories.map((cat) => (
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
                  {state.listings.length} anuncios encontrados.
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

            {state.listings.length === 0 && state.status === 'ready' ? (
              <div className="state-card">Nenhum anuncio com esses filtros.</div>
            ) : null}

            <div className="listing-grid">
              {state.listings.map((listing) => (
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
