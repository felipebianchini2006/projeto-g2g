# Runbook - Deploy Hostinger VPS (Docker Manager)

## Pre-requisitos

- VPS com Docker e Docker Manager habilitados.
- DNS apontando para o IP da VPS.
- Repositorio com `docker-compose.prod.yml` e `nginx.conf`.
- Certificado EFI (se aplicavel) disponivel no host.

## Deploy via Docker Manager (Compose manually)

1) No Docker Manager, escolha "Compose manually".
2) Cole o conteudo de `docker-compose.prod.yml`.
3) Ajuste o volume do nginx para um caminho absoluto do host:

```
volumes:
  - /opt/projeto-g2g/nginx.conf:/etc/nginx/nginx.conf:ro
```

4) (Opcional) Monte o certificado EFI no `api` e `worker`:

```
volumes:
  - /opt/projeto-g2g/efi-cert.p12:/run/secrets/efi-cert.p12:ro
```

5) Crie os arquivos no host:

```
mkdir -p /opt/projeto-g2g
cp nginx.conf /opt/projeto-g2g/nginx.conf
cp /caminho/efi-cert.p12 /opt/projeto-g2g/efi-cert.p12
```

6) Em "Environment variables", adicione as variaveis do checklist (ver abaixo).
7) Salve e clique em Deploy.

## Deploy via Docker Manager (Compose from URL)

1) Suba o repositorio para o GitHub.
2) Em "Compose from URL", use a URL do `docker-compose.prod.yml`.
   - Para repositorio privado, configure a chave SSH de deploy no VPS.
3) Se o Docker Manager baixar apenas o compose (sem o repo):
   - mantenha o volume do `nginx` apontando para um caminho absoluto no host
   - garanta que `nginx.conf` exista em `/opt/projeto-g2g/nginx.conf`
4) Se o Docker Manager clonar o repositorio completo:
   - o volume pode continuar como `./nginx.conf`
5) Configure as variaveis em "Environment variables" e clique em Deploy.

## CI/CD (opcional) - GitHub Actions

- Workflow: `.github/workflows/deploy-hostinger.yml`
- Secrets (Actions -> Secrets):
  - `HOSTINGER_API_KEY`
  - `POSTGRES_USER`
  - `POSTGRES_PASSWORD`
  - `DATABASE_URL`
  - `JWT_SECRET`
- Variables (Actions -> Variables):
  - `HOSTINGER_VM_ID`
  - `POSTGRES_DB`
  - `NEXT_PUBLIC_APP_URL`
  - `NEXT_PUBLIC_API_URL`
- Se precisar de Pix EFI, adicione tambem `EFI_*` como secrets/vars e inclua no bloco
  `environment-variables` do workflow.

## Variaveis e volumes

- Variaveis obrigatorias:
  - `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`
  - `DATABASE_URL` (use `postgres` como host)
  - `REDIS_URL` (use `redis` como host)
  - `JWT_SECRET`
  - `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_API_URL`
- `NEXT_PUBLIC_*` precisam estar definidas antes do build do `web`.
- Variaveis recomendadas:
  - `LOG_LEVEL`, `CORS_ORIGINS`, `TOKEN_TTL`, `REFRESH_TTL`
  - `ORDER_PAYMENT_TTL_SECONDS`, `ORDER_AUTO_COMPLETE_HOURS`
  - `PIX_MOCK_MODE`, `PIX_MOCK_TTL_SECONDS`
  - `EFI_*` (quando usar Pix EFI)
  - `SETTLEMENT_MODE`, `SETTLEMENT_RELEASE_DELAY_HOURS`
- Volumes nomeados criados automaticamente:
  - `postgres_data`, `redis_data`, `api_uploads`
- Volumes de bind recomendados:
  - `nginx.conf` em `/opt/projeto-g2g/nginx.conf`
  - cert EFI em `/opt/projeto-g2g/efi-cert.p12` (se aplicavel)

## Atualizacao com zero/minimo downtime (quando possivel)

- Em uma unica instancia, sempre existe breve indisponibilidade ao recriar containers.
- Para minimizar:
  1) Atualize `worker` primeiro.
  2) Atualize `api` e espere ficar saudavel.
  3) Atualize `web` por ultimo.
- Evite reiniciar `nginx` durante o deploy.
- Se houver migracoes breaking, programe janela de manutencao.

## Rollback

1) Volte o compose para a revisao anterior (ou tag de imagem anterior).
2) Recrie os servicos `api`, `worker` e `web`.
3) Se houve migracao incompativel, restaure o backup do Postgres.

## Backups

### Postgres (dump)

```
docker compose -f docker-compose.prod.yml exec -T postgres \
  pg_dump -U $POSTGRES_USER $POSTGRES_DB > /opt/projeto-g2g/backup.sql
```

### Postgres (restore)

```
cat /opt/projeto-g2g/backup.sql | docker compose -f docker-compose.prod.yml exec -T postgres \
  psql -U $POSTGRES_USER -d $POSTGRES_DB
```

### Uploads

```
docker run --rm -v api_uploads:/data -v /opt/projeto-g2g:/backup alpine \
  tar -czf /backup/uploads.tar.gz -C /data .
```

## Verificacao rapida

- `curl http://localhost/health`
- `curl http://localhost/api/health`
