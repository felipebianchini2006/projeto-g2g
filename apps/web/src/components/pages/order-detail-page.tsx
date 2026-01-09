'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

import { ApiClientError } from '../../lib/api-client';
import { ordersApi, type Order, type PaymentStatus } from '../../lib/orders-api';
import { useAuth } from '../auth/auth-provider';
import { NotificationsBell } from '../notifications/notifications-bell';
import { OrderChat } from '../orders/order-chat';

type OrderDetailContentProps = {
  orderId: string;
  scope: 'buyer' | 'seller';
};

type DetailState = {
  status: 'loading' | 'ready';
  order: Order | null;
  error?: string;
  actionError?: string;
  actionSuccess?: string;
};

const statusLabel: Record<string, string> = {
  CREATED: 'Criado',
  AWAITING_PAYMENT: 'Aguardando pagamento',
  PAID: 'Pago',
  IN_DELIVERY: 'Em entrega',
  DELIVERED: 'Entregue',
  COMPLETED: 'Concluido',
  CANCELLED: 'Cancelado',
  DISPUTED: 'Em disputa',
  REFUNDED: 'Reembolsado',
};

const eventLabel: Record<string, string> = {
  CREATED: 'Pedido criado',
  AWAITING_PAYMENT: 'Aguardando pagamento',
  PAID: 'Pagamento confirmado',
  IN_DELIVERY: 'Entrega iniciada',
  DELIVERED: 'Pedido entregue',
  COMPLETED: 'Pedido concluido',
  CANCELLED: 'Pedido cancelado',
  DISPUTED: 'Disputa aberta',
  REFUNDED: 'Pedido reembolsado',
  NOTE: 'Atualizacao',
};

const paymentStatusLabel: Record<PaymentStatus, string> = {
  PENDING: 'Pendente',
  CONFIRMED: 'Confirmado',
  EXPIRED: 'Expirado',
  REFUNDED: 'Reembolsado',
  FAILED: 'Falhou',
};

const formatCurrency = (value: number, currency = 'BRL') =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(value / 100);

export const OrderDetailContent = ({ orderId, scope }: OrderDetailContentProps) => {
  const { user, accessToken, loading } = useAuth();
  const [state, setState] = useState<DetailState>({
    status: 'loading',
    order: null,
  });

  const detailPrefix = scope === 'seller' ? '/conta/vendas' : '/conta/pedidos';

  const loadOrder = async (silent = false) => {
    if (!accessToken) {
      return;
    }
    if (!silent) {
      setState((prev) => ({
        ...prev,
        status: 'loading',
        actionError: undefined,
        actionSuccess: undefined,
      }));
    }
    try {
      const order = await ordersApi.getOrder(accessToken, orderId);
      setState((prev) => ({ ...prev, status: 'ready', order }));
    } catch (error) {
      const message =
        error instanceof ApiClientError
          ? error.message
          : error instanceof Error
            ? error.message
            : 'Nao foi possivel carregar o pedido.';
      setState({ status: 'ready', order: null, error: message });
    }
  };

  useEffect(() => {
    if (accessToken) {
      loadOrder();
    }
  }, [accessToken, orderId]);

  useEffect(() => {
    if (!accessToken || !state.order) {
      return;
    }
    if (state.order.status !== 'AWAITING_PAYMENT') {
      return;
    }
    const interval = setInterval(() => {
      loadOrder(true);
    }, 10000);
    return () => clearInterval(interval);
  }, [accessToken, state.order?.status, orderId]);

  const handleAction = async (action: () => Promise<Order>, successMessage: string) => {
    if (!accessToken) {
      return;
    }
    try {
      const updated = await action();
      setState((prev) => ({
        ...prev,
        order: updated,
        actionSuccess: successMessage,
        actionError: undefined,
      }));
    } catch (error) {
      const message =
        error instanceof ApiClientError
          ? error.message
          : error instanceof Error
            ? error.message
            : 'Nao foi possivel concluir a acao.';
      setState((prev) => ({ ...prev, actionError: message, actionSuccess: undefined }));
    }
  };

  const isBuyer = user?.id && state.order?.buyerId === user.id;
  const canCancel =
    isBuyer &&
    (state.order?.status === 'CREATED' || state.order?.status === 'AWAITING_PAYMENT');
  const canConfirm = isBuyer && state.order?.status === 'DELIVERED';
  const canDispute =
    isBuyer &&
    (state.order?.status === 'DELIVERED' || state.order?.status === 'COMPLETED') &&
    !state.order?.dispute;

  const deliverySection = useMemo(() => {
    const order = state.order;
    if (!order) {
      return null;
    }
    const autoItems = order.items.filter((item) => item.deliveryType === 'AUTO');
    const manualItems = order.items.filter((item) => item.deliveryType === 'MANUAL');
    const revealAllowed = order.status === 'DELIVERED' || order.status === 'COMPLETED';

    return {
      autoItems,
      manualItems,
      revealAllowed,
    };
  }, [state.order]);

  const paymentSummary = useMemo(() => {
    if (!state.order?.payments?.length) {
      return null;
    }
    return state.order.payments[0];
  }, [state.order]);

  if (loading) {
    return (
      <div className="order-detail-shell">
        <div className="state-card">Carregando sessao...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="order-detail-shell">
        <div className="state-card">Entre para acessar o pedido.</div>
        <Link className="primary-button" href="/login">
          Fazer login
        </Link>
      </div>
    );
  }

  return (
    <section className="order-detail-shell">
      <div className="order-detail-header">
        <div>
          <h1>Pedido #{orderId.slice(0, 8)}</h1>
          <p className="auth-helper">Detalhes completos do pedido e linha do tempo.</p>
        </div>
        <div className="page-actions">
          <NotificationsBell />
          <Link className="ghost-button" href={detailPrefix.replace(`/${orderId}`, '')}>
            Voltar
          </Link>
        </div>
      </div>

      {state.error ? <div className="state-card info">{state.error}</div> : null}
      {state.actionError ? <div className="state-card error">{state.actionError}</div> : null}
      {state.actionSuccess ? <div className="state-card success">{state.actionSuccess}</div> : null}

      {state.status === 'loading' ? (
        <div className="state-card">Carregando pedido...</div>
      ) : null}

      {state.order ? (
        <div className="order-detail-grid">
          <div className="order-card">
            <div className="order-summary">
              <div>
                <span className="summary-label">Status</span>
                <strong>{statusLabel[state.order.status] ?? state.order.status}</strong>
              </div>
              <div>
                <span className="summary-label">Valor</span>
                <strong>
                  {formatCurrency(state.order.totalAmountCents, state.order.currency)}
                </strong>
              </div>
              <div>
                <span className="summary-label">Criado em</span>
                <strong>{new Date(state.order.createdAt).toLocaleString('pt-BR')}</strong>
              </div>
            </div>

            <div className="order-actions">
              <button
                className="ghost-button"
                type="button"
                disabled={!canCancel}
                onClick={() =>
                  handleAction(
                    () => ordersApi.cancelOrder(accessToken, orderId),
                    'Pedido cancelado.',
                  )
                }
              >
                Cancelar
              </button>
              <button
                className="primary-button"
                type="button"
                disabled={!canConfirm}
                onClick={() =>
                  handleAction(
                    () => ordersApi.confirmReceipt(accessToken, orderId),
                    'Recebimento confirmado.',
                  )
                }
              >
                Confirmar recebimento
              </button>
              <button
                className="ghost-button"
                type="button"
                disabled={!canDispute}
                onClick={() =>
                  handleAction(
                    () => ordersApi.openDispute(accessToken, orderId, 'Disputa aberta pelo comprador.'),
                    'Disputa aberta.',
                  )
                }
              >
                Abrir disputa
              </button>
              <Link className="ghost-button" href={`/conta/tickets?orderId=${orderId}`}>
                Abrir ticket
              </Link>
            </div>

            <div className="order-items">
              <h3>Itens</h3>
              {state.order.items.map((item) => (
                <div className="order-item" key={item.id}>
                  <div>
                    <strong>{item.title}</strong>
                    <span>{item.deliveryType === 'AUTO' ? 'Entrega auto' : 'Entrega manual'}</span>
                  </div>
                  <span>
                    {formatCurrency(item.unitPriceCents, state.order?.currency)} x {item.quantity}
                  </span>
                </div>
              ))}
            </div>

            <div className="order-delivery">
              <h3>Entrega</h3>
              {deliverySection?.autoItems.length ? (
                <div className="delivery-block">
                  <h4>Itens auto</h4>
                  {deliverySection.revealAllowed ? (
                    <ul>
                      {deliverySection.autoItems.flatMap((item) =>
                        (item.inventoryItems ?? []).map((inv) => (
                          <li key={inv.id}>
                            <span className="mono">{inv.code}</span>
                          </li>
                        )),
                      )}
                    </ul>
                  ) : (
                    <p className="auth-helper">Disponivel apos a entrega.</p>
                  )}
                </div>
              ) : null}

              {deliverySection?.manualItems.length ? (
                <div className="delivery-block">
                  <h4>Evidencias (manual)</h4>
                  {deliverySection.manualItems.some((item) => item.deliveryEvidence?.length) ? (
                    <ul>
                      {deliverySection.manualItems.flatMap((item) =>
                        (item.deliveryEvidence ?? []).map((evidence) => (
                          <li key={evidence.id}>{evidence.content}</li>
                        )),
                      )}
                    </ul>
                  ) : (
                    <p className="auth-helper">Aguardando envio do seller.</p>
                  )}
                </div>
              ) : null}
            </div>
          </div>

          <div className="order-aside">
            <div className="order-card">
              <h3>Pagamento</h3>
              {paymentSummary ? (
                <div className="payment-summary">
                  <div>
                    <span className="summary-label">Status</span>
                    <strong className={`payment-pill payment-${paymentSummary.status.toLowerCase()}`}>
                      {paymentStatusLabel[paymentSummary.status]}
                    </strong>
                  </div>
                  <div>
                    <span className="summary-label">Txid</span>
                    <strong className="mono">{paymentSummary.txid}</strong>
                  </div>
                  <div>
                    <span className="summary-label">Pago em</span>
                    <strong>
                      {paymentSummary.paidAt
                        ? new Date(paymentSummary.paidAt).toLocaleString('pt-BR')
                        : 'Aguardando'}
                    </strong>
                  </div>
                  <div>
                    <span className="summary-label">Expira em</span>
                    <strong>
                      {paymentSummary.expiresAt
                        ? new Date(paymentSummary.expiresAt).toLocaleString('pt-BR')
                        : 'Nao informado'}
                    </strong>
                  </div>
                </div>
              ) : (
                <p className="auth-helper">Nenhuma cobranca registrada ainda.</p>
              )}

              <h3>Timeline</h3>
              <div className="timeline">
                {state.order.events?.map((event) => (
                  <div className="timeline-item" key={event.id}>
                    <div className="timeline-dot" />
                    <div>
                      <strong>{eventLabel[event.type] ?? event.type}</strong>
                      <span>{new Date(event.createdAt).toLocaleString('pt-BR')}</span>
                      {event.metadata && typeof event.metadata === 'object' ? (
                        <small>
                          {event.metadata['from'] ? `De ${event.metadata['from']} ` : ''}
                          {event.metadata['to'] ? `para ${event.metadata['to']}` : ''}
                        </small>
                      ) : null}
                    </div>
                  </div>
                ))}
                {state.order.events?.length === 0 ? (
                  <div className="state-card">Nenhum evento registrado.</div>
                ) : null}
              </div>
            </div>

            {accessToken ? (
              <OrderChat orderId={orderId} accessToken={accessToken} userId={user.id} />
            ) : (
              <div className="order-card">
                <div className="state-card">Carregando chat...</div>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </section>
  );
};
