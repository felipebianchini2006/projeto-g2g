'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  BadgePercent,
  CreditCard,
  Package,
  ShieldCheck,
  Truck,
} from 'lucide-react';

import { fetchPublicCategories, type CatalogCategory } from '../../lib/marketplace-public';

export const HomeContent = () => {
  const [categories, setCategories] = useState<CatalogCategory[]>([]);

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
        setCategories([]);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  return (
    <>
      <section className="hero-banner">
        <div className="container">
          <div className="hero-slide">
            <img
              className="hero-bg"
              src="/assets/meoow/banner.png"
              alt="Meoww Games"
            />
          </div>
        </div>
      </section>

      <section className="pb-6">
        <div className="mx-auto w-full max-w-[1280px] px-6">
          <div className="grid gap-4 rounded-[28px] border border-meow-red/10 bg-white px-6 py-5 shadow-[0_14px_34px_rgba(216,107,149,0.12)] md:grid-cols-5">
            {[
              {
                icon: Truck,
                title: 'Frete Grátis',
                description: 'acima de R$349',
              },
              {
                icon: BadgePercent,
                title: 'Descontos',
                description: 'em pagamentos à vista',
              },
              {
                icon: Package,
                title: 'Entrega local',
                description: 'receba hoje',
              },
              {
                icon: CreditCard,
                title: 'Pague com cartão',
                description: 'em até 12x s/ juros',
              },
              {
                icon: ShieldCheck,
                title: 'Segurança',
                description: 'loja oficial',
              },
            ].map((item) => (
              <div key={item.title} className="flex items-center gap-3">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-meow-cream/70 text-meow-deep">
                  <item.icon size={22} aria-hidden />
                </span>
                <div>
                  <p className="text-sm font-bold text-meow-charcoal">{item.title}</p>
                  <p className="text-xs text-meow-muted">{item.description}</p>
                </div>
              </div>
            ))}
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
          {categories.length ? (
            <>
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
            </>
          ) : (
            <div className="mt-6 rounded-2xl border border-meow-red/10 bg-white px-5 py-4 text-sm text-meow-muted">
              Nenhuma categoria cadastrada ainda.
            </div>
          )}
        </div>
      </section>
    </>
  );
};
