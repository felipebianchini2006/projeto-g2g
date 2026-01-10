'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

import { ApiClientError } from '../../lib/api-client';
import { ordersApi, type Order } from '../../lib/orders-api';
import { useAuth } from '../auth/auth-provider';
import { AccountShell } from '../account/account-shell';
import { Badge } from '../ui/badge';
import { buttonVariants } from '../ui/button';
import { Card } from '../ui/card';

type OrdersListContentProps = {
  scope: 'buyer' | 'seller';
};

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

const statusVariant: Record<string, 'success' | 'info' | 'warning' | 'danger' | 'neutral'> = {
  DELIVERED: 'success',
  COMPLETED: 'success',
  PAID: 'info',
  IN_DELIVERY: 'info',
  AWAITING_PAYMENT: 'warning',
  CREATED: 'neutral',
  CANCELLED: 'danger',
  DISPUTED: 'danger',
  REFUNDED: 'danger',
};

const formatCurrency = (value: number, currency = 'BRL') =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(value / 100);

export const OrdersListContent = ({ scope }: OrdersListContentProps) => {
  const { user, accessToken, loading } = useAuth();
  const [state, setState] = useState<OrdersState>({
    status: 'loading',
    orders: [],
  });

  const canAccessSeller = scope === 'seller';
  const accessAllowed = !canAccessSeller || user?.role === 'SELLER' || user?.role === 'ADMIN';

  const headline = scope === 'seller' ? 'Minhas vendas' : 'Minhas compras';
  const detailPrefix = scope === 'seller' ? '/conta/vendas' : '/conta/pedidos';

  const summaryText = useMemo(() => {
    if (state.status === 'loading') {
      return 'Carregando pedidos...';
    }
    if (state.orders.length === 0) {
      return 'Nenhum pedido encontrado.';
    }
    return `${state.orders.length} pedidos encontrados.`;
  }, [state]);

  useEffect(() => {
    if (!accessToken || !accessAllowed) {
      return;
    }
    let active = true;
    const loadOrders = async () => {
      try {
        const orders = await ordersApi.listOrders(accessToken, scope);
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
            : error instanceof Error
              ? error.message
              : 'Nao foi possivel carregar pedidos.';
        setState({ status: 'ready', orders: [], error: message });
      }
    };
    loadOrders();
    return () => {
      active = false;
    };
  }, [accessToken, accessAllowed, scope]);

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
          <p className="text-sm text-meow-muted">Entre para acessar seus pedidos.</p>
          <Link className={buttonVariants({ variant: 'primary' })} href="/login">
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
          <p className="text-sm text-meow-muted">Acesso restrito ao seller.</p>
          <Link className={buttonVariants({ variant: 'secondary' })} href="/conta">
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
        { label: headline },
      ]}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-meow-charcoal">{headline}</h1>
          <p className="text-sm text-meow-muted">{summaryText}</p>
        </div>
        <Link className={buttonVariants({ variant: 'secondary', size: 'sm' })} href="/conta">
          Voltar para conta
        </Link>
      </div>

      {state.error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {state.error}
        </div>
      ) : null}

      {state.status === 'loading' ? (
        <div className="rounded-2xl border border-meow-red/20 bg-white px-4 py-3 text-sm text-meow-muted">
          Carregando pedidos...
        </div>
      ) : null}

      {state.status === 'ready' && state.orders.length === 0 ? (
        <div className="rounded-2xl border border-meow-red/20 bg-white px-4 py-3 text-sm text-meow-muted">
          Nenhum pedido encontrado.
        </div>
      ) : null}

      {state.orders.length ? (
        <Card className="rounded-[28px] border border-slate-100 p-6 shadow-card">
          <div className="grid gap-3">
            {state.orders.map((order) => (
              <div
                key={order.id}
                className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-100 bg-meow-50/60 px-4 py-3"
              >
                <div>
                  <p className="text-sm font-semibold text-meow-charcoal">
                    Pedido #{order.id.slice(0, 8).toUpperCase()}
                  </p>
                  <p className="text-xs text-meow-muted">
                    {new Date(order.createdAt).toLocaleString('pt-BR')}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-sm text-meow-charcoal">
                  <Badge variant={statusVariant[order.status] ?? 'neutral'}>
                    {statusLabel[order.status] ?? order.status}
                  </Badge>
                  <span className="font-bold">
                    {formatCurrency(order.totalAmountCents, order.currency)}
                  </span>
                  <Link
                    className={buttonVariants({ variant: 'secondary', size: 'sm' })}
                    href={`${detailPrefix}/${order.id}`}
                  >
                    Ver detalhes
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </Card>
      ) : null}
    </AccountShell>
  );
};
