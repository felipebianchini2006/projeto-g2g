# API

## Base URL e cabecalhos
- Base URL (padrao): http://localhost:3001
- Swagger/OpenAPI: http://localhost:3001/docs (json em /docs-json quando habilitado)
- Content-Type: application/json
- Authorization: Bearer <accessToken> (JWT) para endpoints protegidos
- Request ids opcionais: x-request-id e x-correlation-id (retornados na resposta)

## Formato de erro
Exemplo:
{
  "statusCode": 400,
  "message": "Validation failed",
  "error": "Bad Request"
}

Codigos de status comuns:
- 400 Bad Request (validacao, regra de negocio)
- 401 Unauthorized (token ausente/invalido)
- 403 Forbidden (role/propriedade)
- 404 Not Found
- 409 Conflict (inventario indisponivel)
- 429 Too Many Requests (throttle)
- 500 Internal Server Error

## Exemplos de entidades (representativos)
Auth response:
{
  "user": {
    "id": "user-uuid",
    "email": "buyer@g2g.test",
    "role": "USER",
    "createdAt": "2026-01-08T12:00:00.000Z",
    "updatedAt": "2026-01-08T12:00:00.000Z"
  },
  "accessToken": "jwt-access",
  "refreshToken": "refresh-token"
}

Listing:
{
  "id": "listing-uuid",
  "sellerId": "seller-uuid",
  "categoryId": "category-uuid",
  "title": "Conta Steam",
  "description": "Conta com jogos premium",
  "priceCents": 4990,
  "currency": "BRL",
  "status": "DRAFT",
  "deliveryType": "AUTO",
  "deliverySlaHours": 24,
  "refundPolicy": "Reembolso em ate 7 dias.",
  "createdAt": "2026-01-08T12:00:00.000Z",
  "updatedAt": "2026-01-08T12:00:00.000Z"
}

Order (list/get):
{
  "id": "order-uuid",
  "buyerId": "buyer-uuid",
  "sellerId": "seller-uuid",
  "status": "AWAITING_PAYMENT",
  "totalAmountCents": 4990,
  "currency": "BRL",
  "expiresAt": "2026-01-08T12:15:00.000Z",
  "items": [
    {
      "id": "item-uuid",
      "listingId": "listing-uuid",
      "title": "Conta Steam",
      "unitPriceCents": 4990,
      "quantity": 1,
      "deliveryType": "AUTO",
      "currency": "BRL"
    }
  ]
}

Payment (Pix):
{
  "id": "payment-uuid",
  "orderId": "order-uuid",
  "provider": "EFI",
  "txid": "pix-txid",
  "status": "PENDING",
  "amountCents": 4990,
  "currency": "BRL",
  "qrCode": "PIX:...",
  "copyPaste": "0002010102...",
  "expiresAt": "2026-01-08T12:15:00.000Z"
}

Notification:
{
  "id": "notif-uuid",
  "type": "ORDER",
  "title": "Pedido entregue",
  "body": "Pedido order-uuid entregue.",
  "readAt": null,
  "createdAt": "2026-01-08T12:05:00.000Z"
}

Ticket:
{
  "id": "ticket-uuid",
  "orderId": "order-uuid",
  "openedById": "buyer-uuid",
  "status": "OPEN",
  "subject": "Problema no pedido",
  "messages": [
    { "id": "msg-uuid", "senderId": "buyer-uuid", "message": "Detalhes...", "createdAt": "2026-01-08T12:06:00.000Z" }
  ]
}

Dispute:
{
  "id": "dispute-uuid",
  "orderId": "order-uuid",
  "ticketId": "ticket-uuid",
  "status": "OPEN",
  "reason": "Entrega incompleta",
  "resolution": null
}

Wallet summary:
{
  "currency": "BRL",
  "heldCents": 4990,
  "availableCents": 0,
  "reversedCents": 0
}

## Endpoints

### Auth
- POST /auth/register
- POST /auth/login
- POST /auth/refresh
- POST /auth/logout
- POST /auth/forgot-password
- POST /auth/reset-password

Exemplo: register
Request:
{
  "email": "buyer@g2g.test",
  "password": "StrongPass123",
  "role": "USER"
}
Response: Auth response (ver exemplos de entidades)

Exemplo: login
Request:
{
  "email": "buyer@g2g.test",
  "password": "StrongPass123"
}
Response: Auth response

Exemplo: refresh
Request:
{ "refreshToken": "refresh-token" }
Response: Auth response

Exemplo: logout
Request:
{ "refreshToken": "refresh-token" }
Response:
{ "success": true }

Exemplo: forgot/reset password
Request (forgot): { "email": "buyer@g2g.test" }
Request (reset): { "token": "reset-token", "password": "NewPass123" }
Response: { "success": true }

### Listings publicas
- GET /public/listings
- GET /public/listings/:id (id ou slug)

Filtros (query):
- q (busca por titulo/descricao)
- category (slug ou id da categoria)
- deliveryType (AUTO|MANUAL)
- minPriceCents / maxPriceCents
- sort (recent|price-asc|price-desc|title)
- skip / take

Exemplo de resposta:
[
  {
    "id": "listing-uuid",
    "title": "Conta Steam",
    "description": "Conta com jogos premium",
    "priceCents": 4990,
    "currency": "BRL",
    "status": "PUBLISHED",
    "deliveryType": "AUTO",
    "deliverySlaHours": 24,
    "refundPolicy": "Reembolso em ate 7 dias.",
    "media": [
      { "id": "media-uuid", "url": "/uploads/listings/file.png", "type": "IMAGE", "position": 0 }
    ],
    "categorySlug": "accounts",
    "categoryLabel": "Accounts",
    "createdAt": "2026-01-08T12:00:00.000Z"
  }
]

### Categorias publicas
- GET /public/categories

Exemplo de resposta:
[
  {
    "id": "category-uuid",
    "slug": "accounts",
    "name": "Accounts",
    "description": "Contas digitais",
    "listingsCount": 12
  }
]

### Listings do seller (role SELLER)
- POST /listings
- GET /listings?status=...
- GET /listings/:id
- PATCH /listings/:id
- POST /listings/:id/submit
- DELETE /listings/:id

Exemplo: criar listing
Request:
{
  "categoryId": "category-uuid",
  "title": "Conta Steam",
  "description": "Conta com jogos premium",
  "priceCents": 4990,
  "currency": "BRL",
  "deliveryType": "AUTO",
  "deliverySlaHours": 24,
  "refundPolicy": "Reembolso em ate 7 dias."
}
Response: Listing

### Midia de listing (role SELLER)
- GET /listings/:listingId/media
- POST /listings/:listingId/media/upload (multipart/form-data)
- DELETE /listings/:listingId/media/:mediaId

Requisitos do upload:
- Campo do form: file
- Aceita image/* ou video/*
- Maximo: 15 MB

Exemplo de resposta:
{
  "id": "media-uuid",
  "listingId": "listing-uuid",
  "url": "/uploads/listings/file.png",
  "type": "IMAGE",
  "position": 0
}

### Inventario (role SELLER / ADMIN)
- POST /listings/:listingId/inventory/items
- POST /listings/:listingId/inventory/import
- DELETE /listings/:listingId/inventory/items/:itemId
- POST /listings/:listingId/inventory/reserve (ADMIN)

Exemplo: adicionar itens
Request:
{ "codes": ["ABC-1", "ABC-2"] }
Response:
{ "created": 2, "skipped": 0 }

Exemplo: importar inventario
Request:
{ "payload": "ABC-1\nABC-2\n" }
Response:
{ "created": 2, "skipped": 0 }

### Orders
- POST /orders
- GET /orders?status=...&scope=buyer|seller&skip=0&take=20
- GET /orders/:id
- POST /orders/:id/cancel
- POST /orders/:id/confirm-receipt
- POST /orders/:id/open-dispute
- POST /orders/:id/dispute (alias)

Exemplo: criar order
Request:
{ "listingId": "listing-uuid", "quantity": 1 }
Response: Order

Exemplo: cancelar order
Request:
{ "reason": "Buyer changed mind" }
Response: Order

### Checkout + Payments
- POST /checkout (cria order + cobranca Pix)
- POST /payments/pix/create (cria Pix para order existente)

Exemplo: checkout
Request:
{ "listingId": "listing-uuid", "quantity": 1 }
Response:
{ "order": { ... }, "payment": { ... } }

Exemplo: Pix para order
Request:
{ "orderId": "order-uuid" }
Response: Payment

### Webhooks (Efi Pix)
- POST /webhooks/efi/pix (publico, throttled)
- POST /webhooks/efi/register (ADMIN)
- GET /webhooks/efi/metrics (ADMIN)

Exemplo: payload de webhook
Request:
{
  "evento": "pix",
  "pix": [
    { "txid": "pix-txid", "endToEndId": "e2e-id", "horario": "2026-01-08T12:10:00.000Z" }
  ]
}
Response:
{ "id": "webhook-event-uuid", "eventId": "pix-txid:hash" }

Exemplo: resposta de metricas
{
  "counters": { "received": 10, "processed": 9, "duplicated": 1, "failed": 0 },
  "pending": 1,
  "processed": 9,
  "total": 10
}

### Chat
- GET /chat/orders/:id/messages?take=20&cursor=2026-01-08T12:00:00.000Z
- WebSocket namespace: /chat
  - joinRoom: { "orderId": "order-uuid" }
  - sendMessage: { "orderId": "order-uuid", "text": "Oi" }
  - messageCreated: { "id": "msg-uuid", "orderId": "order-uuid", "userId": "user-uuid", "text": "Oi", "createdAt": "..." }

### Notifications
- GET /notifications?take=20&cursor=2026-01-08T12:00:00.000Z&unread=true
- POST /notifications/:id/read
- POST /notifications/read-all

Exemplo de resposta:
[ { "id": "notif-uuid", "title": "Pedido entregue", "readAt": null } ]

### Tickets
- POST /tickets
- GET /tickets?status=OPEN
- GET /tickets/:id
- POST /tickets/:id/messages

Exemplo: criar ticket
Request:
{ "orderId": "order-uuid", "subject": "Problema", "message": "Detalhes..." }
Response: Ticket

### Disputes (ADMIN)
- GET /admin/disputes?status=OPEN
- GET /admin/disputes/:id
- POST /admin/disputes/:id/resolve

Exemplo: resolver disputa
Request:
{ "action": "refund", "reason": "Entrega incompleta" }
Response:
{ "status": "refunded", "disputeId": "dispute-uuid" }

Exemplo: resolver disputa parcial
Request:
{ "action": "partial", "amountCents": 2500, "reason": "Entrega parcial" }
Response:
{ "status": "partial_refund", "disputeId": "dispute-uuid" }

### Settings (ADMIN)
- GET /admin/settings
- PUT /admin/settings

Exemplo: atualizar settings
Request:
{ "platformFeeBps": 250, "orderPaymentTtlSeconds": 900, "settlementReleaseDelayHours": 24 }
Response: PlatformSetting

### Users (ADMIN)
- GET /admin/users?role=SELLER&blocked=false&search=gmail&skip=0&take=50
- POST /admin/users/:id/block
- POST /admin/users/:id/unblock

Exemplo: bloquear usuario
Request:
{ "reason": "Chargeback abuse" }
Response: User summary (id/email/role/block fields)

### Wallet (USER, SELLER ou ADMIN)
- GET /wallet/summary
- GET /wallet/entries?from=2026-01-01&to=2026-01-31&source=ORDER_PAYMENT

Exemplo de resposta (entries):
{
  "items": [
    {
      "id": "entry-uuid",
      "type": "CREDIT",
      "state": "HELD",
      "source": "ORDER_PAYMENT",
      "amountCents": 4990,
      "currency": "BRL",
      "description": "Escrow held after payment confirmation.",
      "orderId": "order-uuid",
      "paymentId": "payment-uuid",
      "createdAt": "2026-01-08T12:10:00.000Z"
    }
  ],
  "total": 1,
  "skip": 0,
  "take": 20
}

### Admin orders (ADMIN)
- POST /admin/orders/:id/release
- POST /admin/orders/:id/refund

Exemplo: liberar order
Request:
{ "reason": "Manual release" }
Response:
{ "status": "released", "orderId": "order-uuid" }

### Health
- GET /health
- GET /ready

Exemplo de resposta:
{ "status": "ok" }
