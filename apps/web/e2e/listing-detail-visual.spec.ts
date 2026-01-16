import { test, expect } from '@playwright/test';

const listingId = process.env['E2E_LISTING_ID'] ?? 'eee8cae5-c315-492e-9a3c-740ad545872d';

test.describe('Listing Detail Page - Visual Layout', () => {
    test.use({ storageState: { cookies: [], origins: [] } }); // Public view

    test('has all essential sections', async ({ page }) => {
        await page.goto(`/anuncios/${listingId}`);

        // Wait for page to load
        await page.waitForLoadState('networkidle');

        // Essential sections that should be present
        // 1. Title
        await expect(page.getByRole('heading').first()).toBeVisible();

        // 2. Price
        await expect(page.getByText(/R\$|BRL/)).toBeVisible();

        // 3. Buy/CTA button
        await expect(page.getByRole('link', { name: /comprar|adicionar/i })).toBeVisible();

        // 4. Seller info
        await expect(page.getByText(/vendedor|seller/i)).toBeVisible();

        // 5. Description or tabs
        await expect(page.getByText(/descrição|detalhes/i)).toBeVisible();
    });

    test('has proper navigation breadcrumbs', async ({ page }) => {
        await page.goto(`/anuncios/${listingId}`);

        // Should have breadcrumb with "Inicio"
        await expect(page.getByRole('link', { name: /inicio|home/i })).toBeVisible();

        // Should have "Voltar ao catálogo" link
        await expect(page.getByRole('link', { name: /voltar|catálogo/i })).toBeVisible();
    });

    test('report button is visible', async ({ page }) => {
        await page.goto(`/anuncios/${listingId}`);

        // Report button should be visible
        await expect(page.getByRole('button', { name: /denunciar/i })).toBeVisible();
    });

    test.describe('Visual regression - Desktop only', () => {
        test.skip(({ browserName }) => browserName !== 'chromium', 'Visual tests only on Chromium');

        test('listing detail matches snapshot', async ({ page }) => {
            await page.setViewportSize({ width: 1280, height: 720 });
            await page.goto(`/anuncios/${listingId}`);
            await page.waitForLoadState('networkidle');

            // Wait for images to load
            await page.waitForTimeout(1000);

            // Screenshot the main content area
            const mainContent = page.locator('main, section').first();
            await expect(mainContent).toHaveScreenshot('listing-detail.png', {
                maxDiffPixels: 500,
                threshold: 0.3,
            });
        });
    });
});
