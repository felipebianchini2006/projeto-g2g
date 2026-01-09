'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo } from 'react';

import { useAuth } from '../../../../components/auth/auth-provider';
import { useSite } from '../../../../components/site-context';

type MenuItem = {
  label: string;
  href?: string;
  active?: boolean;
  onClick?: () => void;
  tone?: 'danger';
};

type MenuSection = {
  title: string;
  items: MenuItem[];
};

const formatCurrency = (value: number, currency = 'BRL') =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(value / 100);

export default function Page() {
  const { favorites } = useSite();
  const { logout } = useAuth();
  const router = useRouter();

  const menuSections = useMemo<MenuSection[]>(
    () => [
      {
        title: 'Menu',
        items: [
          { label: 'Resumo', href: '/conta' },
          { label: 'Transacoes', href: '/conta/carteira/extrato' },
          { label: 'Meus anuncios', href: '/conta/anuncios' },
          { label: 'Minhas compras', href: '/conta/pedidos' },
          { label: 'Minhas vendas', href: '/conta/vendas' },
          { label: 'Minhas perguntas', href: '/conta/tickets' },
          { label: 'Perguntas recebidas', href: '/conta/tickets' },
          { label: 'Minhas retiradas', href: '/conta/carteira' },
          { label: 'Recargas', href: '/conta/carteira' },
        ],
      },
      {
        title: 'Configuracoes',
        items: [
          { label: 'Minha conta', href: '/conta' },
          { label: 'Meus dados', href: '/conta' },
          { label: 'Verificacoes', href: '/conta' },
          { label: 'Seguranca', href: '/conta' },
          { label: 'Notificacoes', href: '/central-de-notificacoes' },
          {
            label: 'Sair',
            tone: 'danger',
            onClick: async () => {
              await logout();
              router.push('/');
            },
          },
        ],
      },
    ],
    [logout, router],
  );

  return (
    <section className="bg-white px-6 py-10">
      <div className="mx-auto w-full max-w-[1200px]">
        <div className="mb-6 text-sm text-meow-muted">
          <Link href="/" className="font-semibold text-meow-deep">
            Inicio
          </Link>{' '}
          &gt;{' '}
          <Link href="/conta" className="font-semibold text-meow-deep">
            Conta
          </Link>{' '}
          &gt; Favoritos
        </div>

        <div className="grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
          <aside className="rounded-2xl border border-meow-red/20 bg-white p-5 shadow-[0_10px_24px_rgba(216,107,149,0.12)]">
            {menuSections.map((section) => (
              <div key={section.title} className="mb-6 last:mb-0">
                <p className="text-xs font-bold uppercase tracking-[0.4px] text-meow-muted">
                  {section.title}
                </p>
                <div className="mt-3 grid gap-1 text-sm">
                  {section.items.map((item) => {
                    const baseClasses =
                      'flex items-center justify-between rounded-xl px-3 py-2 text-sm font-semibold transition';
                    const activeClasses = item.active
                      ? 'bg-meow-cream text-meow-charcoal'
                      : 'text-meow-muted hover:bg-meow-cream/70 hover:text-meow-charcoal';
                    const dangerClasses =
                      item.tone === 'danger' ? 'text-red-600 hover:text-red-700' : '';

                    if (item.onClick) {
                      return (
                        <button
                          key={item.label}
                          type="button"
                          className={`${baseClasses} ${activeClasses} ${dangerClasses}`}
                          onClick={item.onClick}
                        >
                          {item.label}
                        </button>
                      );
                    }

                    return (
                      <Link
                        key={item.label}
                        href={item.href ?? '#'}
                        className={`${baseClasses} ${activeClasses} ${dangerClasses}`}
                      >
                        {item.label}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </aside>

          <div className="rounded-2xl border border-meow-red/20 bg-white p-6 shadow-[0_10px_24px_rgba(216,107,149,0.12)]">
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
                      <p className="text-sm font-semibold text-meow-charcoal">
                        {item.title}
                      </p>
                      <p className="text-xs text-meow-muted">
                        {formatCurrency(item.priceCents, item.currency)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
