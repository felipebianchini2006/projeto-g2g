'use client';

import Link from 'next/link';

import { useSite } from '../../../../components/site-context';

const formatCurrency = (value: number, currency = 'BRL') =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(value / 100);

export default function Page() {
  const { favorites } = useSite();

  return (
    <section className="mx-auto w-full max-w-[1200px] px-6 py-10">
      <div className="mb-6 text-sm text-meow-muted">Inicio &gt; Conta &gt; Favoritos</div>
      <div className="rounded-2xl border border-meow-red/20 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-black text-meow-charcoal">Meus favoritos</h1>
          <Link href="/conta" className="text-sm font-semibold text-meow-deep">
            Voltar
          </Link>
        </div>
        {favorites.length === 0 ? (
          <div className="mt-6 rounded-xl border border-meow-red/20 bg-meow-cream/60 px-4 py-3 text-sm text-meow-muted">
            Nenhum favorito salvo ainda.
          </div>
        ) : (
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {favorites.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-4 rounded-2xl border border-meow-red/20 bg-white px-4 py-4"
              >
                <div className="h-16 w-16 overflow-hidden rounded-xl bg-meow-cream">
                  <img
                    src={item.image ?? '/assets/meoow/highlight-01.webp'}
                    alt={item.title}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div>
                  <p className="text-sm font-semibold text-meow-charcoal">{item.title}</p>
                  <p className="text-xs text-meow-muted">
                    {formatCurrency(item.priceCents, item.currency)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
