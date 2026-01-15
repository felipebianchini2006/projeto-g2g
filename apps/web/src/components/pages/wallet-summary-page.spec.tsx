import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { WalletSummaryContent } from './wallet-summary-page';
import { walletApi } from '../../lib/wallet-api';

// Mock dependencies
vi.mock('../auth/auth-provider', () => ({
    useAuth: () => ({
        user: { email: 'user@test.com', role: 'USER' },
        accessToken: 'fake-token',
        loading: false,
    }),
}));

vi.mock('../../lib/wallet-api', () => ({
    walletApi: {
        getSummary: vi.fn(),
        listEntries: vi.fn(),
        createTopupPix: vi.fn(),
    },
}));

vi.mock('../account/account-shell', () => ({
    AccountShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

describe('WalletSummaryContent', () => {
    it('opens top-up modal and generates pix', async () => {
        // Setup mocks
        (walletApi.getSummary as any).mockResolvedValue({
            availableCents: 1000,
            heldCents: 0,
            reversedCents: 0,
            currency: 'BRL',
        });
        (walletApi.listEntries as any).mockResolvedValue({ items: [] });
        (walletApi.createTopupPix as any).mockResolvedValue({
            payment: {
                id: 'pay-1',
                qrCode: 'base64-qr-code',
                copyPaste: 'pix-copy-paste-code',
            },
        });

        render(<WalletSummaryContent />);

        // Wait for loading
        await waitFor(() => expect(screen.getByText('Carteira Digital')).toBeVisible());

        // Open modal
        const addButton = screen.getByText('Adicionar saldo');
        fireEvent.click(addButton);

        expect(screen.getByText('Valor (R$)')).toBeVisible();

        // Fill Input
        const input = screen.getByPlaceholderText('0,00');
        fireEvent.change(input, { target: { value: '50.00' } });

        // Submit
        const generateButton = screen.getByText('Gerar Pix');
        fireEvent.click(generateButton);

        // Verify API call
        await waitFor(() => {
            expect(walletApi.createTopupPix).toHaveBeenCalledWith('fake-token', 5000);
        });

        // Verify Success State
        expect(screen.getByText('Pix gerado com sucesso!')).toBeVisible();
        expect(screen.getByAltText('QR Code Pix')).toBeVisible();

        // Verify Copy Paste
        expect(screen.getByDisplayValue('pix-copy-paste-code')).toBeVisible();
    });
});
