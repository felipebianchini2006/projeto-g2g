'use client';

import Link from 'next/link';
import { Heart, Zap } from 'lucide-react';

import { Badge } from '../ui/badge';
import { buttonVariants } from '../ui/button';
import { useSite } from '../site-context';
import type { PublicListing } from '../../lib/marketplace-public';

type HomeListingCardProps = {
  listing: PublicListing;
  image: string;
  href: string;
};

const formatCurrency = (value: number, currency = 'BRL') =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(value / 100);

export const HomeListingCard = ({ listing, image, href }: HomeListingCardProps) => {
  const { isFavorite, toggleFavorite } = useSite();
  const favorite = isFavorite(listing.id);
  const hasOldPrice =
    typeof listing.oldPriceCents === 'number' && listing.oldPriceCents > listing.priceCents;
  const discount = hasOldPrice
    ? Math.max(
      1,
      Math.round(
        (1 - listing.priceCents / Math.max(1, listing.oldPriceCents ?? 1)) * 100,
      ),
    )
    : null;

  return (
    <article className="group flex w-[260px] flex-none flex-col overflow-hidden rounded-[26px] border border-meow-red/10 bg-white shadow-card sm:w-[280px] lg:w-[300px]">
      <div className="relative p-4">
        <div className="relative h-[190px] overflow-hidden rounded-[20px] bg-[radial-gradient(circle_at_top,_#d8162f_0%,_#b51124_55%,_#8f0e1c_100%)]">
          <img
            src={image}
            alt={listing.title}
            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
          />
        </div>
        {listing.deliveryType === 'AUTO' ? (
          <Badge
            variant="success"
            className="absolute left-6 top-6 flex items-center gap-1 bg-emerald-500 text-[10px] font-bold uppercase tracking-[0.4px] text-white"
          >
            <Zap size={12} aria-hidden />
            Entrega auto
          </Badge>
        ) : null}
        <button
          type="button"
          onClick={() =>
            toggleFavorite({
              id: listing.id,
              title: listing.title,
              priceCents: listing.priceCents,
              currency: listing.currency,
              image,
            })
          }
          className="absolute right-6 top-6 flex h-9 w-9 items-center justify-center rounded-full bg-white/95 text-meow-deep shadow-card"
          aria-label={favorite ? 'Remover favorito' : 'Salvar favorito'}
        >
          <Heart size={16} className={favorite ? 'fill-meow-deep' : ''} aria-hidden />
        </button>
      </div>
      <div className="flex flex-1 flex-col gap-3 px-5 pb-5">
        <div>
          <h3 className="text-base font-extrabold text-meow-charcoal">
            {listing.title}
          </h3>
          <p className="mt-1 text-xs text-slate-500">
            {listing.description?.trim() || 'Entrega segura e comprovada.'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {hasOldPrice ? (
            <span className="text-xs text-slate-400 line-through">
              {formatCurrency(listing.oldPriceCents ?? 0, listing.currency)}
            </span>
          ) : null}
          {discount ? (
            <Badge variant="warning" className="text-[9px]">
              -{discount}%
            </Badge>
          ) : null}
        </div>
        <div className="text-2xl font-black text-slate-900">
          {formatCurrency(listing.priceCents, listing.currency)}
        </div>
        <Link
          href={href}
          className={buttonVariants({
            variant: 'primary',
            className:
              'mt-auto h-10 w-full rounded-full text-xs font-bold',
          })}
        >
          Ver detalhes
        </Link>
      </div>
    </article>
  );
};
