'use client';
import { SiteFooter } from './site-footer';
import { SiteHeader } from './site-header';

type SiteLayoutProps = {
  children: React.ReactNode;
};

export const SiteLayout = ({ children }: SiteLayoutProps) => (
  <>
    <SiteHeader />
    <main>{children}</main>
    <SiteFooter />
  </>
);
