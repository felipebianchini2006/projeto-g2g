'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Bell,
  ClipboardList,
  Gavel,
  MoreHorizontal,
} from 'lucide-react';

import { ApiClientError } from '../../lib/api-client';
import { disputesApi, type Dispute, type DisputeStatus } from '../../lib/disputes-api';
import { ticketsApi, type Ticket, type TicketStatus } from '../../lib/tickets-api';
import { hasAdminPermission } from '../../lib/admin-permissions';
import { useAuth } from '../auth/auth-provider';
import { AdminShell } from '../admin/admin-shell';
import { Badge } from '../ui/badge';
import { buttonVariants } from '../ui/button';
import { Card } from '../ui/card';
import { Tabs, TabsList, TabsTrigger } from '../ui/tabs';

// SLA filter pills
const SLA_OPTIONS = [
  { value: 'all', label: 'Todos' },
  { value: 'over_24', label: '+24h' },
  { value: 'over_72', label: '+72h' },
  { value: 'over_168', label: '+7 dias' },
] as const;

type SlaFilter = (typeof SLA_OPTIONS)[number]['value'];

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

const isSameDay = (left: Date, right: Date) =>
  left.getFullYear() === right.getFullYear() &&
  left.getMonth() === right.getMonth() &&
  left.getDate() === right.getDate();

const formatTimeAgo = (value: string) => {
  const date = new Date(value);
  const diffMs = date.getTime() - Date.now();
  const minutes = Math.round(diffMs / 60000);
  const absMinutes = Math.abs(minutes);
  if (absMinutes < 60) {
    return `Ha ${absMinutes} min`;
  }
  const hours = Math.round(minutes / 60);
  const absHours = Math.abs(hours);
  if (absHours < 24) {
    return `Ha ${absHours} h`;
  }
  const days = Math.round(hours / 24);
  return `Ha ${Math.abs(days)} dias`;
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
  const [slaFilter, setSlaFilter] = useState<SlaFilter>('all');

  const loadTickets = async () => {
    if (!accessToken || !hasAdminPermission(user, 'admin.disputes')) {
      return;
    }
    setTicketState((prev) => ({ ...prev, status: 'loading', error: undefined }));
    try {
      const tickets = await ticketsApi.listTickets(accessToken);
      setTicketState({ status: 'ready', items: tickets });
    } catch (error) {
      const message =
        error instanceof ApiClientError
          ? error.message
          : error instanceof Error
            ? error.message
            : 'Não foi possível carregar tickets.';
      setTicketState({ status: 'ready', items: [], error: message });
    }
  };

  const loadDisputes = async () => {
    if (!accessToken || !hasAdminPermission(user, 'admin.disputes')) {
      return;
    }
    setDisputeState((prev) => ({ ...prev, status: 'loading', error: undefined }));
    try {
      const disputes = await disputesApi.listDisputes(accessToken);
      setDisputeState({ status: 'ready', items: disputes });
    } catch (error) {
      const message =
        error instanceof ApiClientError
          ? error.message
          : error instanceof Error
            ? error.message
            : 'Não foi possível carregar disputas.';
      setDisputeState({ status: 'ready', items: [], error: message });
    }
  };

  const refreshQueue = async () => {
    await Promise.all([loadTickets(), loadDisputes()]);
  };

  useEffect(() => {
    if (!accessToken || !hasAdminPermission(user, 'admin.disputes')) {
      return;
    }
    refreshQueue();
  }, [accessToken, user?.role, user?.adminPermissions]);

  const filteredTickets = useMemo(
    () =>
      [...ticketState.items]
        .filter((ticket) => isOverSla(ticket.createdAt, slaFilter))
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [ticketState.items, slaFilter],
  );

  const filteredDisputes = useMemo(
    () =>
      [...disputeState.items]
        .filter((dispute) => isOverSla(dispute.createdAt, slaFilter))
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [disputeState.items, slaFilter],
  );

  const pendingTickets = useMemo(
    () => ticketState.items.filter((ticket) => ticket.status === 'OPEN' || ticket.status === 'IN_PROGRESS'),
    [ticketState.items],
  );

  const pendingDisputes = useMemo(
    () => disputeState.items.filter((dispute) => dispute.status === 'OPEN' || dispute.status === 'REVIEW'),
    [disputeState.items],
  );

  const queueTotal = pendingTickets.length + pendingDisputes.length;
  const slaCritical = [...pendingTickets, ...pendingDisputes].filter((item) =>
    isOverSla(item.createdAt, 'over_24'),
  ).length;
  const disputesOpen = disputeState.items.filter((dispute) => dispute.status === 'OPEN').length;

  const resolvedToday = useMemo(() => {
    const today = new Date();
    const ticketsResolved = ticketState.items.filter(
      (ticket) =>
        (ticket.status === 'RESOLVED' || ticket.status === 'CLOSED') &&
        isSameDay(new Date(ticket.updatedAt), today),
    ).length;
    const disputesResolved = disputeState.items.filter(
      (dispute) =>
        (dispute.status === 'RESOLVED' || dispute.status === 'REJECTED') &&
        isSameDay(new Date(dispute.updatedAt), today),
    ).length;
    return ticketsResolved + disputesResolved;
  }, [ticketState.items, disputeState.items]);

  if (loading) {
    return (
      <section className="bg-white px-6 py-12">
        <div className="mx-auto w-full max-w-[1200px] rounded-xl border border-slate-200 bg-white px-6 py-4 text-sm text-meow-muted">
          Carregando sessao...
        </div>
      </section>
    );
  }

  if (!user || !hasAdminPermission(user, 'admin.disputes')) {
    return (
      <section className="bg-white px-6 py-12">
        <div className="mx-auto w-full max-w-[1200px] rounded-xl border border-slate-200 bg-white px-6 py-6 text-center">
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
      <Card className="border border-slate-200 p-6 shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-meow-charcoal">Fila de Suporte</h1>
            <p className="mt-2 text-sm text-meow-muted">
              Acompanhe tickets e disputas com prioridade de atendimento.
            </p>
          </div>
          <button
            type="button"
            className={buttonVariants({ variant: 'secondary', size: 'sm' })}
            onClick={refreshQueue}
          >
            Atualizar fila
          </button>
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="border border-slate-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase text-slate-400">Fila total</p>
              <p className="mt-2 text-2xl font-black text-meow-charcoal">{queueTotal}</p>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-meow-red/10 text-meow-deep">
              <ClipboardList size={20} aria-hidden />
            </div>
          </div>
        </Card>
        <Card className="border border-slate-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase text-slate-400">SLA critico</p>
              <p className="mt-2 text-2xl font-black text-meow-charcoal">{slaCritical}</p>
              <p className="mt-1 text-xs text-meow-muted">Acima de 24h</p>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-meow-red/10 text-meow-deep">
              <AlertTriangle size={20} aria-hidden />
            </div>
          </div>
        </Card>
        <Card className="border border-slate-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase text-slate-400">Disputas abertas</p>
              <p className="mt-2 text-2xl font-black text-meow-charcoal">{disputesOpen}</p>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-meow-red/10 text-meow-deep">
              <Gavel size={20} aria-hidden />
            </div>
          </div>
        </Card>
        <Card className="border border-slate-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase text-slate-400">Resolvidos hoje</p>
              <p className="mt-2 text-2xl font-black text-meow-charcoal">{resolvedToday}</p>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-meow-red/10 text-meow-deep">
              <Bell size={20} aria-hidden />
            </div>
          </div>
        </Card>
      </div>

      <Card className="border border-slate-200 p-5">
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-xs font-semibold uppercase text-slate-400">Filtro SLA</p>
          <Tabs value={slaFilter} onValueChange={(value) => setSlaFilter(value as SlaFilter)}>
            <TabsList className="gap-2">
              {SLA_OPTIONS.map((option) => (
                <TabsTrigger key={option.value} value={option.value}>
                  {option.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border border-slate-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-meow-charcoal">Disputas</h2>
              <p className="text-xs text-meow-muted">{filteredDisputes.length} em atendimento</p>
            </div>
            <Link className={buttonVariants({ variant: 'secondary', size: 'sm' })} href="/admin/disputas">
              Ver todas
            </Link>
          </div>

          {disputeState.error ? (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              {disputeState.error}
            </div>
          ) : null}
          {disputeState.status === 'loading' ? (
            <div className="mt-4 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-meow-muted">
              Carregando disputas...
            </div>
          ) : null}
          {filteredDisputes.length === 0 && disputeState.status === 'ready' ? (
            <div className="mt-4 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-meow-muted">
              Nenhuma disputa encontrada.
            </div>
          ) : null}

          <div className="mt-4 grid gap-3">
            {filteredDisputes.map((dispute) => (
              <div
                key={dispute.id}
                className={`flex flex-wrap items-center justify-between gap-4 rounded-xl border px-4 py-3 ${dispute.status === 'OPEN'
                  ? 'border-meow-red/30 bg-meow-red/5'
                  : 'border-slate-100 bg-white'
                  }`}
              >
                <div className="flex flex-1 items-start gap-3">
                  <Badge variant={disputeBadge[dispute.status] ?? 'neutral'}>
                    {dispute.status === 'OPEN' ? 'Em aberto' : disputeStatusLabel[dispute.status]}
                  </Badge>
                  <div>
                    <p className="text-sm font-semibold text-meow-charcoal">
                      Disputa #{dispute.orderId.slice(0, 6)}
                    </p>
                    <p className="text-xs text-meow-muted">
                      {dispute.ticket?.subject ?? 'Sem ticket'}
                    </p>
                    <p className="text-[11px] font-semibold text-slate-400">
                      {formatTimeAgo(dispute.createdAt)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Link
                    className={buttonVariants({ variant: 'secondary', size: 'sm' })}
                    href={`/admin/disputas/${dispute.id}`}
                  >
                    Analisar
                  </Link>
                  <button
                    type="button"
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-500 hover:border-meow-red/30 hover:text-meow-deep"
                    aria-label="Mais acoes"
                  >
                    <MoreHorizontal size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="border border-slate-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-meow-charcoal">Tickets</h2>
              <p className="text-xs text-meow-muted">{filteredTickets.length} em atendimento</p>
            </div>
            <Link className={buttonVariants({ variant: 'secondary', size: 'sm' })} href="/conta/tickets">
              Ver todos
            </Link>
          </div>

          {ticketState.error ? (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              {ticketState.error}
            </div>
          ) : null}
          {ticketState.status === 'loading' ? (
            <div className="mt-4 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-meow-muted">
              Carregando tickets...
            </div>
          ) : null}
          {filteredTickets.length === 0 && ticketState.status === 'ready' ? (
            <div className="mt-4 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-meow-muted">
              Nenhum ticket encontrado.
            </div>
          ) : null}

          <div className="mt-4 grid gap-3">
            {filteredTickets.map((ticket) => (
              <div
                key={ticket.id}
                className={`flex flex-wrap items-center justify-between gap-4 rounded-xl border px-4 py-3 ${ticket.status === 'OPEN'
                  ? 'border-meow-red/30 bg-meow-red/5'
                  : 'border-slate-100 bg-white'
                  }`}
              >
                <div className="flex flex-1 items-start gap-3">
                  <Badge variant={ticketBadge[ticket.status] ?? 'neutral'}>
                    {ticketStatusLabel[ticket.status]}
                  </Badge>
                  <div>
                    <p className="text-sm font-semibold text-meow-charcoal">{ticket.subject}</p>
                    <p className="text-xs text-meow-muted">
                      {ticket.orderId ? `Pedido ${ticket.orderId.slice(0, 8)}` : 'Sem pedido'}
                    </p>
                    <p className="text-[11px] font-semibold text-slate-400">
                      {formatTimeAgo(ticket.createdAt)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Link
                    className={buttonVariants({ variant: 'secondary', size: 'sm' })}
                    href={`/conta/tickets/${ticket.id}`}
                  >
                    Abrir
                  </Link>
                  <button
                    type="button"
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-500 hover:border-meow-red/30 hover:text-meow-deep"
                    aria-label="Mais acoes"
                  >
                    <MoreHorizontal size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </AdminShell >
  );
};
