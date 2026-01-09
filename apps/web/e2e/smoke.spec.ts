import { expect, test } from '@playwright/test';

const email = process.env['E2E_USER_EMAIL'] ?? 'buyer@email.com';
const password = process.env['E2E_USER_PASSWORD'] ?? '12345678';
const listingId = process.env['E2E_LISTING_ID'] ?? 'eee8cae5-c315-492e-9a3c-740ad545872d';

test('smoke: login -> comprar -> ver pedido -> abrir ticket', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('E-mail').fill(email);
  await page.getByLabel('Senha').fill(password);
  await page.getByRole('button', { name: 'Entrar' }).click();

  await page.waitForURL('**/dashboard');

  await page.goto(`/anuncios/${listingId}`);
  await page.waitForURL('**/anuncios/**');

  await expect(page.getByRole('link', { name: 'Comprar agora' })).toBeVisible();

  await page.getByRole('link', { name: 'Comprar agora' }).click();
  await page.waitForURL('**/checkout/**');

  await page.getByRole('button', { name: 'Gerar Pix' }).click();
  await page.getByRole('link', { name: 'Ver pedido' }).click();

  await page.waitForURL('**/dashboard/pedidos/**');
  await expect(page.getByRole('heading', { name: /Pedido/ })).toBeVisible();

  await page.getByRole('link', { name: 'Abrir ticket' }).click();
  await page.waitForURL('**/dashboard/tickets**');

  await page.getByLabel('Assunto').fill('Problema no pedido');
  await page.getByLabel('Mensagem inicial').fill('Preciso de ajuda com o pedido.');
  await page.getByRole('button', { name: 'Abrir ticket' }).click();

  await expect(page.getByText('Ticket aberto com sucesso.')).toBeVisible();
});
