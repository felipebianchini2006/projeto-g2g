'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Calendar, MessageCircle, Search, UserRound, X } from 'lucide-react';

import { hasAdminPermission } from '../../lib/admin-permissions';
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
    if (!accessToken || !hasAdminPermission(user, 'admin.chats')) {
      return;
    }
    setRoomsStatus('loading');
    setError(null);
    adminChatsApi
      .listRooms(accessToken, 80, 0)
      .then((response) => {
        setRooms(response.items);
        setRoomsStatus('ready');
      })
      .catch((err: Error) => {
        setError(err.message || 'Nao foi possivel carregar os chats.');
        setRoomsStatus('ready');
      });
  }, [accessToken, user?.role, user?.adminPermissions]);

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

  if (!user || !hasAdminPermission(user, 'admin.chats')) {
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
      <Card className="relative overflow-hidden rounded-3xl border border-meow-red/15 bg-gradient-to-br from-white via-white to-meow-cream/40 p-6 shadow-[0_18px_32px_rgba(214,107,149,0.16)]">
        <div className="absolute -right-8 -top-10 h-28 w-28 rounded-full bg-meow-red/10 blur-2xl" />
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-meow-red/70">
              Admin
            </p>
            <h1 className="mt-2 text-2xl font-black text-meow-charcoal">Chats de compra</h1>
            <p className="mt-2 text-sm text-meow-muted">
              Acompanhe conversas entre compradores e vendedores.
            </p>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-meow-red/20 bg-white shadow-sm text-meow-deep">
            <MessageCircle size={20} />
          </div>
        </div>
      </Card>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 animate-in fade-in slide-in-from-top-2">
          {error}
        </div>
      ) : null}

      <div className={`grid gap-6 transition-all duration-300 ${selectedRoom ? 'xl:grid-cols-[minmax(0,1fr)_520px]' : 'grid-cols-1'}`}>
        <Card className="rounded-3xl border border-slate-200/80 shadow-[0_12px_30px_rgba(15,23,42,0.08)] overflow-hidden bg-white">
          <div className="flex items-center justify-between border-b border-slate-100 bg-gradient-to-r from-white via-white to-slate-50 px-6 py-4">
            <div>
              <h2 className="text-sm font-bold text-meow-charcoal">Conversas</h2>
              <p className="mt-1 text-xs text-slate-500">
                {filteredRooms.length} chats ativos
              </p>
            </div>
            <div className="rounded-full border border-slate-200/70 bg-white px-3 py-1 text-[11px] font-semibold text-slate-500">
              Atualizado agora
            </div>
          </div>
          <div className="border-b border-slate-100 bg-white p-5">
            <div className="flex flex-col gap-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="group relative">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 transition-colors group-focus-within:text-meow-red" />
                  <Input
                    placeholder="Filtrar por vendedor..."
                    value={sellerQuery}
                    onChange={(event) => setSellerQuery(event.target.value)}
                    className="h-11 rounded-xl border-slate-200 bg-slate-50/50 pl-10 text-sm transition-all focus:border-meow-red/30 focus:bg-white focus:ring-4 focus:ring-meow-red/5"
                  />
                </div>
                <div className="group relative">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 transition-colors group-focus-within:text-meow-red" />
                  <Input
                    placeholder="Filtrar por comprador..."
                    value={buyerQuery}
                    onChange={(event) => setBuyerQuery(event.target.value)}
                    className="h-11 rounded-xl border-slate-200 bg-slate-50/50 pl-10 text-sm transition-all focus:border-meow-red/30 focus:bg-white focus:ring-4 focus:ring-meow-red/5"
                  />
                </div>
              </div>

              <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                <div className="relative group">
                  <div className="pointer-events-none absolute left-3.5 top-1/2 flex -translate-y-1/2 items-center gap-2 text-slate-400 z-10 transition-colors group-focus-within:text-meow-red">
                    <Calendar size={14} />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400/80 group-focus-within:text-meow-red/80">De</span>
                  </div>
                  <Input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="relative h-11 rounded-xl border-slate-200 bg-slate-50/50 pl-[4rem] text-sm text-slate-600 transition-all focus:border-meow-red/30 focus:bg-white focus:ring-4 focus:ring-meow-red/5"
                  />
                </div>

                <div className="h-[1px] w-4 bg-slate-200 shrink-0" />

                <div className="relative group">
                  <div className="pointer-events-none absolute left-3.5 top-1/2 flex -translate-y-1/2 items-center gap-2 text-slate-400 z-10 transition-colors group-focus-within:text-meow-red">
                    <Calendar size={14} />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400/80 group-focus-within:text-meow-red/80">Até</span>
                  </div>
                  <Input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="relative h-11 rounded-xl border-slate-200 bg-slate-50/50 pl-[4rem] text-sm text-slate-600 transition-all focus:border-meow-red/30 focus:bg-white focus:ring-4 focus:ring-meow-red/5"
                  />
                </div>
              </div>
            </div>
          </div>
          <div className="max-h-[640px] overflow-y-auto px-3 py-4 scrollbar-thin">
            {roomsStatus === 'loading' ? (
              <div className="py-10 text-center text-sm text-meow-muted">Carregando chats...</div>
            ) : filteredRooms.length === 0 ? (
              <div className="py-12 text-center text-sm text-meow-muted">
                Nenhum chat encontrado.
              </div>
            ) : (
              <div className="space-y-3">
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
                      className={`flex w-full flex-col gap-3 rounded-2xl border px-4 py-3 text-left transition-all ${isSelected
                        ? 'border-meow-red/30 bg-meow-red/5 shadow-[0_10px_20px_rgba(214,107,149,0.12)] ring-1 ring-meow-red/20'
                        : 'border-slate-100 bg-white hover:border-meow-red/20 hover:bg-slate-50'
                        }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div
                            className={`flex h-11 w-11 items-center justify-center rounded-2xl text-lg font-bold ${isSelected
                              ? 'bg-meow-deep text-white'
                              : 'bg-slate-100 text-slate-500'
                              }`}
                          >
                            <UserRound size={18} />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-800">
                              Pedido #{room.orderId.slice(0, 8)}
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                              {buyerName} {'->'} {sellerName}
                            </p>
                          </div>
                        </div>
                        <Badge variant="warning" size="sm">
                          {room.orderStatus}
                        </Badge>
                      </div>
                      <div className="text-xs text-slate-500 line-clamp-1">
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

        {selectedRoom && (
          <Card className="rounded-3xl border border-slate-200/80 shadow-[0_12px_30px_rgba(15,23,42,0.08)] overflow-hidden bg-white h-fit sticky top-6">
            <div className="flex items-center justify-between border-b border-slate-100 bg-gradient-to-r from-white via-white to-slate-50 px-6 py-4">
              <div>
                <h2 className="text-sm font-bold text-meow-charcoal">Mensagens</h2>
                <p className="mt-1 text-xs text-slate-500">
                  Pedido #{selectedRoom.orderId} {'->'} {resolveName(selectedRoom.buyer)} / {resolveName(selectedRoom.seller)}
                </p>
              </div>
              <button
                onClick={() => setSelectedRoom(null)}
                className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-meow-red transition-all"
                title="Fechar conversa"
              >
                <X size={18} />
              </button>
            </div>
            <div className="max-h-[640px] overflow-y-auto px-5 py-6 scrollbar-thin space-y-4 bg-slate-50/60">
              {messagesStatus === 'loading' ? (
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
                    <div
                      key={message.id}
                      className={`rounded-2xl border px-5 py-4 shadow-sm transition-all ${isBuyer
                        ? 'bg-white border-slate-200/60 mr-8'
                        : isSeller
                          ? 'bg-slate-50/80 border-slate-200/60 ml-8'
                          : 'bg-meow-red/5 border-meow-red/10 mx-4'
                        }`}
                    >
                      <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider mb-2">
                        <div className="flex items-center gap-2">
                          <span className={`${isBuyer ? 'text-indigo-500' : isSeller ? 'text-emerald-600' : 'text-meow-red'
                            }`}>
                            {roleLabel}
                          </span>
                          <span className="text-slate-300 text-[8px]">●</span>
                          <span className="text-slate-600">{senderName}</span>
                        </div>
                        <span className="text-slate-400">{formatDateTime(message.createdAt)}</span>
                      </div>
                      <p className="text-[14px] leading-relaxed text-slate-700 whitespace-pre-wrap break-words font-medium">
                        {message.deletedAt ? (
                          <span className="italic text-slate-400 flex items-center gap-2">
                            <span className="block w-1.5 h-1.5 rounded-full bg-slate-300" />
                            Mensagem apagada
                          </span>
                        ) : (
                          message.content
                        )}
                      </p>
                    </div>
                  );
                })
              )}
            </div>
          </Card>
        )}
      </div>
    </AdminShell>
  );
};
