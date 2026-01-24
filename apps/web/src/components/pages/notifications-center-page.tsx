'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import {
  Bell,
  Check,
  MessageCircle,
  ShoppingBag,
  Ticket,
  Trash2,
  Wallet,
} from 'lucide-react';

import { useAuth } from '../auth/auth-provider';
import { notificationsApi, type Notification } from '../../lib/notifications-api';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Tabs, TabsList, TabsTrigger } from '../ui/tabs';

const tabs = [
  { id: 'all', label: 'Todos', icon: Bell },
  { id: 'announcements', label: 'Anuncios', icon: ShoppingBag },
  { id: 'tickets', label: 'Tickets', icon: Ticket },
  { id: 'sales', label: 'Vendas', icon: Wallet },
  { id: 'chats', label: 'Chats', icon: MessageCircle },
] as const;

const typeFilterMap: Record<(typeof tabs)[number]['id'], string[]> = {
  all: [],
  announcements: ['SYSTEM'],
  tickets: ['SYSTEM'],
  sales: ['ORDER', 'PAYMENT'],
  chats: ['CHAT'],
};

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

const getNotificationIcon = (type: string) => {
  if (type === 'CHAT') {
    return MessageCircle;
  }
  if (type === 'ORDER' || type === 'PAYMENT') {
    return Wallet;
  }
  return ShoppingBag;
};

export const NotificationsCenterContent = () => {
  const { accessToken, user, loading } = useAuth();
  const [activeTab, setActiveTab] = useState<(typeof tabs)[number]['id']>('all');
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [actionBusy, setActionBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!accessToken) {
      return;
    }
    let active = true;
    const load = async () => {
      setLoadingList(true);
      try {
        const data = await notificationsApi.listNotifications(accessToken, {
          take: 40,
        });
        if (!active) {
          return;
        }
        setNotifications(data);
      } finally {
        if (active) {
          setLoadingList(false);
        }
      }
    };
    load();
    return () => {
      active = false;
    };
  }, [accessToken]);

  const unreadCount = useMemo(
    () => notifications.filter((item) => !item.readAt).length,
    [notifications],
  );

  const filtered = useMemo(() => {
    const allowed = typeFilterMap[activeTab] ?? [];
    if (activeTab === 'all' || allowed.length === 0) {
      return notifications;
    }
    return notifications.filter((notification) => allowed.includes(notification.type));
  }, [notifications, activeTab]);

  const markAll = async () => {
    if (!accessToken) {
      return;
    }
    setNotice(null);
    await notificationsApi.markAllRead(accessToken);
    setNotifications((prev) =>
      prev.map((item) => ({
        ...item,
        readAt: item.readAt ?? new Date().toISOString(),
      })),
    );
  };

  const markRead = async (notificationId: string) => {
    if (!accessToken) {
      return;
    }
    setActionBusy(notificationId);
    try {
      await notificationsApi.markRead(accessToken, notificationId);
      setNotifications((prev) =>
        prev.map((item) =>
          item.id === notificationId
            ? { ...item, readAt: item.readAt ?? new Date().toISOString() }
            : item,
        ),
      );
    } finally {
      setActionBusy(null);
    }
  };

  const deleteOne = async (notificationId: string) => {
    if (!accessToken) {
      return;
    }
    setActionBusy(notificationId);
    try {
      await notificationsApi.deleteOne(accessToken, notificationId);
      setNotifications((prev) => prev.filter((item) => item.id !== notificationId));
    } finally {
      setActionBusy(null);
    }
  };

  const clearAll = async () => {
    if (!accessToken) {
      return;
    }
    setNotice(null);
    await notificationsApi.clearAll(accessToken);
    setNotifications([]);
  };

  if (loading) {
    return (
      <section className="bg-white pb-16 pt-10">
        <div className="mx-auto w-full max-w-[1200px] px-6">
          <div className="rounded-xl border border-slate-200 bg-white px-6 py-4 text-sm text-meow-muted">
            Carregando sessao...
          </div>
        </div>
      </section>
    );
  }

  if (!user) {
    return (
      <section className="bg-white pb-16 pt-10">
        <div className="mx-auto w-full max-w-[1200px] px-6">
          <div className="rounded-xl border border-slate-200 bg-white px-6 py-6 text-center">
            <p className="text-sm text-meow-muted">
              Entre para acompanhar suas notificações.
            </p>
            <Link
              href="/login"
              className="mt-4 inline-flex rounded-full bg-meow-linear px-6 py-2 text-sm font-bold text-white"
            >
              Fazer login
            </Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="bg-white pb-16 pt-10">
      <div className="mx-auto w-full max-w-[1200px] px-6">
        <div className="mb-6 text-sm text-meow-muted">
          <Link href="/" className="font-semibold text-meow-deep">
            Inicio
          </Link>{' '}
          &gt;{' '}
          <Link href="/conta" className="font-semibold text-meow-deep">
            Conta
          </Link>{' '}
          &gt; Notificações
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-black text-meow-charcoal">Notificações</h1>
              <Badge variant="pink">{unreadCount} novas</Badge>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button type="button" size="sm" variant="secondary" onClick={markAll}>
                Marcar todas como lidas
              </Button>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
              <TabsList className="gap-2 overflow-x-auto whitespace-nowrap sm:flex-wrap sm:overflow-visible">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <TabsTrigger key={tab.id} value={tab.id} className="flex items-center gap-2">
                      <Icon size={14} aria-hidden />
                      {tab.label}
                    </TabsTrigger>
                  );
                })}
              </TabsList>
            </Tabs>
          </div>

          {notice ? (
            <div className="mt-4 rounded-xl border border-meow-red/20 bg-meow-cream/60 px-4 py-3 text-sm text-meow-muted">
              {notice}
            </div>
          ) : null}

          <div className="mt-6 space-y-3">
            {loadingList ? <div className="text-sm text-meow-muted">Carregando...</div> : null}
            {!loadingList && filtered.length === 0 ? (
              <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-5 text-sm text-meow-muted">
                Nenhuma notificação por aqui.
              </div>
            ) : null}
            {filtered.map((notification) => {
              const Icon = getNotificationIcon(notification.type);
              const isRead = Boolean(notification.readAt);
              return (
                <div
                  key={notification.id}
                  className={`flex flex-wrap items-start justify-between gap-4 rounded-xl border px-4 py-4 ${isRead
                    ? 'border-slate-100 bg-white'
                    : 'border-meow-red/30 bg-meow-red/5'
                    }`}
                >
                  <div className="flex flex-1 items-start gap-3">
                    <div
                      className={`mt-0.5 flex h-10 w-10 items-center justify-center rounded-xl ${isRead
                        ? 'bg-slate-100 text-slate-500'
                        : 'bg-meow-red/15 text-meow-deep'
                        }`}
                    >
                      <Icon size={18} aria-hidden />
                    </div>
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-meow-charcoal">
                          {notification.title}
                        </p>
                        {!isRead ? (
                          <span className="rounded-full bg-meow-red/20 px-2 py-0.5 text-[10px] font-bold uppercase text-meow-deep">
                            Nova
                          </span>
                        ) : null}
                      </div>
                      <p className="text-xs text-meow-muted">{notification.body}</p>
                      <p className="text-[11px] font-semibold text-slate-400">
                        {formatTimeAgo(notification.createdAt)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:border-meow-red/40 hover:text-meow-deep disabled:opacity-50"
                      onClick={() => markRead(notification.id)}
                      disabled={isRead || actionBusy === notification.id}
                      aria-label="Marcar como lida"
                    >
                      <Check size={16} />
                    </button>
                    <button
                      type="button"
                      className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:border-red-200 hover:text-red-500 disabled:opacity-50"
                      onClick={() => deleteOne(notification.id)}
                      disabled={actionBusy === notification.id}
                      aria-label="Apagar notificação"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4 text-xs text-meow-muted">
            <span>
              Mostrando {filtered.length} de {notifications.length} notificações.
            </span>
            <button
              type="button"
              onClick={clearAll}
              className="text-xs font-semibold text-red-500 hover:text-red-600"
            >
              Limpar tudo
            </button>
          </div>
        </div>
      </div>

    </section>
  );
};
