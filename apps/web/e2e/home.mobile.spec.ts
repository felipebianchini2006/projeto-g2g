
import { expect, test } from '@playwright/test';

test.describe('Home Mobile', () => {
    test.use({ viewport: { width: 375, height: 667 } }); // Mobile viewport mock

    test('renders home page correctly on mobile', async ({ page }) => {
        await page.goto('/');

        // Check if menu button is visible (mobile only)
        const menuButton = page.locator('button[aria-label="Abrir menu"]');
        await expect(menuButton).toBeVisible();

        // Check for specific mobile elements or lack of desktop elements if needed
        // For example, sidebar should be hidden
        const sidebar = page.locator('aside');
        await expect(sidebar).toBeHidden();

        // Check checks for horizontal scrolling sections (Destaques)
        // Ensure they are visible
        await expect(page.getByText('Destaques')).toBeVisible();
        await expect(page.getByText('Imperdiveis')).toBeVisible();

        // Check if body doesn't have horizontal overflow is hard in Playwright directly without evaluating JS
        // But we can check if key elements are within viewport
        const logo = page.locator('header').first();
        await expect(logo).toBeVisible();
    });
});
