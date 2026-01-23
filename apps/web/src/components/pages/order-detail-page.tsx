'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { Copy, Eye, EyeOff, KeyRound, Lock } from 'lucide-react';

import { ApiClientError } from '../../lib/api-client';
import {
  ordersApi,
  type CreateEvidencePayload,
  type Order,
  type PaymentStatus,
} from '../../lib/orders-api';
import { useAuth } from '../auth/auth-provider';
import { AccountShell } from '../account/account-shell';
import { OrderChat } from '../orders/order-chat';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Skeleton } from '../ui/skeleton';
import { Textarea } from '../ui/textarea';

type OrderDetailContentProps = {
  orderId: string;
  scope: 'buyer' | 'seller';
};

type DetailState = {
  status: 'loading' | 'ready';
  order: Order | null;
  error?: string;
  actionError?: string;
  actionSuccess?: string;
};

const statusLabel: Record<string, string> = {
  CREATED: 'Criado',
  AWAITING_PAYMENT: 'Aguardando pagamento',
  PAID: 'Pago',
  IN_DELIVERY: 'Em entrega',
  DELIVERED: 'Entregue',
  COMPLETED: 'ConcluÃ­do',
  CANCELLED: 'Cancelado',
  DISPUTED: 'Em disputa',
  REFUNDED: 'Reembolsado',
};

const eventLabel: Record<string, string> = {
  CREATED: 'Pedido criado',
  AWAITING_PAYMENT: 'Aguardando pagamento',
  PAID: 'Pagamento confirmado',
  IN_DELIVERY: 'Entrega iniciada',
  DELIVERED: 'Pedido entregue',
  COMPLETED: 'Pedido concluÃ­do',
  CANCELLED: 'Pedido cancelado',
  DISPUTED: 'Disputa aberta',
  REFUNDED: 'Pedido reembolsado',
  NOTE: 'Atualizacao',
};

const paymentStatusLabel: Record<PaymentStatus, string> = {
  PENDING: 'Pendente',
  CONFIRMED: 'Confirmado',
  EXPIRED: 'Expirado',
  REFUNDED: 'Reembolsado',
  FAILED: 'Falhou',
};

const formatCurrency = (value: number, currency = 'BRL') =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(value / 100);

export const OrderDetailContent = ({ orderId, scope }: OrderDetailContentProps) => {
  const { user, accessToken, loading } = useAuth();
  const [state, setState] = useState<DetailState>({
    status: 'loading',
    order: null,
  });
  const [evidenceForm, setEvidenceForm] = useState<CreateEvidencePayload>({
    type: 'TEXT',
    content: '',
  });
  const [evidenceBusy, setEvidenceBusy] = useState(false);
  const [isDisputeModalOpen, setIsDisputeModalOpen] = useState(false);
  const [disputeReason, setDisputeReason] = useState('');
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});
  const [copyStatus, setCopyStatus] = useState<string | null>(null);
  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const listHref = scope === 'seller' ? '/conta/vendas' : '/conta/pedidos';
  const listLabel = scope === 'seller' ? 'Minhas vendas' : 'Minhas compras';
  const orderCode = orderId ? orderId.slice(0, 7).toUpperCase() : '----';

  const loadOrder = async (silent = false) => {
    if (!accessToken) {
      return;
    }
    if (!silent) {
      setState((prev) => ({
        ...prev,
        status: 'loading',
        actionError: undefined,
        actionSuccess: undefined,
      }));
    }
    try {
      const order = await ordersApi.getOrder(accessToken, orderId);
      setState((prev) => ({ ...prev, status: 'ready', order }));
    } catch (error) {
      const message =
        error instanceof ApiClientError
          ? error.message
          : error instanceof Error
            ? error.message
            : 'NÃ£o foi possÃ­vel carregar o pedido.';
      setState({ status: 'ready', order: null, error: message });
    }
  };

  useEffect(() => {
    if (accessToken && orderId) {
      loadOrder();
    }
  }, [accessToken, orderId]);

  useEffect(() => {
    if (!accessToken || !state.order || !orderId) {
      return;
    }
    if (state.order.status !== 'AWAITING_PAYMENT') {
      return;
    }
    const interval = setInterval(() => {
      loadOrder(true);
    }, 10000);
    return () => clearInterval(interval);
  }, [accessToken, state.order?.status, orderId]);

  const handleAction = async (action: () => Promise<Order>, successMessage: string) => {
    if (!accessToken || !orderId) {
      return;
    }
    try {
      const updated = await action();
      setState((prev) => ({
        ...prev,
        order: updated,
        actionSuccess: successMessage,
        actionError: undefined,
      }));
    } catch (error) {
      const message =
        error instanceof ApiClientError
          ? error.message
          : error instanceof Error
            ? error.message
            : 'NÃ£o foi possÃ­vel concluir a acao.';
      setState((prev) => ({ ...prev, actionError: message, actionSuccess: undefined }));
    }
  };

  const handleAddEvidence = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!accessToken || !orderId || evidenceBusy) {
      return;
    }
    const trimmed = evidenceForm.content.trim();
    if (!trimmed) {
      setState((prev) => ({
        ...prev,
        actionError: 'Informe o conteÃºdo da evidencia.',
        actionSuccess: undefined,
      }));
      return;
    }
    setEvidenceBusy(true);
    try {
      await ordersApi.addManualEvidence(accessToken, orderId, {
        ...evidenceForm,
        content: trimmed,
      });
      setEvidenceForm((prev) => ({ ...prev, content: '' }));
      setState((prev) => ({
        ...prev,
        actionSuccess: 'Evidencia adicionada.',
        actionError: undefined,
      }));
      await loadOrder(true);
    } catch (error) {
      const message =
        error instanceof ApiClientError
          ? error.message
          : error instanceof Error
            ? error.message
            : 'NÃ£o foi possÃ­vel adicionar a evidencia.';
      setState((prev) => ({ ...prev, actionError: message, actionSuccess: undefined }));
    } finally {
      setEvidenceBusy(false);
    }
  };

  const handleOpenDispute = () => {
    if (!canDispute) return;
    setIsDisputeModalOpen(true);
  };

  const handleSubmitDispute = async () => {
    if (!disputeReason || disputeReason.length < 10) {
      alert('O motivo deve ter pelo menos 10 caracteres.');
      return;
    }
    setIsDisputeModalOpen(false);
    await handleAction(
      () => ordersApi.openDispute(accessToken!, orderId, disputeReason),
      'Disputa aberta.',
    );
    setDisputeReason('');
  };

  const isBuyer = user?.id && state.order?.buyerId === user.id;
  const canCancel =
    isBuyer &&
    (state.order?.status === 'CREATED' || state.order?.status === 'AWAITING_PAYMENT');
  const canConfirm = isBuyer && state.order?.status === 'DELIVERED';
  const canDispute =
    isBuyer &&
    (state.order?.status === 'DELIVERED' || state.order?.status === 'COMPLETED') &&
    !state.order?.dispute;
  const waitingSellerDelivery = scope === 'buyer' && state.order?.status === 'IN_DELIVERY';

  const deliverySection = useMemo(() => {
    const order = state.order;
    if (!order) {
      return null;
    }
    const items = order.items ?? [];
    const autoItems = items.filter((item) => item.deliveryType === 'AUTO');
    const manualItems = items.filter((item) => item.deliveryType === 'MANUAL');
    const revealAllowed = order.status === 'DELIVERED' || order.status === 'COMPLETED';

    return {
      autoItems,
      manualItems,
      revealAllowed,
    };
  }, [state.order]);

  const paymentSummary = useMemo(() => {
    if (!state.order?.payments?.length) {
      return null;
    }
    return state.order.payments[0];
  }, [state.order]);

  const sellerLabel = useMemo(() => {
    const email = state.order?.seller?.email;
    if (!email) {
      return 'Vendedor';
    }
    const name = email.split('@')[0] ?? 'Vendedor';
    return `Loja do ${name.charAt(0).toUpperCase()}${name.slice(1)}`;
  }, [state.order?.seller?.email]);

  const sellerInitials = useMemo(() => {
    const parts = sellerLabel.split(' ').filter((item) => item.length > 0);
    if (parts.length === 1) {
      return parts[0]?.slice(0, 2).toUpperCase() ?? '';
    }
    return `${parts[0]?.[0] ?? ''}${parts[1]?.[0] ?? ''}`.toUpperCase();
  }, [sellerLabel]);

  const accessEntries = useMemo(() => {
    if (!deliverySection?.autoItems.length) {
      return [];
    }
    return deliverySection.autoItems.flatMap((item) =>
      (item.inventoryItems ?? []).map((inv, index) => ({
        id: inv.id ?? `${item.id}-${index}`,
        code: inv.code ?? '',
      })),
    );
  }, [deliverySection?.autoItems]);

  const parseAccessCode = (code: string) => {
    const trimmed = code.trim();
    if (!trimmed) {
      return { raw: '' };
    }
    const emailMatch = trimmed.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
    if (emailMatch && trimmed.includes(':')) {
      const [maybeEmail, ...rest] = trimmed.split(':');
      if (maybeEmail?.includes('@') && rest.length > 0) {
        return { email: maybeEmail.trim(), password: rest.join(':').trim() };
      }
    }
    const loginMatch = trimmed.match(/(login|email|usuario)\s*[:=]\s*([^|\n]+)/i);
    const senhaMatch = trimmed.match(/senha\s*[:=]\s*([^|\n]+)/i);
    if (loginMatch || senhaMatch) {
      return {
        email: loginMatch?.[2]?.trim(),
        password: senhaMatch?.[1]?.trim(),
      };
    }
    return { raw: trimmed };
  };

  const handleCopy = async (value: string, label: string) => {
    if (!value) {
      return;
    }
    try {
      await navigator.clipboard.writeText(value);
      setCopyStatus(`${label} copiado.`);
    } catch {
      setCopyStatus('NÃ£o foi possÃ­vel copiar.');
    } finally {
      if (copyTimeoutRef.current) {
        clearTimeout(copyTimeoutRef.current);
      }
      copyTimeoutRef.current = setTimeout(() => {
        setCopyStatus(null);
      }, 3000);
    }
  };

  const canManageManualDelivery =
    scope === 'seller' &&
    (user?.role === 'SELLER' || user?.role === 'ADMIN') &&
    (deliverySection?.manualItems.length ?? 0) > 0;
  const canManageManualEvidence =
    canManageManualDelivery && state.order?.status === 'IN_DELIVERY';

  if (loading) {
    return (
      <section className="bg-white px-6 py-12">
        <div className="mx-auto w-full max-w-[1200px]">
          <Skeleton className="h-24 w-full" />
        </div>
      </section>
    );
  }

  if (!user) {
    return (
      <section className="bg-white px-6 py-12">
        <div className="mx-auto w-full max-w-[1200px] rounded-2xl border border-meow-red/20 bg-white px-6 py-6 text-center">
          <p className="text-sm text-meow-muted">Entre para acessar o pedido.</p>
          <Link
            className="mt-4 inline-flex rounded-full bg-meow-linear px-6 py-2 text-sm font-bold text-white"
            href="/login"
          >
            Fazer login
          </Link>
        </div>
      </section>
    );
  }

  if (!orderId) {
    return (
      <section className="bg-white px-6 py-12">
        <div className="mx-auto w-full max-w-[1200px] rounded-2xl border border-meow-red/20 bg-white px-6 py-6 text-center">
          <p className="text-sm text-meow-muted">Pedido nÃ£o encontrado.</p>
          <Link
            href={listHref}
            className="mt-4 inline-flex rounded-full border border-meow-red/30 px-6 py-2 text-sm font-bold text-meow-deep"
          >
            Voltar
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
        { label: listLabel, href: listHref },
        { label: `Pedido #${orderCode}` },
      ]}
    >
      <div className="text-center">
        <h1 className="text-2xl font-black text-meow-charcoal">Pedido #{orderCode}</h1>
        <p className="text-sm text-meow-muted">Detalhes completos do pedido.</p>
      </div>

      {state.error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {state.error}
        </div>
      ) : null}
      {state.actionError ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {state.actionError}
        </div>
      ) : null}
      {state.actionSuccess ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {state.actionSuccess}
        </div>
      ) : null}

      {state.status === 'loading' ? (
        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-4">
            <Skeleton className="h-72 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
          <div className="space-y-4">
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        </div>
      ) : null}

      {state.order && state.status !== 'loading' ? (
        <>
          <div className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
            <div className="min-h-[540px]">
              {accessToken ? (
                <OrderChat
                  orderId={orderId}
                  accessToken={accessToken}
                  userId={user.id}
                  sellerName={sellerLabel}
                  sellerInitials={sellerInitials}
                />
              ) : (
                <div className="rounded-2xl border border-meow-red/20 bg-white px-4 py-3 text-sm text-meow-muted">
                  Carregando chat...
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div className="rounded-[26px] border border-slate-100 bg-white p-5 shadow-[0_18px_40px_rgba(15,23,42,0.06)]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600">
                      <KeyRound size={18} aria-hidden />
                    </span>
                    <div>
                      <h2 className="text-sm font-bold text-meow-charcoal">DADOS DE ACESSO</h2>
                      <p className="text-xs text-meow-muted">
                        Acesso liberado após a entrega.
                      </p>
                    </div>
                  </div>
                  {deliverySection?.revealAllowed ? (
                    <Badge variant="success" className="text-[9px]">
                      ENTREGUE
                    </Badge>
                  ) : null}
                </div>

                {copyStatus ? (
                  <div className="mt-3 rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
                    {copyStatus}
                  </div>
                ) : null}

                {!deliverySection?.revealAllowed ? (
                  <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-xs text-slate-500">
                    Disponível após a entrega.
                  </div>
                ) : null}

                {deliverySection?.revealAllowed && accessEntries.length === 0 ? (
                  <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-xs text-slate-500">
                    Nenhum dado de acesso encontrado.
                  </div>
                ) : null}

                {deliverySection?.revealAllowed && accessEntries.length > 0 ? (
                  <div className="mt-4 grid gap-4">
                    {accessEntries.map((entry, index) => {
                      const parsed = parseAccessCode(entry.code);
                      const isPasswordVisible = visiblePasswords[entry.id] ?? false;
                      const accountLabel = `CONTA #${String(index + 1).padStart(2, '0')}`;

                      return (
                        <div key={entry.id} className="rounded-2xl border border-slate-100 bg-white p-4">
                          <p className="text-[10px] font-semibold uppercase text-slate-400">
                            {accountLabel}
                          </p>
                          {parsed.email || parsed.password ? (
                            <div className="mt-3 grid gap-3">
                              {parsed.email ? (
                                <div>
                                  <p className="text-[10px] font-semibold text-slate-400">EMAIL</p>
                                  <div className="mt-1 flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                                    <input
                                      readOnly
                                      value={parsed.email}
                                      className="flex-1 bg-transparent text-xs text-slate-700 outline-none"
                                    />
                                    <button
                                      type="button"
                                      className="text-slate-400"
                                      onClick={() => handleCopy(parsed.email ?? '', 'Email')}
                                    >
                                      <Copy size={14} aria-hidden />
                                    </button>
                                  </div>
                                </div>
                              ) : null}
                              {parsed.password ? (
                                <div>
                                  <p className="text-[10px] font-semibold text-slate-400">SENHA</p>
                                  <div className="mt-1 flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                                    <input
                                      readOnly
                                      type={isPasswordVisible ? 'text' : 'password'}
                                      value={parsed.password}
                                      className="flex-1 bg-transparent text-xs text-slate-700 outline-none"
                                    />
                                    <button
                                      type="button"
                                      className="text-slate-400"
                                      onClick={() =>
                                        setVisiblePasswords((prev) => ({
                                          ...prev,
                                          [entry.id]: !isPasswordVisible,
                                        }))
                                      }
                                    >
                                      {isPasswordVisible ? (
                                        <EyeOff size={14} aria-hidden />
                                      ) : (
                                        <Eye size={14} aria-hidden />
                                      )}
                                    </button>
                                    <button
                                      type="button"
                                      className="text-slate-400"
                                      onClick={() => handleCopy(parsed.password ?? '', 'Senha')}
                                    >
                                      <Copy size={14} aria-hidden />
                                    </button>
                                  </div>
                                </div>
                              ) : null}
                            </div>
                          ) : (
                            <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                              <div className="flex items-center justify-between gap-2">
                                <code className="break-all font-mono">{parsed.raw}</code>
                                <button
                                  type="button"
                                  className="text-slate-400"
                                  onClick={() => handleCopy(parsed.raw ?? '', 'Dado')}
                                >
                                  <Copy size={14} aria-hidden />
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : null}
              </div>

              <div className="rounded-[22px] border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
                <div className="flex items-start gap-2">
                  <p>
                    Este pedido contém um produto com entrega automática, e as mensagens
                    foram enviadas pelo sistema. Para qualquer dúvida sobre o produto ou
                    serviço, entre em contato com o vendedor pelo chat.
                  </p>
                </div>
              </div>

              <div className="rounded-[26px] border border-slate-100 bg-white p-5 shadow-[0_18px_40px_rgba(15,23,42,0.06)]">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 overflow-hidden rounded-2xl bg-slate-100">
                    <img
                      src={
                        state.order.items?.[0]?.deliveryEvidence?.[0]?.content ??
                        '/assets/meoow/highlight-01.webp'
                      }
                      alt={state.order.items?.[0]?.title ?? 'Produto'}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-meow-charcoal">
                      {state.order.items?.[0]?.title ?? 'Produto'}
                    </p>
                    <p className="text-xs text-meow-muted">
                      Quantidade: {state.order.items?.[0]?.quantity ?? 1} • PIX
                    </p>
                    <p className="text-[11px] text-slate-400">
                      {new Date(state.order.createdAt).toLocaleString('pt-BR')}
                    </p>
                    <p className="text-[11px] text-slate-400">
                      Liberação para o vendedor: 25/01/2026 às 12:24
                    </p>
                  </div>
                </div>

                <div className="mt-4 grid gap-3">
                  <Button
                    variant="secondary"
                    className="w-full rounded-full border border-meow-red/30 px-4 py-3 text-xs font-bold text-meow-deep disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={!canDispute}
                    title={
                      !canDispute ? 'Disponível apenas quando Entregue/Concluído' : undefined
                    }
                    onClick={handleOpenDispute}
                  >
                    Reportar compra/vendedor
                  </Button>
                </div>

                <div className="mt-4 text-[11px] text-slate-400">
                  [12:24] O valor desta venda será disponibilizado ao vendedor em
                  25/01/2026 às 12:24. Garanta que todas as etapas da negociação estejam
                  devidamente resolvidas até essa data.
                </div>
                <div className="mt-3 flex items-center gap-2 text-[11px] text-slate-400">
                  <Lock size={12} aria-hidden />
                  Ambiente Seguro Meoww
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="space-y-4">
              <div className="rounded-2xl border border-meow-red/20 bg-white p-6 shadow-[0_10px_24px_rgba(216,107,149,0.12)]">
                <div className="flex flex-wrap items-center gap-6 text-sm text-meow-muted">
                  <div>
                    <span className="text-xs font-semibold uppercase tracking-[0.4px]">Status</span>
                    <p className="text-base font-bold text-meow-charcoal">
                      {statusLabel[state.order.status] ?? state.order.status}
                    </p>
                  </div>
                  <div>
                    <span className="text-xs font-semibold uppercase tracking-[0.4px]">Valor</span>
                    <p className="text-base font-bold text-meow-charcoal">
                      {formatCurrency(state.order.totalAmountCents, state.order.currency)}
                    </p>
                  </div>
                  <div>
                    <span className="text-xs font-semibold uppercase tracking-[0.4px]">Criado em</span>
                    <p className="text-base font-bold text-meow-charcoal">
                      {new Date(state.order.createdAt).toLocaleString('pt-BR')}
                    </p>
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap gap-3">
                  <button
                    className="rounded-full border border-meow-red/30 px-4 py-2 text-xs font-bold text-meow-deep"
                    type="button"
                    disabled={!canCancel}
                    onClick={() =>
                      handleAction(
                        () => ordersApi.cancelOrder(accessToken, orderId),
                        'Pedido cancelado.',
                      )
                    }
                  >
                    Cancelar
                  </button>
                  {canConfirm ? (
                    <button
                      className="rounded-full bg-meow-linear px-4 py-2 text-xs font-bold text-white"
                      type="button"
                      onClick={() =>
                        handleAction(
                          () => ordersApi.confirmReceipt(accessToken, orderId),
                          'Recebimento confirmado.',
                        )
                      }
                    >
                      Confirmar recebimento
                    </button>
                  ) : null}
                  <Button
                    variant="secondary"
                    className="rounded-full border border-meow-red/30 px-4 py-2 text-xs font-bold text-meow-deep disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={!canDispute}
                    title={
                      !canDispute ? 'Disponível apenas quando Entregue/Concluído' : undefined
                    }
                    onClick={handleOpenDispute}
                  >
                    Abrir disputa
                  </Button>
                  <Link
                    className="flex items-center justify-center rounded-full border border-meow-red/30 px-4 py-2 text-xs font-bold text-meow-deep"
                    href={`/conta/tickets?orderId=${orderId}`}
                  >
                    Abrir ticket
                  </Link>
                </div>
              </div>

              <div className="rounded-2xl border border-meow-red/20 bg-white p-6 shadow-[0_10px_24px_rgba(216,107,149,0.12)]">
                <h2 className="text-base font-bold text-meow-charcoal">Itens</h2>
                <div className="mt-4 grid gap-3">
                  {(state.order.items ?? []).map((item) => (
                    <div
                      key={item.id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-meow-red/10 bg-meow-cream/40 px-4 py-3"
                    >
                      <div>
                        <p className="text-sm font-semibold text-meow-charcoal">{item.title}</p>
                        <p className="text-xs text-meow-muted">
                          {item.deliveryType === 'AUTO' ? 'Entrega auto' : 'Entrega manual'}
                        </p>
                      </div>
                      <span className="text-sm font-semibold text-meow-charcoal">
                        {formatCurrency(item.unitPriceCents, state.order?.currency ?? 'BRL')} x{' '}
                        {item.quantity}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-meow-red/20 bg-white p-6 shadow-[0_10px_24px_rgba(216,107,149,0.12)]">
                <h2 className="text-base font-bold text-meow-charcoal">Entrega</h2>
                {deliverySection?.autoItems.length ? (
                  <div className="mt-4 rounded-xl border border-meow-red/20 bg-meow-cream/40 px-4 py-3 text-sm text-meow-muted">
                    <p className="font-semibold text-meow-charcoal">Itens auto</p>
                    {deliverySection.revealAllowed ? (
                      <ul className="mt-2 grid gap-1 text-xs">
                        {deliverySection.autoItems.flatMap((item) =>
                          (item.inventoryItems ?? []).map((inv) => (
                            <li key={inv.id} className="rounded bg-white px-2 py-1 font-mono">
                              {inv.code}
                            </li>
                          )),
                        )}
                      </ul>
                    ) : (
                      <p className="mt-2 text-xs">Disponível após a entrega.</p>
                    )}
                  </div>
                ) : null}

                {deliverySection?.manualItems.length ? (
                  <div className="mt-4 rounded-xl border border-meow-red/20 bg-meow-cream/40 px-4 py-3 text-sm text-meow-muted">
                    <p className="font-semibold text-meow-charcoal">Evidencias (manual)</p>
                    {waitingSellerDelivery ? (
                      <p className="mt-2 text-xs">Aguardando entrega do vendedor.</p>
                    ) : null}
                    {deliverySection.manualItems.some((item) => item.deliveryEvidence?.length) ? (
                      <ul className="mt-2 grid gap-2 text-xs">
                        {deliverySection.manualItems.flatMap((item) =>
                          (item.deliveryEvidence ?? []).map((evidence) => (
                            <li
                              key={evidence.id}
                              className="rounded-lg border border-meow-red/10 bg-white px-3 py-2"
                            >
                              <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-meow-muted">
                                <span className="rounded-full bg-meow-cream px-2 py-0.5 text-[10px] font-semibold text-meow-charcoal">
                                  {evidence.type === 'LINK' || evidence.type === 'URL'
                                    ? 'URL'
                                    : evidence.type === 'FILE'
                                      ? 'FILE'
                                      : 'TEXT'}
                                </span>
                                {evidence.createdAt ? (
                                  <span>
                                    {new Date(evidence.createdAt).toLocaleString('pt-BR')}
                                  </span>
                                ) : null}
                              </div>
                              <div className="mt-1 break-words text-xs text-meow-charcoal">
                                {evidence.type === 'LINK' ||
                                  evidence.type === 'URL' ||
                                  evidence.type === 'FILE' ? (
                                  <a
                                    href={evidence.content}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-meow-deep underline"
                                  >
                                    {evidence.content}
                                  </a>
                                ) : (
                                  evidence.content
                                )}
                              </div>
                              {evidence.createdByUserId ? (
                                <div className="mt-1 text-[11px] text-meow-muted">
                                  Por {evidence.createdByUserId.slice(0, 7).toUpperCase()}
                                </div>
                              ) : null}
                            </li>
                          )),
                        )}
                      </ul>
                    ) : waitingSellerDelivery ? null : (
                      <p className="mt-2 text-xs">Aguardando envio do vendedor.</p>
                    )}

                    {canManageManualDelivery ? (
                      <form onSubmit={handleAddEvidence} className="mt-4 grid gap-3">
                        <div className="grid gap-3 sm:grid-cols-[130px_1fr]">
                          <label className="grid gap-1 text-xs font-semibold text-meow-muted">
                            Tipo
                            <select
                              className="rounded-xl border border-meow-red/20 bg-white px-3 py-2 text-sm text-meow-charcoal"
                              value={evidenceForm.type}
                              disabled={!canManageManualEvidence || evidenceBusy}
                              onChange={(event) =>
                                setEvidenceForm((prev) => ({
                                  ...prev,
                                  type: event.target.value as CreateEvidencePayload['type'],
                                }))
                              }
                            >
                              <option value="TEXT">Texto</option>
                              <option value="URL">URL</option>
                            </select>
                          </label>
                          <label className="grid gap-1 text-xs font-semibold text-meow-muted">
                            ConteÃºdo
                            {evidenceForm.type === 'URL' ? (
                              <input
                                className="rounded-xl border border-meow-red/20 bg-white px-3 py-2 text-sm text-meow-charcoal"
                                placeholder="https://exemplo.com/entrega"
                                value={evidenceForm.content}
                                disabled={!canManageManualEvidence || evidenceBusy}
                                onChange={(event) =>
                                  setEvidenceForm((prev) => ({
                                    ...prev,
                                    content: event.target.value,
                                  }))
                                }
                              />
                            ) : (
                              <textarea
                                className="min-h-[92px] rounded-xl border border-meow-red/20 bg-white px-3 py-2 text-sm text-meow-charcoal"
                                placeholder="Descreva a entrega"
                                value={evidenceForm.content}
                                disabled={!canManageManualEvidence || evidenceBusy}
                                onChange={(event) =>
                                  setEvidenceForm((prev) => ({
                                    ...prev,
                                    content: event.target.value,
                                  }))
                                }
                              />
                            )}
                          </label>
                        </div>
                        {!canManageManualEvidence ? (
                          <p className="text-xs text-meow-muted">
                            Evidencias e marcacao de entrega so podem ser feitas enquanto o pedido
                            estiver em entrega.
                          </p>
                        ) : null}
                        <div className="flex flex-wrap items-center gap-3">
                          <button
                            type="submit"
                            className="rounded-full bg-meow-linear px-4 py-2 text-xs font-bold text-white"
                            disabled={evidenceBusy || !canManageManualEvidence}
                          >
                            {evidenceBusy ? 'Enviando...' : 'Adicionar evidencia'}
                          </button>
                          <button
                            type="button"
                            className="rounded-full border border-meow-red/30 px-4 py-2 text-xs font-bold text-meow-deep"
                            disabled={!canManageManualEvidence}
                            onClick={() =>
                              handleAction(
                                () => ordersApi.markManualDelivered(accessToken, orderId),
                                'Pedido marcado como entregue.',
                              )
                            }
                          >
                            Marcar como entregue
                          </button>
                        </div>
                      </form>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-2xl border border-meow-red/20 bg-white p-6 shadow-[0_10px_24px_rgba(216,107,149,0.12)]">
                <h2 className="text-base font-bold text-meow-charcoal">Pagamento</h2>
                {paymentSummary ? (
                  <div className="mt-3 space-y-3 text-sm text-meow-muted">
                    <div className="flex items-center justify-between">
                      <span>Status</span>
                      <span className="rounded-full bg-meow-cream px-3 py-1 text-xs font-semibold text-meow-charcoal">
                        {paymentStatusLabel[paymentSummary.status]}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Txid</span>
                      <span className="font-mono text-xs text-meow-charcoal">
                        {paymentSummary.txid}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Pago em</span>
                      <span className="text-xs text-meow-charcoal">
                        {paymentSummary.paidAt
                          ? new Date(paymentSummary.paidAt).toLocaleString('pt-BR')
                          : 'Aguardando'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Expira em</span>
                      <span className="text-xs text-meow-charcoal">
                        {paymentSummary.expiresAt
                          ? new Date(paymentSummary.expiresAt).toLocaleString('pt-BR')
                          : 'Não informado'}
                      </span>
                    </div>
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-meow-muted">
                    Nenhuma cobranca registrada ainda.
                  </p>
                )}

                <h3 className="mt-6 text-sm font-bold text-meow-charcoal">Timeline</h3>
                <div className="mt-3 grid gap-3 text-xs text-meow-muted">
                  {state.order.events?.map((event) => (
                    <div key={event.id} className="rounded-xl border border-meow-red/10 bg-meow-cream/40 px-3 py-2">
                      <p className="font-semibold text-meow-charcoal">
                        {eventLabel[event.type] ?? event.type}
                      </p>
                      <span>{new Date(event.createdAt).toLocaleString('pt-BR')}</span>
                      {event.metadata && typeof event.metadata === 'object' ? (
                        <p className="mt-1 text-[11px] text-meow-muted">
                          {event.metadata['from'] ? `De ${event.metadata['from']} ` : ''}
                          {event.metadata['to'] ? `para ${event.metadata['to']}` : ''}
                        </p>
                      ) : null}
                    </div>
                  ))}
                  {state.order.events?.length === 0 ? (
                    <div className="rounded-xl border border-meow-red/20 bg-white px-3 py-2">
                      Nenhum evento registrado.
                    </div>
                  ) : null}
                </div>
              </div>

            </div>
          </div>
        </>
      ) : null}

      {isDisputeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95">
            <h2 className="text-lg font-black text-meow-charcoal">Abrir disputa</h2>
            <p className="mt-2 text-sm text-meow-muted">
              Descreva o motivo da disputa com detalhes para que possamos analisar.
            </p>
            <div className="mt-4">
              <Textarea
                placeholder="Explique o problema (mínimo 10 caracteres)..."
                value={disputeReason}
                onChange={(e) => setDisputeReason(e.target.value)}
                className="min-h-[120px]"
              />
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <Button
                variant="ghost"
                onClick={() => {
                  setIsDisputeModalOpen(false);
                  setDisputeReason('');
                }}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSubmitDispute}
                disabled={!disputeReason || disputeReason.length < 10}
              >
                Confirmar abertura
              </Button>
            </div>
          </div>
        </div>
      )}
    </AccountShell>
  );
};
