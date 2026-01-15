
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AccountShell } from './account-shell';
import { useAuth } from '../auth/auth-provider';
import { useDashboardLayout } from '../layout/dashboard-layout';
import React from 'react';

// Mock dependecies
vi.mock('next/navigation', () => ({
    usePathname: () => '/conta',
    useRouter: () => ({ push: vi.fn() }),
}));

vi.mock('../auth/auth-provider', () => ({
    useAuth: vi.fn(),
}));

vi.mock('../layout/dashboard-layout', () => ({
    useDashboardLayout: vi.fn(),
}));

// Mock ProfileAvatar to simplify
vi.mock('./profile-avatar', () => ({
    ProfileAvatar: () => <div data-testid="profile-avatar" />,
}));

describe('AccountShell', () => {
    const mockUseAuth = useAuth as unknown as ReturnType<typeof vi.fn>;
    const mockUseDashboardLayout = useDashboardLayout as unknown as ReturnType<typeof vi.fn>;

    beforeEach(() => {
        mockUseDashboardLayout.mockReturnValue({ inDashboardLayout: false });
    });

    it('renders "Minhas perguntas" below "Favoritos" for normal user', () => {
        mockUseAuth.mockReturnValue({
            user: { role: 'USER', email: 'user@test.com' },
            logout: vi.fn(),
        });

        render(
            <AccountShell>
                <div>Content</div>
            </AccountShell>
        );

        expect(screen.getByText('Minhas perguntas')).toBeInTheDocument();

        // Check order roughly by text content index
        const favorios = screen.getByText('Favoritos');
        const perguntas = screen.getByText('Minhas perguntas');

        // 4 = DOCUMENT_POSITION_FOLLOWING (perguntas follows favorios)
        expect(favorios.compareDocumentPosition(perguntas)).toBe(4);

        expect(screen.queryByText('Perguntas recebidas')).not.toBeInTheDocument();
    });

    it('renders "Perguntas recebidas" in Vendedor section for SELLER', async () => {
        mockUseAuth.mockReturnValue({
            user: { role: 'SELLER', email: 'seller@test.com' },
            logout: vi.fn(),
        });

        const user = userEvent.setup();

        render(
            <AccountShell>
                <div>Content</div>
            </AccountShell>
        );

        // Section Vendedor should exist
        const sellerSection = screen.getByText('Vendedor');
        expect(sellerSection).toBeVisible();

        // Click to expand
        await user.click(sellerSection);

        expect(screen.getByText('Perguntas recebidas')).toBeVisible();
    });
});
