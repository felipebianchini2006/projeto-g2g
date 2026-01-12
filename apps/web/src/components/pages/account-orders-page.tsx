'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

import { ApiClientError } from '../../lib/api-client';
import { ordersApi, type Order, type PaymentStatus } from '../../lib/orders-api';
import { useAuth } from '../auth/auth-provider';
import { AccountShell } from '../account/account-shell';
import { Badge } from '../ui/badge';
import { Select } from '../ui/select';

type OrdersState = {
  status: 'loading' | 'ready';
  orders: Order[];
  error?: string;
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

const paymentLabel: Record<PaymentStatus, string> = {
  PENDING: 'Pendente',
  CONFIRMED: 'Confirmado',
  EXPIRED: 'Expirado',
  REFUNDED: 'Estornado',
  FAILED: 'Falhou',
};

const formatCurrency = (value: number, currency = 'BRL') =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(value / 100);

export const AccountOrdersContent = () => {
  const { user, accessToken, loading } = useAuth();
  const [state, setState] = useState<OrdersState>({
    status: 'loading',
    orders: [],
  });
  const [statusFilter, setStatusFilter] = useState<'all' | keyof typeof statusLabel>(
    'all',
  );
  const [paymentFilter, setPaymentFilter] = useState<'all' | PaymentStatus>('all');

  const ordersSorted = useMemo(() => {
    return [...state.orders].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }, [state.orders]);

  const filteredOrders = useMemo(() => {
    return ordersSorted.filter((order) => {
      if (statusFilter !== 'all' && order.status !== statusFilter) {
        return false;
      }
      if (paymentFilter !== 'all') {
        const paymentStatus = order.payments?.[0]?.status;
        return paymentStatus === paymentFilter;
      }
      return true;
    });
  }, [ordersSorted, statusFilter, paymentFilter]);

  const resolveInitials = (value?: string | null) => {
    if (!value) {
      return 'MC';
    }
    const parts = value.trim().split(' ').filter(Boolean);
    if (parts.length === 1) {
      return parts[0].slice(0, 2).toUpperCase();
    }
    return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase();
  };

  const resolveAvatarTone = (value: string) => {
    const tones = ['bg-sky-100 text-sky-600', 'bg-emerald-100 text-emerald-600', 'bg-violet-100 text-violet-600'];
    let hash = 0;
    for (let index = 0; index < value.length; index += 1) {
      hash = (hash * 31 + value.charCodeAt(index)) % tones.length;
    }
    return tones[hash];
  };

  const resolveStatusBadge = (order: Order) => {
    const paymentStatus = order.payments?.[0]?.status;
    if (paymentStatus === 'REFUNDED') {
      return { label: 'PAGAMENTO ESTORNADO', variant: 'danger' as const };
    }
    if (order.status === 'IN_DELIVERY') {
      return { label: 'ENTREGA PENDENTE', variant: 'warning' as const };
    }
    if (order.status === 'DELIVERED' || order.status === 'COMPLETED') {
      return { label: 'ENTREGA CONCLUIDA', variant: 'success' as const };
    }
    if (order.status === 'AWAITING_PAYMENT') {
      return { label: 'AGUARDANDO PAGAMENTO', variant: 'warning' as const };
    }
    if (order.status === 'CANCELLED') {
      return { label: 'CANCELADO', variant: 'danger' as const };
    }
    if (order.status === 'DISPUTED') {
      return { label: 'EM DISPUTA', variant: 'warning' as const };
    }
    if (order.status === 'REFUNDED') {
      return { label: 'REEMBOLSADO', variant: 'danger' as const };
    }
    if (order.status === 'PAID') {
      return { label: 'PAGAMENTO CONFIRMADO', variant: 'success' as const };
    }
    return { label: statusLabel[order.status] ?? order.status, variant: 'neutral' as const };
  };

  useEffect(() => {
    if (!accessToken) {
      return;
    }
    let active = true;
    const loadOrders = async () => {
      try {
        const orders = await ordersApi.listOrders(accessToken, 'buyer');
        if (!active) {
          return;
        }
        setState({ status: 'ready', orders });
      } catch (error) {
        if (!active) {
          return;
        }
        const message =
          error instanceof ApiClientError
            ? error.message
            : 'Nao foi possivel carregar os pedidos.';
        setState({ status: 'ready', orders: [], error: message });
      }
    };
    loadOrders();
    return () => {
      active = false;
    };
  }, [accessToken]);

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
          <p className="text-sm text-meow-muted">Entre para acessar suas compras.</p>
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
    <AccountShell
      breadcrumbs={[
        { label: 'Inicio', href: '/' },
        { label: 'Conta', href: '/conta' },
        { label: 'Minhas compras' },
      ]}
    >
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-meow-charcoal">Minhas compras</h1>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Select
              className="min-w-[180px] rounded-xl border-meow-red/20 bg-white text-sm font-semibold text-meow-charcoal"
              value={paymentFilter}
              onChange={(event) =>
                setPaymentFilter(event.target.value as 'all' | PaymentStatus)
              }
            >
              <option value="all">Pagamento: Todos</option>
              {Object.entries(paymentLabel).map(([value, label]) => (
                <option key={value} value={value}>
                  Pagamento: {label}
                </option>
              ))}
            </Select>
            <Select
              className="min-w-[200px] rounded-xl border-meow-red/20 bg-white text-sm font-semibold text-meow-charcoal"
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value as 'all' | keyof typeof statusLabel)
              }
            >
              <option value="all">Pedido: Todos</option>
              {Object.entries(statusLabel).map(([value, label]) => (
                <option key={value} value={value}>
                  Pedido: {label}
                </option>
              ))}
            </Select>
          </div>
        </div>

        {state.error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {state.error}
          </div>
        ) : null}

        {state.status === 'loading' ? (
          <div className="grid gap-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div
                key={`loading-${index}`}
                className="h-20 rounded-2xl border border-slate-100 bg-meow-50/70"
              />
            ))}
          </div>
        ) : null}

        {state.status === 'ready' && filteredOrders.length === 0 ? (
          <div className="rounded-2xl border border-slate-100 bg-meow-50 px-4 py-3 text-sm text-meow-muted">
            Voce ainda nao tem compras.
          </div>
        ) : null}

        <div className="space-y-3">
          {filteredOrders.map((order) => {
            const firstItem = order.items[0];
            const orderCode = order.id.slice(0, 7).toUpperCase();
            const initials = resolveInitials(firstItem?.title);
            const avatarTone = resolveAvatarTone(order.id);
            const quantity = order.items.reduce((acc, item) => acc + item.quantity, 0);
            const badge = resolveStatusBadge(order);

            return (
              <div
                key={order.id}
                className="flex flex-wrap items-center justify-between gap-4 rounded-[26px] border border-slate-100 bg-white px-5 py-4 shadow-[0_10px_22px_rgba(15,23,42,0.04)]"
              >
                <div className="flex flex-1 items-center gap-4">
                  <div
                    className={`grid h-14 w-14 place-items-center rounded-2xl text-sm font-black ${avatarTone}`}
                  >
                    {initials}
                  </div>
                  <div className="space-y-1">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.4px] text-slate-400">
                      COMPRA #{orderCode}
                    </p>
                    <p className="text-base font-bold text-meow-charcoal">
                      {firstItem?.title ?? 'Compra'}
                    </p>
                    <p className="text-xs text-meow-muted">
                      {quantity} unidade{quantity === 1 ? '' : 's'} • Subtotal:{' '}
                      {formatCurrency(order.totalAmountCents, order.currency)}
                    </p>
                  </div>
                </div>
                <div className="flex w-full flex-wrap items-center justify-between gap-3 sm:w-auto sm:justify-end">
                  <div className="text-right text-xs text-slate-400">
                    {new Date(order.createdAt).toLocaleString('pt-BR')}
                  </div>
                  <Badge variant={badge.variant}>{badge.label}</Badge>
                  <Link
                    href={`/conta/pedidos/${order.id}`}
                    className="rounded-full border border-meow-red/30 px-4 py-2 text-xs font-bold text-meow-deep"
                  >
                    Ver Detalhes
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </AccountShell>
  );
};
