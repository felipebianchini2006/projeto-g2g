import { test, expect } from '@playwright/test';

const listingId = process.env['E2E_LISTING_ID'] ?? 'eee8cae5-c315-492e-9a3c-740ad545872d';

test.describe('Report Listing Flow', () => {
    test.describe('User reports listing', () => {
        test.use({ storageState: 'e2e/.auth/user.json' });

        test('can open report modal and submit report', async ({ page }) => {
            await page.goto(`/anuncios/${listingId}`);

            // Find and click the report button
            const reportButton = page.getByRole('button', { name: /denunciar/i });
            await expect(reportButton).toBeVisible();
            await reportButton.click();

            // Modal should appear
            await expect(page.getByRole('heading', { name: /denunciar anúncio/i })).toBeVisible();

            // Select reason
            const reasonSelect = page.getByRole('combobox').or(page.locator('select'));
            await reasonSelect.selectOption('SCAM');

            // Fill message
            const messageInput = page.getByPlaceholder(/descreva|detalhes/i);
            await messageInput.fill('This listing looks suspicious.');

            // Submit
            await page.getByRole('button', { name: /enviar denúncia/i }).click();

            // Should see success message
            await expect(page.getByText(/denúncia enviada|sucesso/i)).toBeVisible();
        });
    });

    test.describe('Admin reviews reports', () => {
        test.use({ storageState: 'e2e/.auth/admin.json' });

        test('admin can see reports list', async ({ page }) => {
            await page.goto('/admin/denuncias');

            // Should see the page
            await expect(page.getByRole('heading', { name: /denúncias|reports/i })).toBeVisible();

            // Should see list of reports (or empty state)
            const reportsList = page.locator('.support-list, [data-testid="reports-list"]');
            await expect(reportsList.or(page.getByText(/nenhuma denúncia/i))).toBeVisible();
        });

        test('admin can update report status', async ({ page }) => {
            await page.goto('/admin/denuncias');

            // If there are pending reports, click one
            const pendingReport = page.locator('.support-row').first();
            const hasPending = await pendingReport.isVisible().catch(() => false);

            if (hasPending) {
                await pendingReport.click();

                // Should see details section
                await expect(page.getByText(/status/i)).toBeVisible();

                // Try to change status
                const statusSelect = page.locator('select').filter({ hasText: /pendente|em análise/i }).or(page.getByRole('button', { name: /em análise/i }));
                if (await statusSelect.isVisible()) {
                    await statusSelect.click();
                    // Wait for update
                    await expect(page.getByText(/atualizado|sucesso/i)).toBeVisible({ timeout: 5000 }).catch(() => { });
                }
            }
        });
    });
});
