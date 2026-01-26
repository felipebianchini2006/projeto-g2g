'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

import { ApiClientError } from '../../lib/api-client';
import { chatApi, type ChatMessage } from '../../lib/chat-api';
import { disputesApi, type Dispute } from '../../lib/disputes-api';
import { ordersApi, type Order } from '../../lib/orders-api';
import { hasAdminPermission } from '../../lib/admin-permissions';
import { useAuth } from '../auth/auth-provider';
import { AdminShell } from '../admin/admin-shell';

import { Badge } from '../ui/badge';
import { buttonVariants } from '../ui/button';
import { Card } from '../ui/card';

type AdminDisputeDetailContentProps = {
  disputeId: string;
};

const eventLabel: Record<string, string> = {
  CREATED: 'Pedido criado',
  AWAITING_PAYMENT: 'Aguardando pagamento',
  PAID: 'Pagamento confirmado',
  IN_DELIVERY: 'Entrega iniciada',
  DELIVERED: 'Pedido entregue',
  COMPLETED: 'Pedido concluído',
  CANCELLED: 'Pedido cancelado',
  DISPUTED: 'Disputa aberta',
  REFUNDED: 'Pedido reembolsado',
  NOTE: 'Atualizacao',
};

const disputeBadge: Record<string, 'warning' | 'info' | 'success' | 'danger' | 'neutral'> = {
  OPEN: 'danger',
  REVIEW: 'warning',
  RESOLVED: 'success',
  REJECTED: 'neutral',
};

export const AdminDisputeDetailContent = ({ disputeId }: AdminDisputeDetailContentProps) => {
  const { user, accessToken, loading } = useAuth();
  const [dispute, setDispute] = useState<Dispute | null>(null);
  const [order, setOrder] = useState<Order | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatCursor, setChatCursor] = useState<string | null>(null);
  const [chatBusy, setChatBusy] = useState(false);
  const [hasMoreChat, setHasMoreChat] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [actionBusy, setActionBusy] = useState(false);

  const loadDispute = async () => {
    if (!accessToken || !disputeId) {
      return;
    }
    try {
      const data = await disputesApi.getDispute(accessToken, disputeId);
      setDispute(data);
    } catch (error) {
      const message =
        error instanceof ApiClientError
          ? error.message
          : error instanceof Error
            ? error.message
            : 'Não foi possível carregar a disputa.';
      setError(message);
    }
  };

  const loadOrder = async (orderId: string) => {
    if (!accessToken) {
      return;
    }
    try {
      const data = await ordersApi.getOrder(accessToken, orderId);
      setOrder(data);
    } catch (error) {
      const message =
        error instanceof ApiClientError
          ? error.message
          : error instanceof Error
            ? error.message
            : 'Não foi possível carregar o pedido.';
      setError(message);
    }
  };

  const loadChat = async (orderId: string, cursor?: string | null) => {
    if (!accessToken || chatBusy || !hasMoreChat) {
      return;
    }
    setChatBusy(true);
    try {
      const data = await chatApi.listOrderMessages(accessToken, orderId, cursor ?? undefined, 20);
      if (data.messages.length === 0) {
        setHasMoreChat(false);
      } else {
        const nextCursor = data.messages[data.messages.length - 1]?.createdAt;
        setChatCursor(nextCursor);
        setChatMessages((prev) => [...prev, ...data.messages]);
      }
    } catch (error) {
      const message =
        error instanceof ApiClientError
          ? error.message
          : error instanceof Error
            ? error.message
            : 'Não foi possível carregar o chat.';
      setNotice(message);
    } finally {
      setChatBusy(false);
    }
  };

  useEffect(() => {
    if (accessToken && disputeId) {
      loadDispute();
    }
  }, [accessToken, disputeId]);

  useEffect(() => {
    if (dispute?.orderId) {
      loadOrder(dispute.orderId);
      loadChat(dispute.orderId);
    }
  }, [dispute?.orderId]);

  const chatView = useMemo(() => [...chatMessages].reverse(), [chatMessages]);

  const handleResolve = async (action: 'release' | 'refund') => {
    if (!accessToken || !dispute) {
      return;
    }
    setActionBusy(true);
    setNotice(null);
    try {
      const result = await disputesApi.resolveDispute(accessToken, dispute.id, { action });
      setNotice(`Disputa ${result.status}.`);
      await loadDispute();
      if (dispute.orderId) {
        await loadOrder(dispute.orderId);
      }
    } catch (error) {
      const message =
        error instanceof ApiClientError
          ? error.message
          : error instanceof Error
            ? error.message
            : 'Não foi possível resolver a disputa.';
      setNotice(message);
    } finally {
      setActionBusy(false);
    }
  };

  if (loading) {
    return (
      <section className="bg-white px-6 py-12">
        <div className="mx-auto w-full max-w-[1200px] rounded-2xl border border-meow-red/20 bg-white px-6 py-4 text-sm text-meow-muted">
          Carregando sessão...
        </div>
      </section>
    );
  }

  if (!user || !hasAdminPermission(user, 'admin.disputes')) {
    return (
      <section className="bg-white px-6 py-12">
        <div className="mx-auto w-full max-w-[1200px] rounded-2xl border border-meow-red/20 bg-white px-6 py-6 text-center">
          <p className="text-sm text-meow-muted">Acesso restrito ao admin.</p>
          <Link
            className="mt-4 inline-flex rounded-full border border-meow-red/30 px-6 py-2 text-sm font-bold text-meow-deep"
            href="/conta"
          >
            Voltar para conta
          </Link>
        </div>
      </section>
    );
  }

  return (
    <AdminShell
      breadcrumbs={[
        { label: 'Inicio', href: '/' },
        { label: 'Admin', href: '/admin/atendimento' },
        { label: 'Disputas', href: '/admin/disputas' },
        { label: 'Detalhe' },
      ]}
    >
      <Card className="rounded-2xl border border-slate-100 p-6 shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-black text-meow-charcoal">Decisão de disputa</h1>
            <p className="mt-2 text-sm text-meow-muted">
              Analise dados do pedido antes da decisão.
            </p>
          </div>
          <div className="flex items-center gap-2">

            <Link
              className={buttonVariants({ variant: 'secondary', size: 'sm' })}
              href="/admin/atendimento"
            >
              Voltar
            </Link>
          </div>
        </div>
      </Card>

      {notice ? (
        <div className="rounded-2xl border border-meow-red/20 bg-meow-50 px-4 py-3 text-sm text-meow-muted">
          {notice}
        </div>
      ) : null}

      {!dispute ? (
        <div className={`rounded-2xl border px-4 py-3 text-sm ${error ? 'border-red-200 bg-red-50 text-red-700' : 'border-meow-red/20 bg-white text-meow-muted'}`}>
          {error ?? 'Carregando disputa...'}
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="rounded-2xl border border-slate-100 p-6 shadow-card">
            <h3 className="text-base font-bold text-meow-charcoal">Resumo</h3>
            <div className="mt-4 grid gap-3 text-sm text-meow-muted">
              <div className="flex items-center justify-between">
                <span>Status</span>
                <Badge variant={disputeBadge[dispute.status] ?? 'neutral'}>{dispute.status}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span>Criado em</span>
                <strong className="text-meow-charcoal">
                  {new Date(dispute.createdAt).toLocaleString('pt-BR')}
                </strong>
              </div>
              <div className="flex items-center justify-between">
                <span>Ticket</span>
                <Link className="font-mono text-xs text-meow-deep" href={`/conta/tickets/${dispute.ticketId}`}>
                  {dispute.ticketId.slice(0, 8)}
                </Link>
              </div>
              <div className="flex items-center justify-between">
                <span>Pedido</span>
                <strong className="text-meow-charcoal">{dispute.orderId.slice(0, 8)}</strong>
              </div>
            </div>
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              {dispute.reason}
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                className={buttonVariants({ variant: 'primary', size: 'sm' })}
                type="button"
                onClick={() => handleResolve('release')}
                disabled={actionBusy}
              >
                {actionBusy ? 'Processando...' : 'Liberar seller'}
              </button>
              <button
                className={buttonVariants({ variant: 'secondary', size: 'sm' })}
                type="button"
                onClick={() => handleResolve('refund')}
                disabled={actionBusy}
              >
                {actionBusy ? 'Processando...' : 'Reembolsar'}
              </button>
              <button className={buttonVariants({ variant: 'ghost', size: 'sm' })} type="button" disabled>
                Parcial (MVP)
              </button>
            </div>
          </Card>

          <Card className="rounded-2xl border border-slate-100 p-6 shadow-card">
            <h3 className="text-base font-bold text-meow-charcoal">Pedido</h3>
            {order ? (
              <div className="mt-4 grid gap-3 text-sm text-meow-muted">
                <div className="flex items-center justify-between">
                  <span>Status</span>
                  <strong className="text-meow-charcoal">{order.status}</strong>
                </div>
                <div className="flex items-center justify-between">
                  <span>Valor</span>
                  <strong className="text-meow-charcoal">
                    {new Intl.NumberFormat('pt-BR', {
                      style: 'currency',
                      currency: order.currency,
                    }).format(order.totalAmountCents / 100)}
                  </strong>
                </div>
                <div className="flex items-center justify-between">
                  <span>Criado em</span>
                  <strong className="text-meow-charcoal">
                    {new Date(order.createdAt).toLocaleString('pt-BR')}
                  </strong>
                </div>
              </div>
            ) : (
              <div className="mt-4 rounded-xl border border-meow-red/20 bg-white px-3 py-2 text-sm text-meow-muted">
                Carregando pedido...
              </div>
            )}

            <h3 className="mt-6 text-base font-bold text-meow-charcoal">Eventos</h3>
            <div className="mt-3 grid gap-2 text-xs text-meow-muted">
              {order?.events?.map((event) => (
                <div key={event.id} className="rounded-xl border border-meow-red/10 bg-meow-50/60 px-3 py-2">
                  <p className="font-semibold text-meow-charcoal">
                    {eventLabel[event.type] ?? event.type}
                  </p>
                  <span>{new Date(event.createdAt).toLocaleString('pt-BR')}</span>
                </div>
              ))}
              {order?.events?.length === 0 ? (
                <div className="rounded-xl border border-meow-red/20 bg-white px-3 py-2">
                  Nenhum evento registrado.
                </div>
              ) : null}
            </div>
          </Card>

          <Card className="rounded-2xl border border-slate-100 p-6 shadow-card">
            <h3 className="text-base font-bold text-meow-charcoal">Evidencias</h3>
            {order?.items?.length ? (
              <div className="mt-4 grid gap-3">
                {order.items.map((item) => (
                  <div key={item.id} className="rounded-xl border border-meow-red/10 bg-meow-50/60 px-4 py-3">
                    <strong className="text-sm text-meow-charcoal">{item.title}</strong>
                    {item.inventoryItems?.length ? (
                      <ul className="mt-2 grid gap-1 text-xs text-meow-muted">
                        {item.inventoryItems.map((inv) => (
                          <li key={inv.id} className="rounded bg-white px-2 py-1 font-mono">
                            {inv.code}
                          </li>
                        ))}
                      </ul>
                    ) : null}
                    {item.deliveryEvidence?.length ? (
                      <ul className="mt-2 grid gap-1 text-xs text-meow-muted">
                        {item.deliveryEvidence.map((evidence) => (
                          <li key={evidence.id}>{evidence.content}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-2 text-xs text-meow-muted">Sem evidencias enviadas.</p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-4 rounded-xl border border-meow-red/20 bg-white px-3 py-2 text-sm text-meow-muted">
                Nenhuma evidencia registrada.
              </div>
            )}
          </Card>

          <Card className="rounded-2xl border border-slate-100 p-6 shadow-card">
            <h3 className="text-base font-bold text-meow-charcoal">Chat</h3>
            {chatView.length === 0 ? (
              <div className="mt-4 rounded-xl border border-meow-red/20 bg-white px-3 py-2 text-sm text-meow-muted">
                Nenhuma mensagem no chat.
              </div>
            ) : (
              <div className="mt-4 grid gap-3">
                {chatView.map((message) => (
                  <div key={message.id} className="rounded-xl border border-meow-red/10 bg-meow-50/60 px-3 py-2">
                    <p className="text-sm text-meow-charcoal">{message.content}</p>
                    <div className="mt-1 flex items-center justify-between text-[10px] text-meow-muted">
                      <span>{message.senderId.slice(0, 8)}</span>
                      <small>{new Date(message.createdAt).toLocaleString('pt-BR')}</small>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {hasMoreChat ? (
              <button
                className={`mt-4 ${buttonVariants({ variant: 'secondary', size: 'sm' })}`}
                type="button"
                onClick={() => dispute?.orderId && loadChat(dispute.orderId, chatCursor)}
                disabled={chatBusy}
              >
                {chatBusy ? 'Carregando...' : 'Carregar mais'}
              </button>
            ) : null}
          </Card>
        </div>
      )}
    </AdminShell>
  );
};
