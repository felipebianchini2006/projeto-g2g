import { test, expect } from '@playwright/test';

test.describe('Layout tests', () => {
    test('Top bar text is centered on desktop and mobile', async ({ page }) => {
        // Navigate to home
        await page.goto('/');

        // Locators
        // Note: Using a more specific locator strategy if possible, or text match
        const textLocator = page.locator('span', { hasText: 'Frete grátis em regiões selecionadas' }).first();
        const linkLocator = page.getByRole('link', { name: 'Saiba mais' }).first();

        await expect(textLocator).toBeVisible();
        await expect(linkLocator).toBeVisible();

        // Helper to check centering
        const checkCentered = async (width: number) => {
            await page.setViewportSize({ width, height: 800 });
            // Wait for layout stability
            await page.waitForTimeout(500);

            const box = await textLocator.boundingBox();
            expect(box).not.toBeNull();

            if (box) {
                const textCenter = box.x + box.width / 2;
                const viewportCenter = width / 2;
                console.log(`Checking center for width ${width}: TextCenter=${textCenter}, ViewportCenter=${viewportCenter}`);

                // We allow a small margin of error (e.g. 2px)
                expect(Math.abs(textCenter - viewportCenter)).toBeLessThan(2.0);
            }
        };

        // 1. Mobile (375px)
        await checkCentered(375);

        // 2. Tablet (768px)
        await checkCentered(768);

        // 3. Desktop (1280px)
        await checkCentered(1280);
    });
});
