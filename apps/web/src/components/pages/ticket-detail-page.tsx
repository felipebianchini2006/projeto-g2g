'use client';

import Link from 'next/link';
import { useEffect, useState, useRef } from 'react';
import { ArrowLeft, Paperclip, Send } from 'lucide-react';

import { ApiClientError } from '../../lib/api-client';
import {
  ticketsApi,
  type Ticket,
  type TicketMessage,
  type TicketStatus,
} from '../../lib/tickets-api';
import { useAuth } from '../auth/auth-provider';
import { AccountShell } from '../account/account-shell';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { ChatBubble } from '../chat/chat-bubble';

type TicketDetailContentProps = {
  ticketId: string;
};

const statusLabel: Record<TicketStatus, string> = {
  OPEN: 'Aberto',
  IN_PROGRESS: 'Em andamento',
  RESOLVED: 'Resolvido',
  CLOSED: 'Fechado',
};

const statusBadge: Record<TicketStatus, 'warning' | 'info' | 'success' | 'danger' | 'neutral'> = {
  OPEN: 'danger',
  IN_PROGRESS: 'warning',
  RESOLVED: 'success',
  CLOSED: 'neutral',
};

export const TicketDetailContent = ({ ticketId }: TicketDetailContentProps) => {
  const { user, accessToken, loading } = useAuth();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [attachmentsInput, setAttachmentsInput] = useState('');
  const [showAttachments, setShowAttachments] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const ticketCode = ticketId ? ticketId.slice(0, 8) : '--';
  const isLocked = ticket?.status === 'RESOLVED' || ticket?.status === 'CLOSED';

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

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
            : 'Não foi possível carregar o ticket.';
      setError(message);
    }
  };

  useEffect(() => {
    if (accessToken) {
      loadTicket();
    }
  }, [accessToken, ticketId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!accessToken || !ticket) {
      return;
    }
    if (isLocked) {
      setNotice('Este ticket estÃ¡ encerrado e nÃ£o aceita novas mensagens.');
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
      setShowAttachments(false);
    } catch (error) {
      const message =
        error instanceof ApiClientError
          ? error.message
          : error instanceof Error
            ? error.message
            : 'Não foi possível enviar a mensagem.';
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
          <p className="text-sm text-meow-muted">Entre para acessar o ticket.</p>
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
        { label: 'Tickets', href: '/conta/tickets' },
        { label: `Ticket #${ticketCode}` },
      ]}
    >
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/conta/tickets"
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-slate-400 shadow-[0_4px_12px_rgba(0,0,0,0.05)] transition hover:text-meow-deep hover:shadow-md"
            >
              <ArrowLeft size={20} />
            </Link>
            <div>
              <h1 className="text-2xl font-black text-meow-charcoal">Ticket #{ticketCode}</h1>
              <p className="text-xs font-semibold text-meow-muted">
                {ticket
                  ? `Pedido ${ticket.orderId ? '#' + ticket.orderId.slice(0, 8) : 'N/A'} • ${new Date(
                    ticket.createdAt,
                  ).toLocaleDateString('pt-BR')}`
                  : 'Carregando...'}
              </p>
            </div>
          </div>
          {ticket ? (
            <Badge variant={statusBadge[ticket.status]} size="md" className="px-4 py-1.5 text-xs">
              {statusLabel[ticket.status]}
            </Badge>
          ) : null}
        </div>

        {error ? (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 shadow-sm">
            {error}
          </div>
        ) : null}

        <Card className="flex h-[75vh] flex-col overflow-hidden border-0 bg-white shadow-[0_20px_40px_-12px_rgba(0,0,0,0.1)] ring-1 ring-slate-100">
          <div className="scrollbar-thin flex-1 overflow-y-auto bg-slate-50/50 p-6">
            {!ticket ? (
              <div className="flex h-full items-center justify-center text-sm font-medium text-meow-muted">
                Carregando conversa...
              </div>
            ) : messages.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-meow-cream/50 text-meow-deep shadow-sm">
                  <Paperclip size={32} />
                </div>
                <p className="mt-4 font-bold text-meow-charcoal">Nenhuma mensagem</p>
                <p className="text-sm text-meow-muted">
                  Envie a primeira mensagem para iniciar o atendimento.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {messages.map((message) => (
                  <ChatBubble
                    key={message.id}
                    text={message.message}
                    isOwn={message.senderId === user.id}
                    senderInitials={message.senderId === user.id ? 'EU' : 'SU'}
                    timestamp={message.createdAt}
                  />
                ))}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          <div className="border-t border-slate-100 bg-white p-4 md:p-6">
            {notice ? (
              <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-xs text-red-700">
                {notice}
              </div>
            ) : null}
            {isLocked ? (
              <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-xs text-slate-600">
                Ticket {ticket?.status === 'RESOLVED' ? 'resolvido' : 'fechado'} â€” chat desabilitado.
              </div>
            ) : null}

            {showAttachments && (
              <div className="mb-4 animate-in slide-in-from-bottom-2 fade-in duration-200">
                <label className="mb-2 block text-xs font-bold text-meow-muted">
                  Anexar Links (URLs)
                </label>
                <Input
                  value={attachmentsInput}
                  onChange={(e) => setAttachmentsInput(e.target.value)}
                  placeholder="https://exemplo.com/imagem.png, https://..."
                  className="bg-slate-50 text-xs"
                  disabled={isLocked}
                />
                <p className="mt-1 text-[10px] text-slate-400">
                  Separe múltiplos links por vírgula.
                </p>
              </div>
            )}

            <form onSubmit={handleSendMessage} className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowAttachments(!showAttachments)}
                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border transition-all ${showAttachments
                    ? 'border-meow-red/30 bg-meow-red/10 text-meow-deep'
                    : 'border-slate-200 text-slate-400 hover:border-meow-red/30 hover:bg-meow-cream hover:text-meow-deep'
                  }`}
                aria-label="Anexar arquivos"
                disabled={isLocked}
              >
                <Paperclip size={20} />
              </button>
              <Input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Digite sua mensagem..."
                className="h-12 flex-1 rounded-xl border-slate-200 bg-slate-50 px-4 text-sm font-medium transition-all focus:border-meow-red/30 focus:bg-white focus:ring-4 focus:ring-meow-red/10"
                autoFocus
                disabled={isLocked}
              />
              <Button
                type="submit"
                disabled={busy || !draft.trim() || isLocked}
                className="h-12 w-12 shrink-0 rounded-xl bg-meow-linear p-0 shadow-lg shadow-meow-red/20 transition-all hover:scale-105 hover:shadow-meow-red/30 active:scale-95 disabled:opacity-50"
              >
                <Send size={20} className="ml-0.5" />
              </Button>
            </form>
          </div>
        </Card>
      </div>
    </AccountShell>
  );
};
