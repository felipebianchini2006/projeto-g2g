'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Activity, ChevronLeft, Search } from 'lucide-react';

import { ApiClientError } from '../../lib/api-client';
import { adminOrdersApi } from '../../lib/admin-orders-api';
import { ordersApi, type Order } from '../../lib/orders-api';
import { hasAdminPermission } from '../../lib/admin-permissions';
import { useAuth } from '../auth/auth-provider';
import { AdminShell } from '../admin/admin-shell';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';

export const AdminOrdersContent = () => {
  const { user, accessToken, loading } = useAuth();
  const [orderId, setOrderId] = useState('');
  const [order, setOrder] = useState<Order | null>(null);
  const [reason, setReason] = useState('');
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const orderStatusVariant = (status?: string) => {
    switch (status) {
      case 'PAID':
      case 'DELIVERED':
      case 'COMPLETED':
        return 'success';
      case 'AWAITING_PAYMENT':
      case 'IN_DELIVERY':
      case 'DISPUTED':
        return 'warning';
      case 'CANCELLED':
      case 'REFUNDED':
        return 'danger';
      default:
        return 'neutral';
    }
  };

  const paymentStatusVariant = (status?: string) => {
    switch (status) {
      case 'CONFIRMED':
        return 'success';
      case 'PENDING':
        return 'warning';
      case 'REFUNDED':
      case 'FAILED':
        return 'danger';
      default:
        return 'neutral';
    }
  };

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
          : 'Nao foi possivel carregar o pedido.';
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
          : 'Nao foi possivel liberar o pedido.';
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
          : 'Nao foi possivel reembolsar o pedido.';
      setError(message);
    } finally {
      setBusyAction(null);
    }
  };

  if (loading) {
    return (
      <section className="bg-white px-6 py-12">
        <div className="mx-auto w-full max-w-[1200px] rounded-2xl border border-meow-red/20 bg-white px-6 py-4 text-sm text-meow-muted">
          Carregando sessao...
        </div>
      </section>
    );
  }

  if (!user || !hasAdminPermission(user, 'admin.orders')) {
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
      <Card className="rounded-2xl border border-meow-red/20 p-5 shadow-[0_10px_24px_rgba(216,107,149,0.12)]">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-black text-meow-charcoal">Pedidos (admin)</h1>
            <p className="mt-2 text-sm text-meow-muted">
              Libere ou reembolse pedidos com base no ID.
            </p>
          </div>
          <Link
            href="/conta"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-slate-400 shadow-[0_4px_12px_rgba(0,0,0,0.05)] transition hover:text-meow-deep hover:shadow-md"
          >
            <ChevronLeft size={20} />
          </Link>
        </div>
      </Card>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 animate-in fade-in slide-in-from-top-2">
          {error}
        </div>
      ) : null}
      {notice ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 animate-in fade-in slide-in-from-top-2">
          {notice}
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-6">
          <Card className="overflow-hidden rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-3 border-b border-slate-100 bg-slate-50 px-5 py-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-meow-red/10 text-meow-deep">
                <Search size={18} />
              </div>
              <div>
                <h2 className="text-sm font-bold text-meow-charcoal">Buscar pedido</h2>
                <p className="text-xs text-meow-muted">Informe o ID para carregar os dados.</p>
              </div>
            </div>
            <div className="p-5 space-y-4">
              <label className="grid gap-1.5 text-xs font-semibold text-slate-600">
                ID do pedido
                <Input
                  value={orderId}
                  onChange={(event) => setOrderId(event.target.value)}
                  placeholder="order-uuid"
                  className="font-mono"
                />
              </label>
              <Button className="w-full" onClick={handleFetchOrder} disabled={busyAction === 'load'}>
                {busyAction === 'load' ? 'Carregando...' : 'Carregar pedido'}
              </Button>
            </div>
          </Card>

          {order ? (
            <Card className="overflow-hidden rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center gap-3 border-b border-slate-100 bg-slate-50 px-5 py-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-meow-red/10 text-meow-deep">
                  <Activity size={18} />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-meow-charcoal">Logs do pedido</h2>
                  <p className="text-xs text-meow-muted">Historico de eventos do pedido.</p>
                </div>
              </div>
              <div className="p-5">
                <div className="grid gap-3 text-xs text-slate-600">
                  {order.events?.map((event) => (
                    <div
                      key={event.id}
                      className="rounded-xl border border-slate-100 bg-slate-50/60 px-4 py-3"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <Badge variant="neutral" size="sm">
                          {event.type}
                        </Badge>
                        <span className="text-[11px] text-slate-400">
                          {new Date(event.createdAt).toLocaleString('pt-BR')}
                        </span>
                      </div>
                      {event.metadata && typeof event.metadata === 'object' ? (
                        <p className="mt-2 text-[11px] text-slate-500">
                          {event.metadata['from'] ? `De ${event.metadata['from']} ` : ''}
                          {event.metadata['to'] ? `para ${event.metadata['to']}` : ''}
                        </p>
                      ) : null}
                    </div>
                  ))}
                  {order.events?.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
                      Nenhum evento registrado.
                    </div>
                  ) : null}
                </div>
              </div>
            </Card>
          ) : null}
        </div>

        <div className="space-y-6">
          <Card className="overflow-hidden rounded-2xl border border-slate-200 shadow-sm">
            <div className="border-b border-slate-100 bg-slate-50 px-5 py-4">
              <h2 className="text-sm font-bold text-meow-charcoal">Resumo</h2>
              <p className="text-xs text-meow-muted">Detalhes do pedido carregado.</p>
            </div>
            <div className="p-5">
              {!order ? (
                <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
                  Nenhum pedido carregado.
                </div>
              ) : (
                <div className="grid gap-3 text-sm text-slate-600">
                  <div className="flex items-center justify-between">
                    <span>Status</span>
                    <Badge variant={orderStatusVariant(order.status)} size="sm">
                      {order.status}
                    </Badge>
                  </div>
                  {order.payments?.length ? (
                    <div className="flex items-center justify-between">
                      <span>Pagamento</span>
                      <Badge
                        variant={paymentStatusVariant(order.payments[0]?.status)}
                        size="sm"
                      >
                        {order.payments[0]?.status ?? 'PENDENTE'}
                      </Badge>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <span>Pagamento</span>
                      <Badge variant="neutral" size="sm">
                        Sem cobranca
                      </Badge>
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
                    <span>Order ID</span>
                    <span className="font-mono text-xs text-slate-500">{order.id}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Buyer</span>
                    <strong className="text-meow-charcoal">
                      {order.buyer?.email ?? order.buyerId}
                    </strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Seller</span>
                    <strong className="text-meow-charcoal">
                      {order.seller?.email ?? order.sellerId ?? '-'}
                    </strong>
                  </div>
                </div>
              )}
            </div>
          </Card>

          <Card className="overflow-hidden rounded-2xl border border-slate-200 shadow-sm">
            <div className="border-b border-slate-100 bg-slate-50 px-5 py-4">
              <h2 className="text-sm font-bold text-meow-charcoal">Acoes</h2>
              <p className="text-xs text-meow-muted">
                Informe um motivo antes de liberar ou reembolsar.
              </p>
            </div>
            <div className="p-5 space-y-4">
              <label className="grid gap-1.5 text-xs font-semibold text-slate-600">
                Motivo
                <Textarea
                  rows={3}
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  placeholder="Explique a decisao"
                />
              </label>
              <div className="flex flex-wrap gap-3">
                <Button onClick={handleRelease} disabled={!order || busyAction === 'release'}>
                  {busyAction === 'release' ? 'Processando...' : 'Liberar pagamento'}
                </Button>
                <Button
                  variant="danger"
                  onClick={handleRefund}
                  disabled={!order || busyAction === 'refund'}
                >
                  {busyAction === 'refund' ? 'Processando...' : 'Reembolsar buyer'}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </AdminShell>
  );
};
