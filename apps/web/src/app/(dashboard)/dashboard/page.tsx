'use client';

import Link from 'next/link';
import {
  BadgeCheck,
  Boxes,
  Cat,
  Clock,
  CreditCard,
  LayoutDashboard,
  MessageCircle,
  Package,
  Send,
  Settings,
  ShieldCheck,
  ShoppingBag,
  Star,
  Store,
  TrendingUp,
  Users,
  Wallet,
  Zap,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import { useAuth } from '../../../components/auth/auth-provider';
import { Button } from '../../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../../components/ui/table';
import { ApiClientError } from '../../../lib/api-client';
import { chatApi, type ChatMessage } from '../../../lib/chat-api';
import { marketplaceApi, type Listing } from '../../../lib/marketplace-api';
import { ordersApi, type Order, type OrderStatus } from '../../../lib/orders-api';
import { walletApi, type WalletSummary } from '../../../lib/wallet-api';

const sidebarItems = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, active: true },
  { label: 'Meus pedidos', href: '/dashboard/pedidos', icon: ShoppingBag },
  { label: 'Carteira', href: '/dashboard/carteira', icon: Wallet },
  { label: 'Meus anuncios', href: '/dashboard/anuncios', icon: Store },
  { label: 'Vendas', href: '/dashboard/vendas', icon: TrendingUp },
  { label: 'Inventario', href: '/dashboard/inventario', icon: Boxes },
  { label: 'Chat', href: '/dashboard/chat', icon: MessageCircle },
  { label: 'Seguranca', href: '/dashboard/seguranca', icon: ShieldCheck },
  { label: 'Configuracoes', href: '/dashboard/configuracoes', icon: Settings },
] as const;

const orderStatusLabel: Record<OrderStatus, string> = {
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

const orderStatusStyle = (status: OrderStatus) => {
  switch (status) {
    case 'PAID':
    case 'COMPLETED':
      return 'bg-green-100 text-green-700';
    case 'IN_DELIVERY':
    case 'DELIVERED':
      return 'bg-blue-100 text-blue-700';
    case 'AWAITING_PAYMENT':
    case 'CREATED':
      return 'bg-amber-100 text-amber-700';
    case 'DISPUTED':
      return 'bg-orange-100 text-orange-700';
    case 'REFUNDED':
      return 'bg-purple-100 text-purple-700';
    case 'CANCELLED':
    default:
      return 'bg-red-100 text-red-700';
  }
};

const listingStatusStyle: Record<string, string> = {
  DRAFT: 'bg-amber-100 text-amber-700',
  PENDING: 'bg-indigo-100 text-indigo-700',
  PUBLISHED: 'bg-green-100 text-green-700',
  SUSPENDED: 'bg-red-100 text-red-700',
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
    month: 'short',
  });

export default function Page() {
  const { user, accessToken, loading: authLoading } = useAuth();
  const [buyerOrders, setBuyerOrders] = useState<Order[]>([]);
  const [sellerOrders, setSellerOrders] = useState<Order[]>([]);
  const [listings, setListings] = useState<Listing[]>([]);
  const [wallet, setWallet] = useState<WalletSummary | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [dataLoading, setDataLoading] = useState(false);
  const [chatLoading, setChatLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isSeller = user?.role === 'SELLER' || user?.role === 'ADMIN';

  useEffect(() => {
    if (!accessToken) {
      return;
    }
    let active = true;
    const load = async () => {
      setDataLoading(true);
      setError(null);
      const results = await Promise.allSettled([
        ordersApi.listOrders(accessToken, 'buyer'),
        isSeller ? ordersApi.listOrders(accessToken, 'seller') : Promise.resolve([]),
        isSeller ? marketplaceApi.listSellerListings(accessToken) : Promise.resolve([]),
        walletApi.getSummary(accessToken),
      ]);

      if (!active) {
        return;
      }

      const [buyerResult, sellerResult, listingsResult, walletResult] = results;
      const errors: string[] = [];

      if (buyerResult.status === 'fulfilled') {
        setBuyerOrders(buyerResult.value);
      } else if (buyerResult.reason instanceof ApiClientError) {
        errors.push(buyerResult.reason.message);
      }

      if (sellerResult.status === 'fulfilled') {
        setSellerOrders(sellerResult.value);
      } else if (sellerResult.reason instanceof ApiClientError) {
        errors.push(sellerResult.reason.message);
      }

      if (listingsResult.status === 'fulfilled') {
        setListings(listingsResult.value);
      } else if (listingsResult.reason instanceof ApiClientError) {
        errors.push(listingsResult.reason.message);
      }

      if (walletResult.status === 'fulfilled') {
        setWallet(walletResult.value);
      } else if (walletResult.reason instanceof ApiClientError) {
        errors.push(walletResult.reason.message);
      }

      if (errors.length > 0) {
        setError(errors[0]);
      }

      setDataLoading(false);
    };
    load();
    return () => {
      active = false;
    };
  }, [accessToken, isSeller]);

  const sortedBuyerOrders = useMemo(
    () =>
      [...buyerOrders].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      ),
    [buyerOrders],
  );

  const sortedSellerOrders = useMemo(
    () =>
      [...sellerOrders].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      ),
    [sellerOrders],
  );

  const chatOrderId = useMemo(
    () => sortedSellerOrders[0]?.id ?? sortedBuyerOrders[0]?.id ?? null,
    [sortedSellerOrders, sortedBuyerOrders],
  );

  useEffect(() => {
    if (!accessToken || !chatOrderId) {
      setChatMessages([]);
      return;
    }
    let active = true;
    const loadChat = async () => {
      setChatLoading(true);
      try {
        const messages = await chatApi.listOrderMessages(accessToken, chatOrderId, undefined, 12);
        if (active) {
          setChatMessages(messages);
        }
      } catch {
        if (active) {
          setChatMessages([]);
        }
      } finally {
        if (active) {
          setChatLoading(false);
        }
      }
    };
    loadChat();
    return () => {
      active = false;
    };
  }, [accessToken, chatOrderId]);

  const salesStats = useMemo(() => {
    const total = sortedSellerOrders.reduce((acc, order) => acc + order.totalAmountCents, 0);
    const active = sortedSellerOrders.filter(
      (order) => !['CANCELLED', 'REFUNDED'].includes(order.status),
    ).length;
    const average = sortedSellerOrders.length ? total / sortedSellerOrders.length : 0;
    return [
      {
        label: 'Total em vendas',
        value: formatCurrency(total),
        trend: `${sortedSellerOrders.length} pedidos`,
        icon: TrendingUp,
      },
      {
        label: 'Pedidos ativos',
        value: String(active),
        trend: 'Acompanhamento diario',
        icon: Package,
      },
      {
        label: 'Ticket medio',
        value: formatCurrency(average || 0),
        trend: 'Base nos pedidos',
        icon: Star,
      },
    ];
  }, [sortedSellerOrders]);

  const walletCards = useMemo(
    () =>
      wallet
        ? [
            {
              label: 'Saldo disponivel',
              value: formatCurrency(wallet.availableCents, wallet.currency),
              accent: 'bg-meow-red/10',
            },
            {
              label: 'A liberar',
              value: formatCurrency(wallet.heldCents, wallet.currency),
              accent: 'bg-meow-gold/20',
            },
            {
              label: 'Reversoes',
              value: formatCurrency(wallet.reversedCents, wallet.currency),
              accent: 'bg-meow-indigo/10',
            },
          ]
        : [],
    [wallet],
  );

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-meow-gradient px-6 py-16">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <CardTitle>Carregando dashboard</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-meow-muted">
            Validando sua sessao...
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-meow-gradient px-6 py-16">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <CardTitle>Dashboard</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-meow-muted">
            <p>Entre para acessar seu painel.</p>
            <Link
              href="/login"
              className="inline-flex items-center justify-center rounded-full border border-meow-red/30 px-5 py-2 text-sm font-bold text-meow-deep transition hover:bg-meow-cream"
            >
              Fazer login
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-meow-gradient text-meow-charcoal">
      <div className="flex min-h-screen flex-col lg:flex-row">
        <aside className="w-full border-b border-meow-red/10 bg-white/90 px-6 py-8 shadow-[0_12px_30px_rgba(240,98,146,0.08)] backdrop-blur lg:sticky lg:top-0 lg:h-screen lg:w-72 lg:border-b-0 lg:border-r lg:py-10 lg:overflow-y-auto">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-meow-red/20 text-meow-deep shadow-meow">
              <Cat size={24} aria-hidden />
            </div>
            <div>
              <p className="text-sm font-semibold text-meow-muted">Bem-vindo</p>
              <p className="text-lg font-black">{user.email}</p>
            </div>
          </div>

          <nav className="mt-8 grid gap-2">
            {sidebarItems.map((item) => {
              const Icon = item.icon;
              const active = item.active ?? item.href === '/dashboard';
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold transition ${
                    active
                      ? 'bg-meow-red text-white shadow-meow'
                      : 'text-meow-muted hover:bg-meow-cream hover:text-meow-charcoal'
                  }`}
                >
                  <Icon size={18} aria-hidden />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="mt-8 rounded-2xl border border-meow-red/20 bg-meow-cream/60 p-4 text-sm">
            <div className="flex items-center gap-3 text-meow-deep">
              <BadgeCheck size={18} aria-hidden />
              <span className="font-bold">
                {isSeller ? 'Seller verificado' : 'Conta ativa'}
              </span>
            </div>
            <p className="mt-2 text-xs text-meow-muted">
              {isSeller
                ? 'Seu perfil esta entre os mais confiaveis da comunidade.'
                : 'Ative o perfil vendedor para desbloquear recursos extras.'}
            </p>
          </div>
        </aside>

        <main className="flex-1 px-6 py-10 lg:px-10">
          <header className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.4px] text-meow-deep">
                Dashboard unificado
              </p>
              <h1 className="mt-2 text-3xl font-black">
                Sua operacao Meoww Games em tempo real
              </h1>
              <p className="mt-2 text-sm text-meow-muted">
                Monitore pedidos, vendas e conversas em um unico painel.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button variant="outline" className="rounded-full">
                Gerar relatorio
              </Button>
              <Button className="rounded-full">Novo anuncio</Button>
            </div>
          </header>

          {error ? (
            <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
              {error}
            </div>
          ) : null}
          {dataLoading ? (
            <div className="mt-6 rounded-2xl border border-meow-red/20 bg-meow-cream/60 px-4 py-3 text-sm text-meow-muted">
              Atualizando indicadores...
            </div>
          ) : null}

          {isSeller ? (
            <section className="mt-8 grid gap-4 md:grid-cols-3">
              {salesStats.map((stat) => {
                const Icon = stat.icon;
                return (
                  <div key={stat.label} className="rounded-2xl bg-white p-5 shadow-meow">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-[0.4px] text-meow-muted">
                        {stat.label}
                      </span>
                      <Icon size={18} className="text-meow-deep" aria-hidden />
                    </div>
                    <div className="mt-3 text-2xl font-black">{stat.value}</div>
                    <div className="mt-2 inline-flex items-center gap-2 rounded-full bg-meow-cream px-3 py-1 text-xs font-bold text-meow-deep">
                      {stat.trend}
                    </div>
                  </div>
                );
              })}
            </section>
          ) : null}

          <section className="mt-8 grid gap-6 lg:grid-cols-[1.1fr_1fr]">
            <div className="space-y-6">
              <div className="rounded-2xl bg-white p-6 shadow-meow">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-black">Visao do comprador</h2>
                  <span className="rounded-full bg-meow-red/10 px-3 py-1 text-xs font-bold text-meow-deep">
                    Meus pedidos
                  </span>
                </div>
                <div className="mt-5 grid gap-4">
                  {sortedBuyerOrders.length === 0 && !dataLoading ? (
                    <div className="rounded-2xl border border-meow-red/20 bg-meow-cream/60 p-4 text-sm text-meow-muted">
                      Nenhum pedido encontrado.
                    </div>
                  ) : null}
                  {sortedBuyerOrders.slice(0, 2).map((order) => {
                    const firstItem = order.items?.[0];
                    const deliveryType = firstItem?.deliveryType === 'AUTO' ? 'Entrega auto' : 'Entrega manual';
                    return (
                      <div
                        key={order.id}
                        className="rounded-2xl border border-meow-red/20 bg-meow-cream/60 p-4"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-bold text-meow-deep">
                              #{order.id.slice(0, 8)}
                            </p>
                            <p className="text-base font-extrabold">
                              {firstItem?.title ?? 'Pedido'}{' '}
                              {firstItem?.quantity ? `x${firstItem.quantity}` : ''}
                            </p>
                          </div>
                          <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-meow-charcoal shadow-sm">
                            {formatCurrency(order.totalAmountCents, order.currency)}
                          </span>
                        </div>
                        <div className="mt-3 flex flex-wrap items-center gap-3 text-xs font-semibold text-meow-muted">
                          <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1">
                            <Zap size={14} aria-hidden className="text-meow-deep" />
                            {deliveryType}
                          </span>
                          <span
                            className={`inline-flex items-center gap-2 rounded-full px-3 py-1 ${
                              orderStatusStyle(order.status)
                            }`}
                          >
                            {orderStatusLabel[order.status]}
                          </span>
                          <span className="inline-flex items-center gap-2">
                            <Clock size={14} aria-hidden />
                            {formatDate(order.updatedAt)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-2xl bg-white p-6 shadow-meow">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-black">Carteira</h3>
                  <span className="inline-flex items-center gap-2 text-xs font-bold text-meow-deep">
                    <CreditCard size={14} aria-hidden />
                    Pix e cartao
                  </span>
                </div>
                <div className="mt-5 grid gap-4 md:grid-cols-3">
                  {walletCards.length === 0 && !dataLoading ? (
                    <div className="rounded-2xl border border-meow-red/10 bg-meow-cream/60 p-4 text-sm text-meow-muted">
                      Nenhuma movimentacao recente.
                    </div>
                  ) : null}
                  {walletCards.map((card) => (
                    <div
                      key={card.label}
                      className={`rounded-2xl border border-meow-red/10 p-4 ${card.accent}`}
                    >
                      <p className="text-xs font-bold uppercase tracking-[0.4px] text-meow-muted">
                        {card.label}
                      </p>
                      <p className="mt-2 text-lg font-black">{card.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-6">
              {isSeller ? (
                <>
                  <div className="rounded-2xl bg-white p-6 shadow-meow">
                    <div className="flex items-center justify-between">
                      <h2 className="text-lg font-black">Visao do vendedor</h2>
                      <span className="rounded-full bg-meow-red/10 px-3 py-1 text-xs font-bold text-meow-deep">
                        Meus anuncios
                      </span>
                    </div>
                    <div className="mt-4">
                      {listings.length === 0 && !dataLoading ? (
                        <div className="rounded-2xl border border-meow-red/20 bg-meow-cream/60 px-4 py-3 text-sm text-meow-muted">
                          Nenhum anuncio cadastrado.
                        </div>
                      ) : null}
                      {listings.length > 0 ? (
                        <Table className="mt-4">
                          <TableHeader>
                            <TableRow>
                              <TableHead>Anuncio</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead>Preco</TableHead>
                              <TableHead>Entrega</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {listings.slice(0, 4).map((listing) => (
                              <TableRow key={listing.id}>
                                <TableCell className="font-semibold">{listing.title}</TableCell>
                                <TableCell>
                                  <span
                                    className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${
                                      listingStatusStyle[listing.status] ?? 'bg-meow-cream text-meow-muted'
                                    }`}
                                  >
                                    {listing.status}
                                  </span>
                                </TableCell>
                                <TableCell>
                                  {formatCurrency(listing.priceCents, listing.currency)}
                                </TableCell>
                                <TableCell className="text-meow-muted">
                                  {listing.deliveryType === 'AUTO' ? 'Auto' : 'Manual'}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      ) : null}
                      <div className="mt-4">
                        <Button variant="outline" className="rounded-full">
                          Gerenciar anuncios
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl bg-white p-6 shadow-meow">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-black">Vendas</h3>
                      <span className="inline-flex items-center gap-2 text-xs font-bold text-meow-deep">
                        <TrendingUp size={14} aria-hidden />
                        Ultimas 24h
                      </span>
                    </div>
                    <div className="mt-4 grid gap-3">
                      {sortedSellerOrders.length === 0 && !dataLoading ? (
                        <div className="rounded-2xl border border-meow-red/20 bg-meow-cream/60 px-4 py-3 text-sm text-meow-muted">
                          Sem vendas recentes.
                        </div>
                      ) : null}
                      {sortedSellerOrders.slice(0, 2).map((order) => (
                        <div
                          key={order.id}
                          className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-meow-red/20 bg-meow-cream/60 px-4 py-3 text-sm"
                        >
                          <div>
                            <p className="text-xs font-bold text-meow-deep">#{order.id.slice(0, 8)}</p>
                            <p className="text-sm font-semibold">
                              {order.buyer?.email ?? order.buyerId}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-black">
                              {formatCurrency(order.totalAmountCents, order.currency)}
                            </p>
                            <p className="text-xs text-meow-muted">
                              {orderStatusLabel[order.status]}
                            </p>
                          </div>
                          <span className="text-xs font-semibold text-meow-muted">
                            {formatDate(order.updatedAt)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <div className="rounded-2xl bg-white p-6 shadow-meow">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-black">Visao do vendedor</h2>
                    <span className="rounded-full bg-meow-red/10 px-3 py-1 text-xs font-bold text-meow-deep">
                      Ativar perfil
                    </span>
                  </div>
                  <p className="mt-3 text-sm text-meow-muted">
                    Ative seu perfil vendedor para publicar anuncios e acompanhar vendas.
                  </p>
                  <Button variant="outline" className="mt-4 rounded-full">
                    Quero vender
                  </Button>
                </div>
              )}
            </div>
          </section>

          <section className="mt-8 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded-2xl bg-white p-6 shadow-meow">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-black">Chat com compradores</h3>
                  <p className="text-sm text-meow-muted">
                    Responda rapido para manter a reputacao alta.
                  </p>
                </div>
                <span className="inline-flex items-center gap-2 rounded-full bg-meow-cream px-3 py-1 text-xs font-bold text-meow-deep">
                  <Users size={14} aria-hidden />
                  {chatMessages.length} mensagens recentes
                </span>
              </div>

              <div className="mt-6 space-y-4">
                {chatLoading ? (
                  <div className="rounded-2xl border border-meow-red/20 bg-meow-cream/60 px-4 py-3 text-sm text-meow-muted">
                    Carregando mensagens...
                  </div>
                ) : null}
                {!chatLoading && chatMessages.length === 0 ? (
                  <div className="rounded-2xl border border-meow-red/20 bg-meow-cream/60 px-4 py-3 text-sm text-meow-muted">
                    Nenhuma mensagem encontrada.
                  </div>
                ) : null}
                {chatMessages.map((message) => {
                  const isOwn = message.senderId === user.id;
                  return (
                    <div
                      key={message.id}
                      className={`max-w-[85%] rounded-2xl border px-4 py-3 text-sm shadow-sm ${
                        isOwn
                          ? 'ml-auto border-meow-deep/30 bg-meow-red/20 text-meow-charcoal'
                          : 'border-meow-red/20 bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs font-bold text-meow-muted">
                        <span>{isOwn ? 'Voce' : message.senderId}</span>
                        <span>{formatDate(message.createdAt)}</span>
                      </div>
                      <p className="mt-2 text-sm">{message.content}</p>
                    </div>
                  );
                })}
              </div>

              <div className="mt-5 flex items-center gap-3">
                <input
                  type="text"
                  placeholder="Digite sua mensagem..."
                  className="flex-1 rounded-2xl border border-meow-red/20 bg-meow-cream/60 px-4 py-3 text-sm outline-none focus:border-meow-deep/40"
                />
                <Button className="rounded-2xl">
                  <Send size={16} aria-hidden />
                  Enviar
                </Button>
              </div>
            </div>

            <div className="rounded-2xl bg-white p-6 shadow-meow">
              <h3 className="text-lg font-black">Resumo da comunidade</h3>
              <p className="mt-2 text-sm text-meow-muted">
                Insights gerais para compradores e vendedores.
              </p>
              <div className="mt-5 grid gap-4">
                <div className="flex items-center gap-3 rounded-2xl border border-meow-red/20 bg-meow-cream/60 px-4 py-4">
                  <div className="rounded-2xl bg-white p-3 text-meow-deep shadow-sm">
                    <Store size={18} aria-hidden />
                  </div>
                  <div>
                    <p className="text-sm font-bold">Lojas ativas</p>
                    <p className="text-xs text-meow-muted">+12 esta semana</p>
                  </div>
                  <span className="ml-auto text-lg font-black">128</span>
                </div>
                <div className="flex items-center gap-3 rounded-2xl border border-meow-red/20 bg-meow-cream/60 px-4 py-4">
                  <div className="rounded-2xl bg-white p-3 text-meow-deep shadow-sm">
                    <ShoppingBag size={18} aria-hidden />
                  </div>
                  <div>
                    <p className="text-sm font-bold">Pedidos em andamento</p>
                    <p className="text-xs text-meow-muted">Taxa de entrega 98%</p>
                  </div>
                  <span className="ml-auto text-lg font-black">312</span>
                </div>
                <div className="flex items-center gap-3 rounded-2xl border border-meow-red/20 bg-meow-cream/60 px-4 py-4">
                  <div className="rounded-2xl bg-white p-3 text-meow-deep shadow-sm">
                    <Star size={18} aria-hidden />
                  </div>
                  <div>
                    <p className="text-sm font-bold">Nota media</p>
                    <p className="text-xs text-meow-muted">Feedbacks recentes</p>
                  </div>
                  <span className="ml-auto text-lg font-black">4.8</span>
                </div>
              </div>

              <div className="mt-6 rounded-2xl bg-meow-red/10 p-4">
                <div className="flex items-center gap-2 text-meow-deep">
                  <ShieldCheck size={18} aria-hidden />
                  <span className="text-sm font-bold">Dica de seguranca</span>
                </div>
                <p className="mt-2 text-xs text-meow-muted">
                  Ative a validacao em duas etapas para manter sua loja protegida.
                </p>
                <Button variant="outline" className="mt-4 rounded-full">
                  Configurar agora
                </Button>
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
