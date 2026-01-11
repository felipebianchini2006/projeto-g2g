# QA Report - Projeto G2G

## Como rodar local

1) Suba o ambiente e execute tudo:
   - `npm run test:all`

2) Execucao manual por suite:
   - `npm run test:setup`
   - `npm run test:unit:api`
   - `npm run test:int:api`
   - `npm run test:e2e`
   - `npm run test:teardown`

Notas:
- Requer Docker ativo para Postgres/Redis de teste.
- PIX real nao e usado: `PIX_MOCK_MODE=true`.

## Suites e cobertura

### Unit (API - Jest)
- Auth: register/login, refresh token (rotacao/expirado), usuario bloqueado.
- Orders/Checkout: criacao, validacoes, invariantes em centavos.
- Payments (Pix mock): cobranca mock e fluxos de pagamento.
- Settlement/Wallet: fee, release/complete e refund.
- Tickets/Disputes: ticket, mensagens e validacoes de status.
- Webhooks: idempotencia e processadores.

### Integration (API + DB real)
- Auth completo (register -> login -> refresh -> rota protegida).
- Listings (create/list/detail).
- Checkout Pix mock + webhook paid + status/eventos.
- Tickets/Disputes (abertura e resolucao admin).
- Ledger (release e lancamentos).
- Websocket (chat gateway com socket.io-client).

### E2E Web (Playwright)
- Buyer: registro/login, checkout Pix mock, status pago, chat, ticket.
- Seller: login, listar pedidos, responder chat.
- Admin: fila de suporte, resolver disputa.

## Cobertura (Jest)

Ultima execucao (test:all):
- Lines: 57.25%
- Branches: 45.88%
- Statements: 58.30%
- Functions: 63.58%

Thresholds definidos:
- Branches: 45
- Lines: 55
- Statements: 55
- Functions: 60

Artefatos:
- Coverage: `apps/coverage`
- Playwright report: `apps/web/playwright-report`
- Playwright artifacts: `apps/web/test-results`

## Bugs corrigidos

- E2E quebrava por `statusLabel` ausente no checkout (runtime).
- Order detail quebrava quando `items` nao vinha no payload (runtime).
- `searchParams` tratado como sync nas paginas de tickets (Next 16).
- `TooManyRequestsException` inexistente no Nest 11.
- Update de coupon com `partnerId` (Prisma update input).
- Execucao E2E em Windows (spawn de npm) e seed na inicializacao.
- EFI cert path valido em ambiente de teste.

## Riscos restantes

- Integracao Efí real permanece mockada por design (PIX_MOCK_MODE=true).
- Cobertura abaixo de 60% em alguns modulos (efi-http, settlement, orders).
