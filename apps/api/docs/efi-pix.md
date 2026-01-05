## Efi Pix (Cob imediata)

Esta integracao usa OAuth2 com `client_credentials` e mTLS (certificado) para criar cobrancas Pix Cob.

### Variaveis de ambiente

- `EFI_CLIENT_ID` e `EFI_CLIENT_SECRET`
- `EFI_CERT_PATH` caminho absoluto/relativo do certificado (.p12/.pfx ou .pem com chave)
- `EFI_ENV` (`sandbox` ou `prod`)
- `EFI_PIX_KEY` chave Pix cadastrada na Efi

### mTLS (certificado)

1. Baixe o certificado Pix na Efi e salve localmente.
2. Preencha `EFI_CERT_PATH` apontando para o arquivo.
3. Se usar `.p12`/`.pfx`, o Node usa `pfx` diretamente.
4. Se usar `.pem`, o arquivo deve conter chave privada e certificado no mesmo arquivo.

### Sandbox

Em homologacao, a Efi pode confirmar cobrancas de baixo valor via webhook automaticamente.
Isso depende das regras do provedor e nao ocorre em producao.

### Fluxo usado

1. `POST /oauth/token` com Basic Auth + mTLS.
2. `POST /v2/cob` sem `txid` (Efi gera).
3. `GET /v2/loc/{id}/qrcode` para obter copia-e-cola e imagem do QR code.

### Endpoint interno

`POST /payments/pix/create` com `orderId`, autenticado via JWT.
Retorna `txid`, `copyPaste` e `qrCode` para o frontend.

### Webhook Pix

Endpoint publico: `POST /webhooks/efi/pix`.
O payload e registrado em `WebhookEvent` e processado de forma assincrona via BullMQ.

### Registro de webhook (admin)

Endpoint admin: `POST /webhooks/efi/register` com `{ "webhookUrl": "https://..." }`.

Se necessario, ative `EFI_WEBHOOK_SKIP_MTLS_CHECKING=true` para enviar o header
`x-skip-mtls-checking: true` durante o registro.

### Metrics de webhook

Endpoint admin: `GET /webhooks/efi/metrics`.
Retorna contadores em memoria e totais do banco (`pending`, `processed`, `total`).

### Settlement / reembolsos

- Reembolso Pix usa `PUT /v2/pix/{e2eId}/devolucao/{refundId}`.
- Cash-out para vendedor usa `POST /v2/gn/pix/send` com `chave` e `valor`.
- `SETTLEMENT_MODE=cashout` (padrao) preserva reembolso enquanto fundos estao em `HELD`.
- `SETTLEMENT_MODE=split` deve ser usado somente quando a politica permitir devolucao apos split.
