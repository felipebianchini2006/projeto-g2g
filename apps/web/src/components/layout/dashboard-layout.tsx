'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createContext, useContext, useMemo, useState } from 'react';
import {
  Activity,
  Bell,
  CreditCard,
  Heart,
  LayoutGrid,
  LogOut,
  Menu,
  Settings,
  Shield,
  ShoppingBag,
  Sparkles,
  Ticket,
  User,
  Users,
  Wallet,
  Wrench,
  X,
} from 'lucide-react';

import { cn } from '../../lib/utils';
import { useAuth } from '../auth/auth-provider';
import { SiteHeader } from './site-header';
import { buttonVariants } from '../ui/button';
import { Card } from '../ui/card';

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

type DashboardLayoutContextValue = {
  inDashboardLayout: boolean;
};

const DashboardLayoutContext = createContext<DashboardLayoutContextValue>({
  inDashboardLayout: false,
});

export const useDashboardLayout = () => useContext(DashboardLayoutContext);

const normalizePathname = (pathname: string) => {
  const aliases = [
    { from: '/pedidos', to: '/conta/pedidos' },
    { from: '/tickets', to: '/conta/tickets' },
    { from: '/vendas', to: '/conta/vendas' },
    { from: '/carteira', to: '/conta/carteira' },
  ];
  for (const alias of aliases) {
    if (pathname === alias.from || pathname.startsWith(`${alias.from}/`)) {
      return pathname.replace(alias.from, alias.to);
    }
  }
  return pathname;
};

const isActivePath = (pathname: string, href?: string) => {
  if (!href) {
    return false;
  }
  const normalizedPath = normalizePathname(pathname);
  const normalizedHref = href === '/conta/carteira/extrato' ? '/conta/carteira' : href;
  if (href === '/conta') {
    return normalizedPath === href;
  }
  if (normalizedPath === href || normalizedPath.startsWith(`${href}/`)) {
    return true;
  }
  if (normalizedHref !== href) {
    return normalizedPath === normalizedHref || normalizedPath.startsWith(`${normalizedHref}/`);
  }
  return false;
};

const accountNav = (logout: () => Promise<void>, goHome: () => void): MenuSection[] => [
  {
    title: 'Menu',
    items: [
      { label: 'Visao geral', href: '/conta' },
      { label: 'Minhas compras', href: '/conta/pedidos' },
      { label: 'Favoritos', href: '/conta/favoritos' },
      { label: 'Carteira', href: '/conta/carteira' },
      { label: 'Meus tickets', href: '/conta/tickets' },
      { label: 'Configuracoes', href: '/conta/config' },
    ],
  },
  {
    title: 'Conta',
    items: [
      {
        label: 'Sair da conta',
        tone: 'danger',
        onClick: async () => {
          await logout();
          goHome();
        },
      },
    ],
  },
];

const adminNav = (logout: () => Promise<void>, goHome: () => void): MenuSection[] => [
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
          goHome();
        },
      },
    ],
  },
];

const iconMap: Record<string, React.ReactNode> = {
  'Visao geral': <LayoutGrid size={16} aria-hidden />,
  'Minhas compras': <ShoppingBag size={16} aria-hidden />,
  Favoritos: <Heart size={16} aria-hidden />,
  Carteira: <CreditCard size={16} aria-hidden />,
  'Meus tickets': <Ticket size={16} aria-hidden />,
  'Meus anuncios': <ShoppingBag size={16} aria-hidden />,
  'Minhas vendas': <ShoppingBag size={16} aria-hidden />,
  'Minha conta': <User size={16} aria-hidden />,
  'Meus dados': <User size={16} aria-hidden />,
  Seguranca: <Settings size={16} aria-hidden />,
  Sessoes: <Settings size={16} aria-hidden />,
  'Central de ajuda': <Ticket size={16} aria-hidden />,
  Notificacoes: <Bell size={16} aria-hidden />,
  Configuracoes: <Settings size={16} aria-hidden />,
  'Sair da conta': <LogOut size={16} aria-hidden />,
  Atendimento: <Ticket size={16} aria-hidden />,
  Disputas: <Shield size={16} aria-hidden />,
  Moderacao: <Wrench size={16} aria-hidden />,
  Usuarios: <Users size={16} aria-hidden />,
  Pedidos: <Wallet size={16} aria-hidden />,
  Webhooks: <Activity size={16} aria-hidden />,
  Sistema: <Activity size={16} aria-hidden />,
  Parametros: <Settings size={16} aria-hidden />,
  Cadastros: <Settings size={16} aria-hidden />,
  'Voltar ao site': <LayoutGrid size={16} aria-hidden />,
  Sair: <LogOut size={16} aria-hidden />,
};

const SidebarCard = ({
  title,
  sections,
  pathname,
  onNavigate,
  displayName,
  initials,
}: {
  title: string;
  sections: MenuSection[];
  pathname: string;
  onNavigate?: () => void;
  displayName: string;
  initials: string;
}) => (
  <Card className="rounded-[28px] border border-meow-red/10 bg-white/95 p-5 shadow-card">
    <div className="flex flex-col items-center text-center">
      <div className="relative">
        <div className="grid h-20 w-20 place-items-center rounded-full bg-gradient-to-br from-meow-200 to-meow-300 text-2xl font-black text-white shadow-cute">
          {initials}
        </div>
        <span className="absolute -bottom-1 -right-1 grid h-6 w-6 place-items-center rounded-full bg-meow-300 text-xs font-black text-white shadow-cute">
          <User size={12} aria-hidden />
        </span>
      </div>
      <h3 className="mt-4 text-lg font-black text-meow-charcoal">{displayName}</h3>
      <p className="text-xs font-semibold text-meow-muted">{title}</p>
    </div>

    <div className="mt-6 grid gap-5">
      {sections.map((section) => (
        <div key={section.title}>
          <p className="text-[11px] font-bold uppercase tracking-[0.4px] text-meow-muted">
            {section.title}
          </p>
          <div className="mt-3 grid gap-1 text-sm">
            {section.items.map((item) => {
              const baseClasses =
                'flex items-center gap-3 rounded-2xl px-3 py-2 text-sm font-semibold transition';
              const activeClasses = isActivePath(pathname, item.href)
                ? 'bg-meow-100 text-meow-deep'
                : 'text-meow-charcoal/80 hover:bg-meow-50 hover:text-meow-charcoal';
              const dangerClasses =
                item.tone === 'danger' ? 'text-red-500 hover:text-red-600' : '';

              if (item.onClick) {
                return (
                  <button
                    key={item.label}
                    type="button"
                    className={cn(baseClasses, activeClasses, dangerClasses)}
                    onClick={async () => {
                      await item.onClick?.();
                      onNavigate?.();
                    }}
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
                  className={cn(baseClasses, activeClasses, dangerClasses)}
                  onClick={onNavigate}
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
  </Card>
);

const AccountSidebar = ({
  sections,
  pathname,
  onNavigate,
  displayName,
  initials,
}: {
  sections: MenuSection[];
  pathname: string;
  onNavigate?: () => void;
  displayName: string;
  initials: string;
}) => (
  <aside className="rounded-[30px] border border-meow-red/10 bg-white p-5 shadow-card">
    <Link
      href="/"
      className="inline-flex items-center gap-2 rounded-full border border-meow-red/20 bg-white px-4 py-2 text-xs font-bold text-meow-deep shadow-card"
      onClick={onNavigate}
    >
      <span className="grid h-7 w-7 place-items-center rounded-full bg-meow-100 text-meow-deep">
        <Sparkles size={14} aria-hidden />
      </span>
      Voltar a loja
    </Link>

    <div className="mt-6 flex flex-col items-center text-center">
      <div className="relative">
        <div className="grid h-20 w-20 place-items-center rounded-full bg-gradient-to-br from-meow-200 to-meow-300 text-2xl font-black text-white shadow-cute">
          {initials}
        </div>
        <span className="absolute -bottom-1 -right-1 grid h-6 w-6 place-items-center rounded-full bg-meow-300 text-xs font-black text-white shadow-cute">
          <User size={12} aria-hidden />
        </span>
      </div>
      <h3 className="mt-4 text-lg font-black text-meow-charcoal">{displayName}</h3>
      <span className="mt-1 rounded-full bg-meow-100 px-3 py-1 text-[10px] font-bold uppercase text-meow-deep">
        Conta padrao
      </span>
      <div className="mt-3 w-full rounded-full bg-meow-100/70 px-3 py-2 text-[10px] font-bold uppercase text-meow-muted">
        Nivel inicial
      </div>
    </div>

    <div className="mt-6 grid gap-5">
      {sections.map((section) => (
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
                item.tone === 'danger' ? 'text-red-500 hover:text-red-600' : '';

              if (item.onClick) {
                return (
                  <button
                    key={item.label}
                    type="button"
                    className={cn(baseClasses, activeClasses, dangerClasses)}
                    onClick={async () => {
                      await item.onClick?.();
                      onNavigate?.();
                    }}
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
                  className={cn(baseClasses, activeClasses, dangerClasses)}
                  onClick={onNavigate}
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
);

type DashboardLayoutProps = {
  children: React.ReactNode;
};

export const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname() ?? '';
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const isAdminRoute = pathname.startsWith('/admin');

  const displayName = useMemo(() => {
    if (!user?.email) {
      return isAdminRoute ? 'Administrador' : 'Jogador';
    }
    return user.email.split('@')[0] || 'Jogador';
  }, [isAdminRoute, user?.email]);

  const initials = displayName
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const menuSections = useMemo(
    () =>
      isAdminRoute
        ? adminNav(logout, () => router.push('/'))
        : accountNav(logout, () => router.push('/')),
    [isAdminRoute, logout, router],
  );

  const headerTitle = isAdminRoute ? 'Painel do admin' : 'Minha conta';

  return (
    <DashboardLayoutContext.Provider value={{ inDashboardLayout: true }}>
      <div className="min-h-screen bg-meow-gradient">
        <SiteHeader />
        <section className="px-4 pb-12 pt-8">
          <div className="mx-auto w-full max-w-[1200px]">
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs font-bold uppercase tracking-[0.4px] text-meow-muted">
                {headerTitle}
              </span>
              <button
                type="button"
                className={buttonVariants({ variant: 'secondary', size: 'icon' })}
                aria-label="Abrir menu"
                onClick={() => setSidebarOpen(true)}
              >
                <Menu size={18} aria-hidden />
              </button>
            </div>

            <div className="mt-6 grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
              <aside className="hidden lg:block">
                {isAdminRoute ? (
                  <SidebarCard
                    title={headerTitle}
                    sections={menuSections}
                    pathname={pathname}
                    displayName={displayName}
                    initials={initials}
                  />
                ) : (
                  <AccountSidebar
                    sections={menuSections}
                    pathname={pathname}
                    displayName={displayName}
                    initials={initials}
                  />
                )}
              </aside>
              <div className="space-y-6">{children}</div>
            </div>
          </div>
        </section>

        {sidebarOpen ? (
          <div className="fixed inset-0 z-50 flex lg:hidden">
            <div
              className="absolute inset-0 bg-black/40"
              onClick={() => setSidebarOpen(false)}
              aria-hidden="true"
            />
            <div className="relative z-10 h-full w-[86%] max-w-sm bg-white p-5 shadow-xl">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-meow-charcoal">Menu</span>
                <button
                  type="button"
                  className={buttonVariants({ variant: 'ghost', size: 'icon' })}
                  aria-label="Fechar menu"
                  onClick={() => setSidebarOpen(false)}
                >
                  <X size={18} aria-hidden />
                </button>
              </div>
              <div className="mt-5">
                {isAdminRoute ? (
                  <SidebarCard
                    title={headerTitle}
                    sections={menuSections}
                    pathname={pathname}
                    onNavigate={() => setSidebarOpen(false)}
                    displayName={displayName}
                    initials={initials}
                  />
                ) : (
                  <AccountSidebar
                    sections={menuSections}
                    pathname={pathname}
                    onNavigate={() => setSidebarOpen(false)}
                    displayName={displayName}
                    initials={initials}
                  />
                )}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </DashboardLayoutContext.Provider>
  );
};
