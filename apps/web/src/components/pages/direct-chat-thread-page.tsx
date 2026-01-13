'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

import { directChatApi, type DirectChatMessage } from '../../lib/direct-chat-api';
import { useAuth } from '../auth/auth-provider';
import { AccountShell } from '../account/account-shell';
import { Button } from '../ui/button';
import { Card } from '../ui/card';

type MessagesState = {
  status: 'loading' | 'ready' | 'error';
  items: DirectChatMessage[];
  error?: string;
};

export const DirectChatThreadContent = ({ threadId }: { threadId: string }) => {
  const { user, accessToken, loading } = useAuth();
  const [messagesState, setMessagesState] = useState<MessagesState>({
    status: 'loading',
    items: [],
  });
  const [messageText, setMessageText] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!accessToken) {
      return;
    }
    let active = true;
    setMessagesState({ status: 'loading', items: [] });
    directChatApi
      .listMessages(accessToken, threadId, 0, 50)
      .then((response) => {
        if (!active) return;
        setMessagesState({ status: 'ready', items: response.items });
      })
      .catch((error: Error) => {
        if (!active) return;
        setMessagesState({
          status: 'error',
          items: [],
          error: error.message || 'Não foi possível carregar o chat.',
        });
      });
    return () => {
      active = false;
    };
  }, [accessToken, threadId]);

  const sortedMessages = useMemo(
    () =>
      [...messagesState.items].sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      ),
    [messagesState.items],
  );

  if (loading) {
    return (
      <section className="bg-white px-6 py-12">
        <div className="mx-auto w-full max-w-[900px] rounded-2xl border border-slate-100 bg-white px-6 py-4 text-sm text-meow-muted">
          Carregando sessão...
        </div>
      </section>
    );
  }

  if (!user || !accessToken) {
    return (
      <section className="bg-white px-6 py-12">
        <div className="mx-auto w-full max-w-[900px] rounded-2xl border border-slate-100 bg-white px-6 py-6 text-center">
          <p className="text-sm text-meow-muted">Entre para acessar o chat.</p>
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
        { label: 'Mensagens' },
      ]}
    >
      <Card className="rounded-[24px] border border-slate-100 p-6 shadow-card">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-black text-meow-charcoal">Chat com o vendedor</h1>
            <p className="text-sm text-meow-muted">
              Envie mensagens diretamente para combinar detalhes da compra.
            </p>
          </div>
        </div>

        {messagesState.status === 'error' ? (
          <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
            {messagesState.error}
          </div>
        ) : null}

        {messagesState.status === 'loading' ? (
          <div className="mt-4 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm text-meow-muted">
            Carregando mensagens...
          </div>
        ) : null}

        {messagesState.status === 'ready' && sortedMessages.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm text-meow-muted">
            Nenhuma mensagem ainda. Seja o primeiro a dizer oi!
          </div>
        ) : null}

        <div className="mt-4 space-y-3">
          {sortedMessages.map((message) => {
            const isOwn = message.senderId === user.id;
            return (
              <div
                key={message.id}
                className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[70%] rounded-2xl px-4 py-2 text-sm ${
                    isOwn
                      ? 'bg-rose-500 text-white'
                      : 'border border-slate-100 bg-slate-50 text-meow-charcoal'
                  }`}
                >
                  {message.content}
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          <input
            className="h-11 flex-1 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-meow-charcoal outline-none"
            placeholder="Digite sua mensagem..."
            value={messageText}
            onChange={(event) => setMessageText(event.target.value)}
          />
          <Button
            className="rounded-full"
            disabled={sending || !messageText.trim()}
            onClick={async () => {
              if (!messageText.trim()) {
                return;
              }
              try {
                setSending(true);
                const response = await directChatApi.sendMessage(
                  accessToken,
                  threadId,
                  messageText.trim(),
                );
                setMessagesState((prev) => ({
                  status: 'ready',
                  items: [...prev.items, response],
                }));
                setMessageText('');
              } finally {
                setSending(false);
              }
            }}
          >
            {sending ? 'Enviando...' : 'Enviar'}
          </Button>
        </div>
      </Card>
    </AccountShell>
  );
};
