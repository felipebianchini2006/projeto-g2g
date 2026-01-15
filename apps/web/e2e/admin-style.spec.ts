
import { expect, test } from '@playwright/test';

const adminEmail = process.env['E2E_ADMIN_EMAIL'] ?? 'admin@email.com';
const seedPassword = process.env['E2E_SEED_PASSWORD'] ?? '12345678';

test('admin settings button should have correct theme style', async ({ page }) => {
    // 1. Login as Admin
    await page.goto('/login');
    await page.getByLabel('E-mail').fill(adminEmail);
    await page.getByLabel('Senha').fill(seedPassword);
    await page.getByRole('button', { name: 'Entrar' }).click();
    await page.waitForURL('**/');
    console.log('Logged in, current URL:', page.url());

    // 2. Go to Admin Settings (Parametros)
    await page.goto('/admin/parametros');
    console.log('Navigated to parameters, current URL:', page.url());

    // Verify we are not redirected or stuck
    await expect(page.getByText('Parametros')).toBeVisible({ timeout: 10000 });

    // 3. Verify the button style
    const saveButton = page.getByRole('button', { name: 'Salvar ajustes' });
    await expect(saveButton).toBeVisible();

    // Verify it has the new class
    await expect(saveButton).toHaveClass(/admin-primary-button/);

    // Verify computed styles (approximate check for pink/red background)
    // We can't easily check exact variable values in E2E, but we can check if it's not yellow
    // var(--red) corresponds to #ff6b95 usually or similar.
    // Note: Playwright getComputedStyle might return rgb.

    // Check that it's NOT yellow (var(--gold) #fcd34d is rgb(252, 211, 77))
    // We expect something reddish/pinkish.

    /* 
       This check is optional as per request ("Unit (opcional): snapshot/DOM asserting da classe aplicada. E2E: ... botão existe com classe nova.")
       So the class check is sufficient.
    */
});
