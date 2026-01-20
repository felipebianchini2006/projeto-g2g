'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import {
  ChevronDown,
  BadgePercent,
  Database,
  Gavel,
  Headset,
  House,
  Link2,
  LogOut,
  MessageCircle,
  Receipt,
  Settings,
  Settings2,
  ShieldAlert,
  SlidersHorizontal,
  Wallet,
  UserRound,
  Users,
  Webhook,
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
  const { inDashboardLayout } = useDashboardLayout();

  const menuSections = useMemo<MenuSection[]>(
    () => [
      {
        title: 'Admin',
        items: [
          { label: 'Atendimento', href: '/admin/atendimento' },
          { label: 'Chats', href: '/admin/chats' },
          { label: 'Disputas', href: '/admin/disputas' },
          { label: 'Moderação', href: '/admin/anuncios' },
          { label: 'Usuarios', href: '/admin/usuarios' },
          { label: 'Parceiros', href: '/admin/parceiros' },
          { label: 'Cupons', href: '/admin/cupons' },
          { label: 'Pedidos', href: '/admin/pedidos' },
          { label: 'Lucros', href: '/admin/lucros' },
          { label: 'Carteira', href: '/admin/carteira' },
          { label: 'Webhooks', href: '/admin/webhooks' },
          { label: 'Sistema', href: '/admin/sistema' },
          { label: 'Parametros', href: '/admin/parametros' },
        ],
      },
      {
        title: 'Cadastros',
        items: [{ label: 'Cadastros', href: '/admin/cadastros' }],
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

  const sectionIcons: Record<string, React.ReactNode> = {
    Admin: <ShieldAlert size={14} aria-hidden />,
    Cadastros: <Database size={14} aria-hidden />,
    Conta: <UserRound size={14} aria-hidden />,
  };

  const initialOpenSections = useMemo(() => {
    const activeSections = menuSections
      .filter((section) =>
        section.items.some((item) => isActivePath(pathname, item.href)),
      )
      .map((section) => section.title);
    if (activeSections.length > 0) {
      return activeSections;
    }
    return menuSections[0]?.title ? [menuSections[0].title] : [];
  }, [menuSections, pathname]);

  const [openSections, setOpenSections] = useState<string[]>(initialOpenSections);

  useEffect(() => {
    setOpenSections(initialOpenSections);
  }, [initialOpenSections]);

  const toggleSection = (title: string) => {
    setOpenSections((prev) =>
      prev.includes(title) ? prev.filter((item) => item !== title) : [...prev, title],
    );
  };

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
    <section className="bg-white px-6 py-10">
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
          <aside className="rounded-xl border border-slate-200 bg-white p-5 shadow-card">
            {menuSections.map((section) => (
              <div key={section.title} className="mb-6 last:mb-0">
                <button
                  type="button"
                  className="flex w-full items-center justify-between text-[11px] font-bold uppercase tracking-[0.4px] text-meow-muted"
                  onClick={() => toggleSection(section.title)}
                >
                  <span className="flex items-center gap-2">
                    {sectionIcons[section.title] ?? <Settings size={14} aria-hidden />}
                    {section.title}
                  </span>
                  <ChevronDown
                    size={14}
                    className={`transition ${openSections.includes(section.title) ? 'rotate-180' : ''}`}
                    aria-hidden
                  />
                </button>
                {openSections.includes(section.title) ? (
                  <div className="mt-3 grid gap-1 text-sm">
                    {section.items.map((item) => {
                      const baseClasses =
                        'flex items-center gap-3 rounded-xl border border-transparent px-3 py-2 text-sm font-semibold transition';
                      const activeClasses = isActivePath(pathname, item.href)
                        ? 'border-meow-red/30 bg-meow-red/10 text-meow-deep'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-700';
                      const dangerClasses =
                        item.tone === 'danger' ? 'text-red-500 hover:text-red-600' : '';

                      const iconMap: Record<string, React.ReactNode> = {
                        Atendimento: <Headset size={16} aria-hidden />,
                        Chats: <MessageCircle size={16} aria-hidden />,
                        Disputas: <Gavel size={16} aria-hidden />,
                        Moderação: <ShieldAlert size={16} aria-hidden />,
                        Usuarios: <Users size={16} aria-hidden />,
                        Parceiros: <Link2 size={16} aria-hidden />,
                        Cupons: <BadgePercent size={16} aria-hidden />,
                        Pedidos: <Receipt size={16} aria-hidden />,
                        Carteira: <Wallet size={16} aria-hidden />,
                        Webhooks: <Webhook size={16} aria-hidden />,
                        Sistema: <Settings2 size={16} aria-hidden />,
                        Parametros: <SlidersHorizontal size={16} aria-hidden />,
                        Cadastros: <Database size={16} aria-hidden />,
                        'Voltar ao site': <House size={16} aria-hidden />,
                        'Minha conta': <UserRound size={16} aria-hidden />,
                        Sair: <LogOut size={16} aria-hidden />,
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
                ) : null}
              </div>
            ))}
          </aside>

          <div className="space-y-6">{children}</div>
        </div>
      </div>
    </section>
  );
};
