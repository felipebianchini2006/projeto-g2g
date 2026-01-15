
import { expect, test } from '@playwright/test';

const listingId = process.env['E2E_LISTING_ID'] ?? 'eee8cae5-c315-492e-9a3c-740ad545872d';
const buyerEmail = process.env['E2E_USER_EMAIL'] ?? 'buyer@test.com'; // Use a consistent buyer if possible, or dynamic
const buyerPassword = process.env['E2E_USER_PASSWORD'] ?? '12345678';
const sellerEmail = process.env['E2E_SELLER_EMAIL'] ?? 'seller@email.com';
const seedPassword = process.env['E2E_SEED_PASSWORD'] ?? '12345678';

test.describe.serial('Questions Flow', () => {
    test('buyer asks a question and seller receives it', async ({ page }) => {
        const questionText = `Question ${Date.now()}`;

        // 1. Buyer asks question
        await page.goto('/login');
        await page.getByLabel('E-mail').fill(buyerEmail);
        await page.getByLabel('Senha').fill(buyerPassword);
        await page.getByRole('button', { name: 'Entrar' }).click();
        await page.waitForURL('**/');

        await page.goto(`/anuncios/${listingId}`);
        // Assuming there is a question input. If not, it might be "Perguntar" button opening a modal.
        // Based on typical flows: Input text area + "Enviar pergunta".
        // Use generic selector if specific label is unknown, or guess "Pergunte ao vendedor"
        const input = page.getByPlaceholder('Escreva sua duvida...'); // Fixed placeholder (no accent)

        // Fallback if placeholder is different, try looking for textarea
        if (await input.count() === 0) {
            await page.locator('textarea').fill(questionText);
        } else {
            await input.fill(questionText);
        }

        await page.getByRole('button', { name: 'Enviar pergunta' }).click();
        await expect(page.getByText('Pergunta enviada!')).toBeVisible(); // This text might differ, need to verify toast/success message

        // Logout
        await page.goto('/conta/config'); // Or click Logout in menu
        await page.getByRole('button', { name: /Sair/i }).click();
        // Need to confirm if dashboard has logout button directly or in menu. 
        // DashboardLayout: "Sair" in menu.
        // On mobile it might be in sidebar. on Desktop visible? 
        // Use direct logout URL if available or cleared context.
        // Easiest: page.context().clearCookies() or re-login flow overwrites session usually.
        // But let's just go to login page, it usually redirects if logged in, but we can sign out via UI.

        // 2. Seller checks question
        await page.goto('/login');
        // If still logged in, logout
        if (await page.getByRole('button', { name: 'Entrar' }).count() === 0) {
            // force logout
            await page.evaluate(() => localStorage.clear());
            await page.context().clearCookies();
            await page.reload();
        }

        await page.getByLabel('E-mail').fill(sellerEmail);
        await page.getByLabel('Senha').fill(seedPassword);
        await page.getByRole('button', { name: 'Entrar' }).click();

        await page.waitForURL('**/conta');

        await page.goto('/conta/perguntas-recebidas'); // Fixed URL
        await expect(page.getByText(questionText)).toBeVisible();
    });
});
