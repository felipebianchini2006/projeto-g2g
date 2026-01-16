import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AdminListingsContent } from './admin-listings-page';
import { useAuth } from '../auth/auth-provider';
import { adminListingsApi } from '../../lib/admin-listings-api';
import { adminCatalogApi } from '../../lib/admin-catalog-api';
import { marketplaceApi } from '../../lib/marketplace-api';

vi.mock('../auth/auth-provider');
vi.mock('../../lib/admin-listings-api');
vi.mock('../../lib/admin-catalog-api');
vi.mock('../../lib/marketplace-api');
vi.mock('next/link', () => ({
    default: ({ children, ...props }: any) => <a {...props}>{children}</a>,
}));
vi.mock('../admin/admin-shell', () => ({
    AdminShell: ({ children }: any) => <div data-testid="admin-shell">{children}</div>,
}));
vi.mock('../notifications/notifications-bell', () => ({
    NotificationsBell: () => <div data-testid="notifications-bell" />,
}));
// Create a fake matchMedia
window.matchMedia = window.matchMedia || function () {
    return {
        matches: false,
        addListener: function () { },
        removeListener: function () { }
    };
};

describe('AdminListingsContent', () => {
    const mockUser = { role: 'ADMIN', email: 'admin@test.com' };

    beforeEach(() => {
        vi.clearAllMocks();
        (useAuth as any).mockReturnValue({
            user: mockUser,
            accessToken: 'token',
            loading: false,
        });

        // Mock catalog calls to avoid errors
        (adminCatalogApi.listCategories as any).mockResolvedValue([]);
        (adminCatalogApi.listGroups as any).mockResolvedValue([]);
        (adminCatalogApi.listSections as any).mockResolvedValue([]);
        (adminCatalogApi.listSalesModels as any).mockResolvedValue([]);
        (adminCatalogApi.listOrigins as any).mockResolvedValue([]);
        (adminCatalogApi.listRecoveryOptions as any).mockResolvedValue([]);
        (adminListingsApi.listListings as any).mockResolvedValue([]);
        (marketplaceApi.listMedia as any).mockResolvedValue([]);
    });

    it('loads and lists listings', async () => {
        const mockListings = [
            { id: '1', title: 'Listing 1', status: 'PENDING', priceCents: 1000, currency: 'BRL', deliveryType: 'AUTO', media: [] },
        ];
        (adminListingsApi.listListings as any).mockResolvedValue(mockListings);

        render(<AdminListingsContent />);

        expect(screen.getByText(/moderação de anúncios/i)).toBeInTheDocument();

        await waitFor(() => {
            const listings = screen.getAllByText('Listing 1');
            expect(listings[0]).toBeInTheDocument();
        });
    });

    // Since the component is complex, simplified smoke test is enough for now
    it('renders correctly', () => {
        render(<AdminListingsContent />);
        const shells = screen.getAllByTestId('admin-shell');
        expect(shells.length).toBeGreaterThan(0);
    });
});
