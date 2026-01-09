'use client';

import { AuthProvider } from './auth/auth-provider';
import { SiteNotification } from './layout/site-notification';
import { GlobalErrorListener } from './providers/global-error-listener';
import { SiteProvider } from './site-context';

export const Providers = ({ children }: { children: React.ReactNode }) => {
  return (
    <AuthProvider>
      <SiteProvider>
        <GlobalErrorListener />
        <SiteNotification />
        {children}
      </SiteProvider>
    </AuthProvider>
  );
};
