
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { TicketDetailContent } from './ticket-detail-page';

// Mock dependencies
vi.mock('../auth/auth-provider', () => ({
    useAuth: () => ({
        user: { id: 'user-1', name: 'User Test' },
        accessToken: 'fake-token',
        loading: false,
    }),
}));

vi.mock('../account/account-shell', () => ({
    AccountShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
vi.mock('../../lib/tickets-api', () => ({
    ticketsApi: {
        getTicket: vi.fn().mockResolvedValue({
            id: 'ticket-1',
            status: 'OPEN',
            createdAt: new Date().toISOString(),
            messages: [
                {
                    id: 'msg-1',
                    ticketId: 'ticket-1',
                    senderId: 'user-1',
                    message: 'Hello help',
                    createdAt: new Date().toISOString(),
                },
                {
                    id: 'msg-2',
                    ticketId: 'ticket-1',
                    senderId: 'support-1',
                    message: 'Hello user',
                    createdAt: new Date().toISOString(),
                },
            ],
        }),
    },
}));

vi.mock('next/navigation', () => ({
    useRouter: () => ({ push: vi.fn() }),
    usePathname: () => '/conta/tickets/ticket-1',
}));

describe('TicketDetailContent', () => {
    it('renders messages using ChatBubble layout', async () => {
        render(<TicketDetailContent ticketId="ticket-1" />);

        // Wait for messages to load
        const userMsg = await screen.findByText('Hello help');
        const supportMsg = await screen.findByText('Hello user');

        expect(userMsg).toBeVisible();
        expect(supportMsg).toBeVisible();

        // Check alignment classes (ChatBubble implementation detail)
        // userMsg parent should have justify-end
        // We need to find the container. 
        // ChatBubble structure: div.flex.w-full.{justify-end|justify-start}

        // We can traverse up.
        // userMsg is inside p inside div inside div.max-w-[85%] inside div.flex
        // Let's rely on finding the text "EU" for own message.
        const euBadge = screen.getByText('EU');
        expect(euBadge).toBeVisible();

        // Check if support message has "SU" (Mocked initials)
        const suBadge = screen.getByText('SU'); // Initials logic is in ChatBubble call in page
        expect(suBadge).toBeVisible();
    });
});
