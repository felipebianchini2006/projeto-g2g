
import { test, expect } from '@playwright/test';

test.describe('Home Page Content', () => {
    test('renders new benefit texts correctly', async ({ page }) => {
        await page.goto('/');

        // Verify the presence of the 4 new benefit texts
        await expect(page.getByText('Entrega garantida ou seu dinheiro de volta')).toBeVisible();
        await expect(page.getByText('Segurança: site totalmente seguro')).toBeVisible();
        await expect(page.getByText('Entrega virtual: receba sem sair de casa')).toBeVisible();
        await expect(page.getByText(/Pague com cartão/)).toBeVisible();
    });

    test('featured highlights section should be centralized', async ({ page }) => {
        // Mock the API response to ensure we have listings
        await page.route('**/api/public/listings*', async route => {
            const json = [
                {
                    id: '1',
                    title: 'Test Feature',
                    priceCents: 5000,
                    currency: 'BRL',
                    status: 'PUBLISHED',
                    deliveryType: 'AUTO',
                    media: []
                },
                {
                    id: '2',
                    title: 'Test Feature 2',
                    priceCents: 2000,
                    currency: 'BRL',
                    status: 'PUBLISHED',
                    deliveryType: 'AUTO',
                    media: []
                }
            ];
            await route.fulfill({ json });
        });

        await page.goto('/');

        // Find the section containing "Destaques"
        const section = page.locator('section', { has: page.getByRole('heading', { name: 'Destaques' }) });

        // Find the scrollable container. It is the div with 'overflow-x-auto' inside this section.
        const listContainer = section.locator('div.overflow-x-auto');

        // Verify it has the centering classes
        await expect(listContainer).toHaveClass(/mx-auto/);
        await expect(listContainer).toHaveClass(/w-fit/);
        await expect(listContainer).toHaveClass(/max-w-full/);
    });
});
