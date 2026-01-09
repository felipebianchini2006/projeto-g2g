'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

import { ApiClientError } from '../../lib/api-client';
import { ordersApi, type Order } from '../../lib/orders-api';
import { useAuth } from '../auth/auth-provider';
import { OrderChat } from '../orders/order-chat';

type DetailState = {
  status: 'loading' | 'ready';
  order: Order | null;
  error?: string;
};

const statusLabel: Record<string, string> = {
  CREATED: 'Criado',
  AWAITING_PAYMENT: 'Pagamento pendente',
  PAID: 'Pago',
  IN_DELIVERY: 'Em entrega',
  DELIVERED: 'Entregue',
  COMPLETED: 'Concluido',
  CANCELLED: 'Cancelado',
  DISPUTED: 'Em disputa',
  REFUNDED: 'Reembolsado',
};

const formatCurrency = (value: number, currency = 'BRL') =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(value / 100);

export const AccountOrderDetailContent = ({ orderId }: { orderId: string }) => {
  const { user, accessToken, loading } = useAuth();
  const [state, setState] = useState<DetailState>({
    status: 'loading',
    order: null,
  });

  const orderCode = orderId.slice(0, 7).toUpperCase();

  useEffect(() => {
    if (!accessToken) {
      return;
    }
    let active = true;
    const load = async () => {
      try {
        const order = await ordersApi.getOrder(accessToken, orderId);
        if (!active) {
          return;
        }
        setState({ status: 'ready', order });
      } catch (error) {
        if (!active) {
          return;
        }
        const message =
          error instanceof ApiClientError
            ? error.message
            : 'Nao foi possivel carregar o pedido.';
        setState({ status: 'ready', order: null, error: message });
      }
    };
    load();
    return () => {
      active = false;
    };
  }, [accessToken, orderId]);

  const firstItem = state.order?.items?.[0];
  const payment = state.order?.payments?.[0];

  const showChat =
    state.order?.status === 'PAID' ||
    state.order?.status === 'IN_DELIVERY' ||
    state.order?.status === 'DELIVERED' ||
    state.order?.status === 'COMPLETED';

  const deliveryBadge = useMemo(() => {
    if (!state.order) {
      return null;
    }
    if (state.order.status === 'DELIVERED' || state.order.status === 'COMPLETED') {
      return { label: 'Entregue', tone: 'text-emerald-600' };
    }
    return { label: 'Entrega pendente', tone: 'text-meow-muted' };
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
          <p className="text-sm text-meow-muted">Entre para acessar seu pedido.</p>
          <Link
            href="/login"
            className="mt-4 inline-flex rounded-full bg-meow-linear px-6 py-2 text-sm font-bold text-white"
          >
            Fazer login
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="bg-white px-6 py-10">
      <div className="mx-auto w-full max-w-[1200px]">
        <div className="text-xs text-meow-muted">
          <Link href="/" className="font-semibold text-meow-deep">
            Inicio
          </Link>{' '}
          &gt;{' '}
          <Link href="/conta" className="font-semibold text-meow-deep">
            Conta
          </Link>{' '}
          &gt; Minhas compras
        </div>

        <div className="mt-6 text-center">
          <h1 className="text-3xl font-black text-meow-charcoal">
            Pedido #{orderCode}
          </h1>
          <p className="text-sm text-meow-muted">
            Minhas compras &gt; Pedido #{orderCode}
          </p>
        </div>

        {state.error ? (
          <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {state.error}
          </div>
        ) : null}

        {state.status === 'loading' ? (
          <div className="mt-6 rounded-xl border border-meow-red/20 bg-white px-4 py-3 text-sm text-meow-muted">
            Carregando pedido...
          </div>
        ) : null}

        {state.order ? (
          <>
            <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_1.1fr]">
              <div className="rounded-2xl border border-meow-red/20 bg-white p-6 shadow-[0_10px_24px_rgba(216,107,149,0.12)]">
                <div className="text-sm font-semibold text-meow-charcoal">
                  Pedido: <span className="text-meow-muted">#{orderCode}</span>
                </div>
                <div className="mt-4 grid gap-2 text-sm text-meow-muted">
                  <div>
                    <span className="font-semibold text-meow-charcoal">Data:</span>{' '}
                    {new Date(state.order.createdAt).toLocaleString('pt-BR')}
                  </div>
                  <div>
                    <span className="font-semibold text-meow-charcoal">Subtotal:</span>{' '}
                    {formatCurrency(state.order.totalAmountCents, state.order.currency)}
                  </div>
                  <div>
                    <span className="font-semibold text-meow-charcoal">Vendedor:</span>{' '}
                    {state.order.seller?.email ?? state.order.sellerId ?? '-'}
                  </div>
                  <div>
                    <span className="font-semibold text-meow-charcoal">Status:</span>{' '}
                    {statusLabel[state.order.status] ?? state.order.status}
                  </div>
                  {deliveryBadge ? (
                    <div className={deliveryBadge.tone}>{deliveryBadge.label}</div>
                  ) : null}
                </div>
              </div>

              <div className="space-y-4">
                <div className="rounded-2xl border border-meow-red/20 bg-white p-4 shadow-[0_10px_24px_rgba(216,107,149,0.12)]">
                  <div className="flex flex-wrap items-center gap-4">
                    <div className="h-16 w-16 overflow-hidden rounded-xl bg-meow-cream">
                      <img
                        src={
                          firstItem?.deliveryEvidence?.[0]?.content ??
                          '/assets/meoow/highlight-01.webp'
                        }
                        alt={firstItem?.title ?? 'Item'}
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-meow-charcoal">
                        {firstItem?.title ?? 'Item indisponivel.'}
                      </p>
                      <p className="text-xs text-meow-muted">
                        {firstItem
                          ? `${firstItem.quantity} x ${formatCurrency(
                              firstItem.unitPriceCents,
                              state.order.currency,
                            )}`
                          : 'Detalhes do item nao encontrados.'}
                      </p>
                      {firstItem ? (
                        <div className="mt-2 flex items-center gap-2 text-xs text-meow-muted">
                          <span className="rounded bg-meow-cream px-2 py-0.5 font-semibold">
                            #{firstItem.id.slice(0, 7).toUpperCase()}
                          </span>
                          <span>{formatCurrency(firstItem.unitPriceCents, state.order.currency)}</span>
                        </div>
                      ) : null}
                    </div>
                    <Link
                      href={firstItem ? `/anuncios/${firstItem.id}` : '/produtos'}
                      className="rounded-full border border-meow-red/30 px-4 py-2 text-xs font-bold text-meow-deep"
                    >
                      Ver anuncio
                    </Link>
                  </div>
                </div>

                <details className="rounded-2xl border border-meow-red/20 bg-white px-4 py-3 text-sm text-meow-muted shadow-[0_10px_24px_rgba(216,107,149,0.12)]">
                  <summary className="cursor-pointer text-sm font-semibold text-meow-charcoal">
                    Descricao do Produto
                  </summary>
                  <div className="mt-3 text-sm text-meow-muted">
                    {firstItem?.deliveryEvidence?.[0]?.content ??
                      'Descricao nao informada.'}
                  </div>
                </details>
              </div>
            </div>

            <div className="mt-10 rounded-2xl border border-meow-red/20 bg-white p-6 text-center shadow-[0_10px_24px_rgba(216,107,149,0.12)]">
              <h2 className="text-lg font-bold text-meow-charcoal">Pagamento</h2>
              <p className="mt-2 text-sm text-meow-muted">
                {payment
                  ? `Status: ${payment.status}`
                  : 'O pagamento esta pendente.'}
              </p>
              <Link
                href={`/conta/pedidos/${orderId}/pagamentos`}
                className="mt-4 inline-flex rounded-full bg-meow-linear px-6 py-2 text-sm font-bold text-white"
              >
                Continuar pagamento
              </Link>
            </div>

            <div className="mt-12">
              <h2 className="text-center text-xl font-black text-meow-charcoal">
                Chat com o vendedor
              </h2>
              {showChat && accessToken && user ? (
                <div className="mt-6">
                  <OrderChat orderId={orderId} accessToken={accessToken} userId={user.id} />
                </div>
              ) : (
                <div className="mt-4 rounded-xl border border-meow-red/20 bg-white px-4 py-3 text-center text-sm text-meow-muted">
                  O chat sera liberado apos a confirmacao do pagamento.
                </div>
              )}
            </div>
          </>
        ) : null}
      </div>
    </section>
  );
};
