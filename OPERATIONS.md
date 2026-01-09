# Operacoes

## Processos em runtime
- API server: `apps/api/src/main.ts` (NestJS HTTP).
- Worker: `apps/api/src/worker.ts` (BullMQ processors).

Exemplo em producao (apos build):
- API: `node dist/main`
- Worker: `node dist/worker`

## Dependencias
- Postgres (DATABASE_URL)
- Redis (REDIS_URL) para filas BullMQ
- Efi Pix (EFI_* env vars) quando PIX_MOCK_MODE=false
- Storage para `/uploads`

## Filas e jobs
- orders queue
  - expire-order: cancela pedidos nao pagos apos TTL
  - auto-complete-order: completa pedidos AUTO apos delay
- webhooks queue
  - processEfiWebhook: confirma Pix e atualiza pedidos
- email queue
  - send-email: processa EmailOutbox (sender mock)
- settlement queue
  - release-order: libera saldo apos conclusao

## Comportamento agendado
- Expiracao de pedido: orderPaymentTtlSeconds (settings/env).
- Auto-complete: ORDER_AUTO_COMPLETE_HOURS para entrega AUTO.
- Release de settlement: settings.settlementReleaseDelayHours (ou imediato).

## Observabilidade
- Logs: Pino via AppLogger com requestId/correlationId.
- Health checks: GET /health, GET /ready.
- Metricas de webhook: GET /webhooks/efi/metrics (admin).

## Solucao de problemas

### Webhook nao chegando
1) Confirme registro na Efi com POST /webhooks/efi/register.
2) Garanta reachability publica de /webhooks/efi/pix e TLS valido.
3) Verifique logs por `EfiWebhook:*` e registros WebhookEvent no banco.
4) Veja /webhooks/efi/metrics (pending vs processed).
5) Confirme Redis e que o worker esta rodando.

### Pix pago mas pedido segue AWAITING_PAYMENT
1) Verifique WebhookEvent para o txid.
2) Confirme Payment PENDING com txid correspondente.
3) Garanta que a webhooks queue esta drenando (worker up).
4) Verifique PIX_MOCK_MODE e comportamento no sandbox.

### Settlement nao libera saldo
1) Order precisa estar COMPLETED e disputa resolvida.
2) Verifique job release-order e logs do worker.
3) Valide settings: settlementReleaseDelayHours e splitEnabled.
4) Em cashout, seller precisa payoutPixKey e nao estar payoutBlockedAt.

### Emails nao enviados
1) Verifique email_outbox e status.
2) Garanta worker rodando (email queue).
3) Sender e mock; integrar provedor real se necessario.

### Inventario sem disponibilidade (AUTO)
1) Listing precisa deliveryType AUTO.
2) Verifique inventory_items com status AVAILABLE.
3) Valide reserve com orderItemId correto.