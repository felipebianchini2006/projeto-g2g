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
import { AccountShell } from '../account/account-shell';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Input } from '../ui/input';
import { Select } from '../ui/select';
import { Textarea } from '../ui/textarea';

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
              : 'Não foi possível carregar tickets.';
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
            : 'Não foi possível abrir o ticket.';
      setNotice(message);
    } finally {
      setBusy(false);
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

  if (!user) {
    return (
      <section className="bg-white px-6 py-12">
        <div className="mx-auto w-full max-w-[1200px] rounded-2xl border border-meow-red/20 bg-white px-6 py-6 text-center">
          <p className="text-sm text-meow-muted">Entre para acessar seus tickets.</p>
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

  return (
    <AccountShell
      breadcrumbs={[
        { label: 'Inicio', href: '/' },
        { label: 'Conta', href: '/conta' },
        { label: 'Central de ajuda', href: '/conta/ajuda' },
        { label: 'Tickets' },
      ]}
    >
      <Card className="rounded-2xl border border-meow-red/20 p-5 shadow-[0_10px_24px_rgba(216,107,149,0.12)]">
        <h1 className="text-xl font-black text-meow-charcoal">Tickets de suporte</h1>
        <p className="mt-2 text-sm text-meow-muted">{summaryText}</p>
      </Card>

      {state.error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {state.error}
        </div>
      ) : null}
      {notice ? (
        <div className="rounded-xl border border-meow-red/20 bg-meow-cream/60 px-4 py-3 text-sm text-meow-muted">
          {notice}
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <Card className="rounded-2xl border border-meow-red/20 p-5 shadow-[0_10px_24px_rgba(216,107,149,0.12)]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-base font-bold text-meow-charcoal">Seus tickets</h2>
            <Select
              className="rounded-xl border-meow-red/20 bg-white text-xs text-meow-charcoal"
              value={filterStatus}
              onChange={(event) => setFilterStatus(event.target.value as TicketStatus | 'all')}
            >
              <option value="all">Todos</option>
              <option value="OPEN">Abertos</option>
              <option value="IN_PROGRESS">Em andamento</option>
              <option value="RESOLVED">Resolvidos</option>
              <option value="CLOSED">Fechados</option>
            </Select>
          </div>

          {state.status === 'loading' ? (
            <div className="mt-4 rounded-xl border border-meow-red/20 bg-white px-4 py-3 text-sm text-meow-muted">
              Carregando...
            </div>
          ) : null}

          {state.tickets.length === 0 && state.status === 'ready' ? (
            <div className="mt-4 rounded-xl border border-meow-red/20 bg-white px-4 py-3 text-sm text-meow-muted">
              Nenhum ticket ainda.
            </div>
          ) : null}

          <div className="mt-4 grid gap-3">
            {state.tickets.map((ticket) => (
              <Link
                className="flex items-center justify-between gap-3 rounded-xl border border-meow-red/10 bg-meow-cream/40 px-4 py-3"
                key={ticket.id}
                href={`/conta/tickets/${ticket.id}`}
              >
                <div>
                  <p className="text-sm font-semibold text-meow-charcoal">{ticket.subject}</p>
                  <p className="text-xs text-meow-muted">
                    {ticket.orderId ? `Pedido ${ticket.orderId.slice(0, 8)}` : 'Sem pedido'}
                  </p>
                </div>
                <div className="text-right text-xs text-meow-muted">
                  <span className="rounded-full bg-white px-3 py-1 font-semibold text-meow-charcoal">
                    {statusLabel[ticket.status]}
                  </span>
                  <p className="mt-2">{new Date(ticket.createdAt).toLocaleDateString('pt-BR')}</p>
                </div>
              </Link>
            ))}
          </div>
        </Card>

        <Card className="rounded-2xl border border-meow-red/20 p-5 shadow-[0_10px_24px_rgba(216,107,149,0.12)]">
          <h2 className="text-base font-bold text-meow-charcoal">Abrir ticket</h2>
          <p className="mt-2 text-xs text-meow-muted">Anexos são opcionais (MVP).</p>
          <form className="mt-4 grid gap-3" onSubmit={handleCreateTicket}>
            <label className="grid gap-1 text-xs font-semibold text-meow-muted">
              Pedido (opcional)
              <Input
                className="rounded-xl border-meow-red/20 bg-white text-sm text-meow-charcoal"
                value={formState.orderId ?? ''}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, orderId: event.target.value }))
                }
                placeholder="UUID do pedido"
              />
            </label>
            <label className="grid gap-1 text-xs font-semibold text-meow-muted">
              Assunto
              <Input
                className="rounded-xl border-meow-red/20 bg-white text-sm text-meow-charcoal"
                value={formState.subject}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, subject: event.target.value }))
                }
                placeholder="Resumo do problema"
                required
              />
            </label>
            <label className="grid gap-1 text-xs font-semibold text-meow-muted">
              Mensagem inicial
              <Textarea
                className="rounded-xl border-meow-red/20 bg-white text-sm text-meow-charcoal"
                rows={4}
                value={formState.message}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, message: event.target.value }))
                }
                placeholder="Explique o que aconteceu"
                required
              />
            </label>
            <label className="grid gap-1 text-xs font-semibold text-meow-muted">
              Anexos (links)
              <Textarea
                className="rounded-xl border-meow-red/20 bg-white text-sm text-meow-charcoal"
                rows={2}
                value={attachmentsInput}
                onChange={(event) => setAttachmentsInput(event.target.value)}
                placeholder="Opcional: URLs separadas por virgula"
              />
            </label>
            <Button type="submit" size="sm" disabled={busy}>
              {busy ? 'Enviando...' : 'Abrir ticket'}
            </Button>
          </form>
        </Card>
      </div>
    </AccountShell>
  );
};
