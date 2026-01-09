'use client';

'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo } from 'react';

import { useAuth } from '../auth/auth-provider';

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

export const AccountOverviewContent = () => {
  const { user, logout } = useAuth();
  const router = useRouter();

  const menuSections = useMemo<MenuSection[]>(
    () => [
      {
        title: 'Menu',
        items: [
          { label: 'Resumo', href: '/conta', active: true },
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

  if (!user) {
    return (
      <section className="bg-white px-6 py-12">
        <div className="mx-auto w-full max-w-[1200px] rounded-2xl border border-meow-red/20 bg-white px-6 py-6 text-center">
          <p className="text-sm text-meow-muted">Entre para acessar sua conta.</p>
          <Link
            href="/login"
            className="mt-4 inline-flex rounded-full bg-meow-linear px-6 py-2 text-sm font-bold text-white"
          >
            Fazer login
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="bg-white px-6 py-10">
      <div className="mx-auto w-full max-w-[1200px]">
        <div className="text-xs text-meow-muted">
          <Link href="/" className="font-semibold text-meow-deep">
            Inicio
          </Link>{' '}
          &gt; Conta
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
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

          <div className="space-y-6">
            <div className="rounded-2xl border border-meow-red/20 bg-white p-6 shadow-[0_10px_24px_rgba(216,107,149,0.12)]">
              <h1 className="text-xl font-black text-meow-charcoal">
                Bem-vindo, {user.email}
              </h1>
              <p className="mt-2 text-sm text-meow-muted">
                Aqui voce acompanha pedidos, anuncios e sua carteira.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-meow-red/20 bg-meow-cream/50 p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.4px] text-meow-muted">
                  Meus pedidos
                </p>
                <p className="mt-2 text-sm text-meow-charcoal">
                  Acompanhe entregas e pagamentos pendentes.
                </p>
                <Link
                  href="/conta/pedidos"
                  className="mt-4 inline-flex rounded-full bg-meow-linear px-4 py-2 text-xs font-bold text-white"
                >
                  Ver compras
                </Link>
              </div>
              <div className="rounded-2xl border border-meow-red/20 bg-meow-cream/50 p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.4px] text-meow-muted">
                  Meus favoritos
                </p>
                <p className="mt-2 text-sm text-meow-charcoal">
                  Itens salvos para comprar depois.
                </p>
                <Link
                  href="/conta/favoritos"
                  className="mt-4 inline-flex rounded-full border border-meow-red/30 px-4 py-2 text-xs font-bold text-meow-deep"
                >
                  Ver favoritos
                </Link>
              </div>
            </div>

            <div className="rounded-2xl border border-meow-red/20 bg-white p-6 shadow-[0_10px_24px_rgba(216,107,149,0.12)]">
              <h2 className="text-lg font-black text-meow-charcoal">Carteira</h2>
              <p className="mt-2 text-sm text-meow-muted">
                Saldo, recargas e retiradas ficam visiveis aqui.
              </p>
              <Link
                href="/conta/carteira"
                className="mt-4 inline-flex rounded-full bg-meow-linear px-4 py-2 text-xs font-bold text-white"
              >
                Abrir carteira
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
