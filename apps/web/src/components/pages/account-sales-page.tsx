'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

import { ApiClientError } from '../../lib/api-client';
import { ordersApi, type Order, type PaymentStatus } from '../../lib/orders-api';
import { useAuth } from '../auth/auth-provider';
import { AccountShell } from '../account/account-shell';

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

export const AccountSalesContent = () => {
  const { user, accessToken, loading } = useAuth();
  const [state, setState] = useState<OrdersState>({
    status: 'loading',
    orders: [],
  });

  const accessAllowed = user?.role === 'SELLER' || user?.role === 'ADMIN';

  const ordersSorted = useMemo(() => {
    return [...state.orders].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }, [state.orders]);

  useEffect(() => {
    if (!accessToken || !accessAllowed) {
      return;
    }
    let active = true;
    const loadOrders = async () => {
      try {
        const orders = await ordersApi.listOrders(accessToken, 'seller');
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
            : 'Nao foi possivel carregar as vendas.';
        setState({ status: 'ready', orders: [], error: message });
      }
    };
    loadOrders();
    return () => {
      active = false;
    };
  }, [accessToken, accessAllowed]);

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
          <p className="text-sm text-meow-muted">Entre para acessar suas vendas.</p>
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

  if (!accessAllowed) {
    return (
      <section className="bg-white px-6 py-12">
        <div className="mx-auto w-full max-w-[1200px] rounded-2xl border border-meow-red/20 bg-white px-6 py-6 text-center">
          <p className="text-sm text-meow-muted">Seu perfil nao possui acesso as vendas.</p>
          <Link
            href="/conta"
            className="mt-4 inline-flex rounded-full border border-meow-red/30 px-6 py-2 text-sm font-bold text-meow-deep"
          >
            Voltar para conta
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
        { label: 'Minhas vendas' },
      ]}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-meow-charcoal">Vendas recentes</h1>
          <p className="text-sm text-meow-muted">
            Ultimas transacoes feitas na sua loja.
          </p>
        </div>
        <Link
          href="/conta/vendas"
          className="text-xs font-bold text-meow-deep"
        >
          Ver todas
        </Link>
      </div>

      {state.error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {state.error}
        </div>
      ) : null}

      {state.status === 'loading' ? (
        <div className="rounded-xl border border-meow-red/20 bg-white px-4 py-3 text-sm text-meow-muted">
          Carregando vendas...
        </div>
      ) : null}

      {state.status === 'ready' && ordersSorted.length === 0 ? (
        <div className="rounded-xl border border-meow-red/20 bg-white px-4 py-3 text-sm text-meow-muted">
          Nenhuma venda encontrada.
        </div>
      ) : null}

      <div className="mt-4 rounded-[28px] border border-slate-100 bg-white p-6 shadow-card">
        {ordersSorted.map((order) => {
          const firstItem = order.items[0];
          const payment = order.payments?.[0];
          const statusTag =
            order.status === 'PAID' || order.status === 'COMPLETED'
              ? { label: 'Aprovado', tone: 'bg-emerald-100 text-emerald-700' }
              : order.status === 'AWAITING_PAYMENT'
                ? { label: 'Em analise', tone: 'bg-amber-100 text-amber-700' }
                : { label: 'Entregue', tone: 'bg-blue-100 text-blue-700' };

          return (
            <div
              key={order.id}
              className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-100 bg-meow-50/70 px-4 py-3"
            >
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-white text-xs font-black text-meow-charcoal">
                  #{order.id.slice(0, 4)}
                </div>
                <div>
                  <p className="text-sm font-semibold text-meow-charcoal">
                    {firstItem?.title ?? 'Venda'}
                  </p>
                  <p className="text-xs text-meow-muted">
                    Comp: {order.buyer?.email ?? order.buyerId} -{' '}
                    {new Date(order.createdAt).toLocaleDateString('pt-BR')}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-sm font-black text-meow-charcoal">
                  {formatCurrency(order.totalAmountCents, order.currency)}
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-bold ${statusTag.tone}`}>
                  {statusTag.label}
                </span>
                {payment ? (
                  <span
                    className={`rounded-full px-3 py-1 text-[11px] font-semibold ${paymentTone[payment.status]}`}
                  >
                    {paymentLabel[payment.status]}
                  </span>
                ) : null}
                <Link
                  href={`/conta/vendas/${order.id}`}
                  className="rounded-full border border-slate-200 px-3 py-2 text-xs font-bold text-meow-charcoal"
                >
                  Detalhes
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </AccountShell>
  );
};
