import { apiFetch } from './api-client';

export type PublicReview = {
  rating: number;
  comment: string;
  createdAt: string;
  buyerDisplayName: string;
  buyerAvatarUrl?: string | null;
  verifiedPurchase: boolean;
  productTitle: string;
};

export type ReviewDistribution = {
  1: number;
  2: number;
  3: number;
  4: number;
  5: number;
};

export type PublicReviewsResponse = {
  items: PublicReview[];
  total: number;
  ratingAverage: number;
  distribution: ReviewDistribution;
};

export const publicReviewsApi = {
  listSellerReviews: (sellerId: string, skip = 0, take = 10) =>
    apiFetch<PublicReviewsResponse>(
      `/public/sellers/${sellerId}/reviews?skip=${skip}&take=${take}`,
    ),
};
