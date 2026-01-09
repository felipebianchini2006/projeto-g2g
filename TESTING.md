# Estrategia de testes

## API
- Unit (services): valida regras de negocio com dependencias mockadas.
- Integracao (controllers): valida DTO/pipe e mapeamento HTTP com services mockados.
- E2E (supertest): AppModule completo com Postgres/Redis reais.
- Idempotencia: webhook duplicado nao deve gerar novos eventos, ledger entries ou notificacoes.

## Web
- Smoke (Playwright): login -> comprar -> ver pedido -> abrir ticket.
- Usa usuario seed (buyer@email.com / 12345678) e listings seed no banco.
- Rodar: `npm run test:smoke -w apps/web` (primeira vez: `npx playwright install`).

## Ambiente de testes (Docker)
- Subir dependencias: `docker compose -f compose.test.yml up -d`
- Variaveis sugeridas:
  - `DATABASE_URL=postgresql://postgres:123456@localhost:5433/projeto_g2g_test`
  - `REDIS_URL=redis://localhost:6380`
  - `JWT_SECRET=test-secret`
  - `TOKEN_TTL=900`
  - `REFRESH_TTL=3600`
  - `PIX_MOCK_MODE=true`
- Aplicar migracoes: `npm run prisma:migrate:deploy -w apps/api`
- Seed opcional para smoke web: `npm run prisma:seed -w apps/api`
- Para sobrescrever nos e2e, use `E2E_DATABASE_URL` e `E2E_REDIS_URL`.

## Definition of Done
### API
- [ ] Unit tests cobrindo regra nova ou alterada.
- [ ] Integracao (controller) cobrindo input/DTO e erro esperado.
- [ ] E2E (supertest) cobrindo fluxo critico e idempotencia quando aplicavel.
- [ ] Lint e testes ok.
- [ ] Logs/metricas ajustados quando ha novo fluxo.
- [ ] Documentacao atualizada se houver mudanca de contrato.

### Web
- [ ] Smoke Playwright atualizado para fluxo critico afetado.
- [ ] UI validada em viewport mobile e desktop.
- [ ] Sem erros no console e sem regressao visual evidente.
- [ ] Lint e testes ok.
- [ ] Documentacao atualizada se houver mudanca de fluxo.
