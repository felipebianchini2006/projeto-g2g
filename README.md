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

## Prisma (migracoes)

Desenvolvimento:

```bash
npm run prisma:migrate:dev -w apps/api
```

Deploy:

```bash
npm run prisma:migrate:deploy -w apps/api
```

## Variaveis de ambiente

Copie os templates e ajuste os valores:

- `apps/api/.env.example` -> `apps/api/.env`
- `apps/web/.env.example` -> `apps/web/.env.local`

## Convencoes de commit (opcional)

Configurado o `commitlint` com o preset conventional.

```bash
npm run commitlint -- --edit
```

Para automatizar via hook, use o `husky` se desejar.
