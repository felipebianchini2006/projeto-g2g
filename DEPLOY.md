# Deploy passo a passo (Docker Compose)

Este guia assume que o repositorio ja esta no servidor e que voce tem Docker e
Docker Compose instalados.

---

## 1) Pre-requisitos no servidor

- Docker instalado e rodando
- Docker Compose disponivel
- Dominio apontando para o IP da VPS (opcional no inicio)
- Porta 80 liberada (e 443 se usar HTTPS local)

---

## 2) Estrutura minima no servidor

No host, mantenha uma pasta base. Exemplo:

```
/opt/projeto-g2g
```

Dentro dela:

- Repositorio clonado (ou os arquivos enviados)
- `nginx.conf` (pode ficar na raiz do repo)
- (Opcional) certificado EFI Pix (`efi-cert.p12`)

---

## 3) Crie o arquivo `.env.prod` na raiz do repo

Use como base `apps/api/.env.example` e `apps/web/.env.example`.

Exemplo minimo (ajuste conforme seu ambiente):

```
POSTGRES_USER=postgres
POSTGRES_PASSWORD=uma-senha-forte
POSTGRES_DB=projeto_g2g

DATABASE_URL=postgresql://POSTGRES_USER:POSTGRES_PASSWORD@postgres:5432/POSTGRES_DB
REDIS_URL=redis://redis:6379
NODE_ENV=production

JWT_SECRET=uma-chave-muito-forte
LOG_LEVEL=info
SWAGGER_ENABLED=false
CORS_ORIGINS=https://app.seudominio.com

TOKEN_TTL=900
REFRESH_TTL=2592000
ORDER_PAYMENT_TTL_SECONDS=900
ORDER_AUTO_COMPLETE_HOURS=72

PIX_MOCK_MODE=false
PIX_MOCK_TTL_SECONDS=900
EFI_CLIENT_ID=...
EFI_CLIENT_SECRET=...
EFI_CERT_PATH=/run/secrets/efi-cert.p12
EFI_ENV=prod
EFI_PIX_KEY=...
EFI_WEBHOOK_SKIP_MTLS_CHECKING=false

SETTLEMENT_MODE=cashout
SETTLEMENT_RELEASE_DELAY_HOURS=0

DISCORD_CLIENT_ID=...
DISCORD_CLIENT_SECRET=...
DISCORD_REDIRECT_URI=https://app.seudominio.com/api/auth/discord/callback

GEMINI_API_KEY=...
GEMINI_MODEL=gemini-2.5-flash
SUPPORT_AI_ENABLED=true

NEXT_PUBLIC_APP_URL=https://app.seudominio.com
NEXT_PUBLIC_API_URL=https://app.seudominio.com/api
```

Observacoes:
- `NEXT_PUBLIC_*` precisa estar definido antes do build do Web.
- O schema exige `DISCORD_*` e `GEMINI_*`.
- Para usar Pix real, `PIX_MOCK_MODE=false` e variaveis `EFI_*` validas.

---

## 4) (Opcional) Monte o certificado EFI no container

Se usar Pix real, monte o `.p12` no container:

No `docker-compose.prod.yml`:

```
services:
  api:
    volumes:
      - /opt/projeto-g2g/efi-cert.p12:/run/secrets/efi-cert.p12:ro
  worker:
    volumes:
      - /opt/projeto-g2g/efi-cert.p12:/run/secrets/efi-cert.p12:ro
```

E no `.env.prod`:

```
EFI_CERT_PATH=/run/secrets/efi-cert.p12
```

---

## 5) Build das imagens

Na raiz do repo:

```bash
docker compose --env-file .env.prod -f docker-compose.prod.yml build
```

---

## 6) Subir a stack

```bash
docker compose --env-file .env.prod -f docker-compose.prod.yml up -d
```

---

## 7) Rodar migracoes do banco

```bash
docker compose --env-file .env.prod -f docker-compose.prod.yml \
  exec api npm run prisma:migrate:deploy -w apps/api
```

---

## 8) Healthcheck e verificacao basica

```bash
curl http://localhost/health
curl http://localhost/api/health
```

Se falhar, veja logs:

```bash
docker compose -f docker-compose.prod.yml logs -f api
docker compose -f docker-compose.prod.yml logs -f worker
```

---

## 9) Registro do webhook Pix (se usar EFI real)

Com usuario admin autenticado:

```
POST /api/webhooks/efi/register
{
  "webhookUrl": "https://app.seudominio.com/api/webhooks/efi/pix"
}
```

---

## 10) Deploy com HTTPS

Opcoes:

- **Cloudflare / proxy externo**: TLS fora do servidor.
- **Nginx local com TLS**: crie server em 443 e configure `ssl_certificate`.

Ajuste os dominios no `.env.prod`:

```
CORS_ORIGINS=https://app.seudominio.com
NEXT_PUBLIC_APP_URL=https://app.seudominio.com
NEXT_PUBLIC_API_URL=https://app.seudominio.com/api
```

---

## 11) Atualizacao (deploy de nova versao)

```bash
git pull
docker compose --env-file .env.prod -f docker-compose.prod.yml build
docker compose --env-file .env.prod -f docker-compose.prod.yml up -d
docker compose --env-file .env.prod -f docker-compose.prod.yml \
  exec api npm run prisma:migrate:deploy -w apps/api
```

---

## 12) Rollback (rapido)

Se precisar voltar:

1) Volte o repo para um commit anterior.
2) Rebuild e restart:

```bash
docker compose --env-file .env.prod -f docker-compose.prod.yml build
docker compose --env-file .env.prod -f docker-compose.prod.yml up -d
```

Se houve migracoes breaking, restaure o backup do banco.

---

## 13) Backups

Postgres:

```bash
docker compose -f docker-compose.prod.yml exec -T postgres \
  pg_dump -U $POSTGRES_USER $POSTGRES_DB > /opt/projeto-g2g/backup.sql
```

Uploads:

```bash
docker run --rm -v api_uploads:/data -v /opt/projeto-g2g:/backup alpine \
  tar -czf /backup/uploads.tar.gz -C /data .
```

---

## 14) Checklist final

- `.env.prod` completo e seguro
- `PIX_MOCK_MODE=false` se Pix real
- EFI cert montado (quando necessario)
- `NEXT_PUBLIC_*` com URLs finais
- `worker` rodando
- Healthchecks OK

---

## Referencias

- `PRODUCTION.md`
- `RUNBOOK.md`
- `OPERATIONS.md`
