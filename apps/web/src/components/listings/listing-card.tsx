'use client';

import Link from 'next/link';
import { Heart, Zap } from 'lucide-react';

import { useSite } from '../site-context';

type ListingCardProps = {
  title: string;
  price: string;
  image: string;
  isAuto?: boolean;
  href: string;
  variant?: 'red' | 'dark';
  id: string;
  priceCents: number;
  currency: string;
};

const mediaVariants = {
  red: 'bg-[radial-gradient(circle_at_top,_#d8162f_0%,_#b51124_55%,_#8f0e1c_100%)]',
  dark: 'bg-[radial-gradient(circle_at_top,_#30414f_0%,_#1f2937_60%,_#111827_100%)]',
};

export const ListingCard = ({
  title,
  price,
  image,
  isAuto,
  href,
  variant = 'red',
  id,
  priceCents,
  currency,
}: ListingCardProps) => {
  const { isFavorite, toggleFavorite } = useSite();
  const favorite = isFavorite(id);

  return (
    <article className="flex flex-col overflow-hidden rounded-[22px] bg-white shadow-meow transition-transform hover:-translate-y-1.5">
      <div
        className={`relative flex h-[240px] items-center justify-center ${mediaVariants[variant]}`}
      >
        {isAuto ? (
          <span className="absolute left-4 top-4 inline-flex items-center gap-2 rounded-full bg-green-600 px-3 py-1 text-xs font-bold uppercase text-white shadow-[0_10px_20px_rgba(22,163,74,0.35)]">
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
          className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-meow-deep shadow-[0_10px_20px_rgba(15,23,42,0.18)]"
          aria-label={favorite ? 'Remover favorito' : 'Salvar favorito'}
        >
          <Heart size={16} className={favorite ? 'fill-meow-deep' : ''} aria-hidden />
        </button>
        <img src={image} alt={title} className="w-[70%] drop-shadow-2xl" />
      </div>
      <div className="flex flex-1 flex-col gap-4 p-6">
        <div>
          <h3 className="text-[22px] font-extrabold text-meow-charcoal">
            {title}
          </h3>
          <div className="text-[28px] font-black text-slate-900">{price}</div>
        </div>
        <Link
          href={href}
          className="mt-auto inline-flex w-full items-center justify-center rounded-xl bg-gradient-to-br from-meow-indigo to-[#3837c8] py-3 text-sm font-bold text-white"
        >
          Ver detalhes
        </Link>
      </div>
    </article>
  );
};
