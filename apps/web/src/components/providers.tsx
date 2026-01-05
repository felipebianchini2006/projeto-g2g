'use client';

import { AuthProvider } from './auth/auth-provider';

export const Providers = ({ children }: { children: React.ReactNode }) => {
  return <AuthProvider>{children}</AuthProvider>;
};
