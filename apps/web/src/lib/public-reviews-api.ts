import { apiFetch } from './api-client';

export type PublicReview = {
  id: string;
  rating: number;
  comment: string;
  createdAt: string;
  verifiedPurchase: boolean;
  productTitle: string | null;
  buyer: {
    displayName: string;
    avatarUrl?: string | null;
  };
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
  listSellerReviews: (sellerId: string, skip = 0, take = 10, listingId?: string) => {
    const params = new URLSearchParams({ skip: `${skip}`, take: `${take}` });
    if (listingId) {
      params.set('listingId', listingId);
    }
    return apiFetch<PublicReviewsResponse>(
      `/public/sellers/${sellerId}/reviews?${params.toString()}`,
    );
  },
};
