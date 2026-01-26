export type AuthUser = {
  id: string;
  email: string;
  role: 'USER' | 'SELLER' | 'ADMIN' | 'AJUDANTE';
  adminPermissions: string[];
  avatarUrl?: string | null;
  mfaEnabled: boolean;
  mfaLastVerifiedAt?: string | null;
  mfaLastVerifiedIp?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AuthSession = {
  user: AuthUser;
  accessToken: string;
};

export type ForgotPasswordResponse = {
  success: true;
  resetToken?: string;
};

export type ResetPasswordResponse = {
  success: true;
};
