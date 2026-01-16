import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AdminRgContent } from './admin-rg-page';
import { useAuth } from '../auth/auth-provider';
import { adminRgApi } from '../../lib/admin-rg-api';

vi.mock('../auth/auth-provider');
vi.mock('../../lib/admin-rg-api');
vi.mock('next/link', () => ({
    default: ({ children, ...props }: any) => <a {...props}>{children}</a>,
}));
vi.mock('../admin/admin-shell', () => ({
    AdminShell: ({ children }: any) => <div data-testid="admin-shell">{children}</div>,
}));
vi.mock('../notifications/notifications-bell', () => ({
    NotificationsBell: () => <div data-testid="notifications-bell" />,
}));

describe('AdminRgContent', () => {
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
        render(<AdminRgContent />);
        expect(screen.getByText(/carregando sessão/i)).toBeInTheDocument();
    });

    it('renders access denied if not admin', () => {
        (useAuth as any).mockReturnValue({ user: { role: 'USER' }, accessToken: 'token' });
        render(<AdminRgContent />);
        expect(screen.getByText(/acesso restrito ao admin/i)).toBeInTheDocument();
    });

    it('loads and lists verifications', async () => {
        const mockVerifications = [
            {
                id: '1',
                status: 'PENDING',
                rgNumber: '123456',
                user: { fullName: 'John Doe' },
                submittedAt: new Date().toISOString()
            },
        ];
        (adminRgApi.list as any).mockResolvedValue(mockVerifications);

        render(<AdminRgContent />);

        expect(screen.getAllByText(/carregando verificações/i)[0]).toBeInTheDocument();

        await waitFor(() => {
            expect(screen.getAllByText('John Doe')[0]).toBeInTheDocument();
            expect(screen.getAllByText(/RG: 123456/)[0]).toBeInTheDocument();
        });
    });

    it('approves verification', async () => {
        const mockVerifications = [
            {
                id: '1',
                status: 'PENDING',
                rgNumber: '123456',
                user: { fullName: 'John Doe' },
                submittedAt: new Date().toISOString(),
                rgPhotoUrl: '/test.png'
            },
        ];
        (adminRgApi.list as any).mockResolvedValue(mockVerifications);
        (adminRgApi.approve as any).mockResolvedValue({ ...mockVerifications[0], status: 'APPROVED' });

        render(<AdminRgContent />);

        await waitFor(() => screen.getAllByText('John Doe'));
        fireEvent.click(screen.getAllByText('John Doe')[0]!);

        const approveBtn = screen.getByRole('button', { name: /aprovar rg/i });
        fireEvent.click(approveBtn);

        await waitFor(() => {
            expect(adminRgApi.approve).toHaveBeenCalledWith('token', '1');
        });
    });
});
