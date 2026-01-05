import { apiFetch } from './api-client';
import type { DeliveryType, ListingMedia, ListingStatus } from './marketplace-api';
import { products } from './site-data';

export type CatalogCategory = {
  slug: string;
  label: string;
  description: string;
  highlight: string;
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

export type PublicListingDetail = {
  listing: PublicListing | null;
  source: 'api' | 'fallback';
  error?: string;
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

export const fetchPublicListings = async (): Promise<PublicListingResponse> => {
  try {
    const listings = await apiFetch<PublicListing[]>('/public/listings');
    return {
      listings: listings.map(normalizeListing),
      source: 'api',
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Network error';
    return {
      listings: fallbackListings,
      source: 'fallback',
      error: message,
    };
  }
};

export const fetchPublicListing = async (id: string): Promise<PublicListingDetail> => {
  try {
    const listing = await apiFetch<PublicListing>(`/public/listings/${id}`);
    return { listing: normalizeListing(listing), source: 'api' };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Network error';
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
