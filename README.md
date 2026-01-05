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