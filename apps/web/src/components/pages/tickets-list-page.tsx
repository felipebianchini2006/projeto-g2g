'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

import { ApiClientError } from '../../lib/api-client';
import {
  ticketsApi,
  type CreateTicketInput,
  type Ticket,
  type TicketStatus,
} from '../../lib/tickets-api';
import { useAuth } from '../auth/auth-provider';
import { NotificationsBell } from '../notifications/notifications-bell';

type TicketsListContentProps = {
  initialOrderId?: string;
};

type TicketsState = {
  status: 'loading' | 'ready';
  tickets: Ticket[];
  error?: string;
};

const statusLabel: Record<TicketStatus, string> = {
  OPEN: 'Aberto',
  IN_PROGRESS: 'Em andamento',
  RESOLVED: 'Resolvido',
  CLOSED: 'Fechado',
};

export const TicketsListContent = ({ initialOrderId }: TicketsListContentProps) => {
  const { user, accessToken, loading } = useAuth();
  const [state, setState] = useState<TicketsState>({ status: 'loading', tickets: [] });
  const [filterStatus, setFilterStatus] = useState<TicketStatus | 'all'>('all');
  const [notice, setNotice] = useState<string | null>(null);
  const [formState, setFormState] = useState<CreateTicketInput>({
    orderId: initialOrderId,
    subject: '',
    message: '',
    attachments: [],
  });
  const [attachmentsInput, setAttachmentsInput] = useState('');
  const [busy, setBusy] = useState(false);

  const summaryText = useMemo(() => {
    if (state.status === 'loading') {
      return 'Carregando tickets...';
    }
    if (state.tickets.length === 0) {
      return 'Nenhum ticket encontrado.';
    }
    return `${state.tickets.length} tickets encontrados.`;
  }, [state]);

  useEffect(() => {
    if (!accessToken) {
      return;
    }
    let active = true;
    const loadTickets = async () => {
      setState((prev) => ({ ...prev, status: 'loading', error: undefined }));
      try {
        const tickets = await ticketsApi.listTickets(
          accessToken,
          filterStatus === 'all' ? undefined : filterStatus,
        );
        if (!active) {
          return;
        }
        setState({ status: 'ready', tickets });
      } catch (error) {
        if (!active) {
          return;
        }
        const message =
          error instanceof ApiClientError
            ? error.message
            : error instanceof Error
              ? error.message
              : 'Nao foi possivel carregar tickets.';
        setState({ status: 'ready', tickets: [], error: message });
      }
    };
    loadTickets();
    return () => {
      active = false;
    };
  }, [accessToken, filterStatus]);

  const handleCreateTicket = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!accessToken) {
      return;
    }
    setBusy(true);
    setNotice(null);
    try {
      const attachments = attachmentsInput
        .split(/[\n,;]+/)
        .map((value) => value.trim())
        .filter(Boolean);
      const payload: CreateTicketInput = {
        ...formState,
        subject: formState.subject.trim(),
        message: formState.message.trim(),
        orderId: formState.orderId?.trim() || undefined,
        attachments: attachments.length ? attachments : undefined,
      };
      const created = await ticketsApi.createTicket(accessToken, payload);
      setState((prev) => ({ ...prev, tickets: [created, ...prev.tickets] }));
      setFormState({ orderId: formState.orderId, subject: '', message: '' });
      setAttachmentsInput('');
      setNotice('Ticket aberto com sucesso.');
    } catch (error) {
      const message =
        error instanceof ApiClientError
          ? error.message
          : error instanceof Error
            ? error.message
            : 'Nao foi possivel abrir o ticket.';
      setNotice(message);
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="tickets-shell">
        <div className="state-card">Carregando sessao...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="tickets-shell">
        <div className="state-card">Entre para acessar seus tickets.</div>
        <Link className="primary-button" href="/login">
          Fazer login
        </Link>
      </div>
    );
  }

  return (
    <section className="tickets-shell">
      <div className="tickets-header">
        <div>
          <h1>Tickets</h1>
          <p className="auth-helper">{summaryText}</p>
        </div>
        <div className="page-actions">
          <NotificationsBell />
          <Link className="ghost-button" href="/conta">
            Voltar para conta
          </Link>
        </div>
      </div>

      {state.error ? <div className="state-card error">{state.error}</div> : null}
      {notice ? <div className="state-card info">{notice}</div> : null}

      <div className="tickets-grid">
        <div className="order-card">
          <div className="panel-header">
            <h2>Seus tickets</h2>
            <select
              className="form-input"
              value={filterStatus}
              onChange={(event) => setFilterStatus(event.target.value as TicketStatus | 'all')}
            >
              <option value="all">Todos</option>
              <option value="OPEN">Abertos</option>
              <option value="IN_PROGRESS">Em andamento</option>
              <option value="RESOLVED">Resolvidos</option>
              <option value="CLOSED">Fechados</option>
            </select>
          </div>

          {state.status === 'loading' ? <div className="state-card">Carregando...</div> : null}

          {state.tickets.length === 0 && state.status === 'ready' ? (
            <div className="state-card">Nenhum ticket ainda.</div>
          ) : null}

          <div className="tickets-list">
            {state.tickets.map((ticket) => (
              <Link className="ticket-row" key={ticket.id} href={`/conta/tickets/${ticket.id}`}>
                <div>
                  <strong>{ticket.subject}</strong>
                  <span className="auth-helper">
                    {ticket.orderId ? `Pedido ${ticket.orderId.slice(0, 8)}` : 'Sem pedido'}
                  </span>
                </div>
                <div className="ticket-meta">
                  <span className={`status-pill status-${ticket.status.toLowerCase()}`}>
                    {statusLabel[ticket.status]}
                  </span>
                  <small>{new Date(ticket.createdAt).toLocaleDateString('pt-BR')}</small>
                </div>
              </Link>
            ))}
          </div>
        </div>

        <div className="order-card">
          <h2>Abrir ticket</h2>
          <p className="auth-helper">Anexos sao opcionais (MVP).</p>
          <form className="ticket-form" onSubmit={handleCreateTicket}>
            <label className="form-field">
              Pedido (opcional)
              <input
                className="form-input"
                value={formState.orderId ?? ''}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, orderId: event.target.value }))
                }
                placeholder="UUID do pedido"
              />
            </label>
            <label className="form-field">
              Assunto
              <input
                className="form-input"
                value={formState.subject}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, subject: event.target.value }))
                }
                placeholder="Resumo do problema"
                required
              />
            </label>
            <label className="form-field">
              Mensagem inicial
              <textarea
                className="form-textarea"
                rows={4}
                value={formState.message}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, message: event.target.value }))
                }
                placeholder="Explique o que aconteceu"
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
              {busy ? 'Enviando...' : 'Abrir ticket'}
            </button>
          </form>
        </div>
      </div>
    </section>
  );
};
