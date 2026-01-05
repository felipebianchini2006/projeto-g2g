import { UserRole } from '@prisma/client';

export type JwtPayload = {
  sub: string;
  role: UserRole;
};

export type AuthUser = {
  id: string;
  email: string;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
};

export type AuthTokens = {
  accessToken: string;
  refreshToken: string;
};

export type AuthResponse = AuthTokens & {
  user: AuthUser;
};

export type AuthRequestMeta = {
  ip?: string;
  userAgent?: string;
};
