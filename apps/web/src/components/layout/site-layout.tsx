'use client';

import { SiteProvider } from '../site-context';
import { SiteFooter } from './site-footer';
import { SiteHeader } from './site-header';
import { SiteNotification } from './site-notification';

type SiteLayoutProps = {
  children: React.ReactNode;
};

export const SiteLayout = ({ children }: SiteLayoutProps) => (
  <SiteProvider>
    <SiteHeader />
    <main>{children}</main>
    <SiteFooter />
    <SiteNotification />
  </SiteProvider>
);