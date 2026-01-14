# AGENTS.md

## Project context (explicit)
This is a monorepo with a NestJS API and a Next.js web app.

Structure:
- apps/api: NestJS backend, Prisma ORM, PostgreSQL
- apps/web: Next.js frontend
- packages/shared, packages/config: shared types/configs

Default local URLs:
- Web: http://localhost:3000
- API: http://localhost:3001
- Socket.IO path: /socket.io
- Socket.IO namespace: /chat

## Environment and configuration
Web env (apps/web/.env):
- NEXT_PUBLIC_APP_URL: public site URL (dev or prod)
- NEXT_PUBLIC_API_URL: REST base or proxy (can be /api/proxy)
- API_INTERNAL_URL: internal API base for Next proxy
- NEXT_PUBLIC_WS_ORIGIN: optional websocket origin (use for local/dev to avoid /api)

API env (apps/api/.env):
- DATABASE_URL, REDIS_URL, JWT_SECRET, etc.

Important websocket rule:
- Socket.IO URL must be origin only + namespace.
- Never append /api or /api/proxy to socket URL.
- Client must use path "/socket.io".

## Backend (NestJS + Prisma)
Prisma:
- Schema is in apps/api/prisma/schema.prisma.
- Migrations live in apps/api/prisma/migrations.
- Use:
  - npx prisma migrate dev --name <name>
  - npx prisma migrate deploy (prod)
  - npx prisma generate

Chat:
- Gateway: apps/api/src/modules/chat/chat.gateway.ts
- Must be configured with:
  - namespace: "/chat"
  - path: "/socket.io"
  - cors: { origin: true, credentials: true }

Chat messages model:
- ChatMessage includes editedAt/deletedAt and is mapped to "chat_messages".
- DB must include editedAt/deletedAt columns.

Orders + reviews:
- SellerReview rules enforced in OrdersService.
- Reviews are SellerReview (not per-listing Review).
- Eligibility endpoint: GET /orders/review-eligibility?listingId=...

Public listings:
- Public listing payload must include sellerId.

## Frontend (Next.js)
Chat:
- Component: apps/web/src/components/orders/order-chat.tsx
- buildChatUrl must use origin only:
  - If NEXT_PUBLIC_WS_ORIGIN is set, use it as origin
  - Else derive origin from NEXT_PUBLIC_API_URL
- Socket.IO client must use:
  - path: "/socket.io"
  - namespace "/chat"
  - transports: ["websocket", "polling"]
  - timeout ~20000 and reconnection attempts

Listing reviews:
- Listing detail page uses sellerId to load reviews.
- Reviews are from public reviews API, optionally filtered by listingId.

## Nginx proxy
Ensure this location exists:
- location /socket.io/ { proxy_pass http://api_upstream/socket.io/; ... }

Optional (only if needed):
- location /api/socket.io/ rewrite to /socket.io

## Common issues and fixes
Chat timeout/reconnecting:
- Usually caused by wrong socket URL (using /api) or missing /socket.io path.
- In dev, set NEXT_PUBLIC_WS_ORIGIN=http://localhost:3001 to avoid proxy.

Prisma P2022 (missing column):
- Run migrations and generate client.
- Ensure DB and schema are in sync.

## Local dev commands (common)
- npm run dev
- npm run prisma:migrate:dev -w apps/api
- npm run prisma:migrate:deploy -w apps/api
- npx prisma generate (apps/api)
