'use client';

import { type FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import {
  MoreHorizontal,
  Paperclip,
  Pencil,
  Send,
  ShieldCheck,
  Trash2,
} from 'lucide-react';

import {
  chatApi,
  type ChatMessage as ApiChatMessage,
  type ChatReadReceipt,
} from '../../lib/chat-api';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';

type ChatMessage = {
  id: string;
  orderId: string;
  userId: string;
  text: string;
  editedAt?: string | null;
  deletedAt?: string | null;
  createdAt: string;
  status?: 'pending' | 'failed' | 'sent';
  localId?: string;
};

type ChatConnectionState = 'idle' | 'connecting' | 'connected' | 'reconnecting' | 'offline';

type OrderChatProps = {
  orderId: string;
  accessToken: string;
  userId: string;
  sellerName?: string;
  sellerInitials?: string;
};

type MessageCreatedPayload = {
  id: string;
  orderId: string;
  userId: string;
  text: string;
  createdAt: string | Date;
};

type MessageUpdatedPayload = {
  id: string;
  orderId: string;
  userId: string;
  text: string;
  editedAt?: string | null;
  updatedAt: string | Date;
};

type MessageDeletedPayload = {
  id: string;
  orderId: string;
  deletedAt: string | Date;
};

type ReadReceiptPayload = {
  orderId: string;
  userId: string;
  lastReadAt: string | Date;
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
  editedAt: message.editedAt ?? null,
  deletedAt: message.deletedAt ?? null,
  createdAt: message.createdAt,
  status: 'sent',
});

export const OrderChat = ({
  orderId,
  accessToken,
  userId,
  sellerName,
  sellerInitials,
}: OrderChatProps) => {
  const [connection, setConnection] = useState<ChatConnectionState>('idle');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [readReceipts, setReadReceipts] = useState<ChatReadReceipt[]>([]);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [online, setOnline] = useState(true);
  const [historyCursor, setHistoryCursor] = useState<string | null>(null);
  const [historyBusy, setHistoryBusy] = useState(false);
  const [hasMoreHistory, setHasMoreHistory] = useState(true);
  const [initialLoaded, setInitialLoaded] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState('');
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
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
      if (data.messages.length === 0) {
        setHasMoreHistory(false);
        return;
      }
      const nextCursor = data.messages[data.messages.length - 1]?.createdAt ?? null;
      const mapped = data.messages
        .map((message) => mapApiMessage(message, orderId))
        .reverse();
      setHistoryCursor(nextCursor);
      if (data.messages.length < PAGE_SIZE) {
        setHasMoreHistory(false);
      }
      setMessages((prev) => {
        const ids = new Set(prev.map((entry) => entry.id));
        const unique = mapped.filter((entry) => !ids.has(entry.id));
        return [...unique, ...prev];
      });
      setReadReceipts(data.readReceipts ?? []);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Falha ao carregar mensagens.';
      setError(message);
    } finally {
      setHistoryBusy(false);
    }
  };

  useEffect(() => {
    setMessages([]);
    setReadReceipts([]);
    setHistoryCursor(null);
    setHasMoreHistory(true);
    setInitialLoaded(false);
    setEditingId(null);
    setEditDraft('');
    setOpenMenuId(null);
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
    const socket = socketRef.current;
    if (initialLoaded && socket?.connected) {
      socket.emit('markRead', { orderId });
    }
  }, [initialLoaded, orderId]);

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
      socket.emit('markRead', { orderId });
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
      if (payload.userId !== userId) {
        socket.emit('markRead', { orderId });
      }
      scrollToBottom('smooth');
    };

    const handleMessageUpdated = (payload: MessageUpdatedPayload) => {
      const editedAt = payload.editedAt ? new Date(payload.editedAt).toISOString() : null;
      setMessages((prev) =>
        prev.map((entry) =>
          entry.id === payload.id
            ? { ...entry, text: payload.text, editedAt, status: 'sent' }
            : entry,
        ),
      );
    };

    const handleMessageDeleted = (payload: MessageDeletedPayload) => {
      const deletedAt =
        payload.deletedAt instanceof Date
          ? payload.deletedAt.toISOString()
          : new Date(payload.deletedAt).toISOString();
      setMessages((prev) =>
        prev.map((entry) =>
          entry.id === payload.id
            ? { ...entry, text: '', deletedAt, status: 'sent' }
            : entry,
        ),
      );
    };

    const handleReadReceipt = (payload: ReadReceiptPayload) => {
      const lastReadAt =
        payload.lastReadAt instanceof Date
          ? payload.lastReadAt.toISOString()
          : new Date(payload.lastReadAt).toISOString();
      setReadReceipts((prev) => {
        const exists = prev.find((entry) => entry.userId === payload.userId);
        if (!exists) {
          return [...prev, { userId: payload.userId, lastReadAt }];
        }
        return prev.map((entry) =>
          entry.userId === payload.userId ? { ...entry, lastReadAt } : entry,
        );
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
    socket.on('messageUpdated', handleMessageUpdated);
    socket.on('messageDeleted', handleMessageDeleted);
    socket.on('readReceipt', handleReadReceipt);
    socket.on('exception', handleException);
    socket.io.on('reconnect_attempt', () => setConnection('reconnecting'));
    socket.io.on('reconnect_failed', () => setConnection('offline'));

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('connect_error', handleConnectError);
      socket.off('messageCreated', handleMessageCreated);
      socket.off('messageUpdated', handleMessageUpdated);
      socket.off('messageDeleted', handleMessageDeleted);
      socket.off('readReceipt', handleReadReceipt);
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

  const handleStartEdit = (message: ChatMessage) => {
    setEditingId(message.id);
    setEditDraft(message.text);
    setOpenMenuId(null);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditDraft('');
  };

  const handleSaveEdit = (messageId: string) => {
    const text = editDraft.trim();
    if (!text) {
      setError('A mensagem não pode ficar vazia.');
      return;
    }
    const socket = socketRef.current;
    if (!socket || !socket.connected) {
      setError('Chat offline. Tente novamente.');
      return;
    }
    setMessages((prev) =>
      prev.map((entry) =>
        entry.id === messageId
          ? { ...entry, text, editedAt: new Date().toISOString() }
          : entry,
      ),
    );
    socket.emit('editMessage', { messageId, content: text });
    setEditingId(null);
    setEditDraft('');
  };

  const handleDeleteMessage = (messageId: string) => {
    const socket = socketRef.current;
    if (!socket || !socket.connected) {
      setError('Chat offline. Tente novamente.');
      return;
    }
    setMessages((prev) =>
      prev.map((entry) =>
        entry.id === messageId
          ? { ...entry, text: '', deletedAt: new Date().toISOString() }
          : entry,
      ),
    );
    socket.emit('deleteMessage', { messageId });
    setOpenMenuId(null);
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
          markMessageFailed(localId, 'NÃ£o foi possÃ­vel enviar a mensagem.');
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
      return { label: 'OFFLINE', tone: 'text-slate-400' } as const;
    }
    if (connection === 'connected') {
      return { label: 'ONLINE AGORA', tone: 'text-emerald-600' } as const;
    }
    if (connection === 'reconnecting') {
      return { label: 'RECONECTANDO', tone: 'text-amber-500' } as const;
    }
    if (connection === 'connecting') {
      return { label: 'Conectando', tone: 'text-slate-400' } as const;
    }
    return { label: 'OFFLINE', tone: 'text-slate-400' } as const;
  }, [connection, online]);

  const lastReadAtOther = useMemo(() => {
    const otherReads = readReceipts.filter((receipt) => receipt.userId !== userId);
    if (otherReads.length === 0) {
      return null;
    }
    const mostRecent = otherReads.reduce((acc, current) =>
      new Date(current.lastReadAt).getTime() > new Date(acc.lastReadAt).getTime()
        ? current
        : acc,
    );
    return mostRecent.lastReadAt;
  }, [readReceipts, userId]);

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-[26px] border border-slate-100 bg-white shadow-[0_18px_40px_rgba(15,23,42,0.06)]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-meow-100 text-sm font-black text-meow-deep">
            {(sellerInitials ?? 'VP').slice(0, 2).toUpperCase()}
          </div>
          <div>
            <p className="text-sm font-semibold text-meow-charcoal">
              {sellerName ?? 'Vendedor'}
            </p>
            <p className={`text-[11px] font-bold uppercase ${statusLabel.tone}`}>
              <span className="mr-1 inline-block h-2 w-2 rounded-full bg-current" />
              {statusLabel.label}
            </p>
          </div>
        </div>
        <div className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-semibold text-slate-500">
          Resposta média: 5 min
        </div>
      </div>

      {error ? (
        <div className="mx-6 mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {error}
        </div>
      ) : null}

      <div className="flex-1 overflow-hidden px-6 py-4">
        <div className="flex items-center justify-center">
          <span className="rounded-full bg-slate-100 px-4 py-1 text-[10px] font-semibold text-slate-500">
            HOJE
          </span>
        </div>

        <div className="mt-4 rounded-2xl border border-blue-100 bg-blue-50/80 px-4 py-3 text-xs text-blue-800">
          <div className="flex items-start gap-2">
            <ShieldCheck size={16} className="mt-0.5 text-blue-600" aria-hidden />
            <p>
              Compra garantida pela Meoww Store. O pagamento fica retido em segurança até você confirmar o recebimento. Só libere após testar o produto.</p>
          </div>
        </div>

        <div
          className="mt-4 flex-1 space-y-4 overflow-y-auto pb-2"
          ref={listRef}
        >
          {hasMoreHistory ? (
            <div className="flex justify-center">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => loadHistory(historyCursor)}
                disabled={historyBusy}
              >
                {historyBusy ? 'Carregando...' : 'Ver mensagens anteriores'}
              </Button>
            </div>
          ) : null}
          {messages.length === 0 ? (
            <div className="text-xs text-meow-muted">Nenhuma mensagem ainda.</div>
          ) : (
            messages.map((message) => {
              const isOwn = message.userId === userId;
              const isDeleted = Boolean(message.deletedAt);
              const isEditing = editingId === message.id;
              const lastRead = lastReadAtOther ? new Date(lastReadAtOther) : null;
              const isSeen =
                isOwn && lastRead
                  ? lastRead.getTime() >= new Date(message.createdAt).getTime()
                  : false;
              const statusText = isOwn
                ? message.status === 'pending'
                  ? 'Enviando...'
                  : message.status === 'failed'
                    ? 'Falhou'
                    : isSeen
                      ? 'âœ“âœ“ Visto'
                      : 'âœ“ Enviado'
                : null;

              return (
                <div
                  className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                  key={message.id}
                >
                  {!isOwn ? (
                    <div className="mr-2 mt-auto flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-[10px] font-bold text-slate-500">
                      {(sellerInitials ?? 'VP').slice(0, 2).toUpperCase()}
                    </div>
                  ) : null}
                  <div className="max-w-[75%]">
                    <div className="flex items-start justify-between gap-2">
                      <div
                        className={`rounded-2xl px-4 py-2 text-sm shadow-sm ${
                          isDeleted
                            ? 'bg-slate-100 text-slate-400'
                            : isOwn
                              ? 'bg-meow-linear text-white'
                              : 'bg-white text-meow-charcoal'
                        } ${message.status === 'failed' ? 'border border-red-200' : ''}`}
                      >
                        {isEditing ? (
                          <div className="space-y-2 text-meow-charcoal">
                            <Textarea
                              rows={3}
                              value={editDraft}
                              onChange={(event) => setEditDraft(event.target.value)}
                              className="bg-white"
                            />
                            <div className="flex items-center justify-end gap-2">
                              <Button type="button" size="sm" variant="ghost" onClick={handleCancelEdit}>
                                Cancelar
                              </Button>
                              <Button type="button" size="sm" onClick={() => handleSaveEdit(message.id)}>
                                Salvar
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <p>{isDeleted ? 'Mensagem apagada' : message.text}</p>
                        )}
                      </div>
                      {isOwn && !isDeleted && !isEditing ? (
                        <div className="relative">
                          <button
                            type="button"
                            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-slate-500 hover:border-meow-red/30 hover:text-meow-deep"
                            onClick={() =>
                              setOpenMenuId((prev) => (prev === message.id ? null : message.id))
                            }
                            aria-label="Mais acoes"
                          >
                            <MoreHorizontal size={14} />
                          </button>
                          {openMenuId === message.id ? (
                            <div className="absolute right-0 top-9 z-10 w-36 rounded-xl border border-slate-200 bg-white p-2 text-xs shadow-card">
                              <button
                                type="button"
                                className="flex w-full items-center gap-2 rounded-lg px-2 py-1 text-slate-600 hover:bg-slate-50"
                                onClick={() => handleStartEdit(message)}
                              >
                                <Pencil size={12} />
                                Editar
                              </button>
                              <button
                                type="button"
                                className="mt-1 flex w-full items-center gap-2 rounded-lg px-2 py-1 text-red-500 hover:bg-red-50"
                                onClick={() => handleDeleteMessage(message.id)}
                              >
                                <Trash2 size={12} />
                                Apagar
                              </button>
                            </div>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                    <div
                      className={`mt-1 flex items-center justify-between gap-2 text-[10px] ${
                        isOwn ? 'text-pink-400' : 'text-slate-400'
                      }`}
                    >
                      <span>
                        {formatTime(message.createdAt)}
                        {message.editedAt && !isDeleted ? ' (editado)' : ''}
                      </span>
                      {statusText ? <span>{statusText}</span> : null}
                    </div>
                  </div>
                  {isOwn ? (
                    <div className="ml-2 mt-auto flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-[10px] font-bold text-white">
                      EU
                    </div>
                  ) : null}
                </div>
              );
            })
          )}
        </div>
      </div>

      <form
        className="border-t border-slate-100 px-6 py-4"
        onSubmit={handleSend}
      >
        <div className="flex items-center gap-3 rounded-full border border-slate-200 bg-white px-4 py-2 shadow-sm">
          <button type="button" className="text-slate-400" aria-label="Anexar">
            <Paperclip size={18} aria-hidden />
          </button>
          <input
            className="flex-1 bg-transparent text-sm text-meow-charcoal outline-none placeholder:text-slate-400"
            placeholder="Escreva sua mensagem..."
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            disabled={!online}
          />
          <button
            type="submit"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-meow-linear text-white"
            disabled={!canSend}
            aria-label="Enviar"
          >
            <Send size={16} aria-hidden />
          </button>
        </div>
      </form>
    </div>
  );
};




