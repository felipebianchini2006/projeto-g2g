'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useMemo } from 'react';

import { useAuth } from '../auth/auth-provider';

type Breadcrumb = {
  label: string;
  href?: string;
};

type MenuItem = {
  label: string;
  href?: string;
  onClick?: () => void;
  tone?: 'danger';
};

type MenuSection = {
  title: string;
  items: MenuItem[];
};

type AccountShellProps = {
  breadcrumbs?: Breadcrumb[];
  children: React.ReactNode;
};

const isActivePath = (pathname: string, href?: string) => {
  if (!href) {
    return false;
  }
  const normalizedHref = href === '/conta/carteira/extrato' ? '/conta/carteira' : href;
  if (href === '/conta') {
    return pathname === href;
  }
  if (pathname === href || pathname.startsWith(`${href}/`)) {
    return true;
  }
  if (normalizedHref !== href) {
    return pathname === normalizedHref || pathname.startsWith(`${normalizedHref}/`);
  }
  return false;
};

export const AccountShell = ({ breadcrumbs, children }: AccountShellProps) => {
  const { logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname() ?? '';

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
        ],
      },
      {
        title: 'Configuracoes',
        items: [
          { label: 'Minha conta', href: '/conta/minha-conta' },
          { label: 'Meus dados', href: '/conta/meus-dados' },
          { label: 'Central de ajuda', href: '/conta/ajuda' },
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
        {breadcrumbs?.length ? (
          <div className="text-xs text-meow-muted">
            {breadcrumbs.map((crumb, index) => {
              const isLast = index === breadcrumbs.length - 1;
              if (crumb.href && !isLast) {
                return (
                  <span key={crumb.label}>
                    <Link href={crumb.href} className="font-semibold text-meow-deep">
                      {crumb.label}
                    </Link>{' '}
                    &gt;{' '}
                  </span>
                );
              }
              return (
                <span key={crumb.label}>
                  {crumb.label}
                  {!isLast ? ' > ' : ''}
                </span>
              );
            })}
          </div>
        ) : null}

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
                    const activeClasses = isActivePath(pathname, item.href)
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

          <div className="space-y-6">{children}</div>
        </div>
      </div>
    </section>
  );
};
