'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

import { ApiClientError } from '../../lib/api-client';
import { disputesApi, type Dispute, type DisputeStatus } from '../../lib/disputes-api';
import { ticketsApi, type Ticket, type TicketStatus } from '../../lib/tickets-api';
import { useAuth } from '../auth/auth-provider';
import { AdminShell } from '../admin/admin-shell';
import { NotificationsBell } from '../notifications/notifications-bell';
import { Select } from '../ui/select';

type SupportState<T> = {
  status: 'loading' | 'ready';
  items: T[];
  error?: string;
};

const ticketStatusLabel: Record<TicketStatus, string> = {
  OPEN: 'Aberto',
  IN_PROGRESS: 'Em andamento',
  RESOLVED: 'Resolvido',
  CLOSED: 'Fechado',
};

const disputeStatusLabel: Record<DisputeStatus, string> = {
  OPEN: 'Aberto',
  REVIEW: 'Em revisao',
  RESOLVED: 'Resolvido',
  REJECTED: 'Rejeitado',
};

const SLA_OPTIONS = [
  { value: 'all', label: 'Todos' },
  { value: 'over_24', label: '+24h' },
  { value: 'over_72', label: '+72h' },
  { value: 'over_168', label: '+7 dias' },
] as const;

type SlaFilter = (typeof SLA_OPTIONS)[number]['value'];

const isOverSla = (createdAt: string, filter: SlaFilter) => {
  if (filter === 'all') {
    return true;
  }
  const diffHours = (Date.now() - new Date(createdAt).getTime()) / 3600000;
  if (filter === 'over_24') {
    return diffHours >= 24;
  }
  if (filter === 'over_72') {
    return diffHours >= 72;
  }
  return diffHours >= 168;
};

export const AdminSupportContent = () => {
  const { user, accessToken, loading } = useAuth();
  const [ticketState, setTicketState] = useState<SupportState<Ticket>>({
    status: 'loading',
    items: [],
  });
  const [disputeState, setDisputeState] = useState<SupportState<Dispute>>({
    status: 'loading',
    items: [],
  });
  const [ticketFilter, setTicketFilter] = useState<TicketStatus | 'all'>('all');
  const [disputeFilter, setDisputeFilter] = useState<DisputeStatus | 'all'>('all');
  const [slaFilter, setSlaFilter] = useState<SlaFilter>('all');

  useEffect(() => {
    if (!accessToken || user?.role !== 'ADMIN') {
      return;
    }
    let active = true;
    const loadTickets = async () => {
      setTicketState((prev) => ({ ...prev, status: 'loading', error: undefined }));
      try {
        const tickets = await ticketsApi.listTickets(
          accessToken,
          ticketFilter === 'all' ? undefined : ticketFilter,
        );
        if (!active) {
          return;
        }
        setTicketState({ status: 'ready', items: tickets });
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
        setTicketState({ status: 'ready', items: [], error: message });
      }
    };
    loadTickets();
    return () => {
      active = false;
    };
  }, [accessToken, ticketFilter, user?.role]);

  useEffect(() => {
    if (!accessToken || user?.role !== 'ADMIN') {
      return;
    }
    let active = true;
    const loadDisputes = async () => {
      setDisputeState((prev) => ({ ...prev, status: 'loading', error: undefined }));
      try {
        const disputes = await disputesApi.listDisputes(
          accessToken,
          disputeFilter === 'all' ? undefined : disputeFilter,
        );
        if (!active) {
          return;
        }
        setDisputeState({ status: 'ready', items: disputes });
      } catch (error) {
        if (!active) {
          return;
        }
        const message =
          error instanceof ApiClientError
            ? error.message
            : error instanceof Error
              ? error.message
              : 'Nao foi possivel carregar disputas.';
        setDisputeState({ status: 'ready', items: [], error: message });
      }
    };
    loadDisputes();
    return () => {
      active = false;
    };
  }, [accessToken, disputeFilter, user?.role]);

  const filteredTickets = useMemo(
    () => ticketState.items.filter((ticket) => isOverSla(ticket.createdAt, slaFilter)),
    [ticketState.items, slaFilter],
  );

  const filteredDisputes = useMemo(
    () =>
      disputeState.items.filter((dispute) =>
        isOverSla(dispute.createdAt, slaFilter),
      ),
    [disputeState.items, slaFilter],
  );

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
        { label: 'Atendimento' },
      ]}
    >
      <div className="rounded-2xl border border-meow-red/20 bg-white p-6 shadow-[0_10px_24px_rgba(216,107,149,0.12)]">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-black text-meow-charcoal">Fila de suporte</h1>
            <p className="mt-2 text-sm text-meow-muted">
              Tickets e disputas pendentes de avaliacao.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <NotificationsBell />
            <Link
              className="rounded-full border border-meow-red/30 px-4 py-2 text-xs font-bold text-meow-deep"
              href="/conta"
            >
              Voltar para conta
            </Link>
          </div>
        </div>
      </div>

      <div className="support-filters">
        <div className="form-field">
          <span className="summary-label">SLA</span>
          <Select
            value={slaFilter}
            onChange={(event) => setSlaFilter(event.target.value as SlaFilter)}
          >
            {SLA_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </div>
        <div className="form-field">
          <span className="summary-label">Tickets</span>
          <Select
            value={ticketFilter}
            onChange={(event) => setTicketFilter(event.target.value as TicketStatus | 'all')}
          >
            <option value="all">Todos</option>
            <option value="OPEN">Abertos</option>
            <option value="IN_PROGRESS">Em andamento</option>
            <option value="RESOLVED">Resolvidos</option>
            <option value="CLOSED">Fechados</option>
          </Select>
        </div>
        <div className="form-field">
          <span className="summary-label">Disputas</span>
          <Select
            value={disputeFilter}
            onChange={(event) => setDisputeFilter(event.target.value as DisputeStatus | 'all')}
          >
            <option value="all">Todas</option>
            <option value="OPEN">Abertas</option>
            <option value="REVIEW">Em revisao</option>
            <option value="RESOLVED">Resolvidas</option>
            <option value="REJECTED">Rejeitadas</option>
          </Select>
        </div>
      </div>

      <div className="support-grid">
        <div className="order-card">
          <div className="panel-header">
            <h2>Disputas</h2>
            <span className="auth-helper">{filteredDisputes.length} itens</span>
          </div>
          {disputeState.error ? <div className="state-card error">{disputeState.error}</div> : null}
          {disputeState.status === 'loading' ? (
            <div className="state-card">Carregando disputas...</div>
          ) : null}
          {filteredDisputes.length === 0 && disputeState.status === 'ready' ? (
            <div className="state-card">Nenhuma disputa encontrada.</div>
          ) : null}
          <div className="support-list">
            {filteredDisputes.map((dispute) => (
              <Link
                className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-red-100 bg-red-50/60 px-5 py-4 shadow-card"
                href={`/admin/disputas/${dispute.id}`}
                key={dispute.id}
              >
                <div className="flex items-center gap-4">
                  <span className="rounded-lg bg-red-100 px-3 py-1 text-xs font-bold text-red-600">
                    {dispute.status === 'OPEN' ? 'Em aberto' : disputeStatusLabel[dispute.status]}
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-meow-charcoal">
                      Reclamacao #{dispute.orderId.slice(0, 6)}
                    </p>
                    <p className="text-xs text-meow-muted">
                      {dispute.ticket?.subject ?? 'Sem ticket'} • Prazo para resposta: 12h
                    </p>
                  </div>
                </div>
                <span className="rounded-2xl bg-red-500 px-4 py-2 text-xs font-bold text-white shadow-cute">
                  Responder agora
                </span>
              </Link>
            ))}
          </div>
        </div>

        <div className="order-card">
          <div className="panel-header">
            <h2>Tickets</h2>
            <span className="auth-helper">{filteredTickets.length} itens</span>
          </div>
          {ticketState.error ? <div className="state-card error">{ticketState.error}</div> : null}
          {ticketState.status === 'loading' ? (
            <div className="state-card">Carregando tickets...</div>
          ) : null}
          {filteredTickets.length === 0 && ticketState.status === 'ready' ? (
            <div className="state-card">Nenhum ticket encontrado.</div>
          ) : null}
          <div className="support-list">
            {filteredTickets.map((ticket) => (
              <Link
                className="support-row"
                href={`/conta/tickets/${ticket.id}`}
                key={ticket.id}
              >
                <div>
                  <strong>{ticket.subject}</strong>
                  <span className="auth-helper">
                    {ticket.orderId ? `Pedido ${ticket.orderId.slice(0, 8)}` : 'Sem pedido'}
                  </span>
                </div>
                <div className="ticket-meta">
                  <span className={`status-pill status-${ticket.status.toLowerCase()}`}>
                    {ticketStatusLabel[ticket.status]}
                  </span>
                  <small>{new Date(ticket.createdAt).toLocaleDateString('pt-BR')}</small>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </AdminShell>
  );
};
