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
      className="fixed bottom-5 right-4 z-50 flex h-12 w-12 items-center justify-center rounded-xl bg-meow-linear text-white shadow-cute transition hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-meow-200"
      aria-label="Abrir chat de suporte"
    >
      <MessageCircle size={20} aria-hidden />
    </Link>
  );
};
