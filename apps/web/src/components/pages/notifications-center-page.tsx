'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Bell, Check, MessageCircle, ShoppingBag, Ticket } from 'lucide-react';

import { useAuth } from '../auth/auth-provider';
import {
  notificationsApi,
  type Notification,
} from '../../lib/notifications-api';

const tabs = [
  { id: 'all', label: 'Todos', icon: Bell },
  { id: 'anuncios', label: 'Anuncios', icon: ShoppingBag },
  { id: 'tickets', label: 'Tickets', icon: Ticket },
  { id: 'vendas', label: 'Vendas', icon: ShoppingBag },
  { id: 'chats', label: 'Chats', icon: MessageCircle },
] as const;

export const NotificationsCenterContent = () => {
  const { accessToken } = useAuth();
  const [activeTab, setActiveTab] = useState<(typeof tabs)[number]['id']>('all');
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!accessToken) {
      return;
    }
    let active = true;
    const load = async () => {
      setLoading(true);
      const data = await notificationsApi.listNotifications(accessToken, { take: 20 });
      if (!active) {
        return;
      }
      setNotifications(data);
      setLoading(false);
    };
    load().catch(() => {
      if (active) {
        setLoading(false);
      }
    });
    return () => {
      active = false;
    };
  }, [accessToken]);

  const filtered = useMemo(() => {
    if (activeTab === 'all') {
      return notifications;
    }
    return notifications.filter((notification) =>
      notification.type.toLowerCase().includes(activeTab),
    );
  }, [notifications, activeTab]);

  const markAll = async () => {
    if (!accessToken) {
      return;
    }
    await notificationsApi.markAllRead(accessToken);
    setNotifications((prev) => prev.map((item) => ({ ...item, readAt: item.readAt ?? new Date().toISOString() })));
  };

  return (
    <section className="bg-white pb-16 pt-10">
      <div className="mx-auto w-full max-w-[1280px] px-6">
        <div className="mb-6 text-sm text-meow-muted">
          <Link href="/" className="font-semibold text-meow-deep">
            Inicio
          </Link>{' '}
          &gt;{' '}
          <Link href="/conta" className="font-semibold text-meow-deep">
            Conta
          </Link>{' '}
          &gt; Notificacoes
        </div>
        <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
          <aside className="rounded-2xl border border-meow-red/20 bg-white p-4 shadow-sm">
            <h3 className="text-xs font-bold uppercase tracking-[0.4px] text-meow-muted">Menu</h3>
            <div className="mt-4 grid gap-2">
              <button className="rounded-xl bg-meow-cream px-4 py-2 text-left text-sm font-semibold text-meow-charcoal" type="button">
                Notificacoes
              </button>
            </div>
          </aside>

          <div className="rounded-2xl border border-meow-red/20 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-center gap-3">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-semibold ${
                      activeTab === tab.id
                        ? 'border-meow-deep bg-meow-deep text-white'
                        : 'border-meow-red/20 text-meow-muted'
                    }`}
                    onClick={() => setActiveTab(tab.id)}
                  >
                    <Icon size={14} aria-hidden />
                    {tab.label}
                  </button>
                );
              })}
              <button
                type="button"
                className="ml-auto rounded-full bg-meow-charcoal px-4 py-2 text-xs font-semibold text-white"
                onClick={markAll}
              >
                Marcar todos como lido
              </button>
            </div>

            <div className="mt-6">
              {loading ? (
                <div className="text-sm text-meow-muted">Carregando...</div>
              ) : null}
              {!loading && filtered.length === 0 ? (
                <div className="rounded-xl border border-meow-red/20 bg-meow-cream/60 px-4 py-3 text-sm text-meow-muted">
                  Nenhuma notificacao.
                </div>
              ) : null}
              <div className="grid gap-3">
                {filtered.map((notification) => (
                  <div
                    key={notification.id}
                    className={`flex items-start gap-3 rounded-xl border px-4 py-3 ${
                      notification.readAt
                        ? 'border-meow-red/20 bg-white'
                        : 'border-indigo-200 bg-indigo-50/50'
                    }`}
                  >
                    <div className="mt-1 flex h-6 w-6 items-center justify-center rounded-md border border-meow-red/20">
                      {notification.readAt ? <Check size={12} aria-hidden /> : null}
                    </div>
                    <button
                      type="button"
                      className="text-left"
                      onClick={async () => {
                        if (!accessToken || notification.readAt) {
                          return;
                        }
                        await notificationsApi.markRead(accessToken, notification.id);
                        setNotifications((prev) =>
                          prev.map((item) =>
                            item.id === notification.id
                              ? { ...item, readAt: new Date().toISOString() }
                              : item,
                          ),
                        );
                      }}
                    >
                      <p className="text-sm font-semibold text-meow-charcoal">
                        {notification.title}
                      </p>
                      <p className="text-xs text-meow-muted">{notification.body}</p>
                    </button>
                  </div>
                ))}
              </div>
              <div className="mt-6 text-center text-xs text-meow-muted">
                Mostrando 1-{filtered.length} de {filtered.length} itens.
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
