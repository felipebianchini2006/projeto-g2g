import { test, expect } from '@playwright/test';

test.describe('Header - Logged Out State', () => {
    test.use({ storageState: { cookies: [], origins: [] } }); // Force logged out

    test('shows login CTA when logged out', async ({ page }) => {
        await page.goto('/');

        // Should see Entrar/Login button
        const loginLink = page.getByRole('link', { name: /entrar|login/i });
        await expect(loginLink).toBeVisible();
    });

    test('does NOT show user menu items when logged out', async ({ page }) => {
        await page.goto('/');

        // These items should NOT be visible
        await expect(page.getByRole('link', { name: /meu perfil/i })).not.toBeVisible();
        await expect(page.getByRole('link', { name: /meus chamados/i })).not.toBeVisible();
        await expect(page.getByRole('link', { name: /carteira/i })).not.toBeVisible();
        await expect(page.getByRole('link', { name: /menu admin/i })).not.toBeVisible();
        await expect(page.getByRole('button', { name: /sair/i })).not.toBeVisible();
    });

    test('notifications bell is hidden or shows login prompt when logged out', async ({ page }) => {
        await page.goto('/');

        // The notifications bell should either be hidden or not show count when logged out
        const notificationBell = page.locator('[data-testid="notifications-bell"]');
        const bellVisible = await notificationBell.isVisible().catch(() => false);

        if (bellVisible) {
            // If visible, clicking should prompt login or show nothing
            await notificationBell.click();
            // Should show login prompt or empty state
            const loginPrompt = page.getByText(/entre|login|faça login/i);
            const emptyState = page.getByText(/nenhuma notificação/i);
            await expect(loginPrompt.or(emptyState)).toBeVisible();
        }
        // If not visible, that's also acceptable
    });
});

test.describe('Header - Logged In State (User)', () => {
    test.use({ storageState: 'e2e/.auth/user.json' });

    test('shows user menu when logged in', async ({ page }) => {
        await page.goto('/');

        // Should NOT see login button
        await expect(page.getByRole('link', { name: /^entrar$/i })).not.toBeVisible();

        // Should see user menu trigger
        const userMenuTrigger = page.getByRole('button', { name: /menu|conta|perfil/i }).or(page.locator('[data-testid="user-menu-trigger"]'));
        await expect(userMenuTrigger).toBeVisible();
    });

    test('user menu shows correct items for USER role', async ({ page }) => {
        await page.goto('/');

        // Open user menu
        const userMenuTrigger = page.getByRole('button', { name: /menu|conta|perfil/i }).or(page.locator('[data-testid="user-menu-trigger"]'));
        await userMenuTrigger.click();

        // Should see user items
        await expect(page.getByRole('link', { name: /meu perfil|minha conta/i })).toBeVisible();
        await expect(page.getByRole('link', { name: /carteira/i })).toBeVisible();

        // Should NOT see admin menu (only for ADMIN role)
        await expect(page.getByRole('link', { name: /menu admin/i })).not.toBeVisible();
    });
});

test.describe('Header - Admin Role', () => {
    test.use({ storageState: 'e2e/.auth/admin.json' });

    test('admin sees admin menu option', async ({ page }) => {
        await page.goto('/');

        // Open user menu
        const userMenuTrigger = page.getByRole('button', { name: /menu|conta|perfil/i }).or(page.locator('[data-testid="user-menu-trigger"]'));
        await userMenuTrigger.click();

        // Admin should see admin menu link
        await expect(page.getByRole('link', { name: /admin|painel admin/i })).toBeVisible();
    });
});
