'use client';

import Link from 'next/link';
import { useState } from 'react';

import { ApiClientError } from '../../lib/api-client';
import { adminOrdersApi } from '../../lib/admin-orders-api';
import { ordersApi, type Order } from '../../lib/orders-api';
import { useAuth } from '../auth/auth-provider';
import { AdminShell } from '../admin/admin-shell';
import { Badge } from '../ui/badge';

export const AdminOrdersContent = () => {
  const { user, accessToken, loading } = useAuth();
  const [orderId, setOrderId] = useState('');
  const [order, setOrder] = useState<Order | null>(null);
  const [reason, setReason] = useState('');
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const handleFetchOrder = async () => {
    if (!accessToken || !orderId.trim()) {
      setError('Informe o ID do pedido.');
      return;
    }
    setBusyAction('load');
    setError(null);
    setNotice(null);
    try {
      const data = await ordersApi.getOrder(accessToken, orderId.trim());
      setOrder(data);
    } catch (error) {
      const message =
        error instanceof ApiClientError
          ? error.message
          : 'Não foi possível carregar o pedido.';
      setError(message);
    } finally {
      setBusyAction(null);
    }
  };

  const handleRelease = async () => {
    if (!accessToken || !order) {
      return;
    }
    setBusyAction('release');
    setError(null);
    setNotice(null);
    try {
      const result = await adminOrdersApi.releaseOrder(accessToken, order.id, reason.trim());
      setNotice(`Pedido ${result.orderId} liberado.`);
      setReason('');
    } catch (error) {
      const message =
        error instanceof ApiClientError
          ? error.message
          : 'Não foi possível liberar o pedido.';
      setError(message);
    } finally {
      setBusyAction(null);
    }
  };

  const handleRefund = async () => {
    if (!accessToken || !order) {
      return;
    }
    setBusyAction('refund');
    setError(null);
    setNotice(null);
    try {
      const result = await adminOrdersApi.refundOrder(accessToken, order.id, reason.trim());
      setNotice(`Pedido ${result.orderId} reembolsado.`);
      setReason('');
    } catch (error) {
      const message =
        error instanceof ApiClientError
          ? error.message
          : 'Não foi possível reembolsar o pedido.';
      setError(message);
    } finally {
      setBusyAction(null);
    }
  };

  if (loading) {
    return (
      <section className="bg-white px-6 py-12">
        <div className="mx-auto w-full max-w-[1200px] rounded-2xl border border-meow-red/20 bg-white px-6 py-4 text-sm text-meow-muted">
          Carregando sessão...
        </div>
      </section>
    );
  }

  if (!user || user.role !== 'ADMIN') {
    return (
      <section className="bg-white px-6 py-12">
        <div className="mx-auto w-full max-w-[1200px] rounded-2xl border border-meow-red/20 bg-white px-6 py-6 text-center">
          <p className="text-sm text-meow-muted">Acesso restrito ao admin.</p>
          <Link
            className="mt-4 inline-flex rounded-full border border-meow-red/30 px-6 py-2 text-sm font-bold text-meow-deep"
            href="/conta"
          >
            Voltar para conta
          </Link>
        </div>
      </section>
    );
  }

  return (
    <AdminShell
      breadcrumbs={[
        { label: 'Inicio', href: '/' },
        { label: 'Admin', href: '/admin/atendimento' },
        { label: 'Pedidos' },
      ]}
    >
      <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-black text-meow-charcoal">Pedidos (admin)</h1>
            <p className="mt-2 text-sm text-meow-muted">
              Libere ou reembolse pedidos com base no ID.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              className="rounded-full border border-meow-red/30 px-4 py-2 text-xs font-bold text-meow-deep"
              href="/conta"
            >
              Voltar para conta
            </Link>
          </div>
        </div>
      </div>

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}
      {notice ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {notice}
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-card">
          <h2 className="text-base font-bold text-meow-charcoal">Buscar pedido</h2>
          <div className="mt-4 grid gap-3">
            <label className="grid gap-1 text-xs font-semibold text-meow-muted">
              ID do pedido
              <input
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-meow-charcoal"
                value={orderId}
                onChange={(event) => setOrderId(event.target.value)}
                placeholder="order-uuid"
              />
            </label>
            <button
              className="rounded-full bg-meow-300 px-4 py-2 text-xs font-bold text-white"
              type="button"
              onClick={handleFetchOrder}
              disabled={busyAction === 'load'}
            >
              {busyAction === 'load' ? 'Carregando...' : 'Carregar pedido'}
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-card">
          <h2 className="text-base font-bold text-meow-charcoal">Resumo</h2>
          {!order ? (
            <div className="mt-4 rounded-xl border border-slate-100 bg-meow-50 px-4 py-3 text-sm text-meow-muted">
              Nenhum pedido carregado.
            </div>
          ) : (
            <div className="mt-4 grid gap-3 text-sm text-meow-muted">
              <div className="flex items-center justify-between">
                <span>Status</span>
                <strong className="text-meow-charcoal">{order.status}</strong>
              </div>
              {order.payments?.length ? (
                <div className="flex items-center justify-between">
                  <span>Pagamento</span>
                  <Badge variant="info">{order.payments[0]?.status ?? 'PENDENTE'}</Badge>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <span>Pagamento</span>
                  <Badge variant="neutral">Sem cobranca</Badge>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span>Total</span>
                <strong className="text-meow-charcoal">
                  {new Intl.NumberFormat('pt-BR', {
                    style: 'currency',
                    currency: order.currency,
                  }).format(order.totalAmountCents / 100)}
                </strong>
              </div>
              <div className="flex items-center justify-between">
                <span>Buyer</span>
                <strong className="text-meow-charcoal">{order.buyer?.email ?? order.buyerId}</strong>
              </div>
              <div className="flex items-center justify-between">
                <span>Seller</span>
                <strong className="text-meow-charcoal">{order.seller?.email ?? order.sellerId ?? '-'}</strong>
              </div>
            </div>
          )}
        </div>
      </div>

      {order ? (
        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-card">
          <h2 className="text-base font-bold text-meow-charcoal">Logs do pedido</h2>
          <div className="mt-3 grid gap-2 text-xs text-meow-muted">
            {order.events?.map((event) => (
              <div key={event.id} className="rounded-xl border border-meow-red/10 bg-meow-50/60 px-3 py-2">
                <p className="font-semibold text-meow-charcoal">{event.type}</p>
                <span>{new Date(event.createdAt).toLocaleString('pt-BR')}</span>
                {event.metadata && typeof event.metadata === 'object' ? (
                  <p className="mt-1 text-[11px] text-meow-muted">
                    {event.metadata['from'] ? `De ${event.metadata['from']} ` : ''}
                    {event.metadata['to'] ? `para ${event.metadata['to']}` : ''}
                  </p>
                ) : null}
              </div>
            ))}
            {order.events?.length === 0 ? (
              <div className="rounded-xl border border-meow-red/20 bg-white px-3 py-2">
                Nenhum evento registrado.
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-card">
        <h2 className="text-base font-bold text-meow-charcoal">Acoes</h2>
        <p className="mt-1 text-xs text-meow-muted">
          Informe um motivo antes de liberar ou reembolsar.
        </p>
        <label className="mt-4 grid gap-1 text-xs font-semibold text-meow-muted">
          Motivo
          <textarea
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-meow-charcoal"
            rows={3}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Explique a decisão"
          />
        </label>
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            className="rounded-full bg-meow-300 px-4 py-2 text-xs font-bold text-white"
            type="button"
            onClick={handleRelease}
            disabled={!order || busyAction === 'release'}
          >
            {busyAction === 'release' ? 'Processando...' : 'Liberar pagamento'}
          </button>
          <button
            className="rounded-full border border-meow-200 px-4 py-2 text-xs font-bold text-meow-deep"
            type="button"
            onClick={handleRefund}
            disabled={!order || busyAction === 'refund'}
          >
            {busyAction === 'refund' ? 'Processando...' : 'Reembolsar buyer'}
          </button>
        </div>
      </div>
    </AdminShell>
  );
};
