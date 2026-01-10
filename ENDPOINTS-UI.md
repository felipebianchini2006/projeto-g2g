# Endpoint to UI Matrix

## Auth
| Endpoint | Tela/Rota | Entrada de UI |
| --- | --- | --- |
| POST /auth/register | `/register` | Formulario de cadastro |
| POST /auth/login | `/login` | Formulario de login |
| POST /auth/refresh | `/login` (auto) | Fluxo automatico do auth client |
| POST /auth/logout | `/conta` | Menu de usuario (Sair) |
| POST /auth/forgot-password | `/forgot` | Recuperar senha |
| POST /auth/reset-password | `/reset` | Redefinir senha |
| POST /auth/change-password | `/conta/seguranca` | Atualizar senha |
| GET /auth/sessions | `/conta/sessoes` | Lista de sessoes |
| DELETE /auth/sessions/:id | `/conta/sessoes` | Botao encerrar sessao |
| POST /auth/logout-all | `/conta/sessoes` | Botao sair de todas |

## Public
| Endpoint | Tela/Rota | Entrada de UI |
| --- | --- | --- |
| GET /public/listings | `/produtos` | Catalogo publico |
| GET /public/listings/:id | `/anuncios/[id]` | Detalhe do anuncio |
| GET /public/categories | `/categoria`, `/categoria/[slug]` | Listas e filtros |

## Catalogo publico
| Endpoint | Tela/Rota | Entrada de UI |
| --- | --- | --- |
| GET /public/catalog/groups | `/anunciar` | Select de subcategoria/jogo |
| GET /public/catalog/sections | `/anunciar` | Select de secao |
| GET /public/catalog/sales-models | `/anunciar` | Cards de tipo de venda |
| GET /public/catalog/origins | `/anunciar` | Select de procedencia |
| GET /public/catalog/recovery-options | `/anunciar` | Select de dados de recuperacao |

## Seller (Listings + Midia + Inventario)
| Endpoint | Tela/Rota | Entrada de UI |
| --- | --- | --- |
| POST /listings | `/anunciar` | Criar anuncio |
| GET /listings | `/conta/anuncios`, `/dashboard` | Listagem do seller |
| GET /listings/:id | `/dashboard` | Selecionar anuncio |
| PATCH /listings/:id | `/dashboard` | Editar anuncio |
| POST /listings/:id/submit | `/anunciar`, `/dashboard` | Publicar anuncio |
| DELETE /listings/:id | `/dashboard` | Suspender anuncio |
| GET /listings/:listingId/media | `/dashboard` | Midias do anuncio |
| POST /listings/:listingId/media/upload | `/anunciar`, `/dashboard` | Upload de midia |
| DELETE /listings/:listingId/media/:mediaId | `/dashboard` | Remover midia |
| POST /listings/:listingId/inventory/items | `/dashboard` | Adicionar inventario |
| POST /listings/:listingId/inventory/import | `/dashboard` | Importar inventario |
| DELETE /listings/:listingId/inventory/items/:itemId | `/dashboard` | Remover item |
| POST /listings/:listingId/inventory/reserve | `/admin/anuncios` | Reserva admin |

## Orders + Checkout + Payments
| Endpoint | Tela/Rota | Entrada de UI |
| --- | --- | --- |
| POST /orders | `/checkout/[listingId]` | Criar pedido sem Pix |
| GET /orders | `/conta/pedidos`, `/conta/vendas` | Lista buyer/seller |
| GET /orders/:id | `/conta/pedidos/[id]`, `/conta/vendas/[id]` | Detalhe do pedido |
| POST /orders/:id/cancel | `/conta/pedidos/[id]` | Cancelar pedido |
| POST /orders/:id/confirm-receipt | `/conta/pedidos/[id]` | Confirmar recebimento |
| POST /orders/:id/open-dispute | `/conta/pedidos/[id]` | Abrir disputa |
| POST /orders/:id/dispute | `/conta/pedidos/[id]` | Alias de disputa |
| POST /checkout | `/checkout/[listingId]` | Gerar pedido + Pix |
| POST /payments/pix/create | `/conta/pedidos/[id]/pagamentos` | Gerar novo Pix |

## Chat
| Endpoint | Tela/Rota | Entrada de UI |
| --- | --- | --- |
| GET /chat/orders/:id/messages | `/conta/pedidos/[id]`, `/conta/vendas/[id]` | Chat do pedido |

## Notifications
| Endpoint | Tela/Rota | Entrada de UI |
| --- | --- | --- |
| GET /notifications | `/central-de-notificacoes` | Central de notificacoes |
| POST /notifications/:id/read | `/central-de-notificacoes` | Clique na notificacao |
| POST /notifications/read-all | `/central-de-notificacoes` | Marcar todas lidas |

## Tickets
| Endpoint | Tela/Rota | Entrada de UI |
| --- | --- | --- |
| POST /tickets | `/conta/tickets` | Abrir ticket |
| GET /tickets | `/conta/tickets` | Lista de tickets |
| GET /tickets/:id | `/conta/tickets/[id]` | Detalhe do ticket |
| POST /tickets/:id/messages | `/conta/tickets/[id]` | Enviar mensagem |

## Disputes (Admin)
| Endpoint | Tela/Rota | Entrada de UI |
| --- | --- | --- |
| GET /admin/disputes | `/admin/disputas` | Lista de disputas |
| GET /admin/disputes/:id | `/admin/disputas/[id]` | Detalhe de disputa |
| POST /admin/disputes/:id/resolve | `/admin/disputas/[id]` | Resolver disputa |

## Cadastros (Admin)
| Endpoint | Tela/Rota | Entrada de UI |
| --- | --- | --- |
| GET /admin/catalog/categories | `/admin/cadastros` | Lista de categorias |
| POST /admin/catalog/categories | `/admin/cadastros` | Criar categoria |
| PATCH /admin/catalog/categories/:id | `/admin/cadastros` | Editar categoria |
| DELETE /admin/catalog/categories/:id | `/admin/cadastros` | Remover categoria |
| GET /admin/catalog/groups | `/admin/cadastros` | Lista de subcategorias |
| POST /admin/catalog/groups | `/admin/cadastros` | Criar subcategoria |
| PATCH /admin/catalog/groups/:id | `/admin/cadastros` | Editar subcategoria |
| DELETE /admin/catalog/groups/:id | `/admin/cadastros` | Remover subcategoria |
| GET /admin/catalog/sections | `/admin/cadastros` | Lista de secoes |
| POST /admin/catalog/sections | `/admin/cadastros` | Criar secao |
| PATCH /admin/catalog/sections/:id | `/admin/cadastros` | Editar secao |
| DELETE /admin/catalog/sections/:id | `/admin/cadastros` | Remover secao |
| GET /admin/catalog/sales-models | `/admin/cadastros` | Lista de tipos de venda |
| POST /admin/catalog/sales-models | `/admin/cadastros` | Criar tipo de venda |
| PATCH /admin/catalog/sales-models/:id | `/admin/cadastros` | Editar tipo de venda |
| DELETE /admin/catalog/sales-models/:id | `/admin/cadastros` | Remover tipo de venda |
| GET /admin/catalog/origins | `/admin/cadastros` | Lista de procedencias |
| POST /admin/catalog/origins | `/admin/cadastros` | Criar procedencia |
| PATCH /admin/catalog/origins/:id | `/admin/cadastros` | Editar procedencia |
| DELETE /admin/catalog/origins/:id | `/admin/cadastros` | Remover procedencia |
| GET /admin/catalog/recovery-options | `/admin/cadastros` | Lista de dados de recuperacao |
| POST /admin/catalog/recovery-options | `/admin/cadastros` | Criar dados de recuperacao |
| PATCH /admin/catalog/recovery-options/:id | `/admin/cadastros` | Editar dados de recuperacao |
| DELETE /admin/catalog/recovery-options/:id | `/admin/cadastros` | Remover dados de recuperacao |

## Settings + Users (Admin)
| Endpoint | Tela/Rota | Entrada de UI |
| --- | --- | --- |
| GET /admin/settings | `/admin/parametros` | Parametros |
| PUT /admin/settings | `/admin/parametros` | Salvar parametros |
| GET /admin/users | `/admin/usuarios` | Lista de usuarios |
| POST /admin/users/:id/block | `/admin/usuarios` | Bloquear usuario |
| POST /admin/users/:id/unblock | `/admin/usuarios` | Desbloquear usuario |

## Wallet
| Endpoint | Tela/Rota | Entrada de UI |
| --- | --- | --- |
| GET /wallet/summary | `/conta/carteira` | Resumo da carteira |
| GET /wallet/entries | `/conta/carteira/extrato` | Extrato |

## Admin Orders
| Endpoint | Tela/Rota | Entrada de UI |
| --- | --- | --- |
| POST /admin/orders/:id/release | `/admin/pedidos` | Liberar pagamento |
| POST /admin/orders/:id/refund | `/admin/pedidos` | Reembolsar buyer |

## Admin Listings
| Endpoint | Tela/Rota | Entrada de UI |
| --- | --- | --- |
| GET /admin/listings | `/admin/anuncios` | Lista de anuncios |
| POST /admin/listings | `/admin/anuncios` | Criar anuncio |
| POST /admin/listings/:id/approve | `/admin/anuncios` | Aprovar anuncio |
| POST /admin/listings/:id/reject | `/admin/anuncios` | Reprovar anuncio |
| POST /admin/listings/:id/suspend | `/admin/anuncios` | Suspender anuncio |

## Webhooks + Health
| Endpoint | Tela/Rota | Entrada de UI |
| --- | --- | --- |
| POST /webhooks/efi/pix | `/admin/webhooks` | Informativo de endpoint |
| POST /webhooks/efi/register | `/admin/webhooks` | Registrar webhook |
| GET /webhooks/efi/metrics | `/admin/webhooks` | Ver metricas |
| GET /health | `/admin/sistema` | Monitoramento |
| GET /ready | `/admin/sistema` | Monitoramento |
