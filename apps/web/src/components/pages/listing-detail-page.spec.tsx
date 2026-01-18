
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ListingDetailContent } from './listing-detail-page';

// Mock dependencies
vi.mock('../../lib/marketplace-public', () => ({
    fetchPublicListing: vi.fn().mockResolvedValue({
        status: 'ready',
        listing: {
            id: 'listing-1',
            title: 'Game Key',
            priceCents: 5000,
            currency: 'BRL',
            sellerId: 'seller-1',
            media: [],
            description: 'Desc',
            status: 'PUBLISHED',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        },
        source: 'api',
    }),
}));

vi.mock('../../lib/public-profiles-api', () => ({
    publicProfilesApi: {
        getProfile: vi.fn().mockResolvedValue({
            id: 'seller-1',
            displayName: 'Best Seller',
            handle: 'bestseller',
            avatarUrl: null,
            stats: {
                ratingAverage: 4.8,
                reviewsCount: 10,
                salesCount: 50,
            },
            trustSeals: {},
        }),
    },
}));

vi.mock('../../lib/listing-questions-api', () => ({
    listingQuestionsApi: {
        listPublic: vi.fn().mockResolvedValue({ items: [], total: 0 }),
    },
}));

vi.mock('../../lib/public-reviews-api', () => ({
    publicReviewsApi: {
        listSellerReviews: vi.fn().mockResolvedValue({ items: [], total: 0, ratingAverage: 0 }),
    },
}));

vi.mock('../../lib/orders-api', () => ({
    ordersApi: {
        getReviewEligibility: vi.fn().mockResolvedValue({ canReview: false }),
    },
}));

vi.mock('../auth/auth-provider', () => ({
    useAuth: () => ({ accessToken: null }),
}));

vi.mock('../site-context', () => ({
    useSite: () => ({
        addToCart: vi.fn(),
        isFavorite: vi.fn(),
        toggleFavorite: vi.fn(),
    }),
}));

// Mock navigation
vi.mock('next/link', () => ({
    default: ({ href, children }: { href: string; children: React.ReactNode }) => (
        <a href={href}>{children}</a>
    ),
}));
vi.mock('next/navigation', () => ({
    useRouter: () => ({ push: vi.fn() }),
}));

describe('ListingDetailPage Seller Card', () => {
    it('renders seller card with profile info', async () => {
        render(<ListingDetailContent listingId="listing-1" />);

        // Wait for listing and profile to load
        await waitFor(() => {
            expect(screen.getByText('Best Seller')).toBeVisible();
        });

        expect(screen.getByText('@bestseller')).toBeVisible();
        expect(screen.getByText('50')).toBeVisible(); // Sales count
        expect(screen.getByText('Ver perfil completo')).toHaveAttribute('href', '/perfil/seller-1');
    });
});
