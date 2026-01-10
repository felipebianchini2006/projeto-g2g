'use client';

import Link from 'next/link';
import { Heart, Zap } from 'lucide-react';

import { useSite } from '../site-context';

type ListingCardProps = {
  title: string;
  id: string;
  description?: string | null;
  priceCents: number;
  oldPriceCents?: number;
  currency: string;
  image: string;
  isAuto?: boolean;
  href: string;
  variant?: 'red' | 'dark';
};

const mediaVariants = {
  red: 'bg-[radial-gradient(circle_at_top,_#d8162f_0%,_#b51124_55%,_#8f0e1c_100%)]',
  dark: 'bg-[radial-gradient(circle_at_top,_#30414f_0%,_#1f2937_60%,_#111827_100%)]',
};

export const ListingCard = ({
  title,
  image,
  isAuto,
  href,
  variant = 'red',
  id,
  description,
  priceCents,
  oldPriceCents,
  currency,
}: ListingCardProps) => {
  const { isFavorite, toggleFavorite } = useSite();
  const favorite = isFavorite(id);
  const fallbackDescription = description?.trim() || 'Entrega segura e comprovada.';
  const showOldPrice = typeof oldPriceCents === 'number' && oldPriceCents > priceCents;
  const formatCurrency = (value: number, targetCurrency: string) =>
    new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: targetCurrency,
      maximumFractionDigits: 2,
    }).format(value / 100);

  return (
    <article className="group flex flex-col overflow-hidden rounded-[28px] border border-meow-red/10 bg-white shadow-card transition hover:-translate-y-1">
      <div className="relative p-4">
        <div
          className={`relative h-[230px] overflow-hidden rounded-[22px] ${mediaVariants[variant]}`}
        >
          <img
            src={image}
            alt={title}
            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-black/10 to-transparent" />
        </div>
        {isAuto ? (
          <span className="absolute left-8 top-8 inline-flex items-center gap-2 rounded-full bg-emerald-500 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.3px] text-white shadow-cute">
            <Zap size={12} aria-hidden />
            Entrega auto
          </span>
        ) : null}
        <button
          type="button"
          onClick={() =>
            toggleFavorite({
              id,
              title,
              priceCents,
              currency,
              image,
            })
          }
          className="absolute right-8 top-8 flex h-10 w-10 items-center justify-center rounded-full bg-white/95 text-meow-deep shadow-card"
          aria-label={favorite ? 'Remover favorito' : 'Salvar favorito'}
        >
          <Heart size={16} className={favorite ? 'fill-meow-deep' : ''} aria-hidden />
        </button>
      </div>
      <div className="flex flex-1 flex-col gap-4 px-6 pb-6">
        <div>
          <h3 className="text-lg font-extrabold text-meow-charcoal">{title}</h3>
          <p className="mt-2 text-sm text-slate-500">{fallbackDescription}</p>
        </div>
        {showOldPrice ? (
          <div className="text-xs text-slate-400 line-through">
            {formatCurrency(oldPriceCents, currency)}
          </div>
        ) : null}
        <div className="text-2xl font-black text-slate-900">
          {formatCurrency(priceCents, currency)}
        </div>
        <Link
          href={href}
          className="mt-auto inline-flex w-full items-center justify-center rounded-full bg-meow-indigo px-5 py-3 text-sm font-bold text-white shadow-cute transition hover:bg-meow-indigoDark"
        >
          Ver detalhes
        </Link>
      </div>
    </article>
  );
};
