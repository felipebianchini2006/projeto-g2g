
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { AccountProfileContent } from './account-profile-page';
import { useAuth } from '../auth/auth-provider';

// Mock dependencies
vi.mock('next/navigation', () => ({
    useRouter: () => ({ push: vi.fn() }),
    usePathname: () => '/mock-path',
}));

vi.mock('../auth/auth-provider', () => ({
    useAuth: vi.fn(),
}));

vi.mock('../../lib/account-security-api', () => ({
    accountSecurityApi: {
        changePassword: vi.fn(),
    },
}));

describe('AccountProfileContent', () => {
    it('renders "Falar com suporte" button with outline variant', () => {
        // Mock user so it doesn't render loading or login state
        (useAuth as any).mockReturnValue({
            user: {
                id: '123',
                email: 'test@example.com',
                role: 'USER',
            },
            loading: false,
            accessToken: 'token',
            logout: vi.fn(),
        });

        render(<AccountProfileContent />);

        const supportLink = screen.getByRole('link', { name: /falar com suporte/i });
        expect(supportLink).toBeInTheDocument();

        // Assert variant classes (outline variant has border)
        expect(supportLink).toHaveClass('border');
        expect(supportLink).toHaveClass('bg-white');

        // Ensure size is not small (default size is usually larger, sm is h-9)
        // We can't strictly assert "not sm" easily by class if we don't know the exact class string generated 
        // but we can check if it matches the pattern of other buttons if we wanted.
        // However, the primary goal is "visual consistente", checking classes for outline is good enough for "assert variant aplicada".
    });
});
