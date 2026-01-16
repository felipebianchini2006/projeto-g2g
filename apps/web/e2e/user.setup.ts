import { test as setup, expect } from '@playwright/test';
import * as path from 'path';
import { randomUUID } from 'crypto';

const apiUrl = process.env['E2E_API_URL'] ?? 'http://localhost:3001';
const seedPassword = process.env['E2E_SEED_PASSWORD'] ?? '12345678';
const authFile = path.join(__dirname, '.auth', 'user.json');

setup('authenticate as user', async ({ page, request }) => {
    // Create a new user via API
    const userEmail = `e2e-user-${randomUUID().slice(0, 8)}@test.com`;

    // Register
    await page.goto('/register');
    await page.getByLabel('E-mail').fill(userEmail);
    await page.getByLabel('Senha').fill(seedPassword);
    await page.getByLabel('Perfil').selectOption('USER');
    await page.getByRole('button', { name: 'Criar conta' }).click();
    await page.waitForURL('**/');

    // Login
    await page.goto('/login');
    await page.getByLabel('E-mail').fill(userEmail);
    await page.getByLabel('Senha').fill(seedPassword);
    await page.getByRole('button', { name: 'Entrar' }).click();
    await page.waitForURL('**/');

    // Verify we are logged in
    await expect(page.getByRole('button', { name: /menu|conta|perfil/i }).or(page.locator('[data-testid="user-menu-trigger"]'))).toBeVisible({ timeout: 10000 });

    // Save storage state
    await page.context().storageState({ path: authFile });
});
