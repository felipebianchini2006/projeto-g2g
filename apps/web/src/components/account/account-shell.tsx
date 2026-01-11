'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useMemo } from 'react';
import {
  Bell,
  CreditCard,
  Heart,
  LayoutGrid,
  LogOut,
  Monitor,
  Settings,
  Shield,
  ShoppingBag,
  Ticket,
  User,
} from 'lucide-react';

import { useAuth } from '../auth/auth-provider';
import { useDashboardLayout } from '../layout/dashboard-layout';

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
  const { logout, user } = useAuth();
  const router = useRouter();
  const pathname = usePathname() ?? '';
  const { inDashboardLayout } = useDashboardLayout();
  const isSeller = user?.role === 'SELLER' || user?.role === 'ADMIN';

  const menuSections = useMemo<MenuSection[]>(() => {
    const sections: MenuSection[] = [
      {
        title: 'Menu',
        items: [
          { label: 'Visao geral', href: '/conta' },
          { label: 'Minhas compras', href: '/conta/pedidos' },
          { label: 'Favoritos', href: '/conta/favoritos' },
          { label: 'Carteira', href: '/conta/carteira' },
          { label: 'Meus tickets', href: '/conta/tickets' },
        ],
      },
    ];

    if (isSeller) {
      sections.unshift({
        title: 'Vendedor',
        items: [
          { label: 'Painel do vendedor', href: '/conta/vendedor' },
          { label: 'Meus anuncios', href: '/conta/anuncios' },
          { label: 'Minhas vendas', href: '/conta/vendas' },
        ],
      });
    }

    sections.push({
      title: 'Conta',
      items: [
        { label: 'Configuracoes', href: '/conta/config' },
        { label: 'Meus dados', href: '/conta/meus-dados' },
        { label: 'Seguranca', href: '/conta/seguranca' },
        { label: 'Sessoes', href: '/conta/sessoes' },
        {
          label: 'Sair da conta',
          tone: 'danger',
          onClick: async () => {
            await logout();
            router.push('/');
          },
        },
      ],
    });

    return sections;
  }, [isSeller, logout, router]);

  const displayName = useMemo(() => {
    if (!user?.email) {
      return 'Jogador';
    }
    return user.email.split('@')[0] || 'Jogador';
  }, [user?.email]);

  const initials = displayName
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  if (inDashboardLayout) {
    return (
      <div className="space-y-6">
        {breadcrumbs?.length ? (
          <div className="text-xs font-semibold text-meow-muted">
            {breadcrumbs.map((crumb, index) => {
              const isLast = index === breadcrumbs.length - 1;
              if (crumb.href && !isLast) {
                return (
                  <span key={crumb.label}>
                    <Link href={crumb.href} className="text-meow-deep">
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
        {children}
      </div>
    );
  }

  return (
    <section className="bg-meow-50/60 px-6 py-10">
      <div className="mx-auto w-full max-w-[1200px]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-full bg-meow-100 px-4 py-2 text-sm font-bold text-meow-deep"
          >
            <span className="grid h-8 w-8 place-items-center rounded-full bg-white text-meow-deep">
              <ShoppingBag size={16} aria-hidden />
            </span>
            Voltar a loja
          </Link>

          <Link
            href="/central-de-notificacoes"
            className="inline-flex items-center gap-2 rounded-full border border-meow-200 bg-white px-4 py-2 text-sm font-semibold text-meow-charcoal shadow-card"
          >
            <Bell size={16} aria-hidden />
            Notificacoes
          </Link>
        </div>

        {breadcrumbs?.length ? (
          <div className="mt-6 text-xs font-semibold text-meow-muted">
            {breadcrumbs.map((crumb, index) => {
              const isLast = index === breadcrumbs.length - 1;
              if (crumb.href && !isLast) {
                return (
                  <span key={crumb.label}>
                    <Link href={crumb.href} className="text-meow-deep">
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

        <div className="mt-6 grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="rounded-[28px] border border-meow-100 bg-white p-5 shadow-card">
            <div className="flex flex-col items-center text-center">
              <div className="relative">
                <div className="grid h-20 w-20 place-items-center rounded-full bg-gradient-to-br from-meow-200 to-meow-300 text-white text-2xl font-black shadow-cute">
                  {initials}
                </div>
                <span className="absolute -bottom-1 -right-1 grid h-6 w-6 place-items-center rounded-full bg-meow-300 text-xs font-black text-white shadow-cute">
                  <User size={12} aria-hidden />
                </span>
              </div>
              <h3 className="mt-4 text-lg font-black text-meow-charcoal">{displayName}</h3>
            </div>

            <div className="mt-6 grid gap-5">
              {menuSections.map((section) => (
                <div key={section.title}>
                  <p className="text-[11px] font-bold uppercase tracking-[0.4px] text-meow-muted">
                    {section.title}
                  </p>
                  <div className="mt-3 grid gap-1 text-sm">
                    {section.items.map((item) => {
                      const baseClasses =
                        'flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold transition';
                      const activeClasses = isActivePath(pathname, item.href)
                        ? 'bg-meow-100 text-meow-deep'
                        : 'text-meow-charcoal/80 hover:bg-meow-50 hover:text-meow-charcoal';
                      const dangerClasses =
                        item.tone === 'danger'
                          ? 'text-red-500 hover:text-red-600'
                          : '';

                      const iconMap: Record<string, React.ReactNode> = {
                        'Visao geral': <LayoutGrid size={16} aria-hidden />,
                        'Minhas compras': <ShoppingBag size={16} aria-hidden />,
                        Favoritos: <Heart size={16} aria-hidden />,
                        Carteira: <CreditCard size={16} aria-hidden />,
                        'Meus tickets': <Ticket size={16} aria-hidden />,
                        'Meus dados': <User size={16} aria-hidden />,
                        Configuracoes: <Settings size={16} aria-hidden />,
                        'Painel do vendedor': <LayoutGrid size={16} aria-hidden />,
                        'Meus anuncios': <ShoppingBag size={16} aria-hidden />,
                        'Minhas vendas': <ShoppingBag size={16} aria-hidden />,
                        Seguranca: <Shield size={16} aria-hidden />,
                        Sessoes: <Monitor size={16} aria-hidden />,
                        'Sair da conta': <LogOut size={16} aria-hidden />,
                      };

                      if (item.onClick) {
                        return (
                          <button
                            key={item.label}
                            type="button"
                            className={`${baseClasses} ${activeClasses} ${dangerClasses}`}
                            onClick={item.onClick}
                          >
                            {iconMap[item.label] ?? <LayoutGrid size={16} aria-hidden />}
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
                          {iconMap[item.label] ?? <LayoutGrid size={16} aria-hidden />}
                          {item.label}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </aside>

          <div className="space-y-6">{children}</div>
        </div>
      </div>
    </section>
  );
};
