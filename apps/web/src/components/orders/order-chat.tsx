'use client';

import { type FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';

import { chatApi, type ChatMessage as ApiChatMessage } from '../../lib/chat-api';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';

type ChatMessage = {
  id: string;
  orderId: string;
  userId: string;
  text: string;
  createdAt: string;
  status?: 'pending' | 'failed' | 'sent';
  localId?: string;
};

type ChatConnectionState = 'idle' | 'connecting' | 'connected' | 'reconnecting' | 'offline';

type OrderChatProps = {
  orderId: string;
  accessToken: string;
  userId: string;
};

type MessageCreatedPayload = {
  id: string;
  orderId: string;
  userId: string;
  text: string;
  createdAt: string | Date;
};

const PAGE_SIZE = 20;

const buildChatUrl = () => {
  const baseUrl = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001';
  return `${baseUrl.replace(/\/$/, '')}/chat`;
};

const formatTime = (value: string) =>
  new Date(value).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

const mapApiMessage = (message: ApiChatMessage, orderId: string): ChatMessage => ({
  id: message.id,
  orderId,
  userId: message.senderId,
  text: message.content,
  createdAt: message.createdAt,
  status: 'sent',
});

export const OrderChat = ({ orderId, accessToken, userId }: OrderChatProps) => {
  const [connection, setConnection] = useState<ChatConnectionState>('idle');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [online, setOnline] = useState(true);
  const [historyCursor, setHistoryCursor] = useState<string | null>(null);
  const [historyBusy, setHistoryBusy] = useState(false);
  const [hasMoreHistory, setHasMoreHistory] = useState(true);
  const [initialLoaded, setInitialLoaded] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const timeoutsRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const listRef = useRef<HTMLDivElement | null>(null);
  const chatUrl = useMemo(() => buildChatUrl(), []);

  const scrollToBottom = (behavior: ScrollBehavior = 'auto') => {
    if (!listRef.current) {
      return;
    }
    listRef.current.scrollTo({ top: listRef.current.scrollHeight, behavior });
  };

  useEffect(() => {
    if (typeof navigator !== 'undefined') {
      setOnline(navigator.onLine);
    }
    const handleOnline = () => {
      setOnline(true);
      const socket = socketRef.current;
      if (socket && !socket.connected) {
        setConnection('reconnecting');
        socket.connect();
      }
    };
    const handleOffline = () => {
      setOnline(false);
      setConnection('offline');
    };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const loadHistory = async (cursor?: string | null) => {
    if (!accessToken || historyBusy || !hasMoreHistory) {
      return;
    }
    setHistoryBusy(true);
    try {
      const data = await chatApi.listOrderMessages(
        accessToken,
        orderId,
        cursor ?? undefined,
        PAGE_SIZE,
      );
      if (data.length === 0) {
        setHasMoreHistory(false);
        return;
      }
      const nextCursor = data[data.length - 1]?.createdAt ?? null;
      const mapped = data.map((message) => mapApiMessage(message, orderId)).reverse();
      setHistoryCursor(nextCursor);
      if (data.length < PAGE_SIZE) {
        setHasMoreHistory(false);
      }
      setMessages((prev) => {
        const ids = new Set(prev.map((entry) => entry.id));
        const unique = mapped.filter((entry) => !ids.has(entry.id));
        return [...unique, ...prev];
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Falha ao carregar mensagens.';
      setError(message);
    } finally {
      setHistoryBusy(false);
    }
  };

  useEffect(() => {
    setMessages([]);
    setHistoryCursor(null);
    setHasMoreHistory(true);
    setInitialLoaded(false);
    if (accessToken && orderId) {
      loadHistory(null);
    }
  }, [accessToken, orderId]);

  useEffect(() => {
    if (!initialLoaded && messages.length > 0) {
      scrollToBottom();
      setInitialLoaded(true);
    }
  }, [initialLoaded, messages.length]);

  useEffect(() => {
    if (!accessToken || !orderId) {
      return;
    }

    setConnection('connecting');
    setError(null);

    const socket = io(chatUrl, {
      auth: { token: accessToken },
      transports: ['websocket'],
      reconnectionAttempts: 10,
    });

    socketRef.current = socket;

    const handleConnect = () => {
      setConnection('connected');
      setError(null);
      socket.emit('joinRoom', orderId);
    };

    const handleDisconnect = () => {
      const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
      setConnection(isOnline ? 'reconnecting' : 'offline');
    };

    const handleConnectError = (err: Error) => {
      const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
      setConnection(isOnline ? 'reconnecting' : 'offline');
      setError(err?.message ?? 'Falha ao conectar no chat.');
    };

    const handleMessageCreated = (payload: MessageCreatedPayload) => {
      const createdAt =
        payload.createdAt instanceof Date
          ? payload.createdAt.toISOString()
          : new Date(payload.createdAt).toISOString();

      setMessages((prev) => {
        if (prev.some((entry) => entry.id === payload.id)) {
          return prev;
        }

        const matchIndex = prev.findIndex(
          (entry) =>
            entry.status === 'pending' &&
            entry.userId === payload.userId &&
            entry.text === payload.text,
        );

        if (matchIndex >= 0) {
          const next = [...prev];
          next[matchIndex] = {
            ...next[matchIndex],
            id: payload.id,
            createdAt,
            status: 'sent',
          };
          return next;
        }

        return [
          ...prev,
          {
            id: payload.id,
            orderId: payload.orderId,
            userId: payload.userId,
            text: payload.text,
            createdAt,
            status: 'sent',
          },
        ];
      });
      scrollToBottom('smooth');
    };

    const handleException = (payload: { message?: string }) => {
      if (payload?.message) {
        setError(payload.message);
      }
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('connect_error', handleConnectError);
    socket.on('messageCreated', handleMessageCreated);
    socket.on('exception', handleException);
    socket.io.on('reconnect_attempt', () => setConnection('reconnecting'));
    socket.io.on('reconnect_failed', () => setConnection('offline'));

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('connect_error', handleConnectError);
      socket.off('messageCreated', handleMessageCreated);
      socket.off('exception', handleException);
      socket.io.off('reconnect_attempt');
      socket.io.off('reconnect_failed');
      socket.disconnect();
      socketRef.current = null;
      timeoutsRef.current.forEach((timeout) => clearTimeout(timeout));
      timeoutsRef.current.clear();
    };
  }, [accessToken, chatUrl, orderId]);

  const canSend = draft.trim().length > 0 && connection === 'connected' && online;

  const markMessageFailed = (localId: string, reason: string) => {
    setMessages((prev) =>
      prev.map((entry) =>
        entry.localId === localId ? { ...entry, status: 'failed' } : entry,
      ),
    );
    setError(reason);
  };

  const handleSend = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const text = draft.trim();
    if (!text) {
      return;
    }

    const socket = socketRef.current;
    if (!socket || !socket.connected) {
      setError('Chat offline. Tente novamente.');
      return;
    }

    const localId = crypto.randomUUID();
    const optimistic: ChatMessage = {
      id: localId,
      localId,
      orderId,
      userId,
      text,
      createdAt: new Date().toISOString(),
      status: 'pending',
    };

    setMessages((prev) => [...prev, optimistic]);
    setDraft('');
    setError(null);
    scrollToBottom('smooth');

    const timeout = setTimeout(() => {
      markMessageFailed(localId, 'Sem resposta do servidor.');
    }, 7000);
    timeoutsRef.current.set(localId, timeout);

    socket.emit(
      'sendMessage',
      { orderId, text },
      (response?: { id?: string; createdAt?: string | Date }) => {
        const pendingTimeout = timeoutsRef.current.get(localId);
        if (pendingTimeout) {
          clearTimeout(pendingTimeout);
          timeoutsRef.current.delete(localId);
        }

        if (!response?.id) {
          markMessageFailed(localId, 'Nao foi possivel enviar a mensagem.');
          return;
        }

        const createdAt =
          response.createdAt instanceof Date
            ? response.createdAt.toISOString()
            : new Date(response.createdAt ?? Date.now()).toISOString();

        setMessages((prev) =>
          prev.map((entry) =>
            entry.localId === localId
              ? {
                  ...entry,
                  id: response.id ?? entry.id,
                  createdAt,
                  status: 'sent',
                }
              : entry,
          ),
        );
      },
    );
  };

  const statusLabel = useMemo(() => {
    if (!online) {
      return { label: 'Offline', variant: 'danger' } as const;
    }
    if (connection === 'connected') {
      return { label: 'Conectado', variant: 'success' } as const;
    }
    if (connection === 'reconnecting') {
      return { label: 'Reconectando', variant: 'warning' } as const;
    }
    if (connection === 'connecting') {
      return { label: 'Conectando', variant: 'info' } as const;
    }
    return { label: 'Offline', variant: 'danger' } as const;
  }, [connection, online]);

  return (
    <div className="rounded-2xl border border-meow-red/20 bg-white p-4 shadow-card">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-meow-charcoal">Chat do pedido</h3>
          <p className="text-xs text-meow-muted">Mensagens entre comprador e vendedor.</p>
        </div>
        <Badge variant={statusLabel.variant}>{statusLabel.label}</Badge>
      </div>

      {error ? (
        <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {error}
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-[11px] text-meow-muted">
        <span>{messages.length} mensagens</span>
        <div className="flex flex-wrap gap-2">
          {hasMoreHistory ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => loadHistory(historyCursor)}
              disabled={historyBusy}
            >
              {historyBusy ? 'Carregando...' : 'Mostrar anteriores'}
            </Button>
          ) : null}
          <Button type="button" variant="ghost" size="sm" onClick={() => scrollToBottom('smooth')}>
            Ir para o fim
          </Button>
        </div>
      </div>

      <div
        className="mt-3 max-h-[320px] space-y-3 overflow-y-auto rounded-2xl border border-meow-red/10 bg-meow-50/40 p-3"
        ref={listRef}
      >
        {messages.length === 0 ? (
          <div className="text-xs text-meow-muted">Nenhuma mensagem ainda.</div>
        ) : (
          messages.map((message) => {
            const isOwn = message.userId === userId;
            return (
              <div
                className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                key={message.id}
              >
                <div
                  className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${
                    isOwn
                      ? 'bg-meow-300 text-white'
                      : 'bg-white text-meow-charcoal shadow-sm'
                  } ${message.status === 'failed' ? 'border border-red-200' : ''}`}
                >
                  <p>{message.text}</p>
                  <div
                    className={`mt-1 flex items-center justify-between gap-2 text-[10px] ${
                      isOwn ? 'text-white/80' : 'text-meow-muted'
                    }`}
                  >
                    <span>{isOwn ? 'Voce' : 'Outro usuario'} - {formatTime(message.createdAt)}</span>
                    {message.status === 'pending' ? <span>Enviando...</span> : null}
                    {message.status === 'failed' ? <span>Falhou</span> : null}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <form className="mt-3 flex flex-col gap-2 sm:flex-row" onSubmit={handleSend}>
        <Textarea
          rows={2}
          className="min-h-[64px] flex-1"
          placeholder="Escreva sua mensagem..."
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          disabled={!online}
        />
        <Button type="submit" disabled={!canSend}>
          Enviar
        </Button>
      </form>
    </div>
  );
};

