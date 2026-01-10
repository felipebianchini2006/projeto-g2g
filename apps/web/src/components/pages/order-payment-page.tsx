'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

import { ApiClientError } from '../../lib/api-client';
import { ordersApi, type Order } from '../../lib/orders-api';
import { paymentsApi, type PixPayment } from '../../lib/payments-api';
import { useAuth } from '../auth/auth-provider';
import { AccountShell } from '../account/account-shell';
import { buttonVariants } from '../ui/button';
import { Card } from '../ui/card';
import { Textarea } from '../ui/textarea';

const formatCurrency = (value: number, currency = 'BRL') =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(value / 100);

const resolveQrImage = (value?: string | null) => {
  if (!value) {
    return null;
  }
  if (value.startsWith('data:image') || value.startsWith('http')) {
    return value;
  }
  return null;
};

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
  const qrImage = resolveQrImage(activePayment?.qrCode ?? null);

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
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {user ? (
        <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
          <Card className="rounded-[28px] border border-slate-100 p-6 shadow-card">
            <h2 className="text-base font-bold text-meow-charcoal">Resumo</h2>
            <p className="mt-2 text-sm text-meow-muted">
              Codigo do pedido: <strong className="text-meow-charcoal">{orderCode}</strong>
            </p>
            <div className="mt-4 grid gap-3 text-sm text-meow-muted">
              <div className="flex items-center justify-between">
                <span>Status</span>
                <strong className="text-meow-charcoal">{statusLabel || '-'}</strong>
              </div>
              <div className="flex items-center justify-between">
                <span>Total</span>
                <strong className="text-meow-charcoal">
                  {order ? formatCurrency(order.totalAmountCents, order.currency) : '-'}
                </strong>
              </div>
              <div className="flex items-center justify-between">
                <span>Criado em</span>
                <strong className="text-meow-charcoal">
                  {order?.createdAt
                    ? new Date(order.createdAt).toLocaleString('pt-BR')
                    : '-'}
                </strong>
              </div>
            </div>

            {firstItem ? (
              <div className="mt-4 flex items-center gap-4 rounded-xl border border-meow-red/20 bg-meow-cream/60 px-4 py-3">
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
                  <p className="text-sm font-semibold text-meow-charcoal">{firstItem.title}</p>
                  <p className="text-xs text-meow-muted">
                    {firstItem.quantity} x{' '}
                    {formatCurrency(firstItem.unitPriceCents, order?.currency ?? 'BRL')}
                  </p>
                </div>
              </div>
            ) : null}
          </Card>

          <Card className="rounded-[28px] border border-slate-100 p-6 shadow-card">
            <h2 className="text-base font-bold text-meow-charcoal">Pagamento Pix</h2>
            <p className="mt-2 text-sm text-meow-muted">
              {activePayment
                ? `Valor final do pedido: ${formatCurrency(
                    order?.totalAmountCents ?? 0,
                    order?.currency ?? 'BRL',
                  )}`
                : 'Pagamento pendente.'}
            </p>

            {activePayment?.expiresAt ? (
              <div className="mt-3 text-xs text-meow-muted">
                Expira em {new Date(activePayment.expiresAt).toLocaleString('pt-BR')}
              </div>
            ) : null}

            {qrImage ? (
              <div className="mt-4 rounded-2xl border border-meow-red/20 bg-white p-4">
                <img src={qrImage} alt="QR Code Pix" className="mx-auto h-40 w-40" />
              </div>
            ) : null}

            {activePayment?.qrCode && !qrImage ? (
              <div className="mt-4 rounded-xl border border-meow-red/20 bg-white px-4 py-3 text-xs text-meow-muted">
                QR Code Pix: {activePayment.qrCode}
              </div>
            ) : null}

            {activePayment?.copyPaste ? (
              <div className="mt-4">
                <label className="text-xs font-semibold uppercase text-meow-muted">
                  Copia e cola
                </label>
                <Textarea
                  readOnly
                  rows={3}
                  className="mt-2 text-xs"
                  value={activePayment.copyPaste}
                />
              </div>
            ) : null}

            {pixError ? (
              <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                {pixError}
              </div>
            ) : null}

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <Link
                href={`/conta/pedidos/${orderId}`}
                className={buttonVariants({ variant: 'secondary', size: 'sm' })}
              >
                Ver pedido
              </Link>
              {activePayment?.copyPaste ? (
                <button
                  type="button"
                  className={buttonVariants({ variant: 'primary', size: 'sm' })}
                  onClick={handleCopy}
                >
                  Copiar codigo
                </button>
              ) : null}
              <button
                type="button"
                className={buttonVariants({ variant: 'secondary', size: 'sm' })}
                onClick={handleCreatePix}
                disabled={pixBusy}
              >
                {pixBusy ? 'Gerando...' : 'Gerar novo Pix'}
              </button>
            </div>
            {copyStatus ? (
              <div className="mt-3 text-xs font-semibold text-meow-muted">{copyStatus}</div>
            ) : null}
          </Card>
        </div>
      ) : null}
    </AccountShell>
  );
};
