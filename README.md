# Projeto G2G - Monorepo

Monorepo com NestJS (API), Next.js (Web) e pacotes compartilhados usando npm workspaces.

## Estrutura

- `apps/api` - API NestJS (TypeScript)
- `apps/web` - Frontend Next.js (TypeScript)
- `packages/shared` - Tipos e validators compartilhados
- `packages/config` - Configs base (eslint/prettier/tsconfig)

## Requisitos

- Node.js 20+
- npm 10+

## Setup

```bash
npm install
```

## Scripts

```bash
npm run dev
npm run build
npm run test
npm run lint
```

## Testes

Estrategia e checklists: `TESTING.md`.

### E2E (API)

Suba Postgres + Redis de teste e rode o suite E2E da API:

```bash
npm run test:setup
npm run test:int:api
```

Ou diretamente na workspace:

```bash
npm run test:e2e -w apps/api
```

## Web (Next.js)

Para apontar o frontend para a API local, ajuste o `.env.local`:

- `NEXT_PUBLIC_APP_URL=http://localhost:3000`
- `NEXT_PUBLIC_API_URL=http://localhost:3001`
- `DISCORD_CLIENT_ID=...`
- `DISCORD_REDIRECT_URI=http://localhost:3000/api/auth/discord/callback`
- `GOOGLE_CLIENT_ID=...`
- `GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/google/callback`

Para acessar o dashboard placeholder, use `/login` e clique em "Entrar como demo",
ou acesse `/dashboard?dev=1` uma vez para gravar o cookie de bypass local.

## Docker (dev)

Suba os servicos locais (Postgres e Redis):

```bash
npm run docker:up
```

Para derrubar:

```bash
npm run docker:down
```

Reset com drop dos volumes:

```bash
npm run docker:reset
```

Logs:

```bash
npm run docker:logs
```

Para rodar o Adminer (opcional):

```bash
docker compose -f docker-compose.dev.yml --profile devtools up -d adminer
```

Variaveis esperadas na API:

- `DATABASE_URL=postgresql://postgres:123456@localhost:5432/projeto_g2g`
- `REDIS_URL=redis://localhost:6379`
- `JWT_SECRET=uma-chave-forte`
- `TOKEN_TTL=900`
- `REFRESH_TTL=2592000`
- `SWAGGER_ENABLED=true`
- `PIX_MOCK_MODE=true`
- `PIX_MOCK_TTL_SECONDS=900`
- `EFI_CLIENT_ID=...`
- `EFI_CLIENT_SECRET=...`
- `EFI_CERT_PATH=/caminho/para/certificado.p12`
- `EFI_ENV=sandbox`
- `EFI_PIX_KEY=...`
- `EFI_WEBHOOK_SKIP_MTLS_CHECKING=false`
- `SETTLEMENT_MODE=cashout`
- `SETTLEMENT_RELEASE_DELAY_HOURS=0`
- `DISCORD_CLIENT_ID=...`
- `DISCORD_CLIENT_SECRET=...`
- `DISCORD_REDIRECT_URI=http://localhost:3000/api/auth/discord/callback`
- `GOOGLE_CLIENT_ID=...`
- `GOOGLE_CLIENT_SECRET=...`
- `GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/google/callback`
- `GEMINI_API_KEY=...`
- `GEMINI_MODEL=gemini-2.5-flash`
- `SUPPORT_AI_ENABLED=true`

Discord OAuth:

- No Discord Developer Portal, configure o Redirect URL para apontar para
  `DISCORD_REDIRECT_URI` (ex: `http://localhost:3000/api/auth/discord/callback`).

Google OAuth:

- No Google Cloud Console, configure o Redirect URI para apontar para
  `GOOGLE_REDIRECT_URI` (ex: `http://localhost:3000/api/auth/google/callback`).

## Escrow operacional

- Pagamento confirmado cria `LedgerEntry` em `HELD` para o vendedor.
- Pedido `COMPLETED` agenda liberacao via job (`SETTLEMENT_RELEASE_DELAY_HOURS`).
- Modo `cashout` (padrao): envia Pix ao vendedor no release e mantem reembolso possivel enquanto em `HELD`.
- Modo `split` (feature flag): use apenas se o provedor permitir devolucao apos repasse. O release nao dispara cashout (espera-se split no Pix).
- Reembolso:
  - se ainda em `HELD`, tenta devolucao Pix e registra `REVERSED`.
  - se ja liberado, abre ticket e bloqueia payout do vendedor (chargeback manual).

## Prisma (migracoes)

Ao puxar mudancas que alterem o schema, rode as migrations antes de subir a API.

Desenvolvimento:

```bash
npm run prisma:migrate:dev -w apps/api
```

Seed:

```bash
npm run prisma:seed -w apps/api
```

Deploy:

```bash
npm run prisma:migrate:deploy -w apps/api
```

## Variaveis de ambiente

Copie os templates e ajuste os valores:

- `apps/api/.env.example` -> `apps/api/.env`
- `apps/web/.env.example` -> `apps/web/.env.local`

Documentacao Pix Efi:

- `apps/api/docs/efi-pix.md`

## Convencoes de commit (opcional)

Configurado o `commitlint` com o preset conventional.

```bash
npm run commitlint -- --edit
```

Para automatizar via hook, use o `husky` se desejar.
