'use client';

import Link from 'next/link';
import { Search } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import {
  catalogCategories,
  fetchPublicCategories,
  type CatalogCategory,
} from '../../lib/marketplace-public';

export const CategoriesContent = () => {
  const [categories, setCategories] = useState<CatalogCategory[]>(catalogCategories);
  const [query, setQuery] = useState('');

  useEffect(() => {
    let active = true;
    const load = async () => {
      const response = await fetchPublicCategories();
      if (!active) {
        return;
      }
      setCategories(response.categories);
    };
    load().catch(() => {
      if (active) {
        setCategories(catalogCategories);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) {
      return categories;
    }
    return categories.filter((category) =>
      category.label.toLowerCase().includes(normalized),
    );
  }, [categories, query]);

  const splitIndex = Math.ceil(filtered.length / 2);
  const left = filtered.slice(0, splitIndex);
  const right = filtered.slice(splitIndex);

  const popularCategorySlugs = useMemo(() => {
    const sorted = [...categories].sort(
      (a, b) => (b.listingsCount ?? 0) - (a.listingsCount ?? 0),
    );
    return new Set(sorted.slice(0, 4).map((category) => category.slug));
  }, [categories]);

  return (
    <section className="bg-white py-12">
      <div className="mx-auto w-full max-w-[1280px] px-6">
        <div className="flex flex-wrap items-center gap-4">
          <span className="text-sm font-semibold text-meow-muted">Filtrar categoria:</span>
          <div className="flex items-center gap-3 rounded-2xl border border-meow-red/20 bg-white px-4 py-2 shadow-sm">
            <Search size={14} className="text-meow-muted" aria-hidden />
            <input
              className="w-56 bg-transparent text-sm text-meow-charcoal outline-none placeholder:text-meow-muted"
              placeholder="Digite aqui..."
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
        </div>

        <div className="mt-8 rounded-3xl border border-meow-red/10 bg-white p-6 shadow-[0_10px_24px_rgba(216,107,149,0.12)]">
          <div className="grid gap-8 lg:grid-cols-2">
            <div>
              <div className="flex items-center justify-between text-xs font-bold uppercase tracking-[0.4px] text-meow-muted">
                <span>Jogos</span>
                <Link href="/categoria" className="text-meow-deep">
                  Ver todos
                </Link>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {left.map((category) => (
                  <Link
                    key={category.slug}
                    href={`/categoria/${category.slug}`}
                    className="flex items-center gap-3 text-sm font-semibold text-meow-charcoal hover:text-meow-deep"
                  >
                    <span className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border border-meow-red/20 bg-meow-cream">
                      <img
                        src={category.highlight}
                        alt={category.label}
                        className="h-full w-full object-cover"
                      />
                    </span>
                    <span className="flex items-center gap-2">
                      {category.label}
                      {popularCategorySlugs.has(category.slug) ? (
                        <span className="rounded-full bg-meow-deep px-2 py-0.5 text-[10px] font-bold uppercase text-white">
                          Popular
                        </span>
                      ) : null}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between text-xs font-bold uppercase tracking-[0.4px] text-meow-muted">
                <span>Outros</span>
                <Link href="/categoria" className="text-meow-deep">
                  Ver todos
                </Link>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {right.map((category) => (
                  <Link
                    key={category.slug}
                    href={`/categoria/${category.slug}`}
                    className="flex items-center gap-3 text-sm font-semibold text-meow-charcoal hover:text-meow-deep"
                  >
                    <span className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border border-meow-red/20 bg-meow-cream">
                      <img
                        src={category.highlight}
                        alt={category.label}
                        className="h-full w-full object-cover"
                      />
                    </span>
                    <span className="flex items-center gap-2">
                      {category.label}
                      {popularCategorySlugs.has(category.slug) ? (
                        <span className="rounded-full bg-meow-deep px-2 py-0.5 text-[10px] font-bold uppercase text-white">
                          Popular
                        </span>
                      ) : null}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
