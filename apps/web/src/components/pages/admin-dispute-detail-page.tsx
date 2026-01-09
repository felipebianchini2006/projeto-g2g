'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

import { ApiClientError } from '../../lib/api-client';
import { chatApi, type ChatMessage } from '../../lib/chat-api';
import { disputesApi, type Dispute } from '../../lib/disputes-api';
import { ordersApi, type Order } from '../../lib/orders-api';
import { useAuth } from '../auth/auth-provider';
import { AdminShell } from '../admin/admin-shell';
import { NotificationsBell } from '../notifications/notifications-bell';

type AdminDisputeDetailContentProps = {
  disputeId: string;
};

const eventLabel: Record<string, string> = {
  CREATED: 'Pedido criado',
  AWAITING_PAYMENT: 'Aguardando pagamento',
  PAID: 'Pagamento confirmado',
  IN_DELIVERY: 'Entrega iniciada',
  DELIVERED: 'Pedido entregue',
  COMPLETED: 'Pedido concluido',
  CANCELLED: 'Pedido cancelado',
  DISPUTED: 'Disputa aberta',
  REFUNDED: 'Pedido reembolsado',
  NOTE: 'Atualizacao',
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
            : 'Nao foi possivel carregar a disputa.';
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
            : 'Nao foi possivel carregar o pedido.';
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
      if (data.length === 0) {
        setHasMoreChat(false);
      } else {
        const nextCursor = data[data.length - 1]?.createdAt;
        setChatCursor(nextCursor);
        setChatMessages((prev) => [...prev, ...data]);
      }
    } catch (error) {
      const message =
        error instanceof ApiClientError
          ? error.message
          : error instanceof Error
            ? error.message
            : 'Nao foi possivel carregar o chat.';
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
            : 'Nao foi possivel resolver a disputa.';
      setNotice(message);
    } finally {
      setActionBusy(false);
    }
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

  if (!user || user.role !== 'ADMIN') {
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
      <div className="rounded-2xl border border-meow-red/20 bg-white p-6 shadow-[0_10px_24px_rgba(216,107,149,0.12)]">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-black text-meow-charcoal">Decisao de disputa</h1>
            <p className="mt-2 text-sm text-meow-muted">
              Analise dados do pedido antes da decisao.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <NotificationsBell />
            <Link
              className="rounded-full border border-meow-red/30 px-4 py-2 text-xs font-bold text-meow-deep"
              href="/admin/atendimento"
            >
              Voltar
            </Link>
          </div>
        </div>
      </div>

      {notice ? <div className="state-card info">{notice}</div> : null}

      {!dispute ? (
        <div className={`state-card${error ? ' error' : ''}`}>
          {error ?? 'Carregando disputa...'}
        </div>
      ) : (
        <div className="admin-dispute-grid">
          <div className="order-card">
            <h3>Resumo</h3>
            <div className="ticket-summary">
              <div>
                <span className="summary-label">Status</span>
                <strong>{dispute.status}</strong>
              </div>
              <div>
                <span className="summary-label">Criado em</span>
                <strong>{new Date(dispute.createdAt).toLocaleString('pt-BR')}</strong>
              </div>
              <div>
                <span className="summary-label">Ticket</span>
                <Link className="mono" href={`/conta/tickets/${dispute.ticketId}`}>
                  {dispute.ticketId.slice(0, 8)}
                </Link>
              </div>
              <div>
                <span className="summary-label">Pedido</span>
                <strong>{dispute.orderId.slice(0, 8)}</strong>
              </div>
            </div>
            <div className="state-card info">{dispute.reason}</div>

            <div className="order-actions">
              <button
                className="primary-button"
                type="button"
                onClick={() => handleResolve('release')}
                disabled={actionBusy}
              >
                {actionBusy ? 'Processando...' : 'Liberar seller'}
              </button>
              <button
                className="ghost-button"
                type="button"
                onClick={() => handleResolve('refund')}
                disabled={actionBusy}
              >
                {actionBusy ? 'Processando...' : 'Reembolsar buyer'}
              </button>
              <button className="ghost-button" type="button" disabled>
                Parcial (MVP)
              </button>
            </div>
          </div>

          <div className="order-card">
            <h3>Pedido</h3>
            {order ? (
              <div className="order-summary">
                <div>
                  <span className="summary-label">Status</span>
                  <strong>{order.status}</strong>
                </div>
                <div>
                  <span className="summary-label">Valor</span>
                  <strong>
                    {new Intl.NumberFormat('pt-BR', {
                      style: 'currency',
                      currency: order.currency,
                    }).format(order.totalAmountCents / 100)}
                  </strong>
                </div>
                <div>
                  <span className="summary-label">Criado em</span>
                  <strong>{new Date(order.createdAt).toLocaleString('pt-BR')}</strong>
                </div>
              </div>
            ) : (
              <div className="state-card">Carregando pedido...</div>
            )}

            <h3>Eventos</h3>
            <div className="timeline">
              {order?.events?.map((event) => (
                <div className="timeline-item" key={event.id}>
                  <div className="timeline-dot" />
                  <div>
                    <strong>{eventLabel[event.type] ?? event.type}</strong>
                    <span>{new Date(event.createdAt).toLocaleString('pt-BR')}</span>
                  </div>
                </div>
              ))}
              {order?.events?.length === 0 ? (
                <div className="state-card">Nenhum evento registrado.</div>
              ) : null}
            </div>
          </div>

          <div className="order-card">
            <h3>Evidencias</h3>
            {order?.items?.length ? (
              <div className="delivery-block">
                {order.items.map((item) => (
                  <div key={item.id} className="ticket-evidence">
                    <strong>{item.title}</strong>
                    {item.inventoryItems?.length ? (
                      <ul>
                        {item.inventoryItems.map((inv) => (
                          <li key={inv.id} className="mono">
                            {inv.code}
                          </li>
                        ))}
                      </ul>
                    ) : null}
                    {item.deliveryEvidence?.length ? (
                      <ul>
                        {item.deliveryEvidence.map((evidence) => (
                          <li key={evidence.id}>{evidence.content}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="auth-helper">Sem evidencias enviadas.</p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="state-card">Nenhuma evidencia registrada.</div>
            )}
          </div>

          <div className="order-card">
            <h3>Chat</h3>
            {chatView.length === 0 ? (
              <div className="state-card">Nenhuma mensagem no chat.</div>
            ) : (
              <div className="chat-log">
                {chatView.map((message) => (
                  <div className="chat-message" key={message.id}>
                    <p className="chat-text">{message.content}</p>
                    <div className="chat-meta">
                      <span>{message.senderId.slice(0, 8)}</span>
                      <small>{new Date(message.createdAt).toLocaleString('pt-BR')}</small>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {hasMoreChat ? (
              <button
                className="ghost-button"
                type="button"
                onClick={() => dispute?.orderId && loadChat(dispute.orderId, chatCursor)}
                disabled={chatBusy}
              >
                {chatBusy ? 'Carregando...' : 'Carregar mais'}
              </button>
            ) : null}
          </div>
        </div>
      )}
    </AdminShell>
  );
};
