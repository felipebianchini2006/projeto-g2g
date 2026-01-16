import { test, expect } from '@playwright/test';

test.describe('Listing Approval / Confirmar Anuncio Flow', () => {
    test.describe('Admin reviews pending listings', () => {
        test.use({ storageState: 'e2e/.auth/admin.json' });

        test('can access confirmar anuncio page', async ({ page }) => {
            await page.goto('/admin/confirmar-anuncio');

            // Should see the page with title
            await expect(page.getByRole('heading', { name: /confirmar anúncios/i })).toBeVisible();
        });

        test('status filter is locked to PENDING', async ({ page }) => {
            await page.goto('/admin/confirmar-anuncio');

            // Find status filter
            const statusFilter = page.locator('select').filter({ hasText: /status/i }).or(page.locator('select').first());

            if (await statusFilter.isVisible()) {
                // Check if it's disabled or set to PENDING
                const isDisabled = await statusFilter.isDisabled();
                const value = await statusFilter.inputValue().catch(() => '');

                // Should be disabled or locked
                if (!isDisabled) {
                    expect(value.toLowerCase()).toContain('pending');
                } else {
                    expect(isDisabled).toBe(true);
                }
            }
        });

        test('create form is hidden', async ({ page }) => {
            await page.goto('/admin/confirmar-anuncio');

            // The create listing form should NOT be visible
            await expect(page.getByRole('heading', { name: /criar anúncio/i })).not.toBeVisible();
        });

        test('can approve pending listing', async ({ page }) => {
            await page.goto('/admin/confirmar-anuncio');

            // Find a pending listing
            const listing = page.locator('.support-row, [data-testid="listing-row"]').first();
            const hasListing = await listing.isVisible().catch(() => false);

            if (hasListing) {
                await listing.click();

                // Should see details
                await expect(page.getByText(/status/i)).toBeVisible();

                // Click approve
                const approveButton = page.getByRole('button', { name: /aprovar/i });
                if (await approveButton.isVisible()) {
                    await approveButton.click();
                    await expect(page.getByText(/aprovado|publicado|sucesso/i)).toBeVisible({ timeout: 5000 });
                }
            }
        });

        test('can reject pending listing with reason', async ({ page }) => {
            await page.goto('/admin/confirmar-anuncio');

            // Find a pending listing
            const listing = page.locator('.support-row, [data-testid="listing-row"]').first();
            const hasListing = await listing.isVisible().catch(() => false);

            if (hasListing) {
                await listing.click();

                // Fill rejection reason if field exists
                const reasonInput = page.getByPlaceholder(/motivo|razão/i).or(page.locator('textarea'));
                if (await reasonInput.isVisible()) {
                    await reasonInput.fill('Description is too short.');
                }

                // Click reject
                const rejectButton = page.getByRole('button', { name: /rejeitar|reprovar/i });
                if (await rejectButton.isVisible()) {
                    await rejectButton.click();
                    await expect(page.getByText(/rejeitado|sucesso/i)).toBeVisible({ timeout: 5000 });
                }
            }
        });
    });

    test.describe('Comparison with Moderação page', () => {
        test.use({ storageState: 'e2e/.auth/admin.json' });

        test('moderação page has unlocked filter', async ({ page }) => {
            await page.goto('/admin/anuncios');

            // Find status filter
            const statusFilter = page.locator('select').first();

            if (await statusFilter.isVisible()) {
                // Should NOT be disabled
                const isDisabled = await statusFilter.isDisabled();
                expect(isDisabled).toBe(false);
            }
        });

        test('moderação page has create form', async ({ page }) => {
            await page.goto('/admin/anuncios');

            // The create listing form SHOULD be visible
            await expect(page.getByRole('heading', { name: /criar anúncio/i })).toBeVisible();
        });
    });
});
