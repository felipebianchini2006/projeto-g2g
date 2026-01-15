'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { ApiClientError } from '../../lib/api-client';
import { ordersApi, type Order } from '../../lib/orders-api';
import { walletApi, type WalletSummary } from '../../lib/wallet-api';
import { useAuth } from '../auth/auth-provider';
import { AccountShell } from '../account/account-shell';
import { Badge } from '../ui/badge';
import { buttonVariants } from '../ui/button';
import { Card } from '../ui/card';
import {
  ArrowUpRight,
  Bot,
  Calendar,
  Hash,
  LifeBuoy,
  ShoppingCart,
  Wallet,
} from 'lucide-react';

type SummaryState = {
  status: 'loading' | 'ready';
  summary: WalletSummary | null;
  error?: string;
};

type RecentOrdersState = {
  status: 'loading' | 'ready';
  orders: Order[];
  error?: string;
};

const formatCurrency = (value: number, currency = 'BRL') =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(value / 100);

const resolveOrderStatus = (status: Order['status']) => {
  if (status === 'DELIVERED' || status === 'COMPLETED') {
    return { label: 'Entregue', tone: 'success' as const };
  }
  if (status === 'CREATED' || status === 'DISPUTED') {
    return { label: 'Pedido aberto', tone: 'warning' as const };
  }
  if (status === 'CANCELLED' || status === 'REFUNDED') {
    return { label: 'Cancelado', tone: 'danger' as const };
  }
  return { label: 'Processando', tone: 'info' as const };
};

export const AccountOverviewContent = () => {
  const { user, accessToken, loading } = useAuth();
  const [summaryState, setSummaryState] = useState<SummaryState>({
    status: 'loading',
    summary: null,
  });
  const [ordersState, setOrdersState] = useState<RecentOrdersState>({
    status: 'loading',
    orders: [],
  });

  useEffect(() => {
    if (!accessToken) {
      return;
    }
    let active = true;
    const loadSummary = async () => {
      try {
        const summary = await walletApi.getSummary(accessToken);
        if (!active) {
          return;
        }
        setSummaryState({ status: 'ready', summary });
      } catch (error) {
        if (!active) {
          return;
        }
        const message =
          error instanceof ApiClientError
            ? error.message
            : 'Não foi possível carregar sua carteira.';
        setSummaryState({ status: 'ready', summary: null, error: message });
      }
    };
    loadSummary();
    return () => {
      active = false;
    };
  }, [accessToken]);

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
        setOrdersState({
          status: 'ready',
          orders,
        });
      } catch (error) {
        if (!active) {
          return;
        }
        const message =
          error instanceof ApiClientError
            ? error.message
            : 'Não foi possível carregar pedidos recentes.';
        setOrdersState({ status: 'ready', orders: [], error: message });
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
          Carregando sessão...
        </div>
      </section>
    );
  }

  if (!user) {
    return (
      <section className="bg-white px-6 py-12">
        <div className="mx-auto w-full max-w-[1200px] rounded-2xl border border-meow-red/20 bg-white px-6 py-6 text-center">
          <p className="text-sm text-meow-muted">Entre para acessar sua conta.</p>
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

  const totalBought = ordersState.orders
    .filter((order) => ['PAID', 'DELIVERED', 'COMPLETED'].includes(order.status))
    .reduce((acc, order) => acc + order.totalAmountCents, 0);
  const openOrder = ordersState.orders.find((order) =>
    ['CREATED', 'DISPUTED'].includes(order.status),
  );
  const recentOrders = openOrder
    ? [
      openOrder,
      ...ordersState.orders
        .filter((order) => order.id !== openOrder.id)
        .slice(0, 2),
    ]
    : ordersState.orders.slice(0, 3);

  return (
    <AccountShell
      breadcrumbs={[
        { label: 'Início', href: '/' },
        { label: 'Conta' },
      ]}
    >
      <div className="rounded-2xl border border-pink-100 bg-gradient-to-r from-[#f2a4c3] via-[#f7b8d1] to-[#f2a4c3] p-6 text-white shadow-[0_18px_40px_rgba(255,107,154,0.25)]">
        <div className="flex flex-wrap items-center gap-4">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-white/20 text-xl">
            👋
          </div>
          <div>
            <h1 className="text-2xl font-black">Olá, {user.email}!</h1>
            <p className="mt-1 text-sm text-white/80">
              Aqui está o resumo da sua conta hoje.
            </p>
            <Link
              href={`/perfil/${user.id}`}
              className="mt-3 inline-flex items-center gap-2 rounded-full border border-white/50 px-4 py-1 text-xs font-semibold text-white transition hover:border-white hover:bg-white/10"
            >
              Ver perfil público
            </Link>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="rounded-[26px] border border-slate-100 bg-white p-5 shadow-card">
          <div className="flex items-start justify-between gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-rose-50 text-meow-deep">
              <ShoppingCart size={18} aria-hidden />
            </div>
            <Badge variant="neutral" className="rounded-full px-3 py-1 text-[10px] font-bold">
              VITALÍCIO
            </Badge>
          </div>
          <p className="mt-4 text-xs font-semibold uppercase text-meow-muted">
            Total comprado
          </p>
          <p className="mt-2 text-2xl font-black text-meow-charcoal">
            {formatCurrency(totalBought)}
          </p>
          <div className="mt-2 flex items-center gap-2 text-xs font-semibold text-emerald-600">
            <ArrowUpRight size={14} aria-hidden />
            + R$ 450,00 esta semana
          </div>
        </Card>

        <Card className="rounded-[26px] border border-slate-100 bg-white p-5 shadow-card">
          <div className="flex items-start justify-between gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-emerald-50 text-emerald-600">
              <Wallet size={18} aria-hidden />
            </div>
            <Link href="/conta/carteira" className="text-xs font-semibold text-rose-500">
              + Adicionar
            </Link>
          </div>
          <p className="mt-4 text-xs font-semibold uppercase text-meow-muted">
            Saldo disponível
          </p>
          <p className="mt-2 text-2xl font-black text-meow-charcoal">
            {formatCurrency(summaryState.summary?.availableCents ?? 0)}
          </p>
          <p className="mt-2 text-xs text-meow-muted">Pronto para uso imediato</p>
        </Card>
      </div>

      {summaryState.error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {summaryState.error}
        </div>
      ) : null}

      <Card className="rounded-2xl border border-slate-100 p-6 shadow-card">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-black text-meow-charcoal">Pedidos recentes</h2>
          <Link href="/conta/pedidos" className="text-xs font-bold text-rose-500">
            Ver todos os pedidos
          </Link>
        </div>

        {ordersState.error ? (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {ordersState.error}
          </div>
        ) : null}

        {ordersState.status === 'loading' ? (
          <div className="mt-4 rounded-xl border border-slate-100 bg-meow-50 px-4 py-3 text-sm text-meow-muted">
            Carregando pedidos...
          </div>
        ) : null}

        {ordersState.status === 'ready' && ordersState.orders.length === 0 ? (
          <div className="mt-4 rounded-xl border border-slate-100 bg-meow-50 px-4 py-3 text-sm text-meow-muted">
            Nenhum pedido recente encontrado.
          </div>
        ) : null}

        <div className="mt-4 grid gap-3">
          {recentOrders.map((order) => {
            const firstItem = order.items[0];
            const statusInfo = resolveOrderStatus(order.status);
            const isHighlighted = openOrder?.id === order.id;
            const highlight = isHighlighted
              ? 'border-pink-200 bg-pink-50/60'
              : 'border-slate-100';
            const iconTone = isHighlighted
              ? 'bg-purple-100 text-purple-600'
              : 'bg-slate-100 text-slate-500';

            return (
              <div
                key={order.id}
                className={`flex flex-wrap items-center justify-between gap-4 rounded-2xl border px-4 py-4 ${highlight}`}
              >
                <div className="flex items-center gap-3">
                  <div className={`grid h-12 w-12 place-items-center rounded-xl ${iconTone}`}>
                    <Bot size={18} aria-hidden />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-meow-charcoal">
                        {firstItem?.title ?? 'Pedido em processamento'}
                      </p>
                      <Badge variant={statusInfo.tone}>{statusInfo.label}</Badge>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-meow-muted">
                      <span className="inline-flex items-center gap-1">
                        <Hash size={12} aria-hidden />
                        {order.id.slice(0, 5).toUpperCase()}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Calendar size={12} aria-hidden />
                        {new Date(order.createdAt).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-sm font-semibold text-meow-charcoal">
                  {formatCurrency(order.totalAmountCents, order.currency)}
                  <Link
                    href={`/conta/pedidos/${order.id}`}
                    className="rounded-full border border-slate-200 px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-700"
                  >
                    Detalhes
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {openOrder ? (
        <Card className="rounded-[26px] border border-slate-100 p-6 shadow-card">
          <h3 className="text-base font-bold text-meow-charcoal">Precisa de ajuda?</h3>
          <p className="mt-2 text-sm text-meow-muted">
            Vimos que você tem um pedido em aberto (#{openOrder.id.slice(0, 5).toUpperCase()}). Está com dificuldades?
          </p>
          <Link
            href="/conta/tickets"
            className={buttonVariants({
              variant: 'secondary',
              className: 'mx-auto mt-4 w-full justify-center gap-2 rounded-2xl md:w-auto md:px-10',
            })}
          >
            <LifeBuoy size={16} aria-hidden />
            Abrir Chat de Suporte
          </Link>
        </Card>
      ) : null}
    </AccountShell>
  );
};
