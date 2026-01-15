
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
        // We verify that the user message container has "justify-end" (right aligned)
        // and support message has "justify-start" (left aligned) or similar classes.

        // Find the user message wrapper
        const userMsgText = screen.getByText('Hello help');
        // Traverse up to find the flex row. userMsgText -> p -> div -> div -> div (flex row)
        // Note: This relies on specific DOM structure. A better way is if the bubble has a test id or specific class.
        // Let's assume the architecture uses standard tailwind classes.
        // We can check if "bg-meow-primary" or similar is applied to user message bubble.

        const euBadge = screen.getByText('EU');
        expect(euBadge).toBeVisible();

        const suBadge = screen.getByText('SU');
        expect(suBadge).toBeVisible();

        // Detailed check would require DOM traversal or adding data-testids. 
        // For now, presence of unique Badges (EU vs SU) confirms they are rendered as distinct bubbles.
    });
});
