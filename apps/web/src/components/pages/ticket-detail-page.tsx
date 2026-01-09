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
import { AccountShell } from '../account/account-shell';

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
  const ticketCode = ticketId ? ticketId.slice(0, 8) : '--';

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
      <div className="rounded-2xl border border-meow-red/20 bg-white p-5 shadow-[0_10px_24px_rgba(216,107,149,0.12)]">
        <h1 className="text-xl font-black text-meow-charcoal">Ticket #{ticketCode}</h1>
        <p className="mt-2 text-sm text-meow-muted">{summaryText}</p>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}
      {notice ? (
        <div className="rounded-xl border border-meow-red/20 bg-meow-cream/60 px-4 py-3 text-sm text-meow-muted">
          {notice}
        </div>
      ) : null}

      {!ticket ? (
        <div className="rounded-xl border border-meow-red/20 bg-white px-4 py-3 text-sm text-meow-muted">
          Carregando ticket...
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-2xl border border-meow-red/20 bg-white p-5 shadow-[0_10px_24px_rgba(216,107,149,0.12)]">
            <div className="flex flex-wrap items-center gap-6 text-sm text-meow-muted">
              <div>
                <span className="text-xs font-semibold uppercase tracking-[0.4px]">Status</span>
                <p className="text-base font-bold text-meow-charcoal">
                  {statusLabel[ticket.status]}
                </p>
              </div>
              <div>
                <span className="text-xs font-semibold uppercase tracking-[0.4px]">Criado</span>
                <p className="text-base font-bold text-meow-charcoal">
                  {new Date(ticket.createdAt).toLocaleString('pt-BR')}
                </p>
              </div>
              <div>
                <span className="text-xs font-semibold uppercase tracking-[0.4px]">Pedido</span>
                <p className="text-base font-bold text-meow-charcoal">
                  {ticket.orderId ? ticket.orderId.slice(0, 8) : 'N/A'}
                </p>
              </div>
            </div>

            <div className="mt-4 grid gap-3">
              {messages.length === 0 ? (
                <div className="rounded-xl border border-meow-red/20 bg-white px-4 py-3 text-sm text-meow-muted">
                  Nenhuma mensagem ainda.
                </div>
              ) : (
                messages.map((message) => (
                  <div
                    className={`rounded-xl border border-meow-red/10 px-4 py-3 text-sm ${
                      message.senderId === user.id ? 'bg-meow-cream/60' : 'bg-white'
                    }`}
                    key={message.id}
                  >
                    <p className="text-meow-charcoal">{message.message}</p>
                    <span className="mt-2 block text-xs text-meow-muted">
                      {message.senderId === user.id ? 'Voce' : 'Outro usuario'} -{' '}
                      {new Date(message.createdAt).toLocaleString('pt-BR')}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-meow-red/20 bg-white p-5 shadow-[0_10px_24px_rgba(216,107,149,0.12)]">
            <h3 className="text-base font-bold text-meow-charcoal">Nova mensagem</h3>
            <p className="mt-2 text-xs text-meow-muted">Anexos sao opcionais (MVP).</p>
            <form className="mt-4 grid gap-3" onSubmit={handleSendMessage}>
              <label className="grid gap-1 text-xs font-semibold text-meow-muted">
                Mensagem
                <textarea
                  className="rounded-xl border border-meow-red/20 bg-white px-3 py-2 text-sm text-meow-charcoal"
                  rows={4}
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  placeholder="Escreva a atualizacao"
                  required
                />
              </label>
              <label className="grid gap-1 text-xs font-semibold text-meow-muted">
                Anexos (links)
                <textarea
                  className="rounded-xl border border-meow-red/20 bg-white px-3 py-2 text-sm text-meow-charcoal"
                  rows={2}
                  value={attachmentsInput}
                  onChange={(event) => setAttachmentsInput(event.target.value)}
                  placeholder="Opcional: URLs separadas por virgula"
                />
              </label>
              <button
                className="rounded-full bg-meow-linear px-4 py-2 text-xs font-bold text-white"
                type="submit"
                disabled={busy}
              >
                {busy ? 'Enviando...' : 'Enviar mensagem'}
              </button>
            </form>
          </div>
        </div>
      )}
    </AccountShell>
  );
};
