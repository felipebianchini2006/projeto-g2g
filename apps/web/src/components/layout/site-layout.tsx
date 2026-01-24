'use client';
import { usePathname } from 'next/navigation';
import { SiteFooter } from './site-footer';
import { SiteHeader } from './site-header';
import { SupportChatFab } from '../support/support-chat-fab';

type SiteLayoutProps = {
  children: React.ReactNode;
};

export const SiteLayout = ({ children }: SiteLayoutProps) => {
  const pathname = usePathname() ?? '';
  const showSupportChat = pathname === '/';

  return (
    <>
      <SiteHeader />
      <main>{children}</main>
      <SiteFooter />
      {showSupportChat ? <SupportChatFab /> : null}
    </>
  );
};
