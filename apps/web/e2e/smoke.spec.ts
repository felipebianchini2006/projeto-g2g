import { expect, test } from '@playwright/test';

const listingId =
  process.env['E2E_LISTING_ID'] ?? 'eee8cae5-c315-492e-9a3c-740ad545872d';
const apiUrl = process.env['E2E_API_URL'] ?? 'http://localhost:3001';

const buyerPassword = process.env['E2E_USER_PASSWORD'] ?? '12345678';
const buyerEmail =
  process.env['E2E_USER_EMAIL'] ?? `buyer-${Date.now()}@test.com`;
const sellerEmail = process.env['E2E_SELLER_EMAIL'] ?? 'seller@email.com';
const adminEmail = process.env['E2E_ADMIN_EMAIL'] ?? 'admin@email.com';
const seedPassword = process.env['E2E_SEED_PASSWORD'] ?? '12345678';

let orderId = '';

const parseOrderIdFromUrl = (url: string) => {
  const match = url.match(/\/conta\/pedidos\/([^/]+)\/pagamentos/);
  return match?.[1] ?? '';
};

test.describe.serial('e2e flows', () => {
  test('buyer registers, logs in, checks out, pays, chats, and opens ticket', async ({ page, request }) => {
    await page.goto('/register');
    await page.getByLabel('E-mail').fill(buyerEmail);
    await page.getByLabel('Senha').fill(buyerPassword);
    await page.getByLabel('Perfil').selectOption('USER');
    await page.getByRole('button', { name: 'Criar conta' }).click();
    await page.waitForURL('**/');

    await page.goto('/login');
    await page.getByLabel('E-mail').fill(buyerEmail);
    await page.getByLabel('Senha').fill(buyerPassword);
    await page.getByRole('button', { name: 'Entrar' }).click();
    await page.waitForURL('**/');

    await page.goto(`/anuncios/${listingId}`);
    await page.getByRole('link', { name: 'Comprar agora' }).click();
    await page.waitForURL('**/checkout/**');

    await page.getByRole('button', { name: 'Gerar Pix' }).click();
    await page.waitForURL('**/conta/pedidos/**/pagamentos');

    orderId = parseOrderIdFromUrl(page.url());
    expect(orderId).toBeTruthy();

    await expect(page.getByText('Pagamento pendente')).toBeVisible();

    const qrText = await page.getByText(/QR Code Pix:/).textContent();
    const txidMatch = qrText?.match(/PIX:([A-Za-z0-9]+)/);
    expect(txidMatch).not.toBeNull();
    const txid = txidMatch?.[1] ?? '';

    const webhookResponse = await request.post(`${apiUrl}/webhooks/efi/pix`, {
      data: {
        txid,
        pix: [{ txid, horario: new Date().toISOString() }],
      },
    });
    expect(webhookResponse.status()).toBe(201);

    await page.getByRole('link', { name: 'Ver pedido' }).click();
    await page.waitForURL(`**/conta/pedidos/${orderId}`);

    const statusValue = page.getByText('Status').locator('..').locator('p');
    await expect(statusValue).toHaveText(/Em entrega|Entregue|Pago/);

    await page.getByPlaceholder('Escreva sua mensagem...').fill('Oi vendedor');
    await page.getByRole('button', { name: 'Enviar' }).click();
    await expect(page.getByText('Oi vendedor')).toBeVisible();

    await page.getByRole('link', { name: 'Abrir ticket' }).click();
    await page.waitForURL('**/conta/tickets**');

    await page.getByLabel('Assunto').fill('Problema no pedido');
    await page.getByLabel('Mensagem inicial').fill('Preciso de ajuda com o pedido.');
    await page.getByRole('button', { name: 'Abrir ticket' }).click();

    await expect(page.getByText('Ticket aberto com sucesso.')).toBeVisible();
  });

  test('seller sees the order and replies in chat', async ({ page }) => {
    expect(orderId).toBeTruthy();

    await page.goto('/login');
    await page.getByLabel('E-mail').fill(sellerEmail);
    await page.getByLabel('Senha').fill(seedPassword);
    await page.getByRole('button', { name: 'Entrar' }).click();
    await page.waitForURL('**/');

    await page.goto('/conta/vendas');
    await expect(page.getByText(`#${orderId.slice(0, 4)}`)).toBeVisible();

    await page.goto(`/conta/vendas/${orderId}`);
    await expect(page.getByText('Chat do pedido')).toBeVisible();

    await page.getByPlaceholder('Escreva sua mensagem...').fill('Oi comprador');
    await page.getByRole('button', { name: 'Enviar' }).click();
    await expect(page.getByText('Oi comprador')).toBeVisible();
  });

  test('buyer opens a dispute', async ({ page }) => {
    expect(orderId).toBeTruthy();

    await page.goto('/login');
    await page.getByLabel('E-mail').fill(buyerEmail);
    await page.getByLabel('Senha').fill(buyerPassword);
    await page.getByRole('button', { name: 'Entrar' }).click();
    await page.waitForURL('**/');

    await page.goto(`/conta/pedidos/${orderId}`);
    await page.getByRole('button', { name: 'Abrir disputa' }).click();

    // Handle dispute modal
    await expect(page.getByText('Descreva o motivo da disputa')).toBeVisible();
    await page.getByPlaceholder('Explique o problema').fill('Produto veio com defeito e não funciona.');
    await page.getByRole('button', { name: 'Confirmar abertura' }).click();

    await expect(page.getByText('Disputa aberta.')).toBeVisible();
  });

  test('admin reviews support queue and resolves dispute', async ({ page }) => {
    expect(orderId).toBeTruthy();

    await page.goto('/login');
    await page.getByLabel('E-mail').fill(adminEmail);
    await page.getByLabel('Senha').fill(seedPassword);
    await page.getByRole('button', { name: 'Entrar' }).click();
    await page.waitForURL('**/');

    await page.goto('/admin/atendimento');
    await expect(page.getByText('Fila de suporte')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Tickets' })).toBeVisible();

    await page
      .getByRole('link', { name: new RegExp(`Reclamacao #${orderId.slice(0, 6)}`) })
      .click();

    await page.getByRole('button', { name: 'Liberar seller' }).click();
    await expect(page.getByText(/Disputa released\./)).toBeVisible();
  });
});
