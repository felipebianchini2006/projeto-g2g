import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AdminReportsContent } from './admin-reports-page';
import { useAuth } from '../auth/auth-provider';
import { adminReportsApi } from '../../lib/admin-reports-api';

vi.mock('../auth/auth-provider');
vi.mock('../../lib/admin-reports-api');
vi.mock('next/link', () => ({
    default: ({ children, ...props }: any) => <a {...props}>{children}</a>,
}));
vi.mock('../admin/admin-shell', () => ({
    AdminShell: ({ children }: any) => <div data-testid="admin-shell">{children}</div>,
}));
vi.mock('../notifications/notifications-bell', () => ({
    NotificationsBell: () => <div data-testid="notifications-bell" />,
}));

describe('AdminReportsContent', () => {
    const mockUser = { role: 'ADMIN', email: 'admin@test.com' };

    beforeEach(() => {
        vi.clearAllMocks();
        (useAuth as any).mockReturnValue({
            user: mockUser,
            accessToken: 'token',
            loading: false,
        });
    });

    it('renders loading state', () => {
        (useAuth as any).mockReturnValue({ loading: true });
        render(<AdminReportsContent />);
        expect(screen.getByText(/carregando sessão/i)).toBeInTheDocument();
    });

    it('renders access denied if not admin', () => {
        (useAuth as any).mockReturnValue({ user: { role: 'USER' }, accessToken: 'token' });
        render(<AdminReportsContent />);
        expect(screen.getByText(/acesso restrito ao admin/i)).toBeInTheDocument();
    });

    it('loads and lists reports', async () => {
        const mockReports = [
            { id: '1', reason: 'SCAM', status: 'OPEN', listing: { title: 'Listing 1' }, createdAt: new Date().toISOString() },
        ];
        (adminReportsApi.listReports as any).mockResolvedValue(mockReports);

        render(<AdminReportsContent />);

        await waitFor(() => {
            const listings = screen.getAllByText('Listing 1');
            expect(listings[0]).toBeInTheDocument();
        });
    });

    it('selects a report and shows details', async () => {
        const mockReports = [
            {
                id: '1',
                reason: 'SCAM',
                status: 'OPEN',
                listing: { title: 'Listing 1', id: 'l1' },
                createdAt: new Date().toISOString()
            },
        ];
        (adminReportsApi.listReports as any).mockResolvedValue(mockReports);

        render(<AdminReportsContent />);

        await waitFor(() => {
            expect(screen.getAllByText('Listing 1')[0]).toBeInTheDocument();
        });

        fireEvent.click(screen.getAllByText('Listing 1')[0]!);

        expect(screen.getAllByText(/detalhes/i)[0]).toBeInTheDocument();
        expect(screen.getAllByText('ID')[0]).toBeInTheDocument();
        expect(screen.getAllByText('Golpe / Fraude')[0]).toBeInTheDocument();
    });

    it('updates report status', async () => {
        const mockReports = [
            {
                id: '1',
                reason: 'SCAM',
                status: 'OPEN',
                listing: { title: 'Listing 1', id: 'l1' },
                createdAt: new Date().toISOString()
            },
        ];
        (adminReportsApi.listReports as any).mockResolvedValue(mockReports);
        (adminReportsApi.updateReport as any).mockResolvedValue({
            ...mockReports[0],
            status: 'RESOLVED'
        });

        render(<AdminReportsContent />);

        await waitFor(() => screen.getAllByText('Listing 1'));
        fireEvent.click(screen.getAllByText('Listing 1')[0]!);

        const resolveBtn = screen.getByRole('button', { name: /marcar resolvida/i });
        fireEvent.click(resolveBtn);

        await waitFor(() => {
            expect(adminReportsApi.updateReport).toHaveBeenCalledWith('token', '1', { status: 'RESOLVED' });
        });
    });
});
