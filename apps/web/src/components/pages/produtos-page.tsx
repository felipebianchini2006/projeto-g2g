'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Search } from 'lucide-react';

import {
  catalogCategories,
  fetchPublicCategories,
  fetchPublicListings,
  type CatalogCategory,
  type PublicListing,
} from '../../lib/marketplace-public';
import { ListingCard } from '../listings/listing-card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Select } from '../ui/select';

type CatalogState = {
  status: 'loading' | 'ready';
  listings: PublicListing[];
  source: 'api' | 'fallback';
  error?: string;
};

const PAGE_SIZE = 8;

export const ProdutosContent = () => {
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
  const [page, setPage] = useState(1);

  useEffect(() => {
    const q = searchParams.get('q') ?? '';
    const tag = searchParams.get('tag');
    const knownCategory = categories.some((item) => item.slug === tag);
    const delivery = searchParams.get('delivery') ?? 'all';
    const sortParam = searchParams.get('sort') ?? 'recent';
    const min = searchParams.get('minPriceCents') ?? '';
    const max = searchParams.get('maxPriceCents') ?? '';
    const pageParam = Number(searchParams.get('page') ?? '1');
    const nextPage = Number.isNaN(pageParam) ? 1 : Math.max(1, pageParam);
    setQuery(q || (!knownCategory && tag ? tag : ''));
    setCategory(knownCategory && tag ? tag : 'all');
    setDeliveryType(delivery);
    setSort(sortParam);
    setMinPrice(min);
    setMaxPrice(max);
    setPage(nextPage);
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
      const pageParam = Number(searchParams.get('page') ?? '1');
      const resolvedPage = Number.isNaN(pageParam) ? 1 : Math.max(1, pageParam);
      const skip = (resolvedPage - 1) * PAGE_SIZE;
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
        skip,
        take: PAGE_SIZE,
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

  const buildParams = (targetPage = 1) => {
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
    if (targetPage > 1) {
      params.set('page', `${targetPage}`);
    }
    return params;
  };

  const applySearch = () => {
    const params = buildParams(1);
    const queryString = params.toString();
    router.push(queryString ? `/produtos?${queryString}` : '/produtos');
  };

  const handlePageChange = (nextPage: number) => {
    const params = buildParams(nextPage);
    const queryString = params.toString();
    router.push(queryString ? `/produtos?${queryString}` : '/produtos');
  };

  const hasNextPage = state.listings.length === PAGE_SIZE;

  return (
    <section className="bg-meow-gradient pb-16">
      <div className="mx-auto w-full max-w-[1240px] px-6 pt-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-meow-charcoal">Catalogo completo</h1>
            <p className="mt-2 text-sm text-meow-muted">
              Descubra anuncios com entrega imediata, kits premium e vantagens exclusivas.
            </p>
          </div>
          <Link
            href="/"
            className="rounded-full border border-meow-red/20 bg-white px-5 py-2 text-sm font-bold text-meow-deep shadow-card"
          >
            Voltar para home
          </Link>
        </div>

        <div className="mt-6 rounded-[28px] border border-meow-red/10 bg-white p-6 shadow-card">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex flex-1 items-center gap-3 rounded-full border border-meow-red/20 bg-meow-cream/80 px-4 py-2 shadow-[0_10px_24px_rgba(216,107,149,0.12)]">
              <Search size={16} className="text-meow-deep" aria-hidden />
              <input
                className="flex-1 bg-transparent text-sm text-meow-charcoal outline-none placeholder:text-meow-muted"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Anuncio, usuario ou categoria"
              />
            </div>
            <Select
              className="min-w-[210px] rounded-full border-meow-red/20 bg-white text-sm font-bold text-meow-charcoal"
              value={sort}
              onChange={(event) => setSort(event.target.value)}
            >
              <option value="recent">Mais recentes</option>
              <option value="price-asc">Menor preco</option>
              <option value="price-desc">Maior preco</option>
              <option value="title">Titulo A-Z</option>
            </Select>
            <Button variant="primary" onClick={applySearch}>
              Aplicar filtros
            </Button>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-[0.4px] text-meow-muted">
                Categoria
              </span>
              <Select
                className="mt-2 rounded-xl border-meow-red/20 bg-white text-sm font-semibold text-meow-charcoal"
                value={category}
                onChange={(event) => setCategory(event.target.value)}
              >
                <option value="all">Todas</option>
                {categories.map((cat) => (
                  <option key={cat.slug} value={cat.slug}>
                    {cat.label}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <span className="text-[11px] font-bold uppercase tracking-[0.4px] text-meow-muted">
                Entrega
              </span>
              <Select
                className="mt-2 rounded-xl border-meow-red/20 bg-white text-sm font-semibold text-meow-charcoal"
                value={deliveryType}
                onChange={(event) => setDeliveryType(event.target.value)}
              >
                <option value="all">Todas</option>
                <option value="AUTO">Entrega auto</option>
                <option value="MANUAL">Entrega manual</option>
              </Select>
            </div>
            <div>
              <span className="text-[11px] font-bold uppercase tracking-[0.4px] text-meow-muted">
                Preco minimo (centavos)
              </span>
              <Input
                className="mt-2 rounded-xl border-slate-200 bg-slate-50"
                type="number"
                min={0}
                value={minPrice}
                onChange={(event) => setMinPrice(event.target.value)}
                placeholder="Min"
              />
            </div>
            <div>
              <span className="text-[11px] font-bold uppercase tracking-[0.4px] text-meow-muted">
                Preco maximo (centavos)
              </span>
              <Input
                className="mt-2 rounded-xl border-slate-200 bg-slate-50"
                type="number"
                min={0}
                value={maxPrice}
                onChange={(event) => setMaxPrice(event.target.value)}
                placeholder="Max"
              />
            </div>
          </div>
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-black text-meow-charcoal">Resultados</h2>
            <p className="text-sm text-meow-muted">
              {state.listings.length} anuncios nesta pagina.
            </p>
          </div>
          {state.error ? (
            <span className="rounded-full bg-meow-100 px-3 py-1 text-xs font-bold text-meow-deep">
              {state.source === 'fallback' ? 'Modo offline' : 'API indisponivel'}
            </span>
          ) : null}
        </div>

        {state.error ? (
          <div className="mt-4 rounded-2xl border border-meow-red/20 bg-white px-4 py-3 text-sm text-meow-muted shadow-card">
            {state.error}
          </div>
        ) : null}

        {state.status === 'loading' ? (
          <div className="mt-4 rounded-2xl border border-meow-red/20 bg-white px-4 py-3 text-sm text-meow-muted shadow-card">
            Carregando catalogo...
          </div>
        ) : null}

        {state.listings.length === 0 && state.status === 'ready' ? (
          <div className="mt-4 rounded-2xl border border-meow-red/20 bg-white px-4 py-3 text-sm text-meow-muted shadow-card">
            Nenhum anuncio com esses filtros.
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
              image={listing.media?.[0]?.url ?? '/assets/meoow/highlight-02.webp'}
              isAuto={listing.deliveryType === 'AUTO'}
              href={`/anuncios/${listing.id}`}
              variant={index % 2 === 0 ? 'red' : 'dark'}
            />
          ))}
        </div>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <Button
            variant="secondary"
            disabled={page <= 1}
            onClick={() => handlePageChange(page - 1)}
          >
            Anterior
          </Button>
          <span className="text-xs font-semibold text-meow-muted">Pagina {page}</span>
          <Button
            variant="secondary"
            disabled={!hasNextPage}
            onClick={() => handlePageChange(page + 1)}
          >
            Proxima
          </Button>
        </div>
      </div>
    </section>
  );
};
