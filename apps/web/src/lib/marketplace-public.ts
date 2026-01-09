import { apiFetch } from './api-client';
import type { DeliveryType, ListingMedia, ListingStatus } from './marketplace-api';
import { products } from './site-data';

export type CatalogCategory = {
  slug: string;
  label: string;
  description: string;
  highlight: string;
  listingsCount?: number;
};

export type PublicCategory = {
  id: string;
  slug: string;
  name: string;
  description?: string | null;
  listingsCount?: number;
};

export type PublicListing = {
  id: string;
  title: string;
  description?: string | null;
  priceCents: number;
  currency: string;
  status: ListingStatus;
  deliveryType: DeliveryType;
  deliverySlaHours?: number;
  refundPolicy?: string;
  media: ListingMedia[];
  categorySlug?: string;
  categoryLabel?: string;
  createdAt?: string;
};

export type PublicListingResponse = {
  listings: PublicListing[];
  source: 'api' | 'fallback';
  error?: string;
};

export type PublicCategoriesResponse = {
  categories: CatalogCategory[];
  source: 'api' | 'fallback';
  error?: string;
};

export type PublicListingDetail = {
  listing: PublicListing | null;
  source: 'api' | 'fallback';
  error?: string;
};

export type PublicListingFilters = {
  q?: string;
  category?: string;
  deliveryType?: DeliveryType;
  minPriceCents?: number;
  maxPriceCents?: number;
  sort?: 'recent' | 'price-asc' | 'price-desc' | 'title';
  skip?: number;
  take?: number;
};

export const catalogCategories: CatalogCategory[] = [
  {
    slug: 'consoles',
    label: 'Consoles',
    description: 'Bundles premium e edicoes especiais para colecionadores.',
    highlight: '/assets/meoow/highlight-01.webp',
  },
  {
    slug: 'perifericos',
    label: 'Perifericos',
    description: 'Teclados, mouses, headsets e upgrades para setups.',
    highlight: '/assets/meoow/highlight-02.webp',
  },
  {
    slug: 'colecionaveis',
    label: 'Colecionaveis',
    description: 'Itens raros, figuras e edicoes de aniversario.',
    highlight: '/assets/meoow/highlight-03.webp',
  },
  {
    slug: 'setup',
    label: 'Setup',
    description: 'Monitores, cadeiras e equipamentos para streamers.',
    highlight: '/assets/meoow/banner.png',
  },
];

const fallbackCategoryBySlug = new Map(
  catalogCategories.map((category) => [category.slug, category]),
);

const buildCatalogCategory = (category: PublicCategory): CatalogCategory => {
  const fallback = fallbackCategoryBySlug.get(category.slug);
  return {
    slug: category.slug,
    label: category.name,
    description:
      category.description ?? fallback?.description ?? 'Explore anuncios selecionados.',
    highlight: fallback?.highlight ?? '/assets/meoow/banner.png',
    listingsCount: category.listingsCount,
  };
};

const slugify = (value: string) =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');

const parsePriceToCents = (value: string) => {
  const digits = value.replace(/[^0-9]/g, '');
  if (!digits) {
    return 0;
  }
  return Number(digits);
};

const categoryRules: { slug: string; keywords: string[] }[] = [
  { slug: 'consoles', keywords: ['Console'] },
  { slug: 'perifericos', keywords: ['Teclado', 'Mouse', 'Headset', 'Controle'] },
  { slug: 'colecionaveis', keywords: ['Colecionavel'] },
  { slug: 'setup', keywords: ['Monitor', 'Cadeira', 'Soundbar', 'Router', 'Kit', 'SSD'] },
];

const resolveCategorySlug = (title: string) => {
  const match = categoryRules.find((rule) =>
    rule.keywords.some((keyword) => title.includes(keyword)),
  );
  return match?.slug ?? 'setup';
};

const getCategoryLabel = (slug?: string) => {
  if (!slug) {
    return 'Marketplace';
  }
  return catalogCategories.find((category) => category.slug === slug)?.label ?? slug;
};

const fallbackListings: PublicListing[] = products.map((product) => {
  const categorySlug = resolveCategorySlug(product.name);
  return {
    id: slugify(product.name),
    title: product.name,
    description: product.description,
    priceCents: parsePriceToCents(product.currentPrice),
    currency: 'BRL',
    status: 'PUBLISHED',
    deliveryType: product.autoDelivery ? 'AUTO' : 'MANUAL',
    deliverySlaHours: product.autoDelivery ? 2 : 24,
    refundPolicy: 'Reembolso disponivel enquanto o pedido estiver em aberto.',
    media: [
      {
        id: `media-${slugify(product.name)}`,
        url: product.image,
        type: 'IMAGE',
        position: 0,
      },
    ],
    categorySlug,
    categoryLabel: getCategoryLabel(categorySlug),
  };
});

const normalizeListing = (listing: PublicListing): PublicListing => {
  const categorySlug = listing.categorySlug ?? listing.categoryLabel;
  return {
    ...listing,
    categorySlug,
    categoryLabel: listing.categoryLabel ?? getCategoryLabel(categorySlug),
    media: listing.media?.length ? listing.media : [],
  };
};

const filterListings = (
  listings: PublicListing[],
  filters?: PublicListingFilters,
) => {
  if (!filters) {
    return listings;
  }
  const search = filters.q?.trim().toLowerCase() ?? '';
  const min = filters.minPriceCents ?? 0;
  const max = filters.maxPriceCents ?? Number.POSITIVE_INFINITY;

  const filtered = listings.filter((listing) => {
    const text = `${listing.title} ${listing.description ?? ''}`.toLowerCase();
    const matchesSearch = search ? text.includes(search) : true;
    const matchesCategory = filters.category
      ? listing.categorySlug === filters.category
      : true;
    const matchesDelivery = filters.deliveryType
      ? listing.deliveryType === filters.deliveryType
      : true;
    const matchesPrice = listing.priceCents >= min && listing.priceCents <= max;
    return matchesSearch && matchesCategory && matchesDelivery && matchesPrice;
  });

  const sorted = [...filtered].sort((a, b) => {
    if (filters.sort === 'price-asc') {
      return a.priceCents - b.priceCents;
    }
    if (filters.sort === 'price-desc') {
      return b.priceCents - a.priceCents;
    }
    if (filters.sort === 'title') {
      return a.title.localeCompare(b.title);
    }
    const aDate = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const bDate = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return bDate - aDate;
  });

  const skip = filters.skip ?? 0;
  const take = filters.take ?? sorted.length;
  return sorted.slice(skip, skip + take);
};

const buildListingQuery = (filters?: PublicListingFilters) => {
  if (!filters) {
    return '';
  }
  const params = new URLSearchParams();
  if (filters.q?.trim()) {
    params.set('q', filters.q.trim());
  }
  if (filters.category) {
    params.set('category', filters.category);
  }
  if (filters.deliveryType) {
    params.set('deliveryType', filters.deliveryType);
  }
  if (typeof filters.minPriceCents === 'number') {
    params.set('minPriceCents', `${filters.minPriceCents}`);
  }
  if (typeof filters.maxPriceCents === 'number') {
    params.set('maxPriceCents', `${filters.maxPriceCents}`);
  }
  if (filters.sort) {
    params.set('sort', filters.sort);
  }
  if (typeof filters.skip === 'number') {
    params.set('skip', `${filters.skip}`);
  }
  if (typeof filters.take === 'number') {
    params.set('take', `${filters.take}`);
  }
  return params.toString();
};

const fetchPublicApi = async <T>(path: string): Promise<T> => {
  if (typeof window === 'undefined') {
    return apiFetch<T>(path);
  }
  return apiFetch<T>(`/api${path}`, {}, '');
};

const fetchPublicListingApi = async (id: string): Promise<PublicListing> => {
  if (typeof window === 'undefined') {
    return apiFetch<PublicListing>(`/public/listings/${id}`);
  }
  const query = new URLSearchParams({ id }).toString();
  return apiFetch<PublicListing>(`/api/public/listing?${query}`, {}, '');
};

export const fetchPublicListings = async (
  filters?: PublicListingFilters,
): Promise<PublicListingResponse> => {
  try {
    const query = buildListingQuery(filters);
    const path = query ? `/public/listings?${query}` : '/public/listings';
    const listings = await fetchPublicApi<PublicListing[]>(path);
    return {
      listings: listings.map(normalizeListing),
      source: 'api',
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Network error';
    return {
      listings: filterListings(fallbackListings, filters),
      source: 'fallback',
      error: message,
    };
  }
};

export const fetchPublicCategories = async (): Promise<PublicCategoriesResponse> => {
  try {
    const categories = await fetchPublicApi<PublicCategory[]>('/public/categories');
    return {
      categories: categories.map(buildCatalogCategory),
      source: 'api',
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Network error';
    return {
      categories: catalogCategories,
      source: 'fallback',
      error: message,
    };
  }
};

export const fetchPublicListing = async (id: string): Promise<PublicListingDetail> => {
  try {
    const listing = await fetchPublicListingApi(id);
    return { listing: normalizeListing(listing), source: 'api' };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Network error';
    try {
      const listings = await fetchPublicApi<PublicListing[]>('/public/listings');
      const match = listings.find((item) => item.id === id);
      if (match) {
        return { listing: normalizeListing(match), source: 'api', error: message };
      }
    } catch {
      // Ignore list fallback errors and try static fallback.
    }
    const fallback =
      fallbackListings.find((item) => item.id === id) ??
      fallbackListings.find((item) => slugify(item.title) === id) ??
      null;
    return {
      listing: fallback,
      source: 'fallback',
      error: message,
    };
  }
};
