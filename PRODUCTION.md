# Producao (Docker)

## Build e execucao

1) Crie `.env.prod` na raiz (use `apps/api/.env.example` e `apps/web/.env.example` como base).
2) Build das imagens:

```bash
docker compose --env-file .env.prod -f docker-compose.prod.yml build
```

3) Subir os servicos:

```bash
docker compose --env-file .env.prod -f docker-compose.prod.yml up -d
```

Nota: as variaveis `NEXT_PUBLIC_*` sao injetadas no build do web.
Nota: se preferir, passe as variaveis via ambiente/CI em vez de `.env.prod`.

4) Rodar migracoes do banco:

```bash
docker compose --env-file .env.prod -f docker-compose.prod.yml exec api npm run prisma:migrate:deploy -w apps/api
```

5) Healthchecks basicos:

```bash
curl http://localhost/health
curl http://localhost/api/health
```

## Checklist de variaveis de ambiente (.env.prod)

- POSTGRES_USER
- POSTGRES_PASSWORD
- POSTGRES_DB
- DATABASE_URL (ex: postgresql://POSTGRES_USER:POSTGRES_PASSWORD@postgres:5432/POSTGRES_DB)
- REDIS_URL (ex: redis://redis:6379)
- NODE_ENV=production
- JWT_SECRET
- LOG_LEVEL
- CORS_ORIGINS (ex: https://app.seudominio.com)
- TOKEN_TTL
- REFRESH_TTL
- ORDER_PAYMENT_TTL_SECONDS
- ORDER_AUTO_COMPLETE_HOURS
- PIX_MOCK_MODE
- PIX_MOCK_TTL_SECONDS
- EFI_CLIENT_ID
- EFI_CLIENT_SECRET
- EFI_CERT_PATH (caminho dentro do container)
- EFI_ENV (sandbox|prod)
- EFI_PIX_KEY
- EFI_WEBHOOK_SKIP_MTLS_CHECKING
- SETTLEMENT_MODE (cashout|split)
- SETTLEMENT_RELEASE_DELAY_HOURS
- NEXT_PUBLIC_APP_URL (ex: https://app.seudominio.com)
- NEXT_PUBLIC_API_URL (ex: https://app.seudominio.com/api)

## Certificado EFI (Pix)

- Monte o certificado P12 no container do `api` e `worker` e aponte `EFI_CERT_PATH`.
- Exemplo:
  - host: `./secrets/efi-cert.p12`
  - container: `/run/secrets/efi-cert.p12`
  - `.env.prod`: `EFI_CERT_PATH=/run/secrets/efi-cert.p12`
- Ajuste o `docker-compose.prod.yml` para montar o arquivo no caminho indicado.

## HSTS (riscos e recomendacao)

- HSTS so deve ser habilitado quando HTTPS esta garantido para o dominio.
- Se ativar com valores altos e depois precisar voltar para HTTP, os navegadores vao bloquear.
- Recomendacao: comecar com `max-age=300` em ambiente real, aumentar gradualmente e so usar `includeSubDomains`/`preload` quando tiver certeza.

## Runbook

Veja `RUNBOOK.md` para deploy via Hostinger Docker Manager, rollback e backups.
