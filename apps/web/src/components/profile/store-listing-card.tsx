'use client';

import Link from 'next/link';
import { Zap } from 'lucide-react';

import { cn } from '../../lib/utils';

type StoreListingCardProps = {
  id: string;
  title: string;
  image: string;
  badge?: string | null;
  isAuto?: boolean;
  href?: string;
};

export const StoreListingCard = ({
  id,
  title,
  image,
  badge,
  isAuto,
  href,
}: StoreListingCardProps) => {
  const target = href ?? `/anuncios/${id}`;

  return (
    <Link
      href={target}
      className="group flex flex-col overflow-hidden rounded-[22px] border border-slate-100 bg-white p-3 shadow-card transition hover:-translate-y-1"
    >
      <div className="relative">
        <img
          src={image}
          alt={title}
          className="h-44 w-full rounded-[18px] object-cover"
        />
        {badge ? (
          <span className="absolute left-3 top-3 rounded-full bg-white/90 px-3 py-1 text-[10px] font-bold uppercase text-meow-charcoal shadow-card">
            {badge}
          </span>
        ) : null}
        {isAuto ? (
          <span className="absolute bottom-3 right-3 inline-flex items-center gap-1 rounded-full bg-black/70 px-2 py-1 text-[10px] font-bold uppercase text-white">
            <Zap size={10} aria-hidden />
            Auto
          </span>
        ) : null}
      </div>
      <p
        className={cn(
          'mt-3 text-sm font-semibold text-meow-charcoal',
          'line-clamp-2 min-h-[40px]'
        )}
      >
        {title}
      </p>
    </Link>
  );
};
