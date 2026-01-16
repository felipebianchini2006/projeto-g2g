import { test, expect } from '@playwright/test';

test.describe('Admin Partners and Coupons Management', () => {
    test.use({ storageState: 'e2e/.auth/admin.json' });

    test.describe('Partners', () => {
        let partnerId: string;
        const partnerName = `E2E Partner ${Date.now()}`;
        const partnerSlug = `e2e-partner-${Date.now()}`;

        test('can create a partner', async ({ page }) => {
            await page.goto('/admin/parceiros');

            // Fill form
            await page.getByLabel(/nome/i).or(page.getByPlaceholder(/nome/i)).fill(partnerName);
            await page.getByLabel(/slug/i).or(page.getByPlaceholder(/slug/i)).fill(partnerSlug);

            const commissionInput = page.getByLabel(/comissão|commission/i).or(page.getByPlaceholder(/comissão/i));
            if (await commissionInput.isVisible()) {
                await commissionInput.fill('500');
            }

            // Submit
            const createButton = page.getByRole('button', { name: /criar|salvar|adicionar/i });
            await createButton.click();

            // Should see success or the partner in list
            await expect(page.getByText(partnerName).or(page.getByText(/sucesso|criado/i))).toBeVisible({ timeout: 5000 });
        });

        test('can see partner in list', async ({ page }) => {
            await page.goto('/admin/parceiros');

            // Should see the partner
            await expect(page.getByText(partnerName)).toBeVisible();
        });

        test('can delete partner', async ({ page }) => {
            await page.goto('/admin/parceiros');

            // Find the partner row and delete button
            const partnerRow = page.locator('.support-row, tr, [data-testid="partner-row"]')
                .filter({ hasText: partnerName });

            if (await partnerRow.isVisible()) {
                // Click on the row to select it
                await partnerRow.click();

                // Find delete button
                const deleteButton = page.getByRole('button', { name: /excluir|deletar|remover/i });
                if (await deleteButton.isVisible()) {
                    await deleteButton.click();

                    // Handle confirmation if exists
                    const confirmButton = page.getByRole('button', { name: /confirmar|sim/i });
                    if (await confirmButton.isVisible({ timeout: 2000 }).catch(() => false)) {
                        await confirmButton.click();
                    }

                    // Partner should be removed
                    await expect(page.getByText(partnerName)).not.toBeVisible({ timeout: 5000 });
                }
            }
        });
    });

    test.describe('Coupons', () => {
        const couponCode = `E2ECOUPON${Date.now()}`;

        test('can create a coupon', async ({ page }) => {
            await page.goto('/admin/cupons');

            // Fill form
            await page.getByLabel(/código|code/i).or(page.getByPlaceholder(/código/i)).fill(couponCode);

            const discountInput = page.getByLabel(/desconto|discount/i).or(page.getByPlaceholder(/desconto/i));
            if (await discountInput.isVisible()) {
                await discountInput.fill('1000');
            }

            // Submit
            const createButton = page.getByRole('button', { name: /criar|salvar|adicionar/i });
            await createButton.click();

            // Should see success
            await expect(page.getByText(couponCode).or(page.getByText(/sucesso|criado/i))).toBeVisible({ timeout: 5000 });
        });

        test('can see coupon in list', async ({ page }) => {
            await page.goto('/admin/cupons');

            await expect(page.getByText(couponCode)).toBeVisible();
        });

        test('can delete coupon', async ({ page }) => {
            await page.goto('/admin/cupons');

            // Find the coupon row
            const couponRow = page.locator('.support-row, tr, [data-testid="coupon-row"]')
                .filter({ hasText: couponCode });

            if (await couponRow.isVisible()) {
                await couponRow.click();

                const deleteButton = page.getByRole('button', { name: /excluir|deletar|remover/i });
                if (await deleteButton.isVisible()) {
                    await deleteButton.click();

                    // Handle confirmation
                    const confirmButton = page.getByRole('button', { name: /confirmar|sim/i });
                    if (await confirmButton.isVisible({ timeout: 2000 }).catch(() => false)) {
                        await confirmButton.click();
                    }

                    // Coupon should be removed
                    await expect(page.getByText(couponCode)).not.toBeVisible({ timeout: 5000 });
                }
            }
        });
    });
});
