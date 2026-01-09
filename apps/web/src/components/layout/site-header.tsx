'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Bell,
  ChevronDown,
  Menu,
  MessageCircle,
  Moon,
  Search,
  ShoppingBag,
  ShoppingCart,
  Ticket,
  User,
} from 'lucide-react';

import { useAuth } from '../auth/auth-provider';
import { notificationsApi, type Notification } from '../../lib/notifications-api';
import {
  fetchPublicCategories,
  type CatalogCategory,
} from '../../lib/marketplace-public';
import { useSite } from '../site-context';

const formatCurrency = (value: number, currency = 'BRL') =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(value / 100);

export const SiteHeader = () => {
  const { cartCount, cartItems, notify, removeFromCart } = useSite();
  const { user, accessToken } = useAuth();
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

  const displayName = useMemo(() => {
    if (!user?.email) {
      return 'jogador';
    }
    return user.email.split('@')[0] || 'jogador';
  }, [user?.email]);

  const filteredCategories = useMemo(() => {
    const query = categoriesQuery.trim().toLowerCase();
    if (!query) {
      return categories;
    }
    return categories.filter((category) =>
      category.label.toLowerCase().includes(query),
    );
  }, [categories, categoriesQuery]);

  const splitIndex = Math.ceil(filteredCategories.length / 2);
  const leftCategories = filteredCategories.slice(0, splitIndex);
  const rightCategories = filteredCategories.slice(splitIndex);

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

  const handleSearch = () => {
    const query = search.trim();
    if (!query) {
      return;
    }
    notify(`Buscando por: "${query}"`);
    router.push(`/produtos?q=${encodeURIComponent(query)}`);
  };

  useEffect(() => {
    if (!categoriesOpen || categoriesStatus !== 'idle') {
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
  }, [categoriesOpen, categoriesStatus]);

  useEffect(() => {
    if (!notificationsOpen || notificationsStatus !== 'idle') {
      return;
    }
    let active = true;
    const load = async () => {
      if (!accessToken) {
        setNotificationsStatus('ready');
        return;
      }
      setNotificationsStatus('loading');
      const data = await notificationsApi.listNotifications(accessToken, { take: 5 });
      if (!active) {
        return;
      }
      setNotifications(data);
      setNotificationsStatus('ready');
    };
    load().catch(() => {
      if (active) {
        setNotificationsStatus('ready');
      }
    });
    return () => {
      active = false;
    };
  }, [notificationsOpen, notificationsStatus, accessToken]);

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

  const checkoutHref = cartItems[0] ? `/checkout/${cartItems[0].id}` : '/produtos';

  return (
    <>
      <header className="relative z-40 border-b border-meow-deep/10 bg-white/95 shadow-[0_12px_30px_rgba(240,98,146,0.08)] backdrop-blur">
        <div className="mx-auto grid w-full max-w-[1280px] items-center gap-6 px-6 py-4 md:grid-cols-[auto_minmax(280px,1fr)_auto]">
          <Link href="/" className="flex items-center gap-3" onClick={closeAll}>
            <img
              src="/assets/meoow/logo.png"
              alt="Meoww Games"
              className="h-10 w-auto"
            />
            <span className="font-display text-2xl font-black text-meow-charcoal">
              Meoww Games
            </span>
          </Link>

          <div className="flex w-full items-center gap-3 rounded-full border border-meow-red/20 bg-meow-cream/80 px-4 py-2 shadow-[0_10px_24px_rgba(216,107,149,0.12)] md:max-w-[520px]">
            <Search size={16} className="text-meow-deep" aria-hidden />
            <input
              className="flex-1 bg-transparent text-sm text-meow-charcoal outline-none placeholder:text-meow-muted"
              type="text"
              placeholder="Anuncio, usuario ou categoria"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  handleSearch();
                }
              }}
            />
            <span className="rounded-full bg-white px-3 py-0.5 text-xs font-bold text-meow-deep">
              P
            </span>
          </div>

          <div className="ml-auto flex items-center gap-4">
            <div className="relative" ref={categoriesRef}>
              <button
                className="inline-flex items-center gap-1 text-sm font-semibold text-meow-charcoal"
                type="button"
                onClick={toggleCategories}
              >
                Categorias
                <ChevronDown size={16} aria-hidden />
              </button>
              {categoriesOpen ? (
                <div className="absolute left-0 top-full z-50 mt-3 w-[860px] rounded-[28px] border border-meow-red/20 bg-white p-6 shadow-[0_18px_45px_rgba(64,37,50,0.16)]">
                  <div className="flex items-center gap-3 rounded-2xl border border-meow-red/20 bg-meow-cream/70 px-4 py-2">
                    <Search size={14} className="text-meow-deep" aria-hidden />
                    <input
                      className="flex-1 bg-transparent text-sm text-meow-charcoal outline-none placeholder:text-meow-muted"
                      placeholder="Filtrar categoria"
                      value={categoriesQuery}
                      onChange={(event) => setCategoriesQuery(event.target.value)}
                    />
                  </div>
                  <div className="mt-5 grid max-h-[420px] gap-6 overflow-auto pr-2 md:grid-cols-2">
                    {[
                      { title: 'Jogos', items: leftCategories },
                      { title: 'Outros', items: rightCategories },
                    ].map((block) => (
                      <div key={block.title}>
                        <div className="flex items-center justify-between text-xs font-bold uppercase tracking-[0.4px] text-meow-muted">
                          <span>{block.title}</span>
                          <Link href="/categoria" className="text-meow-deep" onClick={closeAll}>
                            Ver todos
                          </Link>
                        </div>
                        <div className="mt-4 grid gap-3 sm:grid-cols-2">
                          {(block.items.length ? block.items : categories).map((category) => (
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
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>

            <Link
              href="/anunciar"
              className="rounded-full bg-meow-linear px-5 py-2 text-sm font-bold text-white shadow-[0_14px_28px_rgba(216,107,149,0.35)]"
              onClick={closeAll}
            >
              Criar anuncio
            </Link>

            <div className="relative" ref={notificationsRef}>
              <button
                className="flex h-10 w-10 items-center justify-center rounded-full border border-meow-red/20 bg-white text-meow-deep"
                type="button"
                aria-label="Notificacoes"
                onClick={toggleNotifications}
              >
                <Bell size={18} aria-hidden />
              </button>
              {notificationsOpen ? (
                <div className="absolute right-0 top-full z-50 mt-2 w-[340px] overflow-hidden rounded-2xl border border-meow-red/20 bg-white shadow-[0_18px_45px_rgba(64,37,50,0.16)]">
                  <div className="flex">
                    <div className="flex w-12 flex-col items-center gap-4 border-r border-meow-red/20 py-5 text-meow-muted">
                      <Bell size={16} aria-hidden />
                      <ShoppingBag size={16} aria-hidden />
                      <Ticket size={16} aria-hidden />
                      <MessageCircle size={16} aria-hidden />
                    </div>
                    <div className="flex-1">
                      <div className="p-5 text-sm text-meow-muted">
                        {notificationsStatus === 'loading'
                          ? 'Carregando notificacoes...'
                          : notifications.length
                            ? notifications[0].title
                            : 'Nenhuma notificacao.'}
                      </div>
                      <Link
                        href="/central-de-notificacoes"
                        className="block border-t border-meow-red/20 px-4 py-3 text-center text-xs font-semibold text-meow-deep"
                        onClick={closeAll}
                      >
                        Ver central de notificacoes
                      </Link>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>

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
                      Seu carrinho esta vazio
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
                          href={checkoutHref}
                          className="text-xs font-semibold text-meow-muted"
                          onClick={closeAll}
                        >
                          Ver carrinho
                        </Link>
                        <Link
                          href={checkoutHref}
                          className="rounded-full bg-meow-linear px-4 py-2 text-xs font-bold text-white"
                          onClick={closeAll}
                        >
                          Comprar
                        </Link>
                      </div>
                    </>
                  )}
                </div>
              ) : null}
            </div>

            <div className="relative" ref={menuRef}>
              <button
                className="flex h-10 w-10 items-center justify-center rounded-full border border-meow-red/20 bg-white text-meow-deep"
                type="button"
                aria-label="Menu do usuario"
                onClick={toggleMenu}
              >
                <Menu size={18} aria-hidden />
              </button>
              {menuOpen ? (
                <div className="absolute right-0 top-full z-50 mt-2 w-64 rounded-2xl border border-meow-deep/60 bg-meow-dark text-white shadow-[0_18px_45px_rgba(27,18,22,0.5)]">
                  <div className="flex items-center gap-3 px-4 py-4">
                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white">
                      <User size={18} aria-hidden />
                    </div>
                    <div>
                      <p className="text-sm font-semibold">
                        Ola, {displayName}!
                      </p>
                      <Link
                        href="/conta"
                        className="text-[11px] font-semibold uppercase tracking-[0.4px] text-white/60"
                        onClick={closeAll}
                      >
                        Ver minha conta
                      </Link>
                    </div>
                  </div>
                  <div className="border-t border-white/10">
                    <Link
                      href="/conta/pedidos"
                      className="flex items-center justify-center px-4 py-3 text-sm font-semibold text-white/80 hover:bg-white/5"
                      onClick={closeAll}
                    >
                      Minhas compras
                    </Link>
                  </div>
                  <div className="border-t border-white/10">
                    <Link
                      href="/conta/favoritos"
                      className="flex items-center justify-center px-4 py-3 text-sm font-semibold text-white/80 hover:bg-white/5"
                      onClick={closeAll}
                    >
                      Meus favoritos
                    </Link>
                  </div>
                  <div className="border-t border-white/10">
                    <button
                      type="button"
                      className="flex w-full items-center justify-center gap-2 px-4 py-3 text-sm font-semibold text-white/80 hover:bg-white/5"
                      onClick={() => setDarkMode((prev) => !prev)}
                    >
                      <Moon size={16} aria-hidden />
                      {darkMode ? 'Tema claro' : 'Tema escuro'}
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </header>
    </>
  );
};
