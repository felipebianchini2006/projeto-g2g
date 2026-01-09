'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

import { ApiClientError } from '../../lib/api-client';
import { ordersApi, type Order, type PaymentStatus } from '../../lib/orders-api';
import { useAuth } from '../auth/auth-provider';

type OrdersState = {
  status: 'loading' | 'ready';
  orders: Order[];
  error?: string;
};

type MenuItem = {
  label: string;
  href?: string;
  active?: boolean;
  onClick?: () => void;
  tone?: 'danger';
};

type MenuSection = {
  title: string;
  items: MenuItem[];
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
  const { user, accessToken, loading, logout } = useAuth();
  const router = useRouter();
  const [state, setState] = useState<OrdersState>({
    status: 'loading',
    orders: [],
  });

  const menuSections = useMemo<MenuSection[]>(
    () => [
      {
        title: 'Menu',
        items: [
          { label: 'Resumo', href: '/conta' },
          { label: 'Transacoes', href: '/carteira' },
          { label: 'Meus anuncios', href: '/dashboard' },
          { label: 'Minhas compras', href: '/conta/pedidos', active: true },
          { label: 'Minhas vendas', href: '/dashboard/vendas' },
          { label: 'Minhas perguntas', href: '/dashboard/tickets' },
          { label: 'Perguntas recebidas', href: '/dashboard/tickets' },
          { label: 'Minhas retiradas', href: '/carteira' },
          { label: 'Recargas', href: '/carteira' },
        ],
      },
      {
        title: 'Configuracoes',
        items: [
          { label: 'Minha conta', href: '/conta' },
          { label: 'Meus dados', href: '/conta' },
          { label: 'Verificacoes', href: '/conta' },
          { label: 'Seguranca', href: '/conta' },
          { label: 'Notificacoes', href: '/central-de-notificacoes' },
          {
            label: 'Sair',
            tone: 'danger',
            onClick: async () => {
              await logout();
              router.push('/');
            },
          },
        ],
      },
    ],
    [logout, router],
  );

  const ordersSorted = useMemo(() => {
    return [...state.orders].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }, [state.orders]);

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
    <section className="bg-white px-6 py-10">
      <div className="mx-auto w-full max-w-[1200px]">
        <div className="text-xs text-meow-muted">
          <Link href="/" className="font-semibold text-meow-deep">
            Inicio
          </Link>{' '}
          &gt;{' '}
          <Link href="/conta" className="font-semibold text-meow-deep">
            Conta
          </Link>{' '}
          &gt; Minhas compras
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
          <aside className="rounded-2xl border border-meow-red/20 bg-white p-5 shadow-[0_10px_24px_rgba(216,107,149,0.12)]">
            {menuSections.map((section) => (
              <div key={section.title} className="mb-6 last:mb-0">
                <p className="text-xs font-bold uppercase tracking-[0.4px] text-meow-muted">
                  {section.title}
                </p>
                <div className="mt-3 grid gap-1 text-sm">
                  {section.items.map((item) => {
                    const baseClasses =
                      'flex items-center justify-between rounded-xl px-3 py-2 text-sm font-semibold transition';
                    const activeClasses = item.active
                      ? 'bg-meow-cream text-meow-charcoal'
                      : 'text-meow-muted hover:bg-meow-cream/70 hover:text-meow-charcoal';
                    const dangerClasses =
                      item.tone === 'danger' ? 'text-red-600 hover:text-red-700' : '';

                    if (item.onClick) {
                      return (
                        <button
                          key={item.label}
                          type="button"
                          className={`${baseClasses} ${activeClasses} ${dangerClasses}`}
                          onClick={item.onClick}
                        >
                          {item.label}
                        </button>
                      );
                    }

                    return (
                      <Link
                        key={item.label}
                        href={item.href ?? '#'}
                        className={`${baseClasses} ${activeClasses} ${dangerClasses}`}
                      >
                        {item.label}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </aside>

          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-meow-red/20 bg-white p-4 shadow-[0_10px_24px_rgba(216,107,149,0.12)]">
              {[
                { label: 'Pagamento', options: ['Todos', 'Pendente', 'Pago'] },
                { label: 'Pedido', options: ['Todos', 'Ultimos 30 dias'] },
                { label: 'Avaliacao', options: ['Todas', 'Pendentes'] },
                { label: 'Codigo do pedido', options: ['Codigo do pedido'] },
              ].map((filter) => (
                <label key={filter.label} className="grid gap-1 text-xs font-semibold text-meow-muted">
                  {filter.label}
                  <select className="rounded-xl border border-meow-red/20 bg-white px-3 py-2 text-sm text-meow-charcoal">
                    {filter.options.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
            </div>

            {state.error ? (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {state.error}
              </div>
            ) : null}

            {state.status === 'loading' ? (
              <div className="rounded-xl border border-meow-red/20 bg-white px-4 py-3 text-sm text-meow-muted">
                Carregando pedidos...
              </div>
            ) : null}

            {state.status === 'ready' && ordersSorted.length === 0 ? (
              <div className="rounded-xl border border-meow-red/20 bg-white px-4 py-3 text-sm text-meow-muted">
                Nenhuma compra encontrada.
              </div>
            ) : null}

            {ordersSorted.map((order) => {
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
                  className="rounded-2xl border border-meow-red/20 bg-white p-5 shadow-[0_10px_24px_rgba(216,107,149,0.12)]"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="text-sm font-bold text-meow-charcoal">
                      Compra <span className="text-meow-muted">#{orderCode}</span>
                    </div>
                    <Link
                      href={`/conta/pedidos/${order.id}`}
                      className="rounded-full bg-meow-linear px-4 py-2 text-xs font-bold text-white"
                    >
                      Ver pedido
                    </Link>
                  </div>
                  <div className="mt-3 text-sm text-meow-muted">
                    {firstItem ? (
                      <>
                        {firstItem.quantity} x {firstItem.title}
                        <span className="px-2 text-meow-red/40">|</span>
                        {formatCurrency(firstItem.unitPriceCents, order.currency)}
                      </>
                    ) : (
                      'Item indisponivel.'
                    )}
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-meow-muted">
                    <span>{new Date(order.createdAt).toLocaleString('pt-BR')}</span>
                    <span>Subtotal: {formatCurrency(order.totalAmountCents, order.currency)}</span>
                    <span className={deliveryTone}>{deliveryLabel}</span>
                    <span>{statusLabel[order.status] ?? order.status}</span>
                  </div>
                  {payment ? (
                    <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                      <span
                        className={`inline-flex items-center gap-2 rounded-full px-3 py-1 font-semibold ${paymentTone[payment.status]}`}
                      >
                        Pix - {formatCurrency(order.totalAmountCents, order.currency)}
                      </span>
                      <span className="text-meow-muted">
                        {paymentLabel[payment.status]}
                      </span>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};
