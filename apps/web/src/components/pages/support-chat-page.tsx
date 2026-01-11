'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';

import { ApiClientError } from '../../lib/api-client';
import { supportAiApi, type SupportChatMessage as ApiSupportChatMessage } from '../../lib/support-ai-api';
import { useAuth } from '../auth/auth-provider';
import { AccountShell } from '../account/account-shell';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';

type UiMessage = {
  id: string;
  role: 'USER' | 'AI' | 'SYSTEM';
  content: string;
  createdAt: string;
  status?: 'pending' | 'failed' | 'sent';
  localId?: string;
};

const MAX_MESSAGE_LENGTH = 2000;

const mapApiMessage = (message: ApiSupportChatMessage): UiMessage => ({
  id: message.id,
  role: message.role,
  content: message.content,
  createdAt: message.createdAt,
  status: 'sent',
});

const formatTime = (value: string) =>
  new Date(value).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

export const SupportChatPage = () => {
  const { user, accessToken, loading } = useAuth();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<UiMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [initialLoading, setInitialLoading] = useState(false);
  const listRef = useRef<HTMLDivElement | null>(null);

  const sessionKey = useMemo(
    () => (user ? `support-chat-session:${user.id}` : null),
    [user],
  );

  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    if (!listRef.current) {
      return;
    }
    listRef.current.scrollTo({ top: listRef.current.scrollHeight, behavior });
  };

  const ensureSession = async () => {
    if (!accessToken || !sessionKey) {
      return null;
    }

    const stored =
      typeof window !== 'undefined' ? window.localStorage.getItem(sessionKey) : null;
    if (stored) {
      setSessionId(stored);
      return stored;
    }

    const response = await supportAiApi.createSession(accessToken);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(sessionKey, response.sessionId);
    }
    setSessionId(response.sessionId);
    return response.sessionId;
  };

  const loadMessages = async (currentSessionId: string) => {
    if (!accessToken) {
      return;
    }
    setInitialLoading(true);
    try {
      const data = await supportAiApi.listMessages(accessToken, currentSessionId);
      setMessages(data.map(mapApiMessage));
      setError(null);
      setTimeout(() => scrollToBottom('auto'), 0);
    } catch (err) {
      const message =
        err instanceof ApiClientError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Nao foi possivel carregar o chat.';
      setError(message);
    } finally {
      setInitialLoading(false);
    }
  };

  useEffect(() => {
    if (!accessToken || !user) {
      return;
    }

    ensureSession()
      .then((id) => {
        if (id) {
          loadMessages(id);
        }
      })
      .catch((err) => {
        const message =
          err instanceof ApiClientError
            ? err.message
            : err instanceof Error
              ? err.message
              : 'Nao foi possivel iniciar o chat.';
        setError(message);
      });
  }, [accessToken, user, sessionKey]);

  const handleSend = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!accessToken || !sessionId || busy) {
      return;
    }

    const text = draft.trim();
    if (!text) {
      return;
    }
    if (text.length > MAX_MESSAGE_LENGTH) {
      setError('Mensagem muito longa.');
      return;
    }

    const localId = crypto.randomUUID();
    const optimistic: UiMessage = {
      id: localId,
      localId,
      role: 'USER',
      content: text,
      createdAt: new Date().toISOString(),
      status: 'pending',
    };

    setMessages((prev) => [...prev, optimistic]);
    setDraft('');
    setError(null);
    scrollToBottom();
    setBusy(true);

    try {
      const response = await supportAiApi.sendMessage(accessToken, sessionId, text);
      setMessages((prev) => {
        const next = prev.map((entry) =>
          entry.localId === localId ? { ...mapApiMessage(response.userMessage), localId } : entry,
        );
        if (!next.some((entry) => entry.id === response.aiMessage.id)) {
          next.push(mapApiMessage(response.aiMessage));
        }
        return next;
      });
      scrollToBottom();
    } catch (err) {
      const message =
        err instanceof ApiClientError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Nao foi possivel enviar a mensagem.';
      setError(message);
      setMessages((prev) =>
        prev.map((entry) =>
          entry.localId === localId ? { ...entry, status: 'failed' } : entry,
        ),
      );
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
          <p className="text-sm text-meow-muted">Entre para falar com o suporte IA.</p>
          <Link
            href="/login"
            className="mt-4 inline-flex rounded-full bg-meow-linear px-6 py-2 text-sm font-bold text-white"
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
        { label: 'Chat com IA' },
      ]}
    >
      <div className="rounded-2xl border border-meow-red/20 bg-white p-6 shadow-[0_10px_24px_rgba(216,107,149,0.12)]">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-black text-meow-charcoal">Chat de suporte com IA</h1>
            <p className="mt-2 text-sm text-meow-muted">
              Respostas rapidas sobre pedidos, Pix e tickets. Para casos urgentes, abra um ticket.
            </p>
          </div>
          <Link
            href="/conta/tickets"
            className="rounded-full border border-meow-red/30 px-4 py-2 text-xs font-bold text-meow-deep"
          >
            Abrir ticket
          </Link>
        </div>

        {error ? (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <div
          className="mt-4 max-h-[360px] space-y-3 overflow-y-auto rounded-2xl border border-meow-red/10 bg-meow-50/40 p-4"
          ref={listRef}
        >
          {initialLoading ? (
            <div className="text-xs text-meow-muted">Carregando conversa...</div>
          ) : null}
          {!initialLoading && messages.length === 0 ? (
            <div className="text-xs text-meow-muted">
              Nenhuma mensagem ainda. Pergunte sobre seu pedido ou pagamento.
            </div>
          ) : null}
          {messages.map((message) => {
            const isUser = message.role === 'USER';
            return (
              <div
                className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
                key={message.id}
              >
                <div
                  className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${
                    isUser
                      ? 'bg-meow-300 text-white'
                      : 'bg-white text-meow-charcoal shadow-sm'
                  } ${message.status === 'failed' ? 'border border-red-200' : ''}`}
                >
                  <p>{message.content}</p>
                  <div
                    className={`mt-1 flex items-center justify-between gap-2 text-[10px] ${
                      isUser ? 'text-white/80' : 'text-meow-muted'
                    }`}
                  >
                    <span>
                      {isUser ? 'Voce' : 'Suporte IA'} - {formatTime(message.createdAt)}
                    </span>
                    {message.status === 'pending' ? <span>Enviando...</span> : null}
                    {message.status === 'failed' ? <span>Falhou</span> : null}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <form className="mt-4 flex flex-col gap-3 sm:flex-row" onSubmit={handleSend}>
          <Textarea
            rows={2}
            className="min-h-[64px] flex-1"
            placeholder="Digite sua pergunta..."
            value={draft}
            maxLength={MAX_MESSAGE_LENGTH}
            onChange={(event) => setDraft(event.target.value)}
            disabled={busy}
          />
          <Button type="submit" disabled={busy || draft.trim().length === 0}>
            {busy ? 'Enviando...' : 'Enviar'}
          </Button>
        </form>
      </div>
    </AccountShell>
  );
};
