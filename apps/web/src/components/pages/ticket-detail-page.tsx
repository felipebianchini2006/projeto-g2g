'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

import { ApiClientError } from '../../lib/api-client';
import {
  ticketsApi,
  type Ticket,
  type TicketMessage,
  type TicketStatus,
} from '../../lib/tickets-api';
import { useAuth } from '../auth/auth-provider';

type TicketDetailContentProps = {
  ticketId: string;
};

const statusLabel: Record<TicketStatus, string> = {
  OPEN: 'Aberto',
  IN_PROGRESS: 'Em andamento',
  RESOLVED: 'Resolvido',
  CLOSED: 'Fechado',
};

export const TicketDetailContent = ({ ticketId }: TicketDetailContentProps) => {
  const { user, accessToken, loading } = useAuth();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [attachmentsInput, setAttachmentsInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const loadTicket = async () => {
    if (!accessToken) {
      return;
    }
    setError(null);
    try {
      const data = await ticketsApi.getTicket(accessToken, ticketId);
      setTicket(data);
      setMessages(data.messages ?? []);
    } catch (error) {
      const message =
        error instanceof ApiClientError
          ? error.message
          : error instanceof Error
            ? error.message
            : 'Nao foi possivel carregar o ticket.';
      setError(message);
    }
  };

  useEffect(() => {
    if (accessToken) {
      loadTicket();
    }
  }, [accessToken, ticketId]);

  const summaryText = useMemo(() => {
    if (!ticket) {
      return 'Carregando ticket...';
    }
    return `${messages.length} mensagens registradas.`;
  }, [ticket, messages.length]);

  const handleSendMessage = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!accessToken || !ticket) {
      return;
    }
    if (!draft.trim()) {
      return;
    }
    setBusy(true);
    setNotice(null);
    try {
      const attachments = attachmentsInput
        .split(/[\n,;]+/)
        .map((value) => value.trim())
        .filter(Boolean);
      const message = await ticketsApi.addMessage(accessToken, ticket.id, {
        message: draft.trim(),
        attachments: attachments.length ? attachments : undefined,
      });
      setMessages((prev) => [...prev, message]);
      setDraft('');
      setAttachmentsInput('');
    } catch (error) {
      const message =
        error instanceof ApiClientError
          ? error.message
          : error instanceof Error
            ? error.message
            : 'Nao foi possivel enviar a mensagem.';
      setNotice(message);
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="ticket-detail-shell">
        <div className="state-card">Carregando sessao...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="ticket-detail-shell">
        <div className="state-card">Entre para acessar o ticket.</div>
        <Link className="primary-button" href="/login">
          Fazer login
        </Link>
      </div>
    );
  }

  return (
    <section className="ticket-detail-shell">
      <div className="ticket-detail-header">
        <div>
          <h1>Ticket #{ticketId.slice(0, 8)}</h1>
          <p className="auth-helper">{summaryText}</p>
        </div>
        <Link className="ghost-button" href="/dashboard/tickets">
          Voltar
        </Link>
      </div>

      {error ? <div className="state-card error">{error}</div> : null}
      {notice ? <div className="state-card info">{notice}</div> : null}

      {!ticket ? (
        <div className="state-card">Carregando ticket...</div>
      ) : (
        <div className="ticket-detail-grid">
          <div className="order-card">
            <div className="ticket-summary">
              <div>
                <span className="summary-label">Status</span>
                <strong>{statusLabel[ticket.status]}</strong>
              </div>
              <div>
                <span className="summary-label">Criado</span>
                <strong>{new Date(ticket.createdAt).toLocaleString('pt-BR')}</strong>
              </div>
              <div>
                <span className="summary-label">Pedido</span>
                <strong>{ticket.orderId ? ticket.orderId.slice(0, 8) : 'N/A'}</strong>
              </div>
            </div>

            <div className="ticket-messages">
              {messages.length === 0 ? (
                <div className="state-card">Nenhuma mensagem ainda.</div>
              ) : (
                messages.map((message) => (
                  <div
                    className={`ticket-message${message.senderId === user.id ? ' own' : ''}`}
                    key={message.id}
                  >
                    <p>{message.message}</p>
                    <span>
                      {message.senderId === user.id ? 'Voce' : 'Outro usuario'} ·{' '}
                      {new Date(message.createdAt).toLocaleString('pt-BR')}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="order-card">
            <h3>Nova mensagem</h3>
            <p className="auth-helper">Anexos sao opcionais (MVP).</p>
            <form className="ticket-form" onSubmit={handleSendMessage}>
              <label className="form-field">
                Mensagem
                <textarea
                  className="form-textarea"
                  rows={4}
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  placeholder="Escreva a atualizacao"
                  required
                />
              </label>
              <label className="form-field">
                Anexos (links)
                <textarea
                  className="form-textarea"
                  rows={2}
                  value={attachmentsInput}
                  onChange={(event) => setAttachmentsInput(event.target.value)}
                  placeholder="Opcional: URLs separadas por virgula"
                />
              </label>
              <button className="primary-button" type="submit" disabled={busy}>
                {busy ? 'Enviando...' : 'Enviar mensagem'}
              </button>
            </form>
          </div>
        </div>
      )}
    </section>
  );
};
