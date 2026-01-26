import type { AuthUser } from './auth-types';

export const canAccessAdmin = (user?: AuthUser | null) =>
  user?.role === 'ADMIN' || user?.role === 'AJUDANTE';

export const hasAdminPermission = (user: AuthUser | null | undefined, permission: string) =>
  user?.role === 'ADMIN' ||
  (user?.role === 'AJUDANTE' && (user.adminPermissions ?? []).includes(permission));
