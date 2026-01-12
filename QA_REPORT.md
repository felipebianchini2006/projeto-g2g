# QA Report — Projeto G2G

## Resumo executivo
- **Status geral:** **FALHA** (Playwright e cobertura)
- **Passou:** setup de infraestrutura, migrations/seed (dev/test), unit tests API (exceto cobertura), e2e API
- **Falhou:**
  - **HIGH:** Playwright e2e web falha por timeout ao clicar em **“Gerar Pix”** no checkout
  - **MEDIUM:** `test:all` falha por thresholds de cobertura (branches/lines/functions)
- **Risco por severidade:**
  - **HIGH:** bloqueia validação completa de fluxo buyer/seller/admin na UI
  - **MEDIUM:** cobertura abaixo do mínimo aumenta risco de regressão não detectada

## Ambiente usado
- **OS:** Windows 10 Pro 64-bit (10.0.19045)
- **Node:** v24.12.0
- **npm:** 11.7.0
- **Docker:** 29.1.3
- **Docker Compose:** v2.40.3
- **Portas:**
  - 3000 (web) — usado durante `test:e2e`
  - 3001 (api) — usado durante `test:e2e`
  - 5432 (postgres dev) — docker (serviço local postgres foi parado)
  - 5433 (postgres test) — docker (test setup)
  - 6379 (redis) — docker

## Execução — setup e smoke
- `npm install` ✅
- `npm run docker:up` ✅
- `npm run prisma:migrate:deploy -w apps/api` ✅ (após parar Postgres local)
- `npm run prisma:seed -w apps/api` ✅ (com `DATABASE_URL` no ambiente)
- `GET /health` e `GET /ready` ✅ (via `npm run test:e2e`)

## Execução — testes automatizados
### `npm run test:all` (CI-like)
- **Unit API:** PASS, mas cobertura abaixo do threshold
  - **Branches:** 43.97% (threshold 45)
  - **Lines:** 54.65% (threshold 55)
  - **Functions:** 59.45% (threshold 60)
- **Status final:** FAIL (coverage)

### `npm run test:int:api`
- **Status:** PASS
- **Suites:** 9 passed / 9 total

### `npm run test:e2e` (Playwright)
- **Status:** FAIL
- **Falha:** timeout aguardando botão **“Gerar Pix”** no checkout
- **Evidências:**
  - Screenshot: `apps/web/test-results/smoke-e2e-flows-buyer-regi-61fed-pays-chats-and-opens-ticket-chromium/test-failed-1.png`
  - Video: `apps/web/test-results/smoke-e2e-flows-buyer-regi-61fed-pays-chats-and-opens-ticket-chromium/video.webm`
  - Trace: `apps/web/test-results/smoke-e2e-flows-buyer-regi-61fed-pays-chats-and-opens-ticket-chromium/trace.zip`
  - Error context: `apps/web/test-results/smoke-e2e-flows-buyer-regi-61fed-pays-chats-and-opens-ticket-chromium/error-context.md`

## Execução — testes manuais E2E
**Status:** **BLOCKED**  
Motivo: fluxo crítico do Playwright falhou no checkout (botão “Gerar Pix” não encontrado), impedindo validar manualmente buyer/seller/admin com confiança.

## Casos de teste executados (PASS/FAIL/BLOCKED)

| ID | Área | Passos resumidos | Resultado esperado | Resultado obtido | Evidências |
|---|---|---|---|---|---|
| A1 | Setup | Node/npm/Docker | Requisitos OK | PASS | terminal |
| A2 | Setup | `npm install` | Dependências ok | PASS | terminal |
| A3 | Setup | `docker:up` | Postgres/Redis online | PASS | terminal |
| A4 | Setup | `prisma:migrate:deploy` (dev) | Migrations aplicadas | PASS | terminal |
| A5 | Setup | `prisma:seed` (dev) | Seed executa | PASS | terminal |
| B1 | Unit (API) | `npm run test:unit:api` | Todos os testes + cobertura | **FAIL** | coverage abaixo do threshold |
| B2 | Int (API) | `npm run test:int:api` | Todos os e2e API | PASS | terminal |
| B3 | E2E (Web) | `npm run test:e2e` | Fluxo smoke Playwright | **FAIL** | screenshot/video/trace |
| C1 | Público | Home/listings/busca | Carrega | **BLOCKED** | Playwright fail |
| C2 | Auth | register/login/refresh/logout | Fluxos OK | **BLOCKED** | Playwright fail |
| C3 | Seller | criar anúncio/inventário | Fluxos OK | **BLOCKED** | Playwright fail |
| C4 | Checkout/Pix | pedido/pix/webhook | Fluxos OK | **BLOCKED** | Playwright fail |
| C5 | Chat | buyer/seller chat | Fluxos OK | **BLOCKED** | Playwright fail |
| C6 | Manual delivery | evidência/entrega | Fluxos OK | **BLOCKED** | Playwright fail |
| C7 | Disputa | abrir/resolve release/refund | Fluxos OK | **BLOCKED** | Playwright fail |
| C8 | Tickets | abrir/responder/fechar | Fluxos OK | **BLOCKED** | Playwright fail |
| C9 | Notificações | gerar/ler | Fluxos OK | **BLOCKED** | Playwright fail |
| C10 | Admin | catálogo/listings/users/settings | Fluxos OK | **BLOCKED** | Playwright fail |
| D1 | AuthZ | 401/403 | Respostas corretas | **BLOCKED** | Playwright fail |
| D2 | Integridade | idempotência/estoque | Respostas corretas | **BLOCKED** | Playwright fail |
| D3 | Upload | limites/mimetype | Respostas corretas | **BLOCKED** | Playwright fail |
| D4 | Rate limit | auth/chat | Respostas corretas | **BLOCKED** | Playwright fail |

## Falhas detalhadas

### BUG-001 — HIGH — Playwright timeout no botão “Gerar Pix”
- **Como reproduzir:** `npm run test:e2e`
- **Resultado:** timeout ao clicar `getByRole('button', { name: 'Gerar Pix' })`
- **Evidência:** screenshot/video/trace em `apps/web/test-results/...`
- **Endpoint envolvido:** `GET /checkout/:listingId`
- **Hipótese:** CTA não renderiza por estado de estoque, erro de UI ou atraso no fetch do listing/checkout.
- **Sugestão:** validar se o CTA depende de `inventory`/`price` e garantir fallback; aumentar timeout ou aguardar carregamento do bloco do checkout no teste.

### BUG-002 — MEDIUM — Cobertura abaixo do threshold (test:all)
- **Como reproduzir:** `npm run test:all`
- **Resultado:** branches/lines/functions abaixo do mínimo exigido.
- **Hipótese:** falta de testes em módulos Google OAuth/efi-http/settlement/orders.
- **Sugestão:** adicionar testes para Google OAuth + serviços com baixa cobertura ou ajustar thresholds.

## Bugs por severidade
- **HIGH:** BUG-001 (Playwright checkout “Gerar Pix”)
- **MEDIUM:** BUG-002 (coverage)

## Melhorias sugeridas
- Incluir teste de carregamento/estado do CTA no checkout.
- Reforçar cobertura nos módulos `google-*`, `efi-http`, `settlement` e `orders`.
- Adicionar log/telemetria para estados do checkout (stock, price, status).

## Observações
- Para liberar o Postgres docker, foi necessário parar o serviço local **postgresql-x64-18** (ocupava a porta 5432).
- OAuthProvider do Prisma foi atualizado com `GOOGLE` e novo migration aplicado em dev/test.
