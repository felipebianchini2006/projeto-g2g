'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useMemo } from 'react';
import {
  Activity,
  Settings,
  Shield,
  Ticket,
  Users,
  Wallet,
  Wrench,
} from 'lucide-react';

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

type AdminShellProps = {
  breadcrumbs?: Breadcrumb[];
  children: React.ReactNode;
};

const isActivePath = (pathname: string, href?: string) => {
  if (!href) {
    return false;
  }
  return pathname === href || pathname.startsWith(`${href}/`);
};

export const AdminShell = ({ breadcrumbs, children }: AdminShellProps) => {
  const { logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname() ?? '';

  const menuSections = useMemo<MenuSection[]>(
    () => [
      {
        title: 'Admin',
        items: [
          { label: 'Atendimento', href: '/admin/atendimento' },
          { label: 'Disputas', href: '/admin/disputas' },
          { label: 'Moderacao', href: '/admin/anuncios' },
          { label: 'Usuarios', href: '/admin/usuarios' },
          { label: 'Pedidos', href: '/admin/pedidos' },
          { label: 'Webhooks', href: '/admin/webhooks' },
          { label: 'Sistema', href: '/admin/sistema' },
          { label: 'Parametros', href: '/admin/parametros' },
        ],
      },
      {
        title: 'Conta',
        items: [
          { label: 'Voltar ao site', href: '/' },
          { label: 'Minha conta', href: '/conta' },
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
    <section className="bg-meow-50/60 px-6 py-10">
      <div className="mx-auto w-full max-w-[1200px]">
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

        <div className="mt-6 grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
          <aside className="rounded-[28px] border border-meow-100 bg-white p-5 shadow-card">
            {menuSections.map((section) => (
              <div key={section.title} className="mb-6 last:mb-0">
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
                      item.tone === 'danger' ? 'text-red-500 hover:text-red-600' : '';

                    const iconMap: Record<string, React.ReactNode> = {
                      Atendimento: <Ticket size={16} aria-hidden />,
                      Disputas: <Shield size={16} aria-hidden />,
                      Moderacao: <Wrench size={16} aria-hidden />,
                      Usuarios: <Users size={16} aria-hidden />,
                      Pedidos: <Wallet size={16} aria-hidden />,
                      Webhooks: <Activity size={16} aria-hidden />,
                      Sistema: <Activity size={16} aria-hidden />,
                      Parametros: <Settings size={16} aria-hidden />,
                    };

                    if (item.onClick) {
                      return (
                        <button
                          key={item.label}
                          type="button"
                          className={`${baseClasses} ${activeClasses} ${dangerClasses}`}
                          onClick={item.onClick}
                        >
                          {iconMap[item.label] ?? <Settings size={16} aria-hidden />}
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
                        {iconMap[item.label] ?? <Settings size={16} aria-hidden />}
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
