'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

import { ApiClientError } from '../../lib/api-client';
import { ordersApi, type Order, type PaymentStatus } from '../../lib/orders-api';
import { useAuth } from '../auth/auth-provider';
import { AccountShell } from '../account/account-shell';
import { Select } from '../ui/select';

type OrdersState = {
  status: 'loading' | 'ready';
  orders: Order[];
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

const paymentLabel: Record<PaymentStatus, string> = {
  PENDING: 'Pagamento pendente',
  CONFIRMED: 'Pagamento aprovado',
  EXPIRED: 'Pagamento expirado',
  REFUNDED: 'Pagamento reembolsado',
  FAILED: 'Falha no pagamento',
};

const paymentTone: Record<PaymentStatus, string> = {
  PENDING: 'bg-amber-50 text-amber-700',
  CONFIRMED: 'bg-emerald-50 text-emerald-700',
  EXPIRED: 'bg-red-50 text-red-700',
  REFUNDED: 'bg-indigo-50 text-indigo-700',
  FAILED: 'bg-red-50 text-red-700',
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
  const [statusFilter, setStatusFilter] = useState<'all' | keyof typeof statusLabel>('all');

  const ordersSorted = useMemo(() => {
    return [...state.orders].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }, [state.orders]);

  const filteredOrders = useMemo(() => {
    if (statusFilter === 'all') {
      return ordersSorted;
    }
    return ordersSorted.filter((order) => order.status === statusFilter);
  }, [ordersSorted, statusFilter]);

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
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-black text-meow-charcoal">Minhas compras</h1>
          <p className="text-sm text-meow-muted">Acompanhe seus pedidos e entregas.</p>
        </div>

        <div className="max-w-xs">
          <Select
            className="rounded-xl border-meow-red/20 bg-white text-sm font-semibold text-meow-charcoal"
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(event.target.value as 'all' | keyof typeof statusLabel)
            }
          >
            <option value="all">Todos os status</option>
            {Object.entries(statusLabel).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </div>

        {state.error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {state.error}
          </div>
        ) : null}

        {state.status === 'loading' ? (
          <div className="rounded-2xl border border-slate-100 bg-meow-50 px-4 py-3 text-sm text-meow-muted">
            Carregando pedidos...
          </div>
        ) : null}

        {state.status === 'ready' && filteredOrders.length === 0 ? (
          <div className="rounded-2xl border border-slate-100 bg-meow-50 px-4 py-3 text-sm text-meow-muted">
            Nenhuma compra encontrada.
          </div>
        ) : null}

        <div className="rounded-[28px] border border-slate-100 bg-white p-6 shadow-card">
          {filteredOrders.map((order) => {
            const firstItem = order.items[0];
            const payment = order.payments?.[0];
            const deliveryLabel =
              order.status === 'DELIVERED' || order.status === 'COMPLETED'
                ? 'Entregue'
                : 'Entrega pendente';
            const deliveryTone =
              order.status === 'DELIVERED' || order.status === 'COMPLETED'
                ? 'text-emerald-600'
                : 'text-meow-muted';
            const orderCode = order.id.slice(0, 7).toUpperCase();

            return (
              <div
                key={order.id}
                className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-100 bg-meow-50/70 px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-xl bg-white text-xs font-black text-meow-charcoal">
                    #{orderCode.slice(0, 4)}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-meow-charcoal">
                      {firstItem?.title ?? 'Compra'}
                    </p>
                    <p className="text-xs text-meow-muted">
                      {new Date(order.createdAt).toLocaleDateString('pt-BR')} - {deliveryLabel}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-sm font-semibold text-meow-charcoal">
                  {formatCurrency(order.totalAmountCents, order.currency)}
                  <span className={deliveryTone}>{statusLabel[order.status] ?? order.status}</span>
                  {payment ? (
                    <span
                      className={`rounded-full px-3 py-1 text-[11px] font-semibold ${paymentTone[payment.status]}`}
                    >
                      {paymentLabel[payment.status]}
                    </span>
                  ) : null}
                  <Link
                    href={`/conta/pedidos/${order.id}`}
                    className="rounded-full border border-slate-200 px-3 py-2 text-xs font-bold text-meow-charcoal"
                  >
                    Detalhes
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
