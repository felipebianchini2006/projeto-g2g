'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

import { ApiClientError } from '../../lib/api-client';
import { ordersApi, type Order } from '../../lib/orders-api';
import { useAuth } from '../auth/auth-provider';

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

  const headline = scope === 'seller' ? 'Vendas' : 'Meus pedidos';
  const detailPrefix = scope === 'seller' ? '/dashboard/vendas' : '/dashboard/pedidos';

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
      <div className="orders-shell">
        <div className="state-card">Carregando sessao...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="orders-shell">
        <div className="state-card">Entre para acessar seus pedidos.</div>
        <Link className="primary-button" href="/login">
          Fazer login
        </Link>
      </div>
    );
  }

  if (!accessAllowed) {
    return (
      <div className="orders-shell">
        <div className="state-card">Acesso restrito ao seller.</div>
        <Link className="ghost-button" href="/dashboard">
          Voltar ao dashboard
        </Link>
      </div>
    );
  }

  return (
    <section className="orders-shell">
      <div className="orders-header">
        <div>
          <h1>{headline}</h1>
          <p className="auth-helper">{summaryText}</p>
        </div>
        <Link className="ghost-button" href="/dashboard">
          Voltar ao dashboard
        </Link>
      </div>

      {state.error ? <div className="state-card info">{state.error}</div> : null}

      <div className="orders-table">
        <div className="orders-row orders-row--head">
          <span>Pedido</span>
          <span>Status</span>
          <span>Valor</span>
          <span>Data</span>
          <span>Detalhes</span>
        </div>
        {state.orders.map((order) => (
          <div className="orders-row" key={order.id}>
            <span className="mono">#{order.id.slice(0, 8)}</span>
            <span className={`status-pill status-${order.status.toLowerCase()}`}>
              {statusLabel[order.status] ?? order.status}
            </span>
            <span>{formatCurrency(order.totalAmountCents, order.currency)}</span>
            <span>{new Date(order.createdAt).toLocaleString('pt-BR')}</span>
            <Link className="ghost-button" href={`${detailPrefix}/${order.id}`}>
              Ver
            </Link>
          </div>
        ))}
      </div>
    </section>
  );
};
