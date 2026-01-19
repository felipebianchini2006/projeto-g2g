import { apiFetch } from './api-client';

export type PublicProfileRole = 'USER' | 'SELLER' | 'ADMIN';

export type PublicProfileStats = {
  ratingAverage: number;
  reviewsCount: number;
  salesCount: number;
  viewsCount: number | null;
};

export type PublicProfileTrustSeals = {
  cpfVerified: boolean;
  emailVerified: boolean;
  phoneVerified: boolean;
};

export type PublicProfilePerformance = {
  responseTimeMinutes: number | null;
  onTimeDeliveryRate: number | null;
};

export type PublicProfile = {
  id: string;
  role: PublicProfileRole;
  displayName: string;
  handle: string;
  avatarUrl?: string | null;
  createdAt: string;
  isOnline: boolean;
  isVerified: boolean;
  isPremium: boolean;
  stats: PublicProfileStats;
  trustSeals: PublicProfileTrustSeals;
  performance: PublicProfilePerformance;
  bio?: string | null;
};

export const publicProfilesApi = {
  getProfile: (profileId: string) =>
    apiFetch<PublicProfile>(`/public/users/${profileId}`),
};
