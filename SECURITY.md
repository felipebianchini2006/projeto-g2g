# Seguranca

## Autenticacao
- JWT access tokens emitidos por /auth/login e /auth/register.
- TTL do token por TOKEN_TTL; TTL do refresh por REFRESH_TTL.
- Refresh tokens armazenados apenas como hashes SHA-256; token bruto retornado uma vez.
- Rotacao de refresh token em /auth/refresh; token antigo e revogado.
- Sessoes sao rastreadas e revogadas no logout e reset de senha.
- Senhas sao hashed com bcrypt (BCRYPT_SALT_ROUNDS).
- Usuarios com blockedAt sao bloqueados pelo JwtAuthGuard.

## Autorizacao (RBAC)
- Roles: USER, SELLER, ADMIN.
- RolesGuard aplica @Roles() nos controllers.
  - Endpoints de seller: /listings/*, /listings/:id/media, inventory add/import.
  - Endpoints de admin: /admin/*, /webhooks/efi/register, /webhooks/efi/metrics.
- OrderAccessGuard garante acesso de buyer/seller em /orders/:id.
- Ticket access em TicketsService (admin ou owner/buyer/seller).
- Chat valida ownership antes de join/send.

## Rate limiting
- Throttler global: 100 req/min (bucket default).
- Auth: 5 req/min (AuthController Throttle).
- Chat HTTP: 30 req/min em /chat/orders/:id/messages.
- Webhook: 120 req/min em /webhooks/efi/pix.
- WebSocket chat limiter: 30 msg/min por user+order e intervalo minimo 500ms.

## Validacao e hardening
- ValidationPipe global: transform, whitelist, forbidNonWhitelisted.
- Helmet habilitado (CSP padrao, crossOriginResourcePolicy cross-origin).
- CORS controlado por CORS_ORIGINS (allow list ou dev wildcard).
- Uploads servidos em /uploads (considere endurecer storage se publico).

## Seguranca de webhook
- Webhook intake nao valida assinatura; usa estrutura + txid.
- Dedupe por eventId + hash do payload e WebhookEvent.
- Registro de webhook com Efi usa OAuth2 + mTLS (ver apps/api/docs/efi-pix.md).

## Auditoria e rastreabilidade
- Audit logs para acoes admin: block/unblock, listing decisions, settings updates,
  dispute resolution, manual release/refund.
- Order events registram transicoes de status e metadata (ip, userAgent, reason).
- Request context injeta requestId/correlationId nos logs (AppLogger).