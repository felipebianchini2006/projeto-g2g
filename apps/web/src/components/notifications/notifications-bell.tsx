'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { ApiClientError } from '../../lib/api-client';
import {
  notificationsApi,
  type Notification,
} from '../../lib/notifications-api';
import { useAuth } from '../auth/auth-provider';

const PAGE_SIZE = 10;

const typeIcon: Record<string, string> = {
  PAYMENT: 'fa-credit-card',
  ORDER: 'fa-box',
  CHAT: 'fa-comment-dots',
  SYSTEM: 'fa-bell',
};

const getNotificationLink = (item: Notification): string | null => {
  if (item.metadata && typeof item.metadata === 'object' && 'link' in item.metadata) {
    return (item.metadata as any).link;
  }

  const text = (item.title + ' ' + item.body).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  if (text.includes('pergunta')) {
    return '/conta/perguntas-recebidas';
  }

  if (text.includes('venda')) {
    return '/conta/vendas';
  }

  if (text.includes('compra') || text.includes('pedido')) {
    return '/conta/compras';
  }

  if (text.includes('disputa')) {
    return '/conta/compras'; // Usually buying related, but could be sales. Defaults to purchases for now.
  }

  return null;
};

export const NotificationsBell = () => {
  const { user, accessToken } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notification[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

  const unreadCount = useMemo(
    () => items.filter((item) => !item.readAt).length,
    [items],
  );

  const loadNotifications = async (reset = false) => {
    if (!accessToken || busy) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const list = await notificationsApi.listNotifications(accessToken, {
        take: PAGE_SIZE,
        cursor: reset ? undefined : cursor ?? undefined,
      });
      const nextCursor = list[list.length - 1]?.createdAt;
      setCursor(nextCursor ?? null);
      setHasMore(list.length === PAGE_SIZE);
      setItems((prev) => (reset ? list : [...prev, ...list]));
    } catch (error) {
      const message =
        error instanceof ApiClientError
          ? error.message
          : error instanceof Error
            ? error.message
            : 'Não foi possível carregar notificacoes.';
      setError(message);
    } finally {
      setBusy(false);
    }
  };

  const refresh = async () => {
    setCursor(null);
    setHasMore(true);
    await loadNotifications(true);
  };

  useEffect(() => {
    if (!accessToken) {
      return;
    }
    refresh().catch(() => { });
    const interval = setInterval(() => {
      refresh().catch(() => { });
    }, 30000);
    return () => clearInterval(interval);
  }, [accessToken]);

  useEffect(() => {
    if (!open) {
      return;
    }
    const handleClick = (event: MouseEvent) => {
      if (!panelRef.current || !event.target) {
        return;
      }
      if (!panelRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, [open]);

  const handleMarkRead = async (notificationId: string) => {
    if (!accessToken) {
      return;
    }
    await notificationsApi.markRead(accessToken, notificationId);
    setItems((prev) =>
      prev.map((item) =>
        item.id === notificationId ? { ...item, readAt: new Date().toISOString() } : item,
      ),
    );
  };

  const handleMarkAll = async () => {
    if (!accessToken) {
      return;
    }
    await notificationsApi.markAllRead(accessToken);
    const now = new Date().toISOString();
    setItems((prev) => prev.map((item) => ({ ...item, readAt: now })));
  };

  const handleNotificationClick = async (item: Notification) => {
    const link = getNotificationLink(item);
    if (link) {
      if (!item.readAt) {
        handleMarkRead(item.id).catch(() => { });
      }
      setOpen(false);
      router.push(link);
    }
  };

  if (!user) {
    return null;
  }

  return (
    <div className="notifications-bell" ref={panelRef} data-testid="notifications-bell">
      <button
        className="notifications-trigger"
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-label="Notificacoes"
      >
        <i className="fas fa-bell" aria-hidden="true" />
        {unreadCount > 0 ? <span className="notification-badge">{unreadCount}</span> : null}
      </button>

      {open ? (
        <>
          <div
            className="fixed inset-0 z-10 bg-black/50 backdrop-blur-sm sm:hidden"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <div className="notifications-panel">
            <div className="notifications-panel-header">
              <strong>Notificacoes</strong>
              <button
                className="text-meow-muted sm:hidden"
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Fechar"
              >
                <i className="fas fa-times" aria-hidden="true" />
              </button>
              <div className="notifications-panel-actions">
                <button className="ghost-button" type="button" onClick={refresh} disabled={busy}>
                  Atualizar
                </button>
                <button className="ghost-button" type="button" onClick={handleMarkAll}>
                  Marcar todas
                </button>
              </div>
            </div>

            {error ? <div className="state-card info">{error}</div> : null}

            {items.length === 0 && !busy ? (
              <div className="state-card">Nenhuma notificacao.</div>
            ) : null}

            <div className="notifications-list">
              {items.map((item) => {
                const link = getNotificationLink(item);
                const content = (
                  <>
                    <div className="notification-icon">
                      <i className={`fas ${typeIcon[item.type] ?? 'fa-bell'}`} aria-hidden="true" />
                    </div>
                    <div className="notification-body">
                      <strong>{item.title}</strong>
                      <span>{item.body}</span>
                      <small>{new Date(item.createdAt).toLocaleString('pt-BR')}</small>
                    </div>
                    {!item.readAt ? (
                      <button
                        className="ghost-button"
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleMarkRead(item.id);
                        }}
                      >
                        Lida
                      </button>
                    ) : null}
                  </>
                );

                const baseClass = `notification-row${item.readAt ? '' : ' unread'}`;

                if (link) {
                  return (
                    <Link
                      key={item.id}
                      href={link}
                      className={`${baseClass} cursor-pointer hover:bg-slate-50`}
                      onClick={() => {
                        setOpen(false);
                        if (!item.readAt) handleMarkRead(item.id);
                      }}
                    >
                      {content}
                    </Link>
                  );
                }

                return (
                  <div key={item.id} className={baseClass}>
                    {content}
                  </div>
                );
              })}
            </div>

            {hasMore ? (
              <button
                className="ghost-button"
                type="button"
                onClick={() => loadNotifications(false)}
                disabled={busy}
              >
                {busy ? 'Carregando...' : 'Carregar mais'}
              </button>
            ) : null}
          </div>
        </>
      ) : null}
    </div>
  );
};
