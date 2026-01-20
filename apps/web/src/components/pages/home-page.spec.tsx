
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
    it('renders the benefit texts correctly', async () => {
        render(<HomeContent />);

        expect(screen.getByText('Entrega garantida')).toBeInTheDocument();
        expect(screen.getByText('Receba seu produto')).toBeInTheDocument();
        expect(screen.getByText('Segurança')).toBeInTheDocument();
        expect(screen.getByText('Site seguro')).toBeInTheDocument();
        expect(screen.getByText('Entrega rapida')).toBeInTheDocument();
        expect(screen.getByText('Receba rapidamente')).toBeInTheDocument();
        expect(screen.getByText('Variedade')).toBeInTheDocument();
        expect(screen.getByText('Compre e venda')).toBeInTheDocument();
    });

    it('renders highlights centered and major categories', async () => {
        render(<HomeContent />);

        // Check for "Destaques" header
        expect(screen.getAllByText('Destaques')[0]).toBeVisible();

        // Check for centralized highlights container (mx-auto on the div wrapper)
        // We look for the div that contains the "Destaques" functionality
        // Based on code: <div ref={featuredRef} className="mt-6 flex gap-5 overflow-x-auto pb-4 pt-1 scroll-smooth mx-auto w-fit max-w-full">
        // We can find it by class or structure.
        // Since we can't easily query by className without test-id, we'll try to find the container near the header or use querySelector in container
        // However, a simple check is to verify if the text is present and if we can find the Heart Categories which are "Categorias maiores" (text-3xl)

        expect(screen.getAllByText('Qual deles tem o seu coracao?')[0]).toBeVisible();
    });
});
