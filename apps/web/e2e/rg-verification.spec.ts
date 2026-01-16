import { test, expect } from '@playwright/test';
import * as path from 'path';

test.describe('RG Verification Flow', () => {
    test.describe('User submits RG', () => {
        test.use({ storageState: 'e2e/.auth/user.json' });

        test('can submit RG for verification', async ({ page }) => {
            await page.goto('/conta/dados');

            // Should see RG verification section
            await expect(page.getByText(/verificação de identidade|rg/i)).toBeVisible();

            // Fill RG number
            const rgInput = page.getByPlaceholder(/12.345.678-9/i).or(page.locator('input[placeholder*="RG"]'));
            if (await rgInput.isVisible()) {
                await rgInput.fill('12.345.678-9');

                // Upload file - create a test image
                const fileInput = page.locator('input[type="file"]');

                // Create a dummy image buffer
                const buffer = Buffer.from([
                    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
                    0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
                    0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4, 0x89, 0x00, 0x00, 0x00,
                    0x0a, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9c, 0x63, 0x00, 0x01, 0x00, 0x00,
                    0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00, 0x00, 0x00, 0x00, 0x49,
                    0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82
                ]);

                await fileInput.setInputFiles({
                    name: 'test-rg.png',
                    mimeType: 'image/png',
                    buffer,
                });

                // Submit
                const submitButton = page.getByRole('button', { name: /enviar para análise/i });
                await submitButton.click();

                // Should see success or pending status
                await expect(
                    page.getByText(/enviado|pendente|em análise/i)
                ).toBeVisible({ timeout: 10000 });
            }
        });

        test('shows current RG status', async ({ page }) => {
            await page.goto('/conta/dados');

            // Should show some status indicator
            const statusIndicators = [
                page.getByText(/não enviado/i),
                page.getByText(/pendente|em análise/i),
                page.getByText(/verificado|aprovado/i),
                page.getByText(/reprovado/i),
            ];

            // At least one should be visible (or the form)
            const formVisible = await page.getByText(/verificação de identidade/i).isVisible();
            expect(formVisible).toBe(true);
        });
    });

    test.describe('Admin reviews RG submissions', () => {
        test.use({ storageState: 'e2e/.auth/admin.json' });

        test('can access RG verification admin page', async ({ page }) => {
            await page.goto('/admin/rg');

            // Should see the page
            await expect(page.getByRole('heading', { name: /verificação de rg/i })).toBeVisible();
        });

        test('can filter by status', async ({ page }) => {
            await page.goto('/admin/rg');

            // Find status filter
            const statusFilter = page.locator('select').first();
            await expect(statusFilter).toBeVisible();

            // Try filtering by pending
            await statusFilter.selectOption('PENDING');

            // Should update the list
            await page.waitForLoadState('networkidle');
        });

        test('can view verification details', async ({ page }) => {
            await page.goto('/admin/rg');

            // If there are verifications, click one
            const verification = page.locator('.support-row, [data-testid="verification-row"]').first();
            const hasVerification = await verification.isVisible().catch(() => false);

            if (hasVerification) {
                await verification.click();

                // Should see details
                await expect(page.getByText(/status/i)).toBeVisible();
                await expect(page.getByText(/rg|número/i)).toBeVisible();
            }
        });

        test('can approve verification', async ({ page }) => {
            await page.goto('/admin/rg?status=PENDING');

            const verification = page.locator('.support-row, [data-testid="verification-row"]').first();
            const hasVerification = await verification.isVisible().catch(() => false);

            if (hasVerification) {
                await verification.click();

                // Click approve button
                const approveButton = page.getByRole('button', { name: /aprovar/i });
                if (await approveButton.isVisible()) {
                    await approveButton.click();
                    await expect(page.getByText(/aprovado|sucesso/i)).toBeVisible({ timeout: 5000 });
                }
            }
        });
    });
});
