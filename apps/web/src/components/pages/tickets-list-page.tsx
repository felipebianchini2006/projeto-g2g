'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Clock,
  Info,
  MessageSquarePlus,
  MoreHorizontal,
  Search,
  Ticket,
  TicketCheck,
} from 'lucide-react';

import { ApiClientError } from '../../lib/api-client';
import { ordersApi, type Order } from '../../lib/orders-api';
import {
  ticketsApi,
  type CreateTicketInput,
  type Ticket,
  type TicketMessage,
  type TicketStatus,
} from '../../lib/tickets-api';
import { useAuth } from '../auth/auth-provider';
import { AccountShell } from '../account/account-shell';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Input } from '../ui/input';
import { Select } from '../ui/select';
import { Tabs, TabsList, TabsTrigger } from '../ui/tabs';
import { Textarea } from '../ui/textarea';

import { ImageUploader } from '../forms/image-uploader';

type TicketsListContentProps = {
  initialOrderId?: string;
};

type TicketsState = {
  status: 'loading' | 'ready';
  tickets: Ticket[];
  error?: string;
};

type OrdersState = {
  status: 'loading' | 'ready';
  orders: Order[];
};

type TicketTab = 'all' | 'open' | 'progress' | 'resolved' | 'closed';

const statusLabel: Record<TicketStatus, string> = {
  OPEN: 'Aberto',
  IN_PROGRESS: 'Em andamento',
  RESOLVED: 'Resolvido',
  CLOSED: 'Fechado',
};

const statusTone: Record<
  TicketStatus,
  'success' | 'warning' | 'info' | 'danger' | 'neutral'
> = {
  OPEN: 'warning',
  IN_PROGRESS: 'info',
  RESOLVED: 'success',
  CLOSED: 'neutral',
};

const formatDate = (value: string) =>
  new Date(value).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

const formatDateTime = (value: string) =>
  new Date(value).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

const formatDuration = (ms: number) => {
  if (!ms || Number.isNaN(ms)) {
    return '0h';
  }
  const hours = Math.round(ms / (1000 * 60 * 60));
  if (hours < 24) {
    return `${hours}h`;
  }
  const days = Math.round(hours / 24);
  return `${days}d`;
};

const extractLastMessage = (messages?: TicketMessage[]) => {
  if (!messages || messages.length === 0) {
    return 'Sem mensagens ainda.';
  }
  return messages[messages.length - 1]?.message ?? 'Sem mensagens ainda.';
};

export const TicketsListContent = ({ initialOrderId }: TicketsListContentProps) => {
  const { user, accessToken, loading } = useAuth();
  const [state, setState] = useState<TicketsState>({ status: 'loading', tickets: [] });
  const [ordersState, setOrdersState] = useState<OrdersState>({
    status: 'loading',
    orders: [],
  });
  const [tab, setTab] = useState<TicketTab>('all');
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [notice, setNotice] = useState<string | null>(null);
  const [formState, setFormState] = useState<CreateTicketInput>({
    orderId: initialOrderId,
    subject: '',
    message: '',
    attachments: [],
  });
  const [attachmentsInput, setAttachmentsInput] = useState('');
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const formRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!accessToken) {
      return;
    }
    let active = true;
    const loadTickets = async () => {
      setState((prev) => ({ ...prev, status: 'loading', error: undefined }));
      try {
        const tickets = await ticketsApi.listTickets(accessToken);
        if (!active) {
          return;
        }
        setState({ status: 'ready', tickets });
        if (tickets.length > 0 && !selectedTicketId) {
          setSelectedTicketId(tickets[0].id);
        }
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
  }, [accessToken, selectedTicketId]);

  useEffect(() => {
    if (!accessToken) {
      return;
    }
    let active = true;
    const loadOrders = async () => {
      try {
        const buyerOrders = await ordersApi.listOrders(accessToken, 'buyer');
        if (!active) {
          return;
        }
        let merged = buyerOrders;
        if (user?.role === 'SELLER' || user?.role === 'ADMIN') {
          const sellerOrders = await ordersApi.listOrders(accessToken, 'seller');
          if (!active) {
            return;
          }
          const seen = new Set(buyerOrders.map((order) => order.id));
          merged = [...buyerOrders, ...sellerOrders.filter((order) => !seen.has(order.id))];
        }
        setOrdersState({ status: 'ready', orders: merged });
      } catch {
        if (active) {
          setOrdersState({ status: 'ready', orders: [] });
        }
      }
    };
    loadOrders();
    return () => {
      active = false;
    };
  }, [accessToken, user?.role]);

  const ticketsSorted = useMemo(() => {
    return [...state.tickets].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }, [state.tickets]);

  const filteredByTab = useMemo(() => {
    if (tab === 'all') {
      return ticketsSorted;
    }
    if (tab === 'open') {
      return ticketsSorted.filter((ticket) => ticket.status === 'OPEN');
    }
    if (tab === 'progress') {
      return ticketsSorted.filter((ticket) => ticket.status === 'IN_PROGRESS');
    }
    if (tab === 'resolved') {
      return ticketsSorted.filter((ticket) => ticket.status === 'RESOLVED');
    }
    return ticketsSorted.filter((ticket) => ticket.status === 'CLOSED');
  }, [tab, ticketsSorted]);

  const filteredTickets = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();
    if (!search) {
      return filteredByTab;
    }
    return filteredByTab.filter((ticket) => {
      const order = ticket.orderId ?? '';
      return (
        ticket.subject.toLowerCase().includes(search) ||
        ticket.id.toLowerCase().includes(search) ||
        order.toLowerCase().includes(search)
      );
    });
  }, [filteredByTab, searchTerm]);

  const openCount = useMemo(
    () =>
      state.tickets.filter((ticket) =>
        ['OPEN', 'IN_PROGRESS'].includes(ticket.status),
      ).length,
    [state.tickets],
  );

  const resolvedCount = useMemo(
    () =>
      state.tickets.filter((ticket) =>
        ['RESOLVED', 'CLOSED'].includes(ticket.status),
      ).length,
    [state.tickets],
  );

  const averageResolution = useMemo(() => {
    const resolved = state.tickets.filter((ticket) =>
      ['RESOLVED', 'CLOSED'].includes(ticket.status),
    );
    if (resolved.length === 0) {
      return '0h';
    }
    const total = resolved.reduce((acc, ticket) => {
      const start = new Date(ticket.createdAt).getTime();
      const end = new Date(ticket.updatedAt).getTime();
      return acc + Math.max(0, end - start);
    }, 0);
    return formatDuration(total / resolved.length);
  }, [state.tickets]);

  const ticketCount = state.tickets.length;
  const summaryCards = [
    {
      label: 'Tickets abertos',
      value: openCount,
      description: 'Aguardando resposta.',
      icon: Ticket,
      tone: 'from-emerald-500 via-emerald-500 to-emerald-600',
    },
    {
      label: 'Resolvidos',
      value: resolvedCount,
      description: 'Encerrados com sucesso.',
      icon: TicketCheck,
      tone: 'from-blue-500 via-blue-500 to-indigo-500',
    },
    {
      label: 'Tempo medio',
      value: averageResolution,
      description: 'De abertura ate resolucao.',
      icon: Clock,
      tone: 'from-violet-500 via-purple-500 to-indigo-500',
    },
  ];

  const selectedTicket = useMemo(
    () => state.tickets.find((ticket) => ticket.id === selectedTicketId) ?? null,
    [selectedTicketId, state.tickets],
  );

  const attachments = useMemo(
    () =>
      attachmentsInput
        .split(/[\n,;]+/)
        .map((value) => value.trim())
        .filter(Boolean),
    [attachmentsInput],
  );

  const handleCreateTicket = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!accessToken) {
      return;
    }
    setBusy(true);
    setNotice(null);
    try {
      const payload: CreateTicketInput = {
        ...formState,
        subject: formState.subject.trim(),
        message: formState.message.trim(),
        orderId: formState.orderId?.trim() || undefined,
        attachments: attachments.length ? attachments : undefined,
      };
      const created = await ticketsApi.createTicket(accessToken, payload);
      setState((prev) => ({ ...prev, tickets: [created, ...prev.tickets] }));
      setSelectedTicketId(created.id);
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

  const handleOpenForm = () => {
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-black text-meow-charcoal">Tickets de suporte</h1>
            <Badge variant="pink" className="px-4 py-2 text-xs">
              {ticketCount}
            </Badge>
          </div>
          <Button variant="secondary" size="sm" onClick={handleOpenForm} className="gap-2">
            <MessageSquarePlus size={16} aria-hidden />
            Abrir novo ticket
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {summaryCards.map((card) => {
            const Icon = card.icon;
            return (
              <Card
                key={card.label}
                className={`relative overflow-hidden rounded-[26px] border-0 bg-gradient-to-br ${card.tone} p-5 text-white shadow-[0_18px_40px_rgba(15,23,42,0.18)]`}
              >
                <div className="absolute -right-6 -top-6 h-16 w-16 rounded-full bg-white/15" />
                <div className="absolute right-8 top-6 h-10 w-10 rounded-full bg-white/10" />
                <div className="relative z-10">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/20">
                    <Icon size={18} aria-hidden />
                  </div>
                  <p className="mt-4 text-xs font-semibold uppercase tracking-[0.3px] text-white/80">
                    {card.label}
                  </p>
                  <p className="mt-2 text-3xl font-black">{card.value}</p>
                  <p className="mt-1 text-xs text-white/80">{card.description}</p>
                </div>
              </Card>
            );
          })}
        </div>

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

        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-4">
            <Card className="rounded-[26px] border border-slate-100 p-5 shadow-card">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <Tabs value={tab} onValueChange={(value) => setTab(value as TicketTab)}>
                  <TabsList className="flex flex-wrap gap-2">
                    <TabsTrigger value="all">Todos</TabsTrigger>
                    <TabsTrigger value="open">Abertos</TabsTrigger>
                    <TabsTrigger value="progress">Em andamento</TabsTrigger>
                    <TabsTrigger value="resolved">Resolvidos</TabsTrigger>
                    <TabsTrigger value="closed">Fechados</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-3">
                <div className="relative flex-1 min-w-[220px]">
                  <Search
                    size={16}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                    aria-hidden
                  />
                  <Input
                    className="pl-10"
                    placeholder="Buscar ticket ou pedido..."
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                  />
                </div>
              </div>

              {state.status === 'loading' ? (
                <div className="mt-4 rounded-xl border border-slate-100 bg-meow-50 px-4 py-3 text-sm text-meow-muted">
                  Carregando tickets...
                </div>
              ) : null}

              {state.status === 'ready' && filteredTickets.length === 0 ? (
                <div className="mt-4 rounded-xl border border-slate-100 bg-meow-50 px-4 py-3 text-sm text-meow-muted">
                  Nenhum ticket encontrado.
                </div>
              ) : null}

              <div className="mt-4 grid gap-3">
                {filteredTickets.map((ticket) => {
                  const baseClass = `w-full rounded-2xl border px-4 py-3 text-left transition ${
                    selectedTicketId === ticket.id
                      ? 'border-meow-200 bg-meow-50'
                      : 'border-slate-100 bg-white hover:border-meow-100'
                  }`;
                  const orderHref = ticket.orderId
                    ? ticket.order?.sellerId && user?.id === ticket.order.sellerId
                      ? `/conta/vendas/${ticket.orderId}`
                      : `/conta/pedidos/${ticket.orderId}`
                    : null;

                  const content = (
                    <>
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <Badge variant={statusTone[ticket.status]}>
                          {statusLabel[ticket.status]}
                        </Badge>
                        <span className="text-xs text-slate-400">
                          {formatDate(ticket.createdAt)}
                        </span>
                      </div>
                      <p className="mt-2 text-sm font-semibold text-meow-charcoal">
                        {ticket.subject}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {ticket.orderId
                          ? `Pedido ${ticket.orderId.slice(0, 8).toUpperCase()}`
                          : 'Sem pedido relacionado'}
                      </p>
                      <p className="mt-2 text-xs text-meow-muted line-clamp-2">
                        {extractLastMessage(ticket.messages)}
                      </p>
                    </>
                  );

                  if (orderHref) {
                    return (
                      <Link key={ticket.id} href={orderHref} className={baseClass}>
                        {content}
                      </Link>
                    );
                  }

                  return (
                    <button
                      key={ticket.id}
                      type="button"
                      onClick={() => setSelectedTicketId(ticket.id)}
                      className={baseClass}
                    >
                      {content}
                    </button>
                  );
                })}
              </div>
            </Card>

            {selectedTicket ? (
              <Card className="rounded-[26px] border border-slate-100 p-5 shadow-card">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.3px] text-slate-400">
                      Ticket selecionado
                    </p>
                    <p className="text-lg font-black text-meow-charcoal">
                      {selectedTicket.subject}
                    </p>
                  </div>
                  <Badge variant={statusTone[selectedTicket.status]}>
                    {statusLabel[selectedTicket.status]}
                  </Badge>
                </div>
                <div className="mt-3 grid gap-2 text-xs text-slate-500">
                  <span>ID: {selectedTicket.id}</span>
                  <span>
                    Abertura: {formatDateTime(selectedTicket.createdAt)} | Atualizado:{' '}
                    {formatDateTime(selectedTicket.updatedAt)}
                  </span>
                  <span>
                    {selectedTicket.orderId
                      ? `Pedido relacionado: ${selectedTicket.orderId}`
                      : 'Sem pedido relacionado'}
                  </span>
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <Link
                    href={`/conta/tickets/${selectedTicket.id}`}
                    className="rounded-full border border-slate-200 px-4 py-2 text-xs font-bold text-meow-charcoal"
                  >
                    Ver conversa
                  </Link>
                </div>
              </Card>
            ) : null}
          </div>

          <Card
            className="rounded-[26px] border border-slate-100 p-5 shadow-card"
            ref={formRef}
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-meow-charcoal">Abrir ticket</h2>
                <p className="mt-1 text-xs text-meow-muted">
                  Preencha os dados e nossa equipe responde rapido.
                </p>
              </div>
            </div>

            <form className="mt-4 grid gap-3" onSubmit={handleCreateTicket}>
              <label className="grid gap-1 text-xs font-semibold text-meow-muted">
                Pedido relacionado
                <Select
                  className="rounded-xl border-slate-200 bg-white text-sm text-meow-charcoal"
                  value={formState.orderId ?? ''}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, orderId: event.target.value || undefined }))
                  }
                >
                  <option value="">
                    {ordersState.status === 'loading'
                      ? 'Carregando pedidos...'
                      : 'Sem pedido'}
                  </option>
                  {ordersState.orders.map((order) => (
                    <option key={order.id} value={order.id}>
                      #{order.id.slice(0, 6).toUpperCase()} -{' '}
                      {order.items[0]?.title ?? 'Pedido'}
                    </option>
                  ))}
                </Select>
              </label>
              <label className="grid gap-1 text-xs font-semibold text-meow-muted">
                Assunto
                <Input
                  className="rounded-xl border-slate-200 bg-white text-sm text-meow-charcoal"
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
                  className="rounded-xl border-slate-200 bg-white text-sm text-meow-charcoal"
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
                Imagens (opcional)
                <ImageUploader
                  files={mediaFiles}
                  onFilesChange={setMediaFiles}
                  maxFiles={3}
                  className="mt-1"
                />
              </label>

              <label className="grid gap-1 text-xs font-semibold text-meow-muted">
                Links externos (opcional)
                <Textarea
                  className="rounded-xl border-slate-200 bg-white text-sm text-meow-charcoal"
                  rows={2}
                  value={attachmentsInput}
                  onChange={(event) => setAttachmentsInput(event.target.value)}
                  placeholder="URLs separadas por virgula"
                />
              </label>
              {attachments.length > 0 ? (
                <div className="rounded-xl border border-slate-100 bg-meow-50 px-3 py-2 text-xs text-meow-muted">
                  {attachments.map((item) => (
                    <div key={item} className="truncate">
                      {item}
                    </div>
                  ))}
                </div>
              ) : null}
              <Button type="submit" size="sm" disabled={busy}>
                {busy ? 'Enviando...' : 'Abrir ticket'}
              </Button>
            </form>

            <div className="mt-4 rounded-2xl border border-blue-100 bg-blue-50/70 px-4 py-3 text-xs text-blue-700">
              <div className="flex items-start gap-2">
                <Info size={16} className="mt-0.5 text-blue-500" aria-hidden />
                <p>
                  Dica: inclua detalhes do pedido, prints e datas para agilizar o
                  atendimento.
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </AccountShell>
  );
};
