# Guia do sistema do zero (para iniciantes)

Este guia ensina a configurar o sistema do zero como se voce nunca tivesse
programado antes. Ele e bem detalhado, passo a passo. Se voce ja tem
experiencia, veja tambem `PRODUCTION.md`, `RUNBOOK.md`, `OPERATIONS.md` e
`SECURITY.md` para detalhes avancados.

---

## 1) O que e este sistema (em palavras simples)

Este repositorio contem um sistema completo com:

- **Web (Next.js)**: a parte que o usuario ve no navegador.
- **API (NestJS)**: a parte que responde as requisicoes da Web.
- **Worker (NestJS)**: um processo separado que faz tarefas em segundo plano.
- **Postgres**: banco de dados (onde ficam os dados).
- **Redis**: fila e cache (para processar tarefas).

No computador local (seu PC), as URLs padrao sao:

- Web: http://localhost:3000
- API: http://localhost:3001

---

## 2) O que voce precisa instalar no seu computador

Se voce nunca fez isso, siga na ordem. Cada item e um programa:

1) **Node.js 20+**
   - O Node.js permite rodar o codigo JavaScript do projeto.
2) **npm 10+**
   - O npm vem junto com o Node.js.
3) **Git**
   - O Git permite baixar o projeto do repositorio.
4) **Docker Desktop**
   - O Docker cria ambientes prontos com Postgres e Redis.

Dica: se voce nao sabe se ja tem instalado, nao tem problema instalar de novo.

---

## 3) Baixar o projeto para o seu PC

1) Crie uma pasta no seu computador, por exemplo:
   - `C:\projetos`
2) Abra o **PowerShell**.
3) Entre na pasta:

```bash
cd C:\projetos
```

4) Baixe o repositorio (o Git precisa estar instalado):

```bash
git clone <URL_DO_REPOSITORIO>
```

5) Entre na pasta do projeto:

```bash
cd projeto-g2g
```

---

## 4) Entenda a estrutura do projeto (bem simples)

Dentro da pasta `projeto-g2g` voce vai ver:

- `apps/api`  -> backend (API)
- `apps/web`  -> frontend (Web)
- `packages/shared` -> tipos compartilhados
- `packages/config` -> configuracoes compartilhadas
- `docker-compose.dev.yml` -> banco Postgres e Redis para dev

---

## 5) Instalar as dependencias do projeto

Agora vamos instalar as bibliotecas do projeto. Isso pode demorar alguns
minutos na primeira vez.

```bash
npm install
```

Se aparecer alguma mensagem de erro, pare e me diga exatamente o que apareceu.

---

## 6) Criar os arquivos de configuracao (.env)

O projeto precisa de dois arquivos de configuracao:

- `apps/api/.env`
- `apps/web/.env.local`

Vamos criar a partir dos exemplos:

1) Copie o arquivo da API:

```bash
Copy-Item apps\api\.env.example apps\api\.env
```

2) Copie o arquivo da Web:

```bash
Copy-Item apps\web\.env.example apps\web\.env.local
```

3) Agora abra os dois arquivos e preencha os campos principais.

### 6.1) API (`apps/api/.env`)

Campos obrigatorios para a API iniciar:

- `JWT_SECRET`
- `DISCORD_CLIENT_ID`
- `DISCORD_CLIENT_SECRET`
- `DISCORD_REDIRECT_URI`
- `GEMINI_API_KEY`

Se voce nao tiver esses dados ainda, pode colocar valores de teste por agora.
Exemplo:

- `JWT_SECRET=teste123`
- `DISCORD_CLIENT_ID=teste`
- `DISCORD_CLIENT_SECRET=teste`
- `DISCORD_REDIRECT_URI=http://localhost:3000/api/auth/discord/callback`
- `GEMINI_API_KEY=teste`

### 6.2) Web (`apps/web/.env.local`)

Campos principais:

- `NEXT_PUBLIC_APP_URL=http://localhost:3000`
- `NEXT_PUBLIC_API_URL=http://localhost:3001`
- `DISCORD_CLIENT_ID=teste`
- `DISCORD_REDIRECT_URI=http://localhost:3000/api/auth/discord/callback`

Importante: tudo que comeca com `NEXT_PUBLIC_` aparece no navegador.

---

## 7) Subir o banco de dados (Postgres) e o Redis

Agora vamos ligar os servicos de banco e fila usando Docker.

```bash
npm run docker:up
```

Se o Docker Desktop estiver fechado, abra ele antes.

Opcional: abrir o Adminer (um painel do banco de dados):

```bash
docker compose -f docker-compose.dev.yml --profile devtools up -d adminer
```

Adminer: http://localhost:8080

---

## 8) Criar as tabelas no banco (migracoes)

As migracoes criam as tabelas no banco de dados.

```bash
npm run prisma:migrate:dev -w apps/api
```

Depois rode o seed (dados de exemplo):

```bash
npm run prisma:seed -w apps/api
```

---

## 9) Iniciar o sistema

Agora vamos rodar o projeto todo:

```bash
npm run dev
```

Ao final, voce deve ver:

- Web: http://localhost:3000
- API: http://localhost:3001

Se o Swagger estiver habilitado:

- Docs da API: http://localhost:3001/docs

---

## 10) Usuarios de teste (somente local)

O seed cria usuarios de teste:

- Admin: `admin@email.com` / `12345678`
- Seller: `seller@email.com` / `12345678`
- Buyer: `buyer@email.com` / `12345678`

Nao use isso em producao.

---

## 11) Problemas comuns e como resolver

1) **API nao sobe**
   - Faltam variaveis obrigatorias no `.env`.
2) **Web nao conecta na API**
   - `NEXT_PUBLIC_API_URL` esta errado.
3) **Docker nao sobe**
   - Docker Desktop fechado ou sem permissao.
4) **Erro de banco (P2022)**
   - Migracoes nao rodaram.

Se algo disso acontecer, me diga o erro exato.

---

## 12) Producao (resumo simples)

Para colocar em producao, voce usa Docker Compose e o arquivo `.env.prod`.
Veja detalhes em `PRODUCTION.md`.

Resumo rapido:

1) Crie `.env.prod` com as variaveis reais.
2) Build das imagens:

```bash
docker compose --env-file .env.prod -f docker-compose.prod.yml build
```

3) Suba os servicos:

```bash
docker compose --env-file .env.prod -f docker-compose.prod.yml up -d
```

4) Rode migracoes no container da API:

```bash
docker compose --env-file .env.prod -f docker-compose.prod.yml \
  exec api npm run prisma:migrate:deploy -w apps/api
```

---

## 13) Links e documentos importantes

- `PRODUCTION.md` (producao completa)
- `RUNBOOK.md` (deploy e rollback)
- `OPERATIONS.md` (filas e troubleshooting)
- `SECURITY.md` (seguranca)
- `TESTING.md` (testes)
- `apps/api/docs/efi-pix.md` (Pix EFI)
