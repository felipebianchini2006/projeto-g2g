import { test as setup, expect } from '@playwright/test';
import * as path from 'path';

const adminEmail = process.env['E2E_ADMIN_EMAIL'] ?? 'admin@email.com';
const seedPassword = process.env['E2E_SEED_PASSWORD'] ?? '12345678';
const authFile = path.join(__dirname, '.auth', 'admin.json');

setup('authenticate as admin', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('E-mail').fill(adminEmail);
    await page.getByLabel('Senha').fill(seedPassword);
    await page.getByRole('button', { name: 'Entrar' }).click();
    await page.waitForURL('**/');

    // Verify we are logged in
    await expect(page.getByRole('button', { name: /menu|conta|perfil/i }).or(page.locator('[data-testid="user-menu-trigger"]'))).toBeVisible({ timeout: 10000 });

    // Save storage state
    await page.context().storageState({ path: authFile });
});
