# Arquitetura

## Visao geral
- Monorepo: `apps/web` (Next.js) e `apps/api` (NestJS).
- API usa Postgres via Prisma e Redis via BullMQ.
- Jobs em background rodam em um worker NestJS (`apps/api/src/worker.ts`).
- Integracoes externas: Efi Pix.
- Uploads ficam em `/uploads` e sao servidos como `/uploads/*` pela API.

## Diagrama alto nivel (texto)
[Web (Next.js)] ---> [API (NestJS)] ---> [Postgres]
                         |                  |
                         |                  +-- Prisma ORM
                         |
                         +--> [Redis/BullMQ] ---> [Worker (NestJS)]
                         |
                         +--> [Uploads (/uploads)]
                         |
                         +--> [Efi Pix APIs + Webhook]

## Modulos da API (apps/api/src/modules)
- auth: register/login/refresh/logout/reset, JWT, sessoes e refresh tokens.
- users: admin para busca/bloqueio/desbloqueio e auditoria.
- listings: ciclo do anuncio do seller, listagem publica, moderacao admin.
- listings/inventory: itens de inventario para entrega AUTO.
- listings/listing-media: upload/list/remove de midia dos anuncios.
- orders: criacao de pedidos, cancelamento, confirmacao de recebimento, disputas.
- payments: criacao de cobranca Pix e helpers de reembolso/cashout.
- webhooks: intake de webhook Efi Pix, dedupe, processamento async, metricas.
- settlement: ledger, agendamento de release, fluxo de reembolso.
- wallet: resumo e extrato para seller/admin.
- notifications: listar e marcar notificacoes.
- tickets: tickets de suporte e mensagens.
- disputes: resolucao admin de disputas.
- chat: historico HTTP e gateway websocket.
- email: outbox + envio em job (sender mock).
- settings: configuracoes da plataforma + auditoria.
- health: /health e /ready.
- logger/request-context: correlation ids e logging estruturado.
- prisma/redis: infraestrutura.

## Maquina de estados do pedido (texto)
CREATED
  -> AWAITING_PAYMENT
    -> PAID
      -> IN_DELIVERY
        -> DELIVERED
          -> COMPLETED
            -> (settlement release -> wallet AVAILABLE)
  -> CANCELLED (cancelamento do comprador ou expiracao)
AWAITING_PAYMENT -> CANCELLED (cancelamento do comprador ou expiracao)
DELIVERED/COMPLETED -> DISPUTED (comprador abre disputa)
DISPUTED -> COMPLETED (admin libera)
DISPUTED -> REFUNDED (admin reembolsa)
ANY -> REFUNDED (fluxo admin de reembolso)

Notas:
- createOrder transiciona CREATED -> AWAITING_PAYMENT imediatamente.
- confirmacao de pagamento transiciona para PAID e depois IN_DELIVERY.
- Entrega AUTO: IN_DELIVERY -> DELIVERED imediatamente, e agenda auto-complete.
- Entrega MANUAL deve mover para DELIVERED via acao externa (sem endpoint dedicado).

## Fluxo Pix + webhook (texto)
1) Comprador chama POST /checkout ou POST /payments/pix/create.
2) API cria Order (AWAITING_PAYMENT) e Payment (PENDING).
3) Comprador paga Pix; Efi envia POST /webhooks/efi/pix.
4) API grava WebhookEvent e enfileira job (webhooks queue).
5) WebhooksProcessor:
   - valida payload e encontra Payment pelo txid
   - atualiza Payment para CONFIRMED
   - atualiza Order para PAID e depois IN_DELIVERY
   - cria ledger HELD e notifica/email
6) OrdersProcessor agenda auto-complete se entrega AUTO.
7) SettlementProcessor libera saldo apos COMPLETED (delay nas settings).

## Jobs e filas
- orders queue: expire-order, auto-complete-order
- webhooks queue: processEfiWebhook
- email queue: send-email (sender mock)
- settlement queue: release-order