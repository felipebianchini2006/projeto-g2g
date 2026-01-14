
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { HomeContent } from './home-page';

// Mock dependencies
vi.mock('../../lib/marketplace-public', () => ({
    fetchPublicCategories: vi.fn().mockResolvedValue({ categories: [] }),
    fetchPublicListings: vi.fn().mockResolvedValue({ listings: [], source: 'api' }),
}));

// Mock lucide-react icons components to avoid issues dealing with SVG in tests if necessary, 
// though usually they render fine. 

describe('HomeContent', () => {
    it('renders the 4 new benefit texts correctly', async () => {
        const { container } = render(<HomeContent />);

        // Check for the new texts
        expect(screen.getByText('Entrega garantida ou seu dinheiro de volta')).toBeInTheDocument();
        expect(screen.getByText('Segurança: site totalmente seguro')).toBeInTheDocument();
        expect(screen.getByText('Entrega virtual: receba sem sair de casa')).toBeInTheDocument();

        // Check for the one that remains
        expect(screen.getByText(/Pague com cartão/)).toBeInTheDocument();
    });
});
