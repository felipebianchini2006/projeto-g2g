'use client';

import { type FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';

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
  const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
  return `${baseUrl.replace(/\/$/, '')}/chat`;
};

export const OrderChat = ({ orderId, accessToken, userId }: OrderChatProps) => {
  const [connection, setConnection] = useState<ChatConnectionState>('idle');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [page, setPage] = useState(1);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [online, setOnline] = useState(true);
  const socketRef = useRef<Socket | null>(null);
  const timeoutsRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const listRef = useRef<HTMLDivElement | null>(null);
  const chatUrl = useMemo(() => buildChatUrl(), []);

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

  useEffect(() => {
    if (page === 1 && listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages, page]);

  const visibleMessages = useMemo(() => {
    const count = PAGE_SIZE * page;
    return messages.slice(-count);
  }, [messages, page]);

  const canLoadMore = visibleMessages.length < messages.length;
  const canSend = draft.trim().length > 0 && connection === 'connected' && online;

  const rollbackMessage = (localId: string, reason: string) => {
    setMessages((prev) => prev.filter((entry) => entry.localId !== localId));
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
    setPage(1);
    setError(null);

    const timeout = setTimeout(() => {
      rollbackMessage(localId, 'Sem resposta do servidor.');
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
          rollbackMessage(localId, 'Nao foi possivel enviar a mensagem.');
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
      return { label: 'Offline', className: 'offline' };
    }
    if (connection === 'connected') {
      return { label: 'Conectado', className: 'connected' };
    }
    if (connection === 'reconnecting') {
      return { label: 'Reconectando', className: 'reconnecting' };
    }
    if (connection === 'connecting') {
      return { label: 'Conectando', className: 'connecting' };
    }
    return { label: 'Offline', className: 'offline' };
  }, [connection, online]);

  return (
    <div className="order-card order-chat-card">
      <div className="order-chat-header">
        <div>
          <h3>Chat do pedido</h3>
          <p className="auth-helper">Mensagens entre buyer e seller.</p>
        </div>
        <span className={`chat-status chat-status--${statusLabel.className}`}>
          {statusLabel.label}
        </span>
      </div>

      {error ? <div className="state-card info">{error}</div> : null}

      <div className="chat-pagination">
        <span className="auth-helper">
          Mostrando {visibleMessages.length} de {messages.length} mensagens
        </span>
        <div className="chat-pagination-actions">
          {canLoadMore ? (
            <button
              className="ghost-button"
              type="button"
              onClick={() => setPage((prev) => prev + 1)}
            >
              Mostrar anteriores
            </button>
          ) : null}
          {page > 1 ? (
            <button className="ghost-button" type="button" onClick={() => setPage(1)}>
              Ir para o fim
            </button>
          ) : null}
        </div>
      </div>

      <div className="chat-log" ref={listRef}>
        {visibleMessages.length === 0 ? (
          <div className="chat-empty">Nenhuma mensagem ainda.</div>
        ) : (
          visibleMessages.map((message) => {
            const isOwn = message.userId === userId;
            return (
              <div
                className={`chat-message ${isOwn ? 'own' : ''} ${message.status ?? ''}`}
                key={message.id}
              >
                <p className="chat-text">{message.text}</p>
                <div className="chat-meta">
                  <span>
                    {isOwn ? 'Voce' : 'Outro usuario'} ·{' '}
                    {new Date(message.createdAt).toLocaleTimeString('pt-BR', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                  {message.status === 'pending' ? <small>Enviando...</small> : null}
                  {message.status === 'failed' ? <small>Falhou</small> : null}
                </div>
              </div>
            );
          })
        )}
      </div>

      <form className="chat-input-row" onSubmit={handleSend}>
        <textarea
          className="form-input chat-input"
          rows={2}
          placeholder="Escreva sua mensagem..."
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          disabled={!online}
        />
        <button className="primary-button chat-send" type="submit" disabled={!canSend}>
          Enviar
        </button>
      </form>
    </div>
  );
};
