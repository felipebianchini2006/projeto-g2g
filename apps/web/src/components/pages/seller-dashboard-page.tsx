'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

import { ApiClientError } from '../../lib/api-client';
import { ordersApi, type Order } from '../../lib/orders-api';
import { ticketsApi, type Ticket } from '../../lib/tickets-api';
import { walletApi, type WalletSummary } from '../../lib/wallet-api';
import { useAuth } from '../auth/auth-provider';
import { AccountShell } from '../account/account-shell';
import { Card } from '../ui/card';

type OrdersState = {
  status: 'loading' | 'ready';
  orders: Order[];
  error?: string;
};

type WalletState = {
  status: 'loading' | 'ready';
  summary: WalletSummary | null;
};

type TicketsState = {
  status: 'loading' | 'ready';
  items: Ticket[];
};

const formatCurrency = (value: number, currency = 'BRL') =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(value / 100);

const isSameDay = (value: string, target: Date) => {
  const date = new Date(value);
  return (
    date.getFullYear() === target.getFullYear() &&
    date.getMonth() === target.getMonth() &&
    date.getDate() === target.getDate()
  );
};

export const SellerDashboardContent = () => {
  const { user, accessToken, loading } = useAuth();
  const [ordersState, setOrdersState] = useState<OrdersState>({
    status: 'loading',
    orders: [],
  });
  const [walletState, setWalletState] = useState<WalletState>({
    status: 'loading',
    summary: null,
  });
  const [ticketsState, setTicketsState] = useState<TicketsState>({
    status: 'loading',
    items: [],
  });
  const accessAllowed = user?.role === 'SELLER' || user?.role === 'ADMIN';

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
        setOrdersState({ status: 'ready', orders });
      } catch (error) {
        if (!active) {
          return;
        }
        const message =
          error instanceof ApiClientError
            ? error.message
            : 'Não foi possível carregar vendas.';
        setOrdersState({ status: 'ready', orders: [], error: message });
      }
    };
    const loadWallet = async () => {
      try {
        const summary = await walletApi.getSummary(accessToken);
        if (!active) {
          return;
        }
        setWalletState({ status: 'ready', summary });
      } catch {
        if (!active) {
          return;
        }
        setWalletState({ status: 'ready', summary: null });
      }
    };
    const loadTickets = async () => {
      try {
        const tickets = await ticketsApi.listTickets(accessToken, 'OPEN');
        if (!active) {
          return;
        }
        setTicketsState({ status: 'ready', items: tickets });
      } catch {
        if (!active) {
          return;
        }
        setTicketsState({ status: 'ready', items: [] });
      }
    };
    loadOrders();
    loadWallet();
    loadTickets();
    return () => {
      active = false;
    };
  }, [accessToken, accessAllowed]);

  if (loading) {
    return (
      <section className="bg-white px-6 py-12">
        <div className="mx-auto w-full max-w-[1200px] rounded-2xl border border-meow-red/20 bg-white px-6 py-4 text-sm text-meow-muted">
          Carregando sessão...
        </div>
      </section>
    );
  }

  if (!user) {
    return (
      <section className="bg-white px-6 py-12">
        <div className="mx-auto w-full max-w-[1200px] rounded-2xl border border-meow-red/20 bg-white px-6 py-6 text-center">
          <p className="text-sm text-meow-muted">Entre para acessar o painel do vendedor.</p>
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
          <p className="text-sm text-meow-muted">Seu perfil não possui acesso ao painel.</p>
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

  const today = new Date();
  const salesToday = ordersState.orders
    .filter((order) => isSameDay(order.createdAt, today))
    .reduce((acc, order) => acc + order.totalAmountCents, 0);

  const walletTotal =
    (walletState.summary?.availableCents ?? 0) + (walletState.summary?.heldCents ?? 0);

  const openTicketsCount = ticketsState.items.filter((ticket) => ticket.status === 'OPEN')
    .length;

  const chartData = useMemo(() => {
    const days = Array.from({ length: 7 }).map((_, index) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - index));
      const total = ordersState.orders
        .filter((order) => isSameDay(order.createdAt, date))
        .reduce((acc, order) => acc + order.totalAmountCents, 0);
      const label = date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
      return { label, total };
    });
    const max = Math.max(...days.map((day) => day.total), 1);
    return { days, max };
  }, [ordersState.orders]);

  return (
    <AccountShell
      breadcrumbs={[
        { label: 'Inicio', href: '/' },
        { label: 'Conta', href: '/conta' },
        { label: 'Painel do vendedor' },
      ]}
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="rounded-2xl border border-meow-red/20 p-5 shadow-card">
          <p className="text-xs font-semibold uppercase tracking-[0.4px] text-meow-muted">
            Vendas hoje
          </p>
          <p className="mt-3 text-2xl font-black text-meow-charcoal">
            {formatCurrency(salesToday)}
          </p>
          <p className="mt-1 text-xs text-meow-muted">Pedidos do dia.</p>
        </Card>
        <Card className="rounded-2xl border border-meow-red/20 p-5 shadow-card">
          <p className="text-xs font-semibold uppercase tracking-[0.4px] text-meow-muted">
            Saldo total
          </p>
          <p className="mt-3 text-2xl font-black text-meow-charcoal">
            {formatCurrency(walletTotal)}
          </p>
          <p className="mt-1 text-xs text-meow-muted">Disponivel + a receber.</p>
        </Card>
        <Card className="rounded-2xl border border-meow-red/20 p-5 shadow-card">
          <p className="text-xs font-semibold uppercase tracking-[0.4px] text-meow-muted">
            Perguntas
          </p>
          <p className="mt-3 text-lg font-black text-meow-charcoal">Em breve</p>
          <p className="mt-1 text-xs text-meow-muted">
            Esta funcionalidade será adicionada.
          </p>
        </Card>
        <Card className="rounded-2xl border border-meow-red/20 p-5 shadow-card">
          <p className="text-xs font-semibold uppercase tracking-[0.4px] text-meow-muted">
            Ticket aberto
          </p>
          <p className="mt-3 text-2xl font-black text-meow-charcoal">
            {ticketsState.status === 'loading' ? '...' : openTicketsCount}
          </p>
          <p className="mt-1 text-xs text-meow-muted">Tickets em andamento.</p>
        </Card>
      </div>

      {ordersState.error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {ordersState.error}
        </div>
      ) : null}

      <Card className="rounded-[28px] border border-meow-red/20 p-6 shadow-card">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-black text-meow-charcoal">Desempenho de vendas</h2>
            <p className="text-sm text-meow-muted">Ultimos 7 dias.</p>
          </div>
          <span className="rounded-full bg-meow-100 px-3 py-1 text-xs font-bold text-meow-deep">
            Ultimos 7 dias
          </span>
        </div>
        <div className="mt-6 h-44 rounded-2xl border border-meow-red/10 bg-meow-50/60 p-4">
          <div className="flex h-full items-end justify-between gap-3">
            {chartData.days.map((day) => (
              <div key={day.label} className="flex h-full flex-1 flex-col items-center gap-2">
                <div className="flex h-full w-full items-end">
                  <div
                    className="w-full rounded-2xl bg-meow-300"
                    style={{ height: `${(day.total / chartData.max) * 100}%` }}
                  />
                </div>
                <span className="text-[10px] font-semibold text-meow-muted">{day.label}</span>
              </div>
            ))}
          </div>
        </div>
      </Card>
    </AccountShell>
  );
};
