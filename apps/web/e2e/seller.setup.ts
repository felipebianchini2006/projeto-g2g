import { test as setup, expect } from '@playwright/test';
import * as path from 'path';

const sellerEmail = process.env['E2E_SELLER_EMAIL'] ?? 'seller@email.com';
const seedPassword = process.env['E2E_SEED_PASSWORD'] ?? '12345678';
const authFile = path.join(__dirname, '.auth', 'seller.json');

setup('authenticate as seller', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('E-mail').fill(sellerEmail);
    await page.getByLabel('Senha').fill(seedPassword);
    await page.getByRole('button', { name: 'Entrar' }).click();
    await page.waitForURL('**/');

    // Verify we are logged in
    await expect(page.getByRole('button', { name: /menu|conta|perfil/i }).or(page.locator('[data-testid="user-menu-trigger"]'))).toBeVisible({ timeout: 10000 });

    // Save storage state
    await page.context().storageState({ path: authFile });
});
