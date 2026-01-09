'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

import { ApiClientError } from '../../lib/api-client';
import { ordersApi, type Order, type PaymentStatus } from '../../lib/orders-api';
import { useAuth } from '../auth/auth-provider';
import { AccountShell } from '../account/account-shell';
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

  const listHref = scope === 'seller' ? '/conta/vendas' : '/conta/pedidos';
  const listLabel = scope === 'seller' ? 'Minhas vendas' : 'Minhas compras';
  const orderCode = orderId.slice(0, 7).toUpperCase();

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
      <section className="bg-white px-6 py-12">
        <div className="mx-auto w-full max-w-[1200px] rounded-2xl border border-meow-red/20 bg-white px-6 py-4 text-sm text-meow-muted">
          Carregando sessao...
        </div>
      </section>
    );
  }

  if (!user) {
    return (
      <section className="bg-white px-6 py-12">
        <div className="mx-auto w-full max-w-[1200px] rounded-2xl border border-meow-red/20 bg-white px-6 py-6 text-center">
          <p className="text-sm text-meow-muted">Entre para acessar o pedido.</p>
          <Link
            className="mt-4 inline-flex rounded-full bg-meow-linear px-6 py-2 text-sm font-bold text-white"
            href="/login"
          >
            Fazer login
          </Link>
        </div>
      </section>
    );
  }

  return (
    <AccountShell
      breadcrumbs={[
        { label: 'Inicio', href: '/' },
        { label: 'Conta', href: '/conta' },
        { label: listLabel, href: listHref },
        { label: `Pedido #${orderCode}` },
      ]}
    >
      <div className="text-center">
        <h1 className="text-2xl font-black text-meow-charcoal">Pedido #{orderCode}</h1>
        <p className="text-sm text-meow-muted">Detalhes completos do pedido.</p>
      </div>

      {state.error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {state.error}
        </div>
      ) : null}
      {state.actionError ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {state.actionError}
        </div>
      ) : null}
      {state.actionSuccess ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {state.actionSuccess}
        </div>
      ) : null}

      {state.status === 'loading' ? (
        <div className="rounded-xl border border-meow-red/20 bg-white px-4 py-3 text-sm text-meow-muted">
          Carregando pedido...
        </div>
      ) : null}

      {state.order ? (
        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-4">
            <div className="rounded-2xl border border-meow-red/20 bg-white p-6 shadow-[0_10px_24px_rgba(216,107,149,0.12)]">
              <div className="flex flex-wrap items-center gap-6 text-sm text-meow-muted">
                <div>
                  <span className="text-xs font-semibold uppercase tracking-[0.4px]">Status</span>
                  <p className="text-base font-bold text-meow-charcoal">
                    {statusLabel[state.order.status] ?? state.order.status}
                  </p>
                </div>
                <div>
                  <span className="text-xs font-semibold uppercase tracking-[0.4px]">Valor</span>
                  <p className="text-base font-bold text-meow-charcoal">
                    {formatCurrency(state.order.totalAmountCents, state.order.currency)}
                  </p>
                </div>
                <div>
                  <span className="text-xs font-semibold uppercase tracking-[0.4px]">Criado em</span>
                  <p className="text-base font-bold text-meow-charcoal">
                    {new Date(state.order.createdAt).toLocaleString('pt-BR')}
                  </p>
                </div>
              </div>

              <div className="mt-5 flex flex-wrap gap-3">
                <button
                  className="rounded-full border border-meow-red/30 px-4 py-2 text-xs font-bold text-meow-deep"
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
                  className="rounded-full bg-meow-linear px-4 py-2 text-xs font-bold text-white"
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
                  className="rounded-full border border-meow-red/30 px-4 py-2 text-xs font-bold text-meow-deep"
                  type="button"
                  disabled={!canDispute}
                  onClick={() =>
                    handleAction(
                      () =>
                        ordersApi.openDispute(
                          accessToken,
                          orderId,
                          'Disputa aberta pelo comprador.',
                        ),
                      'Disputa aberta.',
                    )
                  }
                >
                  Abrir disputa
                </button>
                <Link
                  className="rounded-full border border-meow-red/30 px-4 py-2 text-xs font-bold text-meow-deep"
                  href={`/conta/tickets?orderId=${orderId}`}
                >
                  Abrir ticket
                </Link>
              </div>
            </div>

            <div className="rounded-2xl border border-meow-red/20 bg-white p-6 shadow-[0_10px_24px_rgba(216,107,149,0.12)]">
              <h2 className="text-base font-bold text-meow-charcoal">Itens</h2>
              <div className="mt-4 grid gap-3">
                {state.order.items.map((item) => (
                  <div
                    key={item.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-meow-red/10 bg-meow-cream/40 px-4 py-3"
                  >
                    <div>
                      <p className="text-sm font-semibold text-meow-charcoal">{item.title}</p>
                      <p className="text-xs text-meow-muted">
                        {item.deliveryType === 'AUTO' ? 'Entrega auto' : 'Entrega manual'}
                      </p>
                    </div>
                    <span className="text-sm font-semibold text-meow-charcoal">
                      {formatCurrency(item.unitPriceCents, state.order.currency)} x {item.quantity}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-meow-red/20 bg-white p-6 shadow-[0_10px_24px_rgba(216,107,149,0.12)]">
              <h2 className="text-base font-bold text-meow-charcoal">Entrega</h2>
              {deliverySection?.autoItems.length ? (
                <div className="mt-4 rounded-xl border border-meow-red/20 bg-meow-cream/40 px-4 py-3 text-sm text-meow-muted">
                  <p className="font-semibold text-meow-charcoal">Itens auto</p>
                  {deliverySection.revealAllowed ? (
                    <ul className="mt-2 grid gap-1 text-xs">
                      {deliverySection.autoItems.flatMap((item) =>
                        (item.inventoryItems ?? []).map((inv) => (
                          <li key={inv.id} className="rounded bg-white px-2 py-1 font-mono">
                            {inv.code}
                          </li>
                        )),
                      )}
                    </ul>
                  ) : (
                    <p className="mt-2 text-xs">Disponivel apos a entrega.</p>
                  )}
                </div>
              ) : null}

              {deliverySection?.manualItems.length ? (
                <div className="mt-4 rounded-xl border border-meow-red/20 bg-meow-cream/40 px-4 py-3 text-sm text-meow-muted">
                  <p className="font-semibold text-meow-charcoal">Evidencias (manual)</p>
                  {deliverySection.manualItems.some((item) => item.deliveryEvidence?.length) ? (
                    <ul className="mt-2 grid gap-1 text-xs">
                      {deliverySection.manualItems.flatMap((item) =>
                        (item.deliveryEvidence ?? []).map((evidence) => (
                          <li key={evidence.id}>{evidence.content}</li>
                        )),
                      )}
                    </ul>
                  ) : (
                    <p className="mt-2 text-xs">Aguardando envio do seller.</p>
                  )}
                </div>
              ) : null}
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl border border-meow-red/20 bg-white p-6 shadow-[0_10px_24px_rgba(216,107,149,0.12)]">
              <h2 className="text-base font-bold text-meow-charcoal">Pagamento</h2>
              {paymentSummary ? (
                <div className="mt-3 space-y-3 text-sm text-meow-muted">
                  <div className="flex items-center justify-between">
                    <span>Status</span>
                    <span className="rounded-full bg-meow-cream px-3 py-1 text-xs font-semibold text-meow-charcoal">
                      {paymentStatusLabel[paymentSummary.status]}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Txid</span>
                    <span className="font-mono text-xs text-meow-charcoal">
                      {paymentSummary.txid}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Pago em</span>
                    <span className="text-xs text-meow-charcoal">
                      {paymentSummary.paidAt
                        ? new Date(paymentSummary.paidAt).toLocaleString('pt-BR')
                        : 'Aguardando'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Expira em</span>
                    <span className="text-xs text-meow-charcoal">
                      {paymentSummary.expiresAt
                        ? new Date(paymentSummary.expiresAt).toLocaleString('pt-BR')
                        : 'Nao informado'}
                    </span>
                  </div>
                </div>
              ) : (
                <p className="mt-3 text-sm text-meow-muted">
                  Nenhuma cobranca registrada ainda.
                </p>
              )}

              <h3 className="mt-6 text-sm font-bold text-meow-charcoal">Timeline</h3>
              <div className="mt-3 grid gap-3 text-xs text-meow-muted">
                {state.order.events?.map((event) => (
                  <div key={event.id} className="rounded-xl border border-meow-red/10 bg-meow-cream/40 px-3 py-2">
                    <p className="font-semibold text-meow-charcoal">
                      {eventLabel[event.type] ?? event.type}
                    </p>
                    <span>{new Date(event.createdAt).toLocaleString('pt-BR')}</span>
                    {event.metadata && typeof event.metadata === 'object' ? (
                      <p className="mt-1 text-[11px] text-meow-muted">
                        {event.metadata['from'] ? `De ${event.metadata['from']} ` : ''}
                        {event.metadata['to'] ? `para ${event.metadata['to']}` : ''}
                      </p>
                    ) : null}
                  </div>
                ))}
                {state.order.events?.length === 0 ? (
                  <div className="rounded-xl border border-meow-red/20 bg-white px-3 py-2">
                    Nenhum evento registrado.
                  </div>
                ) : null}
              </div>
            </div>

            {accessToken ? (
              <div className="rounded-2xl border border-meow-red/20 bg-white p-4 shadow-[0_10px_24px_rgba(216,107,149,0.12)]">
                <OrderChat orderId={orderId} accessToken={accessToken} userId={user.id} />
              </div>
            ) : (
              <div className="rounded-2xl border border-meow-red/20 bg-white px-4 py-3 text-sm text-meow-muted">
                Carregando chat...
              </div>
            )}
          </div>
        </div>
      ) : null}
    </AccountShell>
  );
};
