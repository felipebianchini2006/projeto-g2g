'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import {
  catalogCategories,
  fetchPublicCategories,
  type CatalogCategory,
} from '../../lib/marketplace-public';

export const HomeContent = () => {
  const [categories, setCategories] = useState<CatalogCategory[]>(catalogCategories);

  useEffect(() => {
    let active = true;
    const loadCategories = async () => {
      const response = await fetchPublicCategories();
      if (!active) {
        return;
      }
      setCategories(response.categories);
    };
    loadCategories().catch(() => {
      if (active) {
        setCategories(catalogCategories);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  return (
    <>
      <section className="relative overflow-hidden bg-white pb-16 pt-12">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(214,107,149,0.12)_0%,_rgba(255,255,255,0.9)_55%,_rgba(214,107,149,0.08)_100%)]" />
        <div className="relative mx-auto w-full max-w-[1280px] px-6">
          <div className="flex flex-col items-center gap-4 text-center">
            <span className="text-sm font-semibold text-meow-deep">[ comprar e vender ]</span>
            <h1 className="text-4xl font-black text-meow-charcoal md:text-5xl">
              contas, jogos, gift cards, gold e itens digitais
            </h1>
            <p className="text-sm text-meow-muted">
              Marketplace seguro para compradores e vendedores com entregas rapidas.
            </p>
            <Link
              href="/categoria"
              className="rounded-full bg-meow-linear px-8 py-3 text-sm font-bold text-white shadow-meow"
            >
              Como funciona?
            </Link>
          </div>
        </div>
      </section>

      <section className="bg-white pb-16 pt-8">
        <div className="mx-auto w-full max-w-[1280px] px-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-black text-meow-charcoal">
              Categorias populares
            </h2>
          </div>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {categories.slice(0, 8).map((category) => (
              <Link
                key={category.slug}
                href={`/categoria/${category.slug}`}
                className="group overflow-hidden rounded-2xl border border-meow-red/10 bg-white shadow-[0_10px_24px_rgba(216,107,149,0.12)] transition hover:-translate-y-1"
              >
                <div className="h-36 w-full overflow-hidden bg-meow-cream">
                  <img
                    src={category.highlight}
                    alt={category.label}
                    className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                  />
                </div>
                <div className="px-4 py-3">
                  <p className="text-sm font-bold text-meow-charcoal">
                    {category.label}
                  </p>
                </div>
              </Link>
            ))}
          </div>
          <div className="mt-8 flex items-center gap-3 text-xs font-bold text-meow-muted">
            <span className="h-px flex-1 bg-meow-red/20" />
            <Link href="/categoria" className="text-meow-deep">
              Ver todas categorias
            </Link>
            <span className="h-px flex-1 bg-meow-red/20" />
          </div>
        </div>
      </section>
    </>
  );
};
