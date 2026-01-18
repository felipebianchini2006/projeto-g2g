'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { MessageCircle, Search, UserRound } from 'lucide-react';

import { useAuth } from '../auth/auth-provider';
import { AdminShell } from '../admin/admin-shell';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { adminChatsApi, type AdminChatMessage, type AdminChatRoomSummary } from '../../lib/admin-chats-api';

const formatDateTime = (value?: string | Date | null) => {
  if (!value) {
    return '';
  }
  const date = value instanceof Date ? value : new Date(value);
  return date.toLocaleString('pt-BR');
};

const resolveName = (user?: { fullName: string | null; email: string } | null) =>
  user?.fullName || user?.email || 'Usuario';

export const AdminChatsContent = () => {
  const { user, accessToken, loading } = useAuth();
  const [rooms, setRooms] = useState<AdminChatRoomSummary[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<AdminChatRoomSummary | null>(null);
  const [messages, setMessages] = useState<AdminChatMessage[]>([]);
  const [roomsStatus, setRoomsStatus] = useState<'idle' | 'loading' | 'ready'>('idle');
  const [messagesStatus, setMessagesStatus] = useState<'idle' | 'loading' | 'ready'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [sellerQuery, setSellerQuery] = useState('');
  const [buyerQuery, setBuyerQuery] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  useEffect(() => {
    if (!accessToken || user?.role !== 'ADMIN') {
      return;
    }
    setRoomsStatus('loading');
    setError(null);
    adminChatsApi
      .listRooms(accessToken, 80, 0)
      .then((response) => {
        setRooms(response.items);
        setRoomsStatus('ready');
        if (response.items.length) {
          setSelectedRoom((current) => current ?? response.items[0] ?? null);
        }
      })
      .catch((err: Error) => {
        setError(err.message || 'Nao foi possivel carregar os chats.');
        setRoomsStatus('ready');
      });
  }, [accessToken, user?.role]);

  useEffect(() => {
    if (!accessToken || !selectedRoom) {
      return;
    }
    setMessagesStatus('loading');
    adminChatsApi
      .listMessages(accessToken, selectedRoom.orderId, 100)
      .then((response) => {
        setMessages(response.messages);
        setMessagesStatus('ready');
      })
      .catch((err: Error) => {
        setError(err.message || 'Nao foi possivel carregar as mensagens.');
        setMessagesStatus('ready');
      });
  }, [accessToken, selectedRoom]);

  const messagesForDisplay = useMemo(
    () => [...messages].reverse(),
    [messages],
  );

  const filteredRooms = useMemo(() => {
    const sellerNeedle = sellerQuery.trim().toLowerCase();
    const buyerNeedle = buyerQuery.trim().toLowerCase();
    const fromDate = dateFrom ? new Date(`${dateFrom}T00:00:00`) : null;
    const toDate = dateTo ? new Date(`${dateTo}T23:59:59`) : null;

    return rooms.filter((room) => {
      const sellerName = resolveName(room.seller).toLowerCase();
      const buyerName = resolveName(room.buyer).toLowerCase();
      if (sellerNeedle && !sellerName.includes(sellerNeedle)) {
        return false;
      }
      if (buyerNeedle && !buyerName.includes(buyerNeedle)) {
        return false;
      }
      const createdAt = new Date(room.orderCreatedAt);
      if (fromDate && createdAt < fromDate) {
        return false;
      }
      if (toDate && createdAt > toDate) {
        return false;
      }
      return true;
    });
  }, [rooms, sellerQuery, buyerQuery, dateFrom, dateTo]);

  if (loading) {
    return (
      <section className="bg-white px-6 py-12">
        <div className="mx-auto w-full max-w-[1200px] rounded-2xl border border-meow-red/20 bg-white px-6 py-4 text-sm text-meow-muted">
          Carregando sessao...
        </div>
      </section>
    );
  }

  if (!user || user.role !== 'ADMIN') {
    return (
      <section className="bg-white px-6 py-12">
        <div className="mx-auto w-full max-w-[1200px] rounded-2xl border border-meow-red/20 bg-white px-6 py-6 text-center">
          <p className="text-sm text-meow-muted">Acesso restrito ao admin.</p>
          <Link
            className="mt-4 inline-flex rounded-full bg-meow-linear px-6 py-2 text-sm font-bold text-white transition hover:opacity-90"
            href="/conta"
          >
            Voltar para conta
          </Link>
        </div>
      </section>
    );
  }

  return (
    <AdminShell
      breadcrumbs={[
        { label: 'Inicio', href: '/' },
        { label: 'Admin', href: '/admin/atendimento' },
        { label: 'Chats de compra' },
      ]}
    >
      <Card className="rounded-2xl border border-meow-red/20 p-5 shadow-[0_10px_24px_rgba(216,107,149,0.12)]">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-black text-meow-charcoal">Chats de compra</h1>
            <p className="mt-2 text-sm text-meow-muted">
              Acompanhe conversas entre compradores e vendedores.
            </p>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-meow-cream/70 text-meow-deep">
            <MessageCircle size={20} />
          </div>
        </div>
      </Card>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 animate-in fade-in slide-in-from-top-2">
          {error}
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1fr_520px]">
        <Card className="rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-100 bg-white px-5 py-3">
            <h2 className="text-sm font-bold text-meow-charcoal">Conversas</h2>
            <span className="text-xs font-medium text-meow-muted">
              {filteredRooms.length} chats
            </span>
          </div>
          <div className="border-b border-slate-100 bg-white px-5 py-4">
            <div className="grid gap-3 md:grid-cols-[1.4fr_1.4fr_0.9fr_0.9fr]">
              <div className="relative">
                <Search size={14} className="pointer-events-none absolute left-3 top-3 text-slate-400" />
                <Input
                  placeholder="Filtrar por vendedor"
                  value={sellerQuery}
                  onChange={(event) => setSellerQuery(event.target.value)}
                  className="pl-9"
                />
              </div>
              <div className="relative">
                <Search size={14} className="pointer-events-none absolute left-3 top-3 text-slate-400" />
                <Input
                  placeholder="Filtrar por comprador"
                  value={buyerQuery}
                  onChange={(event) => setBuyerQuery(event.target.value)}
                  className="pl-9"
                />
              </div>
              <Input
                type="date"
                value={dateFrom}
                onChange={(event) => setDateFrom(event.target.value)}
              />
              <Input
                type="date"
                value={dateTo}
                onChange={(event) => setDateTo(event.target.value)}
              />
            </div>
          </div>
          <div className="max-h-[620px] overflow-y-auto p-2 scrollbar-thin">
            {roomsStatus === 'loading' ? (
              <div className="py-10 text-center text-sm text-meow-muted">Carregando chats...</div>
            ) : filteredRooms.length === 0 ? (
              <div className="py-12 text-center text-sm text-meow-muted">
                Nenhum chat encontrado.
              </div>
            ) : (
              <div className="space-y-2">
                {filteredRooms.map((room) => {
                  const isSelected = selectedRoom?.orderId === room.orderId;
                  const buyerName = resolveName(room.buyer);
                  const sellerName = resolveName(room.seller);
                  const lastMessage =
                    room.lastMessage?.deletedAt ? 'Mensagem apagada' : room.lastMessage?.content;
                  return (
                    <button
                      key={room.orderId}
                      type="button"
                      onClick={() => setSelectedRoom(room)}
                      className={`flex w-full flex-col gap-2 rounded-xl border p-4 text-left transition-all ${isSelected
                        ? 'border-meow-red/30 bg-meow-red/5 shadow-sm ring-1 ring-meow-red/20'
                        : 'border-slate-100 bg-white hover:border-meow-red/20 hover:bg-slate-50'
                        }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div
                            className={`flex h-10 w-10 items-center justify-center rounded-full text-lg font-bold ${isSelected
                              ? 'bg-meow-deep text-white'
                              : 'bg-slate-100 text-slate-500'
                              }`}
                          >
                            <UserRound size={18} />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-700">
                              Pedido #{room.orderId.slice(0, 8)}
                            </p>
                            <p className="text-xs text-slate-500">
                              {buyerName} → {sellerName}
                            </p>
                          </div>
                        </div>
                        <Badge variant="warning" size="sm">
                          {room.orderStatus}
                        </Badge>
                      </div>
                      <div className="text-xs text-slate-400 line-clamp-1">
                        {lastMessage || 'Sem mensagens ainda.'}
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-slate-400">
                        <span>{formatDateTime(room.lastMessage?.createdAt || room.orderCreatedAt)}</span>
                        <span>{room.messageCount} mensagens</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </Card>

        <Card className="rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="border-b border-slate-100 bg-white px-5 py-3">
            <h2 className="text-sm font-bold text-meow-charcoal">Mensagens</h2>
            {selectedRoom ? (
              <p className="text-xs text-slate-500">
                Pedido #{selectedRoom.orderId} • {resolveName(selectedRoom.buyer)} / {resolveName(selectedRoom.seller)}
              </p>
            ) : null}
          </div>
          <div className="max-h-[620px] overflow-y-auto p-5 scrollbar-thin space-y-4 bg-slate-50/40">
            {!selectedRoom ? (
              <div className="py-16 text-center text-sm text-meow-muted">
                Selecione um chat para visualizar as mensagens.
              </div>
            ) : messagesStatus === 'loading' ? (
              <div className="py-10 text-center text-sm text-meow-muted">Carregando mensagens...</div>
            ) : messagesForDisplay.length === 0 ? (
              <div className="py-10 text-center text-sm text-meow-muted">
                Nenhuma mensagem enviada ainda.
              </div>
            ) : (
              messagesForDisplay.map((message) => {
                const senderName = resolveName(message.sender);
                const isBuyer = message.sender.id === selectedRoom.buyer?.id;
                const isSeller = message.sender.id === selectedRoom.seller?.id;
                const roleLabel = isBuyer ? 'Comprador' : isSeller ? 'Vendedor' : 'Usuario';
                return (
                  <div key={message.id} className="rounded-2xl border border-slate-100 bg-white px-4 py-3">
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span className="font-semibold text-slate-700">{senderName}</span>
                      <span>
                        {roleLabel} • {formatDateTime(message.createdAt)}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-meow-charcoal whitespace-pre-wrap break-words">
                      {message.deletedAt ? 'Mensagem apagada' : message.content}
                    </p>
                  </div>
                );
              })
            )}
          </div>
        </Card>
      </div>
    </AdminShell>
  );
};
