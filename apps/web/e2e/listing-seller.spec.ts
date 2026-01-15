
import { test, expect } from '@playwright/test';

const listingId = process.env['E2E_LISTING_ID'] ?? 'eee8cae5-c315-492e-9a3c-740ad545872d';

test('listing page should display seller card and navigate to profile', async ({ page }) => {
    // 1. Visit listing page
    await page.goto(`/anuncios/${listingId}`);

    // 2. Wait for loading
    await expect(page.locator('h1')).toBeVisible();

    // 3. Find Seller Card
    // We assume the test environment listing has a valid seller
    // Check for some static text from the card, e.g. "Vendas", "Avaliação"
    await expect(page.getByText('Vendas', { exact: true })).toBeVisible();
    await expect(page.getByText('Avaliação', { exact: true })).toBeVisible();

    // 4. Check Link
    const profileLink = page.getByRole('link', { name: 'Ver perfil completo' });
    await expect(profileLink).toBeVisible();

    // 5. Navigate
    await profileLink.click();
    await page.waitForURL('**/perfil/**');

    // 6. Verify Profile Page (Basic check)
    // Assuming profile page has some elements. Maybe just URL check is enough per criteria.
});
