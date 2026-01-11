# Guia completo do sistema (iniciante -> producao)

Este guia explica como configurar e usar o sistema do zero, e como prepara-lo
para producao. O foco e iniciantes, com passos claros e exemplos. Para detalhes
operacionais avancados, veja `PRODUCTION.md`, `RUNBOOK.md`, `OPERATIONS.md` e
`SECURITY.md`.

---

## 1) Visao geral do sistema

O monorepo tem 3 apps principais e 2 dependencias:

- Web (Next.js): interface do usuario.
  - Porta local: 3000
  - Em producao fica atras do Nginx.
- API (NestJS): REST + WebSocket (chat) + webhooks.
  - Porta local: 3001
  - Em producao fica exposta como `/api`.
- Worker (NestJS): jobs de fila (BullMQ).
  - Processo separado, obrigatorio em producao.
- Postgres: banco principal.
- Redis: filas e cache.

Fluxos principais:
- Checkout Pix (mock ou EFI real) -> pagamento -> pedido.
- Chat do pedido via WebSocket (socket.io).
- Suporte IA (Gemini) via endpoints da API.
- Disputas e liberacao de saldo (settlement).

---

## 2) Estrutura do repositorio

- `apps/api` - NestJS (backend).
- `apps/web` - Next.js (frontend).
- `packages/shared` - tipos e validacoes compartilhadas.
- `packages/config` - configs base.
- `docker-compose.dev.yml` - Postgres/Redis para dev.
- `docker-compose.prod.yml` - stack de producao.
- `nginx.conf` - proxy para web + api + websockets.

---

## 3) Requisitos

### 3.1) Desenvolvimento local

- Node.js 20+
- npm 10+
- Docker Desktop (Postgres/Redis)

### 3.2) Producao

- Servidor/VPS com Docker e Docker Compose
- Dominio apontado para o IP
- TLS (HTTPS) recomendado
- Segredos (JWT, Discord, Gemini, EFI) definidos

---

## 4) Setup local (dev) passo a passo

### 4.1) Instale dependencias

```bash
npm install
```

### 4.2) Crie os arquivos de ambiente

Copie os templates:

- `apps/api/.env.example` -> `apps/api/.env`
- `apps/web/.env.example` -> `apps/web/.env.local`

Preencha os valores. Alguns campos sao obrigatorios para o app subir:

- `JWT_SECRET`
- `DISCORD_CLIENT_ID`
- `DISCORD_CLIENT_SECRET`
- `DISCORD_REDIRECT_URI`
- `GEMINI_API_KEY`

Para desenvolvimento, voce pode usar valores de teste, mas em producao use
segredos reais.

### 4.3) Suba Postgres e Redis

```bash
npm run docker:up
```

Opcional (Adminer):

```bash
docker compose -f docker-compose.dev.yml --profile devtools up -d adminer
```

Adminer: http://localhost:8080

### 4.4) Rode migracoes e seed

```bash
npm run prisma:migrate:dev -w apps/api
npm run prisma:seed -w apps/api
```

### 4.5) Inicie o projeto

```bash
npm run dev
```

- Web: http://localhost:3000
- API: http://localhost:3001
- Swagger (se `SWAGGER_ENABLED=true`): http://localhost:3001/docs

### 4.6) Usuarios e dados seed (somente dev)

O seed cria contas e dados de exemplo:

- Admin: `admin@email.com` / `12345678`
- Seller: `seller@email.com` / `12345678`
- Buyer: `buyer@email.com` / `12345678`

Nao use o seed em producao.

---

## 5) Variaveis de ambiente (explicacao simples)

### 5.1) API (`apps/api/.env`)

Basicas:

- `NODE_ENV`: `development` | `test` | `production`
- `PORT`: porta da API (padrao 3001)
- `DATABASE_URL`: Postgres
- `REDIS_URL`: Redis
- `LOG_LEVEL`: `fatal` | `error` | `warn` | `info` | `debug` | `trace`
- `CORS_ORIGINS`: lista separada por virgula (ex: `https://app.seudominio.com`)
- `SWAGGER_ENABLED`: `true` para docs locais, `false` em prod

Auth:

- `JWT_SECRET`: chave forte
- `TOKEN_TTL`: access token em segundos
- `REFRESH_TTL`: refresh token em segundos

Pedidos:

- `ORDER_PAYMENT_TTL_SECONDS`: tempo maximo para pagamento
- `ORDER_AUTO_COMPLETE_HOURS`: auto-complete de entrega automatica

Pix (mock ou EFI):

- `PIX_MOCK_MODE`: `true` em dev/test, `false` em prod
- `PIX_MOCK_TTL_SECONDS`: TTL do Pix mock

EFI (Pix real):

- `EFI_CLIENT_ID`
- `EFI_CLIENT_SECRET`
- `EFI_CERT_PATH` (certificado mTLS, ex: `/run/secrets/efi-cert.p12`)
- `EFI_ENV`: `sandbox` | `prod`
- `EFI_PIX_KEY`
- `EFI_WEBHOOK_SKIP_MTLS_CHECKING`: `true` apenas para registro de webhook se preciso

Settlement:

- `SETTLEMENT_MODE`: `cashout` | `split`
- `SETTLEMENT_RELEASE_DELAY_HOURS`

Discord OAuth (obrigatorio pelo schema):

- `DISCORD_CLIENT_ID`
- `DISCORD_CLIENT_SECRET`
- `DISCORD_REDIRECT_URI`

Suporte IA (Gemini) (obrigatorio pelo schema):

- `GEMINI_API_KEY`
- `GEMINI_MODEL` (padrao `gemini-2.5-flash`)
- `SUPPORT_AI_ENABLED`: `true` | `false`

Observacao: mesmo com `SUPPORT_AI_ENABLED=false`, o schema exige
`GEMINI_API_KEY`. Se voce nao usa Gemini, defina um valor de teste ou ajuste
`apps/api/src/config/env.schema.ts`.

### 5.2) Web (`apps/web/.env.local`)

- `NEXT_PUBLIC_APP_URL`: URL publica do frontend
- `NEXT_PUBLIC_API_URL`: URL publica da API (em prod, use `/api`)
- `DISCORD_CLIENT_ID`
- `DISCORD_REDIRECT_URI`

Importante: `NEXT_PUBLIC_*` sao injetadas no build do Next. Se mudar, rebuilde.

### 5.3) `.env.prod` na raiz (Docker Compose)

No deploy por Docker Compose, as variaveis sao lidas via `.env.prod`.
Inclua tambem:

- `POSTGRES_USER`
- `POSTGRES_PASSWORD`
- `POSTGRES_DB`
- `DATABASE_URL` (use host `postgres`)

Exemplo de `DATABASE_URL` em prod:

```
postgresql://POSTGRES_USER:POSTGRES_PASSWORD@postgres:5432/POSTGRES_DB
```

---

## 6) Pix: mock e producao

### 6.1) Modo mock (dev/test)

```
PIX_MOCK_MODE=true
```

Nao chama a EFI real. O checkout gera cobranca falsa.

### 6.2) Modo real (producao)

```
PIX_MOCK_MODE=false
EFI_CLIENT_ID=...
EFI_CLIENT_SECRET=...
EFI_CERT_PATH=/run/secrets/efi-cert.p12
EFI_ENV=prod
EFI_PIX_KEY=...
```

Webhook Pix:

- Endpoint publico: `POST /api/webhooks/efi/pix`
- Registro admin: `POST /api/webhooks/efi/register`

Mais detalhes em `apps/api/docs/efi-pix.md`.

---

## 7) Suporte IA (Gemini)

Para ativar:

```
SUPPORT_AI_ENABLED=true
GEMINI_API_KEY=...
GEMINI_MODEL=gemini-2.5-flash
```

Tela no web: `/conta/ajuda/chat`.

---

## 8) Discord OAuth

Passos simples:

1) Crie app no Discord Developer Portal.
2) Copie `CLIENT_ID` e `CLIENT_SECRET`.
3) Configure o Redirect URL (ex: `https://app.seudominio.com/api/auth/discord/callback`).
4) Preencha as variaveis `DISCORD_*`.

---

## 9) Worker e filas (obrigatorio em prod)

O worker processa expiracao de pedidos, webhooks, settlement e emails.

### 9.1) Producao (Docker)

O `docker-compose.prod.yml` ja sobe o container `worker`.

### 9.2) Local (se precisar testar jobs)

1) Build da API:

```bash
npm run build -w apps/api
```

2) Rode o worker:

```bash
node apps/api/dist/worker.js
```

---

## 10) Deploy em producao (Docker Compose)

### 10.1) Prepare `.env.prod`

Use `apps/api/.env.example` e `apps/web/.env.example` como base.
Defina todos os campos obrigatorios, incluindo `POSTGRES_*`.

### 10.2) Build das imagens

```bash
docker compose --env-file .env.prod -f docker-compose.prod.yml build
```

### 10.3) Suba os servicos

```bash
docker compose --env-file .env.prod -f docker-compose.prod.yml up -d
```

### 10.4) Rode migracoes

```bash
docker compose --env-file .env.prod -f docker-compose.prod.yml \
  exec api npm run prisma:migrate:deploy -w apps/api
```

### 10.5) Healthcheck basico

```bash
curl http://localhost/health
curl http://localhost/api/health
```

---

## 11) HTTPS e Nginx

O `nginx.conf` atual escuta na porta 80 e ja inclui proxy para:

- `/` -> web
- `/api/` -> API
- `/socket.io/` e `/ws/` -> WebSocket

Se usar TLS:

Opcao A (mais simples):
- Use Cloudflare ou proxy externo com HTTPS.
- Nginx fica em HTTP interno.

Opcao B:
- Configure Nginx com certificados (LetsEncrypt).
- Crie um bloco `server` em 443 com `ssl_certificate`.

Observacao: `nginx.conf` ativa HSTS. So mantenha se HTTPS estiver garantido.

---

## 12) Backups

Postgres:

```bash
docker compose -f docker-compose.prod.yml exec -T postgres \
  pg_dump -U $POSTGRES_USER $POSTGRES_DB > /opt/projeto-g2g/backup.sql
```

Uploads (volume `api_uploads`):

```bash
docker run --rm -v api_uploads:/data -v /opt/projeto-g2g:/backup alpine \
  tar -czf /backup/uploads.tar.gz -C /data .
```

Mais detalhes em `RUNBOOK.md`.

---

## 13) Validacao antes do go-live

Checklist rapido:

1) `.env.prod` completo e seguro.
2) `PIX_MOCK_MODE=false` se vai usar Pix real.
3) Certificado EFI montado e `EFI_CERT_PATH` valido.
4) `NEXT_PUBLIC_*` com URLs finais e HTTPS.
5) `worker` ativo (fila precisa rodar).
6) Healthchecks ok (`/health` e `/api/health`).
7) Testes rodaram (ver `TESTING.md`).

---

## 14) Problemas comuns (resumo)

- API nao sobe: variaveis obrigatorias ausentes (Joi bloqueia).
- Web nao conecta na API: `NEXT_PUBLIC_API_URL` errado ou CORS.
- Pix real nao confirma: webhook nao registrado ou TLS invalido.
- Filas nao processam: Redis/worker indisponivel.

---

## 15) Documentos de apoio

- `README.md` (visao geral)
- `PRODUCTION.md` (prod com Docker)
- `RUNBOOK.md` (deploy e rollback)
- `OPERATIONS.md` (filas e troubleshooting)
- `SECURITY.md` (auth, rate limiting, hardening)
- `TESTING.md` (estrategia de testes)
- `apps/api/docs/efi-pix.md` (Pix EFI)
