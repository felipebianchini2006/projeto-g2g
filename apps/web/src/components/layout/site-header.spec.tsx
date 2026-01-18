import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SiteHeader } from './site-header';
import { useAuth } from '../auth/auth-provider';
import { useSite } from '../site-context';

vi.mock('next/link', () => ({
    default: ({ children, ...props }: any) => <a {...props}>{children}</a>,
}));

vi.mock('next/navigation', () => ({
    useRouter: () => ({
        push: vi.fn(),
    }),
}));

vi.mock('../auth/auth-provider', () => ({
    useAuth: vi.fn(),
}));

vi.mock('../site-context', () => ({
    useSite: vi.fn(),
}));

vi.mock('../../lib/notifications-api', () => ({
    notificationsApi: {
        listNotifications: vi.fn().mockResolvedValue([]),
    },
}));

vi.mock('../../lib/marketplace-public', () => ({
    fetchPublicCategories: vi.fn().mockResolvedValue({ categories: [] }),
}));

describe('SiteHeader', () => {
    const mockLogout = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
        (useSite as any).mockReturnValue({
            cartCount: 0,
            cartItems: [],
            notify: vi.fn(),
            removeFromCart: vi.fn(),
        });
    });

    it('renders login buttons when logged out', () => {
        (useAuth as any).mockReturnValue({
            user: null,
            accessToken: null,
            logout: mockLogout,
        });

        render(<SiteHeader />);

        const loginBtns = screen.getAllByText(/entrar/i);
        expect(loginBtns[0]).toBeInTheDocument();
        const createBtns = screen.getAllByText(/criar conta/i);
        expect(createBtns[0]).toBeInTheDocument();
    });

    it('renders user menu when logged in', () => {
        (useAuth as any).mockReturnValue({
            user: { email: 'user@test.com', role: 'USER', createdAt: new Date() },
            accessToken: 'token',
            logout: mockLogout,
        });

        render(<SiteHeader />);

        expect(screen.getAllByLabelText(/menu do usu/i)[0]).toBeInTheDocument();
        expect(screen.getAllByLabelText(/notifica/i)[0]).toBeInTheDocument();
    });

    it('opens user menu', () => {
        (useAuth as any).mockReturnValue({
            user: { email: 'user@test.com', role: 'USER', createdAt: new Date() },
            accessToken: 'token',
            logout: mockLogout,
        });

        render(<SiteHeader />);

        const menuButton = screen.getAllByLabelText(/menu do usu/i)[0];
        fireEvent.click(menuButton!);

        expect(screen.getByText(/user/i)).toBeInTheDocument();
        expect(screen.getAllByText(/meu perfil/i)[0]).toBeInTheDocument();
    });

    it.skip('shows admin menu for admin', async () => {
        (useAuth as any).mockReturnValue({
            user: { email: 'admin@test.com', role: 'ADMIN', createdAt: new Date() },
            accessToken: 'token',
            logout: mockLogout,
        });

        render(<SiteHeader />);

        const menuButton = screen.getAllByLabelText(/menu do usu/i)[0];
        fireEvent.click(menuButton!);

        // Wait for menu to open and render content
        await waitFor(() => {
            expect(screen.getAllByText(/menu admin/i)[0]).toBeInTheDocument();
        });
    });
});

