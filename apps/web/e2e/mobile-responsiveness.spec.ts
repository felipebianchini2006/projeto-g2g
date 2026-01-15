
import { expect, test } from '@playwright/test';

test('Mobile layout responsiveness', async ({ page }) => {
    await page.goto('/');

    // Verify header elements stacking on mobile
    const searchInput = page.locator('.site-header input[placeholder*="Anúncio"]');
    await expect(searchInput).toBeVisible();

    // On Mobile, the layout should be stacked, so checking basic visibility first
    const logo = page.locator('.site-header img[alt="Meoww Games"]');
    await expect(logo).toBeVisible();

    // Check if horizontal scroll is present (body width <= viewport width)
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    const viewportWidth = await page.evaluate(() => window.innerWidth);

    // Allowing a small margin of error or exact match
    expect(bodyWidth).toBeLessThanOrEqualTo(viewportWidth + 1);
});
