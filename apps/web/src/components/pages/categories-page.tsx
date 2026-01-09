'use client';

import Link from 'next/link';
import { Search } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import { fetchPublicCategories, type CatalogCategory } from '../../lib/marketplace-public';

export const CategoriesContent = () => {
  const [categories, setCategories] = useState<CatalogCategory[]>([]);
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
        setCategories([]);
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

  const popularCategorySlugs = useMemo(() => {
    const sorted = [...categories].sort(
      (a, b) => (b.listingsCount ?? 0) - (a.listingsCount ?? 0),
    );
    return new Set(sorted.slice(0, 4).map((category) => category.slug));
  }, [categories]);

  const isOutro = (label: string) => {
    const normalized = label.toLowerCase();
    const keywords = [
      'assinaturas',
      'premium',
      'curso',
      'treinamento',
      'discord',
      'email',
      'gift',
      'redes',
      'servicos',
      'softwares',
      'licencas',
      'steam',
    ];
    return keywords.some((keyword) => normalized.includes(keyword));
  };

  const jogos = filtered.filter((category) => !isOutro(category.label));
  const outros = filtered.filter((category) => isOutro(category.label));

  const splitIntoColumns = (items: CatalogCategory[], columns: number) => {
    const cols: CatalogCategory[][] = Array.from({ length: columns }, () => []);
    items.forEach((item, index) => {
      cols[index % columns].push(item);
    });
    return cols;
  };

  const jogosColumns = useMemo(() => splitIntoColumns(jogos, 4), [jogos]);
  const outrosColumns = useMemo(() => splitIntoColumns(outros, 2), [outros]);

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
          {categories.length ? (
            <div className="grid gap-10 lg:grid-cols-[2.3fr_1fr]">
              <div>
                <div className="flex items-center justify-between text-xs font-bold uppercase tracking-[0.4px] text-meow-muted">
                  <span>Jogos</span>
                  <Link href="/categoria" className="text-meow-deep">
                    Ver todos
                  </Link>
                </div>
                <div className="mt-4 grid gap-6 lg:grid-cols-4">
                  {jogosColumns.map((column, columnIndex) => (
                    <div key={`jogos-${columnIndex}`} className="grid gap-3">
                      {column.map((category) => (
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
                  ))}
                  {!jogos.length ? (
                    <div className="text-xs text-meow-muted">
                      Nenhuma categoria cadastrada.
                    </div>
                  ) : null}
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between text-xs font-bold uppercase tracking-[0.4px] text-meow-muted">
                  <span>Outros</span>
                  <Link href="/categoria" className="text-meow-deep">
                    Ver todos
                  </Link>
                </div>
                <div className="mt-4 grid gap-6 lg:grid-cols-2">
                  {outrosColumns.map((column, columnIndex) => (
                    <div key={`outros-${columnIndex}`} className="grid gap-3">
                      {column.map((category) => (
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
                  ))}
                  {!outros.length ? (
                    <div className="text-xs text-meow-muted">
                      Nenhuma categoria cadastrada.
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-meow-red/10 bg-meow-cream/40 px-5 py-4 text-sm text-meow-muted">
              Nenhuma categoria cadastrada ainda.
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
