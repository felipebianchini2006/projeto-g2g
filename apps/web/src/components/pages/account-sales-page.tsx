'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { BarChart3, Clock, Download, MoreHorizontal, Search, Wallet } from 'lucide-react';

import { ApiClientError } from '../../lib/api-client';
import { ordersApi, type Order } from '../../lib/orders-api';
import { useAuth } from '../auth/auth-provider';
import { AccountShell } from '../account/account-shell';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Input } from '../ui/input';
import { Select } from '../ui/select';
import { Tabs, TabsList, TabsTrigger } from '../ui/tabs';

type OrdersState = {
  status: 'loading' | 'ready';
  orders: Order[];
  error?: string;
};

type PeriodOption = 'month' | '30d' | '90d' | 'all';
type OrdersTab = 'recent' | 'history' | 'pending' | 'cancelled';

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

const statusTone: Record<
  string,
  'success' | 'warning' | 'info' | 'danger' | 'neutral'
> = {
  COMPLETED: 'success',
  PAID: 'warning',
  IN_DELIVERY: 'warning',
  DELIVERED: 'info',
  CANCELLED: 'danger',
  REFUNDED: 'danger',
  AWAITING_PAYMENT: 'neutral',
  CREATED: 'neutral',
  DISPUTED: 'warning',
};

const formatCurrency = (value: number, currency = 'BRL') =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(value / 100);

const formatDate = (value: string) =>
  new Date(value).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

const escapeCsv = (value: string) => {
  const escaped = value.replace(/"/g, '""');
  return `"${escaped}"`;
};

export const AccountSalesContent = () => {
  const { user, accessToken, loading } = useAuth();
  const [state, setState] = useState<OrdersState>({
    status: 'loading',
    orders: [],
  });
  const [period, setPeriod] = useState<PeriodOption>('month');
  const [tab, setTab] = useState<OrdersTab>('recent');
  const [searchTerm, setSearchTerm] = useState('');
  const [menuState, setMenuState] = useState<{
    id: string;
    top: number;
    left: number;
  } | null>(null);

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
  }, [accessAllowed, accessToken]);

  const ordersSorted = useMemo(() => {
    return [...state.orders].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }, [state.orders]);

  const ordersByPeriod = useMemo(() => {
    if (period === 'all') {
      return ordersSorted;
    }
    const now = new Date();
    const threshold = new Date(now);
    if (period === 'month') {
      threshold.setDate(1);
      threshold.setHours(0, 0, 0, 0);
    } else if (period === '30d') {
      threshold.setDate(threshold.getDate() - 30);
    } else {
      threshold.setDate(threshold.getDate() - 90);
    }
    return ordersSorted.filter((order) => new Date(order.createdAt) >= threshold);
  }, [ordersSorted, period]);

  const filteredByTab = useMemo(() => {
    if (tab === 'history') {
      return ordersByPeriod;
    }
    if (tab === 'pending') {
      return ordersByPeriod.filter((order) =>
        ['PAID', 'IN_DELIVERY', 'DELIVERED'].includes(order.status),
      );
    }
    if (tab === 'cancelled') {
      return ordersByPeriod.filter((order) =>
        ['CANCELLED', 'REFUNDED'].includes(order.status),
      );
    }
    return ordersByPeriod.slice(0, 8);
  }, [ordersByPeriod, tab]);

  const filteredOrders = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();
    if (!search) {
      return filteredByTab;
    }
    return filteredByTab.filter((order) => {
      const buyer = order.buyer?.fullName ?? order.buyer?.email ?? order.buyerId ?? '';
      const product = order.items[0]?.title ?? '';
      return (
        order.id.toLowerCase().includes(search) ||
        buyer.toLowerCase().includes(search) ||
        product.toLowerCase().includes(search)
      );
    });
  }, [filteredByTab, searchTerm]);

  const totalRevenue = useMemo(
    () =>
      ordersByPeriod
        .filter((order) => order.status === 'COMPLETED')
        .reduce((acc, order) => acc + order.totalAmountCents, 0),
    [ordersByPeriod],
  );

  const pendingRelease = useMemo(
    () =>
      ordersByPeriod
        .filter((order) => ['PAID', 'IN_DELIVERY', 'DELIVERED'].includes(order.status))
        .reduce((acc, order) => acc + order.totalAmountCents, 0),
    [ordersByPeriod],
  );

  const averageTicket = useMemo(() => {
    if (ordersByPeriod.length === 0) {
      return 0;
    }
    const total = ordersByPeriod.reduce((acc, order) => acc + order.totalAmountCents, 0);
    return Math.round(total / ordersByPeriod.length);
  }, [ordersByPeriod]);
  const summaryCards = [
    {
      label: 'Faturamento total',
      value: formatCurrency(totalRevenue, 'BRL'),
      description: 'Pedidos concluidos.',
      icon: BarChart3,
      tone: 'from-emerald-500 via-emerald-500 to-emerald-600',
    },
    {
      label: 'Saldo a liberar',
      value: formatCurrency(pendingRelease, 'BRL'),
      description: 'Pagos e entregues.',
      icon: Clock,
      tone: 'from-blue-500 via-blue-500 to-indigo-500',
    },
    {
      label: 'Ticket medio',
      value: formatCurrency(averageTicket, 'BRL'),
      description: 'Media por pedido.',
      icon: Wallet,
      tone: 'from-pink-500 via-rose-500 to-fuchsia-500',
    },
  ];

  const handleExport = () => {
    const headers = ['Pedido', 'Produto', 'Comprador', 'Data', 'Valor', 'Status'];
    const rows = filteredOrders.map((order) => [
      order.id,
      order.items[0]?.title ?? 'Venda',
      order.buyer?.fullName ?? order.buyer?.email ?? order.buyerId ?? '',
      formatDate(order.createdAt),
      formatCurrency(order.totalAmountCents, order.currency),
      statusLabel[order.status] ?? order.status,
    ]);
    const csv =
      `${headers.map(escapeCsv).join(',')}\n` +
      rows.map((row) => row.map((value) => escapeCsv(value)).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `vendas-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
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
      <div className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-meow-charcoal">Minhas vendas</h1>
            <p className="text-sm text-meow-muted">
              Acompanhe faturamento, pedidos e status em tempo real.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Select
              className="min-w-[160px] rounded-full border-slate-200 bg-white text-xs font-semibold text-slate-500 shadow-card"
              value={period}
              onChange={(event) => setPeriod(event.target.value as PeriodOption)}
            >
              <option value="month">Este mês</option>
              <option value="30d">Ultimos 30 dias</option>
              <option value="90d">Ultimos 90 dias</option>
              <option value="all">Todo periodo</option>
            </Select>
            <Button variant="secondary" size="sm" onClick={handleExport}>
              <Download size={14} aria-hidden />
              Exportar
            </Button>
          </div>
        </div>

        {menuState ? (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setMenuState(null)}
            />
            <div
              className="fixed z-50 w-40 rounded-xl border border-slate-100 bg-white p-2 text-sm shadow-[0_10px_38px_-10px_rgba(22,23,24,0.35),0_10px_20px_-15px_rgba(22,23,24,0.2)]"
              style={{
                top: `${menuState.top}px`,
                left: `${menuState.left}px`,
              }}
            >
              <Link
                href={`/conta/vendas/${menuState.id}`}
                className="block rounded-lg px-3 py-2 text-sm font-semibold text-meow-charcoal hover:bg-meow-50"
                onClick={() => setMenuState(null)}
              >
                Ver detalhes
              </Link>
              <button
                type="button"
                className="w-full rounded-lg px-3 py-2 text-left text-sm font-semibold text-meow-charcoal hover:bg-meow-50"
                onClick={() => {
                  const orderId = menuState.id;
                  setMenuState(null);
                  if (navigator?.clipboard) {
                    navigator.clipboard.writeText(orderId).catch(() => { });
                  }
                }}
              >
                Copiar ID
              </button>
            </div>
          </>
        ) : null}

        <div className="grid gap-4 md:grid-cols-3">
          {summaryCards.map((card) => {
            const Icon = card.icon;
            return (
              <Card
                key={card.label}
                className={`relative overflow-hidden rounded-[26px] border-0 bg-gradient-to-br ${card.tone} p-5 text-white shadow-[0_18px_40px_rgba(15,23,42,0.18)]`}
              >
                <div className="absolute -right-6 -top-6 h-16 w-16 rounded-full bg-white/15" />
                <div className="absolute right-8 top-6 h-10 w-10 rounded-full bg-white/10" />
                <div className="relative z-10">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/20">
                    <Icon size={18} aria-hidden />
                  </div>
                  <p className="mt-4 text-xs font-semibold uppercase tracking-[0.3px] text-white/80">
                    {card.label}
                  </p>
                  <p className="mt-2 text-2xl font-black">{card.value}</p>
                  <p className="mt-1 text-xs text-white/80">{card.description}</p>
                </div>
              </Card>
            );
          })}
        </div>

        <Card className="rounded-[26px] border border-slate-100 p-6 shadow-card">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Tabs value={tab} onValueChange={(value) => setTab(value as OrdersTab)}>
              <TabsList className="flex flex-wrap gap-2">
                <TabsTrigger value="recent">Vendas recentes</TabsTrigger>
                <TabsTrigger value="history">Historico</TabsTrigger>
                <TabsTrigger value="pending">Pendentes</TabsTrigger>
                <TabsTrigger value="cancelled">Cancelados</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <div className="relative flex-1 min-w-[220px]">
              <Search
                size={16}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                aria-hidden
              />
              <Input
                className="pl-10"
                placeholder="Buscar pedido ou comprador..."
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />
            </div>
          </div>

          {state.error ? (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {state.error}
            </div>
          ) : null}

          {state.status === 'loading' ? (
            <div className="mt-4 rounded-xl border border-meow-red/20 bg-white px-4 py-3 text-sm text-meow-muted">
              Carregando vendas...
            </div>
          ) : null}

          {state.status === 'ready' && filteredOrders.length === 0 ? (
            <div className="mt-4 rounded-xl border border-slate-100 bg-meow-50 px-4 py-3 text-sm text-meow-muted">
              Nenhuma venda encontrada.
            </div>
          ) : null}

          <div className="mt-6 grid gap-4 md:hidden">
            {filteredOrders.map((order) => {
              const buyer =
                order.buyer?.fullName ?? order.buyer?.email ?? 'Comprador';
              const product = order.items[0]?.title ?? 'Venda';
              const tone = statusTone[order.status] ?? 'neutral';

              return (
                <div
                  key={order.id}
                  className="rounded-[22px] border border-slate-100 bg-white p-5 shadow-card"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className="text-[10px] font-bold uppercase text-slate-400">
                        #{order.id.slice(0, 8).toUpperCase()}
                      </span>
                      <h3 className="mt-1 text-sm font-bold text-meow-charcoal">
                        {product}
                      </h3>
                    </div>
                    <Badge variant={tone} className="shrink-0">
                      {statusLabel[order.status] ?? order.status}
                    </Badge>
                  </div>

                  <div className="mt-4 grid gap-3 border-t border-slate-50 pt-4 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-400">Comprador</span>
                      <span className="font-medium text-slate-700">{buyer}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-400">Data</span>
                      <span className="font-medium text-slate-700">
                        {formatDate(order.createdAt)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-400">Valor</span>
                      <span className="font-bold text-meow-deep">
                        {formatCurrency(order.totalAmountCents, order.currency)}
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-end gap-2 border-t border-slate-50 pt-3">
                    <Link
                      href={`/conta/vendas/${order.id}`}
                      className="inline-flex h-9 items-center justify-center rounded-full bg-slate-100 px-4 text-xs font-bold text-slate-600 transition hover:bg-slate-200"
                    >
                      Detalhes
                    </Link>
                    <button
                      type="button"
                      className="grid h-9 w-9 place-items-center rounded-full border border-slate-200 bg-white text-slate-400 transition hover:border-meow-200 hover:text-meow-deep"
                      onClick={(e) => {
                        e.stopPropagation();
                        const rect = e.currentTarget.getBoundingClientRect();
                        setMenuState({
                          id: order.id,
                          top: rect.bottom + 5,
                          left: Math.max(10, rect.right - 160),
                        });
                      }}
                      aria-label="Acoes"
                    >
                      <MoreHorizontal size={16} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-6 hidden overflow-x-auto md:block">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-xs uppercase text-slate-400">
                  <th className="px-3 py-2">Pedido/Produto</th>
                  <th className="px-3 py-2">Comprador</th>
                  <th className="px-3 py-2">Data</th>
                  <th className="px-3 py-2">Valor</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2 text-right">Acoes</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((order) => {
                  const buyer = order.buyer?.fullName ?? order.buyer?.email ?? 'Comprador';
                  const product = order.items[0]?.title ?? 'Venda';
                  const tone = statusTone[order.status] ?? 'neutral';
                  return (
                    <tr key={order.id} className="border-b border-slate-100">
                      <td className="px-3 py-3">
                        <div className="text-xs font-semibold text-slate-400">
                          #{order.id.slice(0, 8).toUpperCase()}
                        </div>
                        <Link
                          href={`/conta/vendas/${order.id}`}
                          className="text-sm font-semibold text-meow-charcoal transition hover:text-meow-deep"
                        >
                          {product}
                        </Link>
                      </td>
                      <td className="px-3 py-3 text-sm text-slate-600">{buyer}</td>
                      <td className="px-3 py-3 text-sm text-slate-600">
                        {formatDate(order.createdAt)}
                      </td>
                      <td className="px-3 py-3 text-sm font-semibold text-meow-charcoal">
                        {formatCurrency(order.totalAmountCents, order.currency)}
                      </td>
                      <td className="px-3 py-3">
                        <Badge variant={tone}>
                          {statusLabel[order.status] ?? order.status}
                        </Badge>
                      </td>
                      <td className="px-3 py-3 text-right">
                        <div className="relative inline-flex">
                          <button
                            type="button"
                            className="grid h-8 w-8 place-items-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:border-meow-200 hover:text-meow-deep"
                            onClick={(e) => {
                              e.stopPropagation();
                              const rect = e.currentTarget.getBoundingClientRect();
                              setMenuState({
                                id: order.id,
                                top: rect.bottom + 5,
                                left: Math.max(10, rect.right - 160),
                              });
                            }}
                            aria-label="Acoes"
                          >
                            <MoreHorizontal size={16} aria-hidden />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </AccountShell>
  );
};
