'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

import { ApiClientError } from '../../lib/api-client';
import { ordersApi, type Order } from '../../lib/orders-api';
import { paymentsApi, type PixPayment } from '../../lib/payments-api';
import { useAuth } from '../auth/auth-provider';
import { AccountShell } from '../account/account-shell';

const formatCurrency = (value: number, currency = 'BRL') =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(value / 100);

export const OrderPaymentContent = ({ orderId }: { orderId: string }) => {
  const { user, accessToken, loading } = useAuth();
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copyStatus, setCopyStatus] = useState<string | null>(null);
  const [pixPayment, setPixPayment] = useState<PixPayment | null>(null);
  const [pixBusy, setPixBusy] = useState(false);
  const [pixError, setPixError] = useState<string | null>(null);

  useEffect(() => {
    if (!accessToken) {
      return;
    }
    let active = true;
    const load = async () => {
      try {
        const data = await ordersApi.getOrder(accessToken, orderId);
        if (active) {
          setOrder(data);
        }
      } catch (error) {
        if (active) {
          setError(
            error instanceof ApiClientError
              ? error.message
              : 'Nao foi possivel carregar o pedido.',
          );
        }
      }
    };
    load();
    return () => {
      active = false;
    };
  }, [accessToken, orderId]);

  const firstItem = order?.items?.[0];
  const payment = order?.payments?.[0];
  const activePayment = pixPayment ?? payment;
  const orderCode = orderId.slice(0, 7).toUpperCase();

  const statusLabel = useMemo(() => {
    if (!order) {
      return '';
    }
    const map: Record<string, string> = {
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
    return map[order.status] ?? order.status;
  }, [order]);

  const handleCopy = async () => {
    if (!activePayment?.copyPaste) {
      return;
    }
    try {
      await navigator.clipboard.writeText(activePayment.copyPaste);
      setCopyStatus('Codigo copiado.');
    } catch {
      setCopyStatus('Nao foi possivel copiar o codigo.');
    }
  };

  const handleCreatePix = async () => {
    if (!accessToken || pixBusy) {
      return;
    }
    setPixBusy(true);
    setPixError(null);
    try {
      const data = await paymentsApi.createPix(accessToken, orderId);
      setPixPayment(data);
    } catch (error) {
      const message =
        error instanceof ApiClientError
          ? error.message
          : error instanceof Error
            ? error.message
            : 'Nao foi possivel gerar o Pix.';
      setPixError(message);
    } finally {
      setPixBusy(false);
    }
  };

  return (
    <AccountShell
      breadcrumbs={[
        { label: 'Inicio', href: '/' },
        { label: 'Conta', href: '/conta' },
        { label: 'Minhas compras', href: '/conta/pedidos' },
        { label: `Pedido #${orderCode}` },
      ]}
    >
      <div className="text-center">
        <h1 className="text-2xl font-black text-meow-charcoal">Pedido #{orderCode}</h1>
        <p className="text-sm text-meow-muted">Pagamento e resumo do pedido</p>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-meow-red/20 bg-white px-6 py-4 text-sm text-meow-muted">
          Carregando...
        </div>
      ) : null}

      {!user ? (
        <div className="rounded-2xl border border-meow-red/20 bg-white px-6 py-4 text-sm text-meow-muted">
          Entre para acessar o pagamento.
        </div>
      ) : null}

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-xs font-semibold text-red-700">
          {error}
        </div>
      ) : null}

      {user ? (
        <div className="grid gap-6">
          <div className="rounded-2xl border border-meow-red/20 bg-white p-6 shadow-[0_10px_24px_rgba(216,107,149,0.12)]">
            <h2 className="text-lg font-black text-meow-charcoal">Pedido</h2>
            <p className="text-sm text-meow-muted">
              Codigo do pedido: <strong className="text-meow-charcoal">{orderCode}</strong>
            </p>
            <div className="mt-4 grid gap-4 md:grid-cols-[1fr_auto]">
              <div className="space-y-2 text-sm text-meow-muted">
                <div>
                  Data:{' '}
                  {order?.createdAt
                    ? new Date(order.createdAt).toLocaleString('pt-BR')
                    : '-'}
                </div>
                <div>Status: {statusLabel}</div>
                <div>
                  Subtotal:{' '}
                  {order ? formatCurrency(order.totalAmountCents, order.currency) : '-'}
                </div>
              </div>
              {firstItem ? (
                <div className="flex items-center gap-4 rounded-xl border border-meow-red/20 bg-meow-cream/60 px-4 py-3">
                  <div className="h-16 w-16 overflow-hidden rounded-lg bg-white">
                    <img
                      src={
                        firstItem.deliveryEvidence?.[0]?.content ??
                        '/assets/meoow/highlight-01.webp'
                      }
                      alt={firstItem.title}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-meow-charcoal">
                      {firstItem.title}
                    </p>
                    <p className="text-xs text-meow-muted">
                      {firstItem.quantity} x{' '}
                      {formatCurrency(firstItem.unitPriceCents, order?.currency ?? 'BRL')}
                    </p>
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          <div className="rounded-2xl border border-meow-red/20 bg-meow-cream/40 p-6 text-center shadow-[0_10px_24px_rgba(216,107,149,0.12)]">
            <h2 className="text-lg font-black text-meow-charcoal">Pagamento</h2>
            <p className="mt-2 text-sm text-meow-muted">
              {activePayment
                ? `Valor final do pedido: ${formatCurrency(
                    order?.totalAmountCents ?? 0,
                    order?.currency ?? 'BRL',
                  )}`
                : 'Pagamento pendente.'}
            </p>

            {activePayment?.copyPaste ? (
              <div className="mt-4 rounded-xl border border-meow-red/20 bg-white px-4 py-3 text-xs text-meow-muted">
                {activePayment.copyPaste}
              </div>
            ) : null}

            {pixError ? (
              <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                {pixError}
              </div>
            ) : null}

            <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
              <Link
                href={`/conta/pedidos/${orderId}`}
                className="rounded-full border border-meow-red/30 px-5 py-2 text-xs font-bold text-meow-deep"
              >
                Ver pedido
              </Link>
              {activePayment?.copyPaste ? (
                <button
                  type="button"
                  className="rounded-full bg-meow-linear px-6 py-2 text-xs font-bold text-white"
                  onClick={handleCopy}
                >
                  Copiar codigo
                </button>
              ) : null}
              <button
                type="button"
                className="rounded-full border border-meow-red/30 px-5 py-2 text-xs font-bold text-meow-deep"
                onClick={handleCreatePix}
                disabled={pixBusy}
              >
                {pixBusy ? 'Gerando...' : 'Gerar novo Pix'}
              </button>
            </div>
            {copyStatus ? (
              <div className="mt-3 text-xs font-semibold text-meow-muted">{copyStatus}</div>
            ) : null}
          </div>
        </div>
      ) : null}
    </AccountShell>
  );
};
