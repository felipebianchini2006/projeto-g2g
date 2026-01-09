'use client';

import { AuthProvider } from './auth/auth-provider';
import { SiteProvider } from './site-context';

export const Providers = ({ children }: { children: React.ReactNode }) => {
  return (
    <AuthProvider>
      <SiteProvider>{children}</SiteProvider>
    </AuthProvider>
  );
};
