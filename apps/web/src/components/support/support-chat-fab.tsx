'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { MessageCircle } from 'lucide-react';

const shouldHideFab = (pathname: string) =>
  pathname.startsWith('/admin') || pathname.startsWith('/conta/ajuda/chat');

export const SupportChatFab = () => {
  const pathname = usePathname() ?? '';
  if (shouldHideFab(pathname)) {
    return null;
  }

  return (
    <Link
      href="/conta/ajuda/chat"
      className="fixed bottom-5 right-4 z-50 flex items-center gap-2 rounded-full bg-meow-linear px-4 py-3 text-sm font-bold text-white shadow-cute transition hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-meow-200"
      aria-label="Abrir chat de suporte"
    >
      <span className="grid h-9 w-9 place-items-center rounded-full bg-white/20">
        <MessageCircle size={18} aria-hidden />
      </span>
      <span className="hidden sm:inline">Chat de suporte</span>
    </Link>
  );
};
