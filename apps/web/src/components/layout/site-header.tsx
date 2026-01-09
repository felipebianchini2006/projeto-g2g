'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Bell,
  ChevronDown,
  Menu,
  Moon,
  Search,
  ShoppingCart,
  User,
} from 'lucide-react';

import { useAuth } from '../auth/auth-provider';
import { useSite } from '../site-context';

export const SiteHeader = () => {
  const { cartCount, notify } = useSite();
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const displayName = useMemo(() => {
    if (!user?.email) {
      return 'jogador';
    }
    return user.email.split('@')[0] || 'jogador';
  }, [user?.email]);

  const handleSearch = () => {
    const query = search.trim();
    if (!query) {
      return;
    }
    notify(`Buscando por: "${query}"`);
    router.push(`/produtos?q=${encodeURIComponent(query)}`);
  };

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (!menuRef.current) {
        return;
      }
      if (!menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, []);

  return (
    <>
      <header className="relative z-40 border-b border-meow-deep/10 bg-white/95 shadow-[0_12px_30px_rgba(240,98,146,0.08)] backdrop-blur">
        <div className="mx-auto grid w-full max-w-[1280px] items-center gap-6 px-6 py-4 md:grid-cols-[auto_minmax(280px,1fr)_auto]">
          <Link href="/" className="flex items-center gap-3">
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
            <button
              className="inline-flex items-center gap-1 text-sm font-semibold text-meow-charcoal"
              type="button"
            >
              Categorias
              <ChevronDown size={16} aria-hidden />
            </button>
            <Link
              href="/dashboard"
              className="rounded-full bg-meow-linear px-5 py-2 text-sm font-bold text-white shadow-[0_14px_28px_rgba(216,107,149,0.35)]"
            >
              Criar anuncio
            </Link>
            <button
              className="flex h-10 w-10 items-center justify-center rounded-full border border-meow-red/20 bg-white text-meow-deep"
              type="button"
              aria-label="Notificacoes"
            >
              <Bell size={18} aria-hidden />
            </button>
            <Link
              href="/checkout/1"
              className="relative flex h-10 w-10 items-center justify-center rounded-full border border-meow-red/20 bg-white text-meow-deep"
              aria-label="Carrinho"
            >
              <ShoppingCart size={18} aria-hidden />
              {cartCount > 0 ? (
                <span className="absolute -right-1 -top-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-meow-deep px-1 text-[10px] font-bold text-white">
                  {cartCount}
                </span>
              ) : null}
            </Link>
            <div className="relative" ref={menuRef}>
              <button
                className="flex h-10 w-10 items-center justify-center rounded-full border border-meow-red/20 bg-white text-meow-deep"
                type="button"
                aria-label="Menu do usuario"
                onClick={() => setMenuOpen((prev) => !prev)}
              >
                <Menu size={18} aria-hidden />
              </button>
              {menuOpen ? (
                <div className="absolute right-0 top-full z-50 mt-2 w-60 rounded-2xl border border-meow-red/20 bg-white shadow-[0_18px_45px_rgba(64,37,50,0.16)]">
                  <div className="flex items-center gap-3 px-4 py-4">
                    <div className="flex h-11 w-11 items-center justify-center rounded-full border border-meow-red/20 bg-meow-cream text-meow-deep">
                      <User size={18} aria-hidden />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-meow-charcoal">
                        Ola, {displayName}!
                      </p>
                      <Link
                        href="/conta"
                        className="text-[11px] font-semibold uppercase tracking-[0.4px] text-meow-muted"
                      >
                        Ver minha conta
                      </Link>
                    </div>
                  </div>
                  <div className="border-t border-meow-red/20">
                    <Link
                      href="/dashboard/pedidos"
                      className="flex items-center justify-center px-4 py-3 text-sm font-semibold text-meow-charcoal hover:bg-meow-cream"
                    >
                      Minhas compras
                    </Link>
                  </div>
                  <div className="border-t border-meow-red/20">
                    <button
                      type="button"
                      className="flex w-full items-center justify-center px-4 py-3 text-sm font-semibold text-meow-charcoal hover:bg-meow-cream"
                    >
                      Meus favoritos
                    </button>
                  </div>
                  <div className="border-t border-meow-red/20">
                    <button
                      type="button"
                      className="flex w-full items-center justify-center gap-2 px-4 py-3 text-sm font-semibold text-meow-charcoal hover:bg-meow-cream"
                    >
                      <Moon size={16} aria-hidden />
                      Tema escuro
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
