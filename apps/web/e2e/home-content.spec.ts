
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
});
