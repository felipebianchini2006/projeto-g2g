
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OrderDetailContent } from './order-detail-page';
import { useAuth } from '../auth/auth-provider';
import { ordersApi } from '../../lib/orders-api';

// Mocks
vi.mock('next/link', () => ({
    default: ({ children, ...props }: any) => <a {...props}>{children}</a>,
}));

vi.mock('../auth/auth-provider', () => ({
    useAuth: vi.fn(),
}));

vi.mock('next/navigation', () => ({
    useRouter: () => ({ push: vi.fn() }),
    usePathname: () => '/conta/pedidos/order-123',
    useSearchParams: () => new URLSearchParams(),
}));

vi.mock('../../lib/orders-api', () => ({
    ordersApi: {
        getOrder: vi.fn(),
        openDispute: vi.fn(),
        confirmReceipt: vi.fn(),
    },
    ApiClientError: class extends Error { },
}));

const mockUser = {
    id: 'user-123',
    email: 'buyer@test.com',
    role: 'USER',
};

const mockOrder = {
    id: 'order-123',
    buyerId: 'user-123',
    sellerId: 'seller-123',
    status: 'DELIVERED',
    totalAmountCents: 1000,
    currency: 'BRL',
    createdAt: new Date().toISOString(),
    items: [
        {
            id: 'item-1',
            title: 'Item Teste',
            deliveryType: 'AUTO',
            quantity: 1,
            unitPriceCents: 1000,
        },
    ],
    payments: [],
    events: [],
};

describe('OrderDetailContent dispute flow', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        (useAuth as any).mockReturnValue({
            user: mockUser,
            accessToken: 'token-123',
            loading: false,
        });
    });

    it('renders "Abrir disputa" disabled and with tooltip when order is not DELIVERED/COMPLETED', async () => {
        (ordersApi.getOrder as any).mockResolvedValue({
            ...mockOrder,
            status: 'IN_DELIVERY',
        });

        render(<OrderDetailContent orderId="order-123" scope="buyer" />);

        // Wait for loading to finish
        await waitFor(() => expect(screen.queryByText(/Carregando/i)).not.toBeInTheDocument());

        const disputeBtn = screen.getByRole('button', { name: /Abrir disputa/i });
        expect(disputeBtn).toBeDisabled();
        expect(disputeBtn).toHaveClass('disabled:cursor-not-allowed');
        // Check for title attribute
        expect(disputeBtn).toHaveAttribute('title', 'Disponível apenas quando Entregue/Concluído');
    });

    it('opens modal and submits dispute when order is DELIVERED', async () => {
        (ordersApi.getOrder as any).mockResolvedValue({
            ...mockOrder,
            status: 'DELIVERED',
        });
        (ordersApi.openDispute as any).mockResolvedValue({ ...mockOrder, status: 'DISPUTED' });

        render(<OrderDetailContent orderId="order-123" scope="buyer" />);
        await waitFor(() => expect(screen.queryByText(/Carregando/i)).not.toBeInTheDocument());

        const disputeBtn = screen.getByRole('button', { name: /Abrir disputa/i });
        expect(disputeBtn).toBeEnabled();

        // Open modal
        fireEvent.click(disputeBtn);
        expect(screen.getByText('Abrir disputa')).toBeVisible();
        expect(screen.getByPlaceholderText(/Explique o problema/i)).toBeVisible();

        // Try to submit invalid reason
        const confirmBtn = screen.getByRole('button', { name: 'Confirmar abertura' });
        expect(confirmBtn).toBeDisabled();

        // Fill reason
        fireEvent.change(screen.getByPlaceholderText(/Explique o problema/i), {
            target: { value: 'Produto não confere com a descrição.' },
        });
        expect(confirmBtn).toBeEnabled();

        // Submit
        fireEvent.click(confirmBtn);

        await waitFor(() => {
            expect(ordersApi.openDispute).toHaveBeenCalledWith(
                'token-123',
                'order-123',
                'Produto não confere com a descrição.'
            );
        });

        expect(screen.queryByText('Abrir disputa')).not.toBeInTheDocument(); // Modal closed
    });
});
