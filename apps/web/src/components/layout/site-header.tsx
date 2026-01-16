'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Bell,
  ChevronDown,
  Crown,
  Headset,
  LogOut,
  Menu,
  Moon,
  Search,
  ShoppingCart,
  Ticket,
  UserRound,
  Wallet,
} from 'lucide-react';

import { useAuth } from '../auth/auth-provider';
import { notificationsApi, type Notification } from '../../lib/notifications-api';
import { fetchPublicCategories, type CatalogCategory } from '../../lib/marketplace-public';
import { useSite } from '../site-context';

const formatCurrency = (value: number, currency = 'BRL') =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(value / 100);

export const SiteHeader = () => {
  const { cartCount, cartItems, notify, removeFromCart } = useSite();
  const { user, accessToken, logout } = useAuth();
  const [search, setSearch] = useState('');
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  const [categoriesQuery, setCategoriesQuery] = useState('');
  const [categories, setCategories] = useState<CatalogCategory[]>([]);
  const [categoriesStatus, setCategoriesStatus] = useState<'idle' | 'loading' | 'ready'>('idle');

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [notificationsStatus, setNotificationsStatus] = useState<'idle' | 'loading' | 'ready'>('idle');

  const menuRef = useRef<HTMLDivElement | null>(null);
  const categoriesRef = useRef<HTMLDivElement | null>(null);
  const notificationsRef = useRef<HTMLDivElement | null>(null);
  const cartRef = useRef<HTMLDivElement | null>(null);
  const notificationsBusyRef = useRef(false);

  const displayName = useMemo(() => {
    if (!user?.email) {
      return 'jogador';
    }
    return user.email.split('@')[0] || 'jogador';
  }, [user?.email]);

  const memberSinceYear = useMemo(() => {
    if (!user?.createdAt) {
      return new Date().getFullYear();
    }
    return new Date(user.createdAt).getFullYear();
  }, [user?.createdAt]);


  const filteredCategories = useMemo(() => {
    const query = categoriesQuery.trim().toLowerCase();
    if (!query) {
      return categories;
    }
    return categories.filter((category) =>
      category.label.toLowerCase().includes(query),
    );
  }, [categories, categoriesQuery]);

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

  const jogosCategories = useMemo(
    () => filteredCategories.filter((category) => !isOutro(category.label)),
    [filteredCategories],
  );
  const outrosCategories = useMemo(
    () => filteredCategories.filter((category) => isOutro(category.label)),
    [filteredCategories],
  );

  const popularCategorySlugs = useMemo(() => {
    const sorted = [...categories].sort(
      (a, b) => (b.listingsCount ?? 0) - (a.listingsCount ?? 0),
    );
    return new Set(sorted.slice(0, 3).map((category) => category.slug));
  }, [categories]);

  const cartTotal = useMemo(
    () => cartItems.reduce((acc, item) => acc + item.priceCents * item.quantity, 0),
    [cartItems],
  );

  const splitIntoColumns = (items: CatalogCategory[], size = 8) => {
    if (items.length === 0) {
      return [];
    }
    const columns: CatalogCategory[][] = [];
    for (let index = 0; index < items.length; index += size) {
      columns.push(items.slice(index, index + size));
    }
    return columns;
  };

  const handleSearch = () => {
    const query = search.trim();
    if (!query) {
      return;
    }
    notify(`Buscando por: "${query}"`);
    router.push(`/produtos?q=${encodeURIComponent(query)}`);
  };

  useEffect(() => {
    if (!categoriesOpen) {
      return;
    }
    let active = true;
    const load = async () => {
      setCategoriesStatus('loading');
      const response = await fetchPublicCategories();
      if (!active) {
        return;
      }
      setCategories(response.categories);
      setCategoriesStatus('ready');
    };
    load().catch(() => {
      if (active) {
        setCategoriesStatus('ready');
      }
    });
    return () => {
      active = false;
    };
  }, [categoriesOpen]);

  useEffect(() => {
    const stored = window.localStorage.getItem('meoww-theme');
    if (stored === 'dark') {
      setDarkMode(true);
    }
  }, []);

  useEffect(() => {
    const theme = darkMode ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', theme);
    window.localStorage.setItem('meoww-theme', theme);
  }, [darkMode]);

  useEffect(() => {
    if (!notificationsOpen) {
      return;
    }
    if (!accessToken) {
      setNotifications([]);
      setNotificationsStatus('ready');
      return;
    }
    if (notificationsBusyRef.current) {
      return;
    }
    notificationsBusyRef.current = true;
    setNotificationsStatus('loading');
    notificationsApi
      .listNotifications(accessToken, { take: 4 })
      .then((data) => {
        setNotifications(data);
      })
      .catch(() => {
        setNotifications([]);
      })
      .finally(() => {
        notificationsBusyRef.current = false;
        setNotificationsStatus('ready');
      });
  }, [notificationsOpen, accessToken]);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      const target = event.target as Node;
      if (menuOpen && menuRef.current && !menuRef.current.contains(target)) {
        setMenuOpen(false);
      }
      if (categoriesOpen && categoriesRef.current && !categoriesRef.current.contains(target)) {
        setCategoriesOpen(false);
      }
      if (
        notificationsOpen &&
        notificationsRef.current &&
        !notificationsRef.current.contains(target)
      ) {
        setNotificationsOpen(false);
      }
      if (cartOpen && cartRef.current && !cartRef.current.contains(target)) {
        setCartOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [menuOpen, categoriesOpen, notificationsOpen, cartOpen]);

  const closeAll = () => {
    setMenuOpen(false);
    setCategoriesOpen(false);
    setNotificationsOpen(false);
    setCartOpen(false);
  };

  const toggleCategories = () => {
    setCategoriesOpen((prev) => !prev);
    setMenuOpen(false);
    setNotificationsOpen(false);
    setCartOpen(false);
  };

  const toggleNotifications = () => {
    setNotificationsOpen((prev) => !prev);
    setMenuOpen(false);
    setCategoriesOpen(false);
    setCartOpen(false);
  };

  const toggleCart = () => {
    setCartOpen((prev) => !prev);
    setMenuOpen(false);
    setCategoriesOpen(false);
    setNotificationsOpen(false);
  };

  const toggleMenu = () => {
    setMenuOpen((prev) => !prev);
    setCategoriesOpen(false);
    setNotificationsOpen(false);
    setCartOpen(false);
  };

  const hasCartItems = cartItems.length > 0;
  const cartHref = '/carrinho';
  const checkoutHref = cartItems[0]?.id ? `/checkout/${cartItems[0].id}` : '/carrinho';

  const menuPanelClass = darkMode
    ? 'border-white/10 bg-[#1a1116] text-white shadow-[0_18px_45px_rgba(27,18,22,0.5)]'
    : 'border-meow-red/20 bg-white text-meow-charcoal shadow-[0_18px_45px_rgba(64,37,50,0.16)]';
  const menuGradientClass = darkMode
    ? 'bg-gradient-to-br from-[#2b1f26] via-[#24171e] to-[#1a1116]'
    : 'bg-meow-linear';
  const menuSubtleTextClass = darkMode ? 'text-white/70' : 'text-meow-muted';
  const menuCardClass = darkMode
    ? 'border-white/10 bg-white/5 text-white'
    : 'border-meow-red/10 bg-white text-meow-charcoal';
  const isAdmin = user?.role === 'ADMIN';
  const balanceLabel = 'R$ 0,00';
  const menuLinks = [
    {
      label: 'Meu perfil',
      description: 'Minhas compras e dados',
      href: '/conta',
      icon: UserRound,
      tone: 'bg-sky-100 text-sky-500',
    },
    {
      label: 'Meus chamados',
      description: 'Status de reclamacoes',
      href: '/conta/tickets',
      icon: Ticket,
      tone: 'bg-amber-100 text-amber-500',
    },
    {
      label: 'Carteira',
      description: 'Historico completo',
      href: '/conta/carteira',
      icon: Wallet,
      tone: 'bg-emerald-100 text-emerald-500',
    },
    {
      label: 'Fale conosco',
      description: 'Ajuda e suporte',
      href: '/conta/ajuda',
      icon: Headset,
      tone: 'bg-pink-100 text-pink-500',
    },
  ];

  if (isAdmin) {
    menuLinks.push({
      label: 'Menu admin',
      description: 'Painel administrativo',
      href: '/admin/atendimento',
      icon: Crown,
      tone: 'bg-indigo-100 text-indigo-500',
    });
  }

  return (
    <>
      <div className="bg-gradient-to-r from-[#f2a4c3] via-[#f7b8d1] to-[#f2a4c3] text-white">
        <div className="relative mx-auto w-full max-w-[1280px] px-6 py-2 text-[11px] font-bold uppercase tracking-[0.6px] flex flex-col items-center gap-2 text-center sm:block">
          <span></span>
        </div>
      </div>
      <header className="site-header relative z-40 border-b border-meow-deep/10 bg-white/95 shadow-[0_12px_30px_rgba(240,98,146,0.08)] backdrop-blur">
        <div className="mx-auto w-full max-w-[1280px] px-6 py-4">
          <div className="grid w-full grid-cols-[auto_1fr_auto] items-center gap-4 md:grid-cols-[auto_minmax(280px,1fr)_auto] md:gap-6">
            <div className="flex justify-start">
              <Link href="/" className="flex items-center gap-3" onClick={closeAll}>
                <img
                  src="/assets/meoow/logo.png"
                  alt="Meoww Games"
                  className="h-10 w-auto md:h-12"
                />
              </Link>
            </div>

            <div className="hidden w-full items-center gap-3 rounded-full border border-meow-red/20 bg-meow-cream/80 px-4 py-2 shadow-[0_10px_24px_rgba(216,107,149,0.12)] md:flex">
              <div className="flex h-4 w-4 items-center justify-center">
                <Search size={16} className="text-meow-deep" aria-hidden />
              </div>
              <input
                className="flex-1 bg-transparent text-sm text-meow-charcoal outline-none placeholder:text-meow-muted"
                type="text"
                placeholder="An?ncio, usu?rio ou categoria"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    handleSearch();
                  }
                }}
              />
              <span className="flex h-5 items-center justify-center rounded-full bg-white px-3 text-xs font-bold text-meow-deep">
                P
              </span>
            </div>

            <div className="ml-auto flex items-center gap-2 md:gap-4">
              <button
                className="flex h-10 w-10 items-center justify-center rounded-full border border-meow-red/20 bg-white text-meow-deep md:hidden"
                type="button"
                aria-label="Buscar"
                onClick={() => router.push('/produtos')}
              >
                <Search size={18} aria-hidden />
              </button>
              <div className="relative hidden md:block" ref={categoriesRef}>
                <button
                  className="inline-flex items-center gap-1 text-sm font-semibold text-meow-charcoal"
                  type="button"
                  onClick={toggleCategories}
                >
                  Categorias
                  <ChevronDown size={16} aria-hidden />
                </button>
                {categoriesOpen ? (
                  <>
                    <div
                      className="fixed inset-0 z-[49] bg-black/60 backdrop-blur-[2px] sm:hidden"
                      onClick={() => setCategoriesOpen(false)}
                      aria-hidden="true"
                    />
                    <div className="fixed inset-x-0 bottom-0 top-[100px] z-[50] flex flex-col overflow-hidden rounded-t-[32px] border-t border-meow-red/20 bg-white shadow-[0_-10px_40px_rgba(0,0,0,0.15)] sm:absolute sm:inset-auto sm:right-0 sm:top-full sm:mt-3 sm:block sm:h-auto sm:w-[min(1100px,94vw)] sm:rounded-2xl sm:p-6 sm:shadow-[0_18px_45px_rgba(64,37,50,0.16)] sm:translate-x-0 sm:overflow-visible">
                      <div
                        className="flex shrink-0 items-center justify-center p-3 sm:hidden"
                        onClick={() => setCategoriesOpen(false)}
                      >
                        <div className="h-1.5 w-12 rounded-full bg-slate-200" />
                      </div>
                      <div className="flex-1 overflow-y-auto p-5 sm:p-0">
                        <div className="flex flex-wrap items-center gap-3 sm:gap-4">
                          <span className="text-sm font-semibold text-meow-muted">
                            Filtrar categoria:
                          </span>
                          <div className="flex w-full items-center gap-3 rounded-2xl border border-meow-red/20 bg-meow-cream/70 px-4 py-2 sm:w-auto">
                            <Search size={14} className="text-meow-deep" aria-hidden />
                            <input
                              className="w-full bg-transparent text-sm text-meow-charcoal outline-none placeholder:text-meow-muted sm:w-56"
                              placeholder="Digite aqui..."
                              value={categoriesQuery}
                              onChange={(event) => setCategoriesQuery(event.target.value)}
                            />
                          </div>
                        </div>

                        <div className="mt-6 max-h-[none] overflow-y-visible pr-0 sm:max-h-[60vh] sm:overflow-y-auto sm:pr-2">
                          {categoriesStatus === 'ready' && categories.length === 0 ? (
                            <div className="rounded-2xl border border-meow-red/20 bg-meow-cream/60 px-4 py-3 text-sm text-meow-muted">
                              Nenhuma categoria cadastrada.
                            </div>
                          ) : (
                            <div className="grid gap-10 lg:grid-cols-[3fr_1.3fr]">
                              {[
                                { title: 'Jogos', items: jogosCategories },
                                { title: 'Outros', items: outrosCategories },
                              ].map((block) => (
                                <div key={block.title}>
                                  <div className="flex items-center justify-between text-xs font-bold uppercase tracking-[0.4px] text-meow-muted">
                                    <span>{block.title}</span>
                                    <Link
                                      href="/categoria"
                                      className="text-[11px] font-bold uppercase tracking-[0.4px] text-meow-deep"
                                      onClick={closeAll}
                                    >
                                      Ver todos
                                    </Link>
                                  </div>
                                  <div className="mt-4 flex flex-col gap-6 sm:flex-row sm:gap-8">
                                    {splitIntoColumns(block.items, 8).map((column, columnIndex) => (
                                      <div
                                        key={`${block.title}-${columnIndex}`}
                                        className="flex flex-col gap-3"
                                      >
                                        {column.map((category) => (
                                          <Link
                                            key={category.slug}
                                            href={`/categoria/${category.slug}`}
                                            className="flex items-center gap-3 text-sm font-semibold text-meow-charcoal hover:text-meow-deep"
                                            onClick={closeAll}
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
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </>
                ) : null}
              </div>

              <Link
                href="/anunciar"
                className="hidden rounded-full bg-meow-linear px-5 py-2 text-sm font-bold text-white shadow-[0_14px_28px_rgba(216,107,149,0.35)] md:inline-flex"
                onClick={closeAll}
              >
                Criar anúncio
              </Link>
              {user ? (
                <div className="relative" ref={notificationsRef}>
                  <button
                    className="flex h-10 w-10 items-center justify-center rounded-full border border-meow-red/20 bg-white text-meow-deep"
                    type="button"
                    aria-label="Notificações"
                    onClick={toggleNotifications}
                  >
                    <Bell size={18} aria-hidden />
                  </button>
                  {notificationsOpen ? (
                    <>
                      <div
                        className="fixed inset-0 z-[49] bg-black/60 backdrop-blur-[2px] sm:hidden"
                        onClick={() => setNotificationsOpen(false)}
                        aria-hidden="true"
                      />
                      <div className="fixed inset-x-0 bottom-0 z-[50] w-full overflow-hidden rounded-t-[32px] border-t border-meow-red/20 bg-white shadow-[0_-10px_40px_rgba(0,0,0,0.2)] sm:absolute sm:inset-auto sm:right-0 sm:top-full sm:mt-2 sm:w-[340px] sm:rounded-2xl sm:border sm:shadow-[0_18px_45px_rgba(64,37,50,0.16)] sm:translate-x-0">
                        <div
                          className="flex items-center justify-center p-3 sm:hidden"
                          onClick={() => setNotificationsOpen(false)}
                        >
                          <div className="h-1.5 w-12 rounded-full bg-slate-200" />
                        </div>
                        <div className="flex items-center justify-between border-b border-meow-red/20 px-4 py-3">
                          <span className="text-sm font-semibold text-meow-charcoal">
                            Notificações
                          </span>
                          <Link
                            href="/central-de-notificacoes"
                            className="text-[11px] font-semibold uppercase tracking-[0.4px] text-meow-deep"
                            onClick={closeAll}
                          >
                            Ver todas
                          </Link>
                        </div>
                        <div className="max-h-[60vh] overflow-y-auto p-4 sm:max-h-[320px]">
                          {notificationsStatus === 'loading' ? (
                            <div className="text-sm text-meow-muted">
                              Carregando notificações...
                            </div>
                          ) : null}
                          {notificationsStatus !== 'loading' && notifications.length === 0 ? (
                            <div className="text-sm text-meow-muted">Nenhuma notificação.</div>
                          ) : null}
                          {notifications.length ? (
                            <ul className="grid gap-3">
                              {notifications.map((notification) => (
                                <li
                                  key={notification.id}
                                  className="rounded-xl border border-meow-red/10 bg-meow-cream/40 px-3 py-2"
                                >
                                  <p className="text-xs font-semibold text-meow-charcoal">
                                    {notification.title}
                                  </p>
                                  <p className="mt-1 text-[11px] text-meow-muted">
                                    {notification.body}
                                  </p>
                                  <span className="mt-1 block text-[10px] text-meow-muted">
                                    {new Date(notification.createdAt).toLocaleString('pt-BR')}
                                  </span>
                                </li>
                              ))}
                            </ul>
                          ) : null}
                        </div>
                      </div>
                    </>
                  ) : null}
                </div>
              ) : null}

              <div className="relative" ref={cartRef}>
                <button
                  className="relative flex h-10 w-10 items-center justify-center rounded-full border border-meow-red/20 bg-white text-meow-deep"
                  type="button"
                  aria-label="Carrinho"
                  onClick={toggleCart}
                >
                  <ShoppingCart size={18} aria-hidden />
                  {cartCount > 0 ? (
                    <span className="absolute -right-1 -top-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-meow-deep px-1 text-[10px] font-bold text-white">
                      {cartCount}
                    </span>
                  ) : null}
                </button>
                {cartOpen ? (
                  <div className="absolute right-0 top-full z-50 mt-2 w-80 rounded-2xl border border-meow-red/20 bg-white p-4 shadow-[0_18px_45px_rgba(64,37,50,0.16)]">
                    {cartItems.length === 0 ? (
                      <div className="rounded-xl bg-meow-cream/50 px-4 py-6 text-center text-sm text-meow-muted">
                        Seu carrinho está vazio
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center justify-between text-sm font-semibold text-meow-charcoal">
                          <span>Carrinho</span>
                          <span>Total: {formatCurrency(cartTotal)}</span>
                        </div>
                        <div className="mt-4 grid gap-3">
                          {cartItems.map((item) => (
                            <div key={item.id} className="flex items-start gap-3">
                              <div className="h-12 w-12 overflow-hidden rounded-xl bg-meow-cream">
                                <img
                                  src={item.image ?? '/assets/meoow/highlight-01.webp'}
                                  alt={item.title}
                                  className="h-full w-full object-cover"
                                />
                              </div>
                              <div className="flex-1">
                                <p className="text-xs font-semibold text-meow-charcoal">
                                  {item.title}
                                </p>
                                <p className="text-[11px] text-meow-muted">
                                  {item.quantity} x {formatCurrency(item.priceCents, item.currency)}
                                </p>
                              </div>
                              <button
                                type="button"
                                className="text-xs font-bold text-meow-muted"
                                onClick={() => removeFromCart(item.id)}
                              >
                                x
                              </button>
                            </div>
                          ))}
                        </div>
                        <div className="mt-4 flex items-center justify-between">
                          <Link
                            href={cartHref}
                            className="text-xs font-semibold text-meow-muted"
                            onClick={closeAll}
                          >
                            Ver carrinho
                          </Link>
                          {hasCartItems ? (
                            <Link
                              href={checkoutHref}
                              className="rounded-full bg-meow-linear px-4 py-2 text-xs font-bold text-white"
                              onClick={closeAll}
                            >
                              Comprar
                            </Link>
                          ) : (
                            <span className="rounded-full bg-meow-red/20 px-4 py-2 text-xs font-bold text-meow-muted">
                              Comprar
                            </span>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                ) : null}
              </div>

              {user ? (
                <div className="relative" ref={menuRef}>
                  <button
                    className="flex h-10 w-10 items-center justify-center rounded-full border border-meow-red/20 bg-white text-meow-deep"
                    type="button"
                    aria-label="Menu do usuário"
                    onClick={toggleMenu}
                  >
                    <Menu size={18} aria-hidden />
                  </button>
                  {menuOpen ? (
                    <div
                      className={`fixed left-1/2 top-20 z-50 w-[min(92vw,320px)] -translate-x-1/2 overflow-hidden rounded-2xl border sm:absolute sm:left-auto sm:right-0 sm:top-full sm:mt-2 sm:w-[320px] sm:translate-x-0 ${menuPanelClass}`}
                    >
                      <div className={`px-5 py-4 ${menuGradientClass}`}>
                        <div className="flex items-center gap-3">
                          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-yellow-300 text-lg font-black text-meow-deep shadow-[0_10px_24px_rgba(0,0,0,0.18)]">
                            {displayName.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-white">{displayName}</p>
                            <p className="text-xs text-white/80">Membro desde {memberSinceYear}</p>
                          </div>
                        </div>
                      </div>
                      <div className="px-5 py-4">
                        <div className={`flex items-center justify-between rounded-2xl border px-4 py-3 ${menuCardClass}`}>
                          <div>
                            <span className={`text-[11px] font-semibold uppercase ${menuSubtleTextClass}`}>
                              Seu saldo
                            </span>
                            <p className={`mt-1 text-lg font-black ${darkMode ? 'text-white' : 'text-meow-deep'}`}>
                              {balanceLabel}
                            </p>
                          </div>
                          <Link
                            href="/conta/carteira"
                            className={`text-[11px] font-semibold uppercase tracking-[0.4px] ${darkMode ? 'text-white/80' : 'text-meow-deep'}`}
                            onClick={closeAll}
                          >
                            Histórico completo
                          </Link>
                        </div>

                        <div className="mt-4 grid gap-2">
                          {menuLinks.map((item) => (
                            <Link
                              key={item.label}
                              href={item.href}
                              onClick={closeAll}
                              className={`flex items-center gap-3 rounded-2xl px-3 py-2 transition ${darkMode ? 'hover:bg-white/5' : 'hover:bg-meow-cream/60'}`}
                            >
                              <span
                                className={`flex h-10 w-10 items-center justify-center rounded-2xl ${darkMode ? 'bg-white/10 text-white' : item.tone
                                  }`}
                              >
                                <item.icon size={18} aria-hidden />
                              </span>
                              <div className="flex-1">
                                <p className={`text-sm font-semibold ${darkMode ? 'text-white' : 'text-meow-charcoal'}`}>
                                  {item.label}
                                </p>
                                <p className={`text-[11px] ${menuSubtleTextClass}`}>
                                  {item.description}
                                </p>
                              </div>
                            </Link>
                          ))}
                        </div>

                        <div className={`mt-4 border-t pt-4 ${darkMode ? 'border-white/10' : 'border-meow-red/10'}`}>
                          <button
                            type="button"
                            className={`flex w-full items-center justify-center gap-2 rounded-full border px-4 py-2 text-xs font-semibold ${darkMode ? 'border-white/10 text-white/80 hover:bg-white/5' : 'border-meow-red/20 text-meow-charcoal hover:bg-meow-cream/50'}`}
                            onClick={() => setDarkMode((prev) => !prev)}
                          >
                            <Moon size={14} aria-hidden />
                            {darkMode ? 'Tema claro' : 'Tema escuro'}
                          </button>
                          <button
                            type="button"
                            className={`mt-3 flex w-full items-center justify-center gap-2 rounded-full text-xs font-semibold ${darkMode ? 'text-white/80' : 'text-meow-muted'}`}
                            onClick={async () => {
                              if (!user) {
                                return;
                              }
                              await logout();
                              closeAll();
                              router.push('/');
                            }}
                          >
                            <LogOut size={14} aria-hidden />
                            Sair da conta
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="flex items-center gap-2 sm:gap-3">
                  <Link
                    href="/login"
                    className="flex h-10 w-10 items-center justify-center rounded-full border border-meow-red/20 bg-white text-meow-deep md:hidden"
                    aria-label="Entrar"
                  >
                    <UserRound size={18} aria-hidden />
                  </Link>
                  <Link
                    href="/login"
                    className="hidden rounded-full px-3 py-2 text-xs font-bold text-meow-deep hover:bg-meow-red/10 md:inline-flex md:px-4 md:text-sm"
                  >
                    Entrar
                  </Link>
                  <Link
                    href="/register"
                    className="hidden rounded-full bg-meow-linear px-3 py-2 text-xs font-bold text-white shadow-[0_14px_28px_rgba(216,107,149,0.35)] md:inline-flex md:px-5 md:text-sm"
                  >
                    Criar conta
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>
    </>
  );
};
