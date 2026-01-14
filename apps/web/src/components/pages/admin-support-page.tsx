'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

import { ApiClientError } from '../../lib/api-client';
import { disputesApi, type Dispute, type DisputeStatus } from '../../lib/disputes-api';
import { ticketsApi, type Ticket, type TicketStatus } from '../../lib/tickets-api';
import { useAuth } from '../auth/auth-provider';
import { AdminShell } from '../admin/admin-shell';
import { NotificationsBell } from '../notifications/notifications-bell';
import { Badge } from '../ui/badge';
import { buttonVariants } from '../ui/button';
import { Card } from '../ui/card';
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
  REVIEW: 'Em revisão',
  RESOLVED: 'Resolvido',
  REJECTED: 'Rejeitado',
};

const disputeBadge: Record<DisputeStatus, 'warning' | 'info' | 'success' | 'danger' | 'neutral'> = {
  OPEN: 'danger',
  REVIEW: 'warning',
  RESOLVED: 'success',
  REJECTED: 'neutral',
};

const ticketBadge: Record<TicketStatus, 'warning' | 'info' | 'success' | 'danger' | 'neutral'> = {
  OPEN: 'danger',
  IN_PROGRESS: 'warning',
  RESOLVED: 'success',
  CLOSED: 'neutral',
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
              : 'Não foi possível carregar tickets.';
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
              : 'Não foi possível carregar disputas.';
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
    () => disputeState.items.filter((dispute) => isOverSla(dispute.createdAt, slaFilter)),
    [disputeState.items, slaFilter],
  );

  if (loading) {
    return (
      <section className="bg-white px-6 py-12">
        <div className="mx-auto w-full max-w-[1200px] rounded-2xl border border-meow-red/20 bg-white px-6 py-4 text-sm text-meow-muted">
          Carregando sessão...
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
      <Card className="rounded-2xl border border-slate-100 p-6 shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-black text-meow-charcoal">Fila de suporte</h1>
            <p className="mt-2 text-sm text-meow-muted">
              Tickets e disputas pendentes de avaliação.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <NotificationsBell />
            <Link className={buttonVariants({ variant: 'secondary', size: 'sm' })} href="/conta">
              Voltar para conta
            </Link>
          </div>
        </div>
      </Card>

      <Card className="rounded-2xl border border-slate-100 p-6 shadow-card">
        <div className="grid gap-4 md:grid-cols-3">
          <label className="grid gap-2 text-xs font-semibold text-meow-muted">
            SLA
            <Select value={slaFilter} onChange={(event) => setSlaFilter(event.target.value as SlaFilter)}>
              {SLA_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </label>
          <label className="grid gap-2 text-xs font-semibold text-meow-muted">
            Tickets
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
          </label>
          <label className="grid gap-2 text-xs font-semibold text-meow-muted">
            Disputas
            <Select
              value={disputeFilter}
              onChange={(event) => setDisputeFilter(event.target.value as DisputeStatus | 'all')}
            >
              <option value="all">Todas</option>
              <option value="OPEN">Abertas</option>
              <option value="REVIEW">Em revisão</option>
              <option value="RESOLVED">Resolvidas</option>
              <option value="REJECTED">Rejeitadas</option>
            </Select>
          </label>
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="rounded-2xl border border-slate-100 p-6 shadow-card">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-meow-charcoal">Disputas</h2>
            <span className="text-xs text-meow-muted">{filteredDisputes.length} itens</span>
          </div>
          {disputeState.error ? (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              {disputeState.error}
            </div>
          ) : null}
          {disputeState.status === 'loading' ? (
            <div className="mt-4 rounded-xl border border-meow-red/20 bg-white px-3 py-2 text-sm text-meow-muted">
              Carregando disputas...
            </div>
          ) : null}
          {filteredDisputes.length === 0 && disputeState.status === 'ready' ? (
            <div className="mt-4 rounded-xl border border-meow-red/20 bg-white px-3 py-2 text-sm text-meow-muted">
              Nenhuma disputa encontrada.
            </div>
          ) : null}
          <div className="mt-4 grid gap-3">
            {filteredDisputes.map((dispute) => (
              <Link
                className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-red-100 bg-red-50/60 px-4 py-3 shadow-card"
                href={`/admin/disputas/${dispute.id}`}
                key={dispute.id}
              >
                <div className="flex items-center gap-4">
                  <Badge variant={disputeBadge[dispute.status] ?? 'neutral'}>
                    {dispute.status === 'OPEN' ? 'Em aberto' : disputeStatusLabel[dispute.status]}
                  </Badge>
                  <div>
                    <p className="text-sm font-semibold text-meow-charcoal">
                      Reclamacao #{dispute.orderId.slice(0, 6)}
                    </p>
                    <p className="text-xs text-meow-muted">
                      {dispute.ticket?.subject ?? 'Sem ticket'} | Prazo para resposta: 12h
                    </p>
                  </div>
                </div>
                <span className="rounded-2xl bg-red-500 px-4 py-2 text-xs font-bold text-white shadow-cute">
                  Responder agora
                </span>
              </Link>
            ))}
          </div>
        </Card>

        <Card className="rounded-2xl border border-slate-100 p-6 shadow-card">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-meow-charcoal">Tickets</h2>
            <span className="text-xs text-meow-muted">{filteredTickets.length} itens</span>
          </div>
          {ticketState.error ? (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              {ticketState.error}
            </div>
          ) : null}
          {ticketState.status === 'loading' ? (
            <div className="mt-4 rounded-xl border border-meow-red/20 bg-white px-3 py-2 text-sm text-meow-muted">
              Carregando tickets...
            </div>
          ) : null}
          {filteredTickets.length === 0 && ticketState.status === 'ready' ? (
            <div className="mt-4 rounded-xl border border-meow-red/20 bg-white px-3 py-2 text-sm text-meow-muted">
              Nenhum ticket encontrado.
            </div>
          ) : null}
          <div className="mt-4 grid gap-3">
            {filteredTickets.map((ticket) => (
              <Link
                className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-100 bg-white px-4 py-3 shadow-card"
                href={`/conta/tickets/${ticket.id}`}
                key={ticket.id}
              >
                <div>
                  <p className="text-sm font-semibold text-meow-charcoal">{ticket.subject}</p>
                  <p className="text-xs text-meow-muted">
                    {ticket.orderId ? `Pedido ${ticket.orderId.slice(0, 8)}` : 'Sem pedido'}
                  </p>
                </div>
                <div className="flex items-center gap-2 text-xs text-meow-muted">
                  <Badge variant={ticketBadge[ticket.status] ?? 'neutral'}>
                    {ticketStatusLabel[ticket.status]}
                  </Badge>
                  <span>{new Date(ticket.createdAt).toLocaleDateString('pt-BR')}</span>
                </div>
              </Link>
            ))}
          </div>
        </Card>
      </div>
    </AdminShell>
  );
};
