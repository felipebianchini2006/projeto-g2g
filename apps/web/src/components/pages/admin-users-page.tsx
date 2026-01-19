'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import {
  Search,
  Filter,
  User,
  Shield,
  Ban,
  CheckCircle,
  RefreshCw,
  Mail,
  Calendar,
  AlertOctagon,
  ArrowBigLeft,
  ChevronLeft,
} from 'lucide-react';

import { ApiClientError } from '../../lib/api-client';
import {
  adminUsersApi,
  type AdminUser,
  type AdminUserRole,
  type AdminUserUpdatePayload,
} from '../../lib/admin-users-api';
import { useAuth } from '../auth/auth-provider';
import { AdminShell } from '../admin/admin-shell';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Textarea } from '../ui/textarea';

const roleLabel: Record<AdminUserRole, string> = {
  USER: 'Buyer',
  SELLER: 'Seller',
  ADMIN: 'Admin',
};

const roleBadgeVariant: Record<AdminUserRole, 'info' | 'pink' | 'success'> = {
  USER: 'info',
  SELLER: 'pink',
  ADMIN: 'success',
};

export const AdminUsersContent = () => {
  const { user, accessToken, loading } = useAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [roleFilter, setRoleFilter] = useState<AdminUserRole | 'all'>('all');
  const [blockedFilter, setBlockedFilter] = useState<'all' | 'blocked' | 'active'>('all');
  const [search, setSearch] = useState('');
  const [actionReason, setActionReason] = useState('');
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{ email: string; role: AdminUserRole }>({
    email: '',
    role: 'USER',
  });

  const handleError = (error: unknown, fallback: string) => {
    if (error instanceof ApiClientError) {
      setError(error.message);
      return;
    }
    setError(error instanceof Error ? error.message : fallback);
  };

  const loadUsers = async () => {
    if (!accessToken) {
      return;
    }
    setBusyAction('load');
    setError(null);
    setNotice(null);
    try {
      const response = await adminUsersApi.listUsers(accessToken, {
        role: roleFilter === 'all' ? undefined : roleFilter,
        blocked:
          blockedFilter === 'all'
            ? undefined
            : blockedFilter === 'blocked'
              ? true
              : false,
        search: search.trim() || undefined,
      });
      setUsers(response.items);
      if (response.items.length > 0 && !selectedUser) {
        setSelectedUser(response.items[0]);
      }
      setActionReason('');
    } catch (error) {
      handleError(error, 'Não foi possível carregar usuarios.');
    } finally {
      setBusyAction(null);
    }
  };

  useEffect(() => {
    if (accessToken && user?.role === 'ADMIN') {
      loadUsers();
    }
  }, [accessToken, roleFilter, blockedFilter, search, user?.role]);

  const applyUserUpdate = (updated: AdminUser) => {
    const matchesBlockedFilter =
      blockedFilter === 'all'
        ? true
        : blockedFilter === 'blocked'
          ? Boolean(updated.blockedAt)
          : !updated.blockedAt;
    const matchesRoleFilter = roleFilter === 'all' ? true : updated.role === roleFilter;
    const trimmedSearch = search.trim().toLowerCase();
    const matchesSearch =
      trimmedSearch.length === 0
        ? true
        : updated.email.toLowerCase().includes(trimmedSearch);
    const matchesFilters = matchesBlockedFilter && matchesRoleFilter && matchesSearch;

    setUsers((prev) => {
      if (!matchesFilters) {
        return prev.filter((item) => item.id !== updated.id);
      }
      return prev.map((item) => (item.id === updated.id ? updated : item));
    });

    if (!matchesFilters) {
      setSelectedUser(null);
    } else {
      setSelectedUser(updated);
    }
  };

  useEffect(() => {
    if (!selectedUser) {
      setEditForm({ email: '', role: 'USER' });
      return;
    }
    setEditForm({
      email: selectedUser.email,
      role: selectedUser.role,
    });
  }, [selectedUser]);

  const handleUpdate = async () => {
    if (!accessToken || !selectedUser) {
      return;
    }
    const email = editForm.email.trim();
    const payload: AdminUserUpdatePayload = {};
    if (email && email !== selectedUser.email) {
      payload.email = email;
    }
    if (editForm.role !== selectedUser.role) {
      payload.role = editForm.role;
    }
    if (Object.keys(payload).length === 0) {
      setError(null);
      setNotice('Nenhuma alteracao para salvar.');
      return;
    }

    setBusyAction('update');
    setError(null);
    setNotice(null);
    try {
      const updated = await adminUsersApi.updateUser(accessToken, selectedUser.id, payload);
      applyUserUpdate(updated);
      setNotice('Usuario atualizado.');
    } catch (error) {
      handleError(error, 'Não foi possível atualizar o usuário.');
    } finally {
      setBusyAction(null);
    }
  };

  const handleBlock = async () => {
    if (!accessToken || !selectedUser) {
      return;
    }
    if (!actionReason.trim()) {
      setError('Informe o motivo do bloqueio.');
      return;
    }
    setBusyAction('block');
    setError(null);
    setNotice(null);
    try {
      const updated = await adminUsersApi.blockUser(
        accessToken,
        selectedUser.id,
        actionReason.trim(),
      );
      applyUserUpdate(updated);
      setNotice('Usuario bloqueado.');
      setActionReason('');
    } catch (error) {
      handleError(error, 'Não foi possível bloquear o usuário.');
    } finally {
      setBusyAction(null);
    }
  };

  const handleUnblock = async () => {
    if (!accessToken || !selectedUser) {
      return;
    }
    setBusyAction('unblock');
    setError(null);
    setNotice(null);
    try {
      const updated = await adminUsersApi.unblockUser(accessToken, selectedUser.id);
      applyUserUpdate(updated);
      setNotice('Usuario desbloqueado.');
      setActionReason('');
    } catch (error) {
      handleError(error, 'Não foi possível desbloquear o usuário.');
    } finally {
      setBusyAction(null);
    }
  };

  if (loading) {
    return (
      <section className="bg-white px-6 py-12">
        <div className="mx-auto w-full max-w-[1200px] rounded-2xl border border-meow-red/20 bg-white px-6 py-4 text-sm text-meow-muted">
          Carregando sessão...
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
        { label: 'Usuarios' },
      ]}
    >
      <Card className="rounded-2xl border border-meow-red/20 p-5 shadow-[0_10px_24px_rgba(216,107,149,0.12)]">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-black text-meow-charcoal">Usuarios</h1>
            <p className="mt-2 text-sm text-meow-muted">
              Bloqueie ou desbloqueie acesso quando necessario.
            </p>
          </div>
          <Link
            href="/conta"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-slate-400 shadow-[0_4px_12px_rgba(0,0,0,0.05)] transition hover:text-meow-deep hover:shadow-md"
          >
            <ChevronLeft size={24} />
          </Link>
        </div>
      </Card>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 animate-in fade-in slide-in-from-top-2">
          {error}
        </div>
      ) : null}
      {notice ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 animate-in fade-in slide-in-from-top-2">
          {notice}
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1fr_400px]">
        {/* Left Column: List and Filters */}
        <div className="space-y-4">
          <Card className="rounded-2xl border border-slate-200 p-5 shadow-sm">
            <h2 className="text-sm font-bold uppercase tracking-wide text-meow-muted">Filtros</h2>
            <div className="mt-4 grid gap-4 md:grid-cols-3">
              <label className="grid gap-1.5 text-xs font-semibold text-slate-500">
                <span className="flex items-center gap-1.5">
                  <Shield size={12} /> Função (Role)
                </span>
                <div className="relative">
                  <select
                    className="h-10 w-full appearance-none rounded-xl border border-slate-200 bg-slate-50 px-3 pr-8 text-sm font-medium text-slate-700 outline-none focus:border-meow-red/50 focus:ring-4 focus:ring-meow-red/10"
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value as AdminUserRole | 'all')}
                  >
                    <option value="all">Todos</option>
                    <option value="USER">Compradores</option>
                    <option value="SELLER">Vendedores</option>
                    <option value="ADMIN">Admins</option>
                  </select>
                  <Filter size={14} className="absolute right-3 top-3 text-slate-400 pointer-events-none" />
                </div>
              </label>

              <label className="grid gap-1.5 text-xs font-semibold text-slate-500">
                <span className="flex items-center gap-1.5">
                  <AlertOctagon size={12} /> Status
                </span>
                <div className="relative">
                  <select
                    className="h-10 w-full appearance-none rounded-xl border border-slate-200 bg-slate-50 px-3 pr-8 text-sm font-medium text-slate-700 outline-none focus:border-meow-red/50 focus:ring-4 focus:ring-meow-red/10"
                    value={blockedFilter}
                    onChange={(e) => setBlockedFilter(e.target.value as 'all' | 'blocked' | 'active')}
                  >
                    <option value="all">Todos</option>
                    <option value="active">Ativos</option>
                    <option value="blocked">Bloqueados</option>
                  </select>
                  <Filter size={14} className="absolute right-3 top-3 text-slate-400 pointer-events-none" />
                </div>
              </label>

              <label className="grid gap-1.5 text-xs font-semibold text-slate-500">
                <span className="flex items-center gap-1.5">
                  <Search size={12} /> Buscar
                </span>
                <div className="relative">
                  <Input
                    className="h-10 bg-slate-50"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Email do usuário..."
                  />
                  <div className="absolute right-3 top-3 text-slate-400 pointer-events-none">
                    {busyAction === 'load' ? <RefreshCw size={14} className="animate-spin" /> : null}
                  </div>
                </div>
              </label>
            </div>
          </Card>

          <Card className="overflow-hidden rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/50 px-5 py-3">
              <h2 className="text-sm font-bold text-meow-charcoal">Lista de Usuários</h2>
              <span className="text-xs font-medium text-meow-muted">{users.length} encontrados</span>
            </div>

            <div className="max-h-[600px] overflow-y-auto p-2 scrollbar-thin">
              {users.length === 0 && busyAction !== 'load' ? (
                <div className="flex flex-col items-center justify-center py-12 text-center text-sm text-meow-muted">
                  <User size={48} className="text-slate-200 mb-3" />
                  <p>Nenhum usuário encontrado com os filtros atuais.</p>
                </div>
              ) : null}

              <div className="space-y-2">
                {users.map((item) => {
                  const isSelected = selectedUser?.id === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setSelectedUser(item);
                        setActionReason('');
                        setError(null);
                      }}
                      className={`group flex w-full flex-col gap-3 rounded-xl border p-4 text-left transition-all ${isSelected
                          ? 'border-meow-red/30 bg-meow-red/5 shadow-sm ring-1 ring-meow-red/20'
                          : 'border-slate-100 bg-white hover:border-meow-red/20 hover:bg-slate-50'
                        }`}
                    >
                      <div className="flex w-full items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold ${isSelected ? 'bg-meow-deep text-white' : 'bg-slate-100 text-slate-500 group-hover:bg-white group-hover:text-meow-deep group-hover:shadow-sm'
                            }`}>
                            {item.email.slice(0, 2).toUpperCase()}
                          </div>
                          <div className="space-y-0.5">
                            <p className={`text-sm font-bold ${isSelected ? 'text-meow-deep' : 'text-slate-700'}`}>
                              {item.email}
                            </p>
                            <div className="flex items-center gap-2 text-xs">
                              <Badge variant={roleBadgeVariant[item.role] || 'neutral'} size="sm">
                                {roleLabel[item.role]}
                              </Badge>
                              <span className="text-slate-400">•</span>
                              <span className={item.blockedAt ? 'font-bold text-red-500' : 'font-medium text-emerald-600'}>
                                {item.blockedAt ? 'Bloqueado' : 'Ativo'}
                              </span>
                            </div>
                          </div>
                        </div>
                        <span className="text-[10px] font-medium text-slate-400">
                          {new Date(item.createdAt).toLocaleDateString('pt-BR')}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </Card>
        </div>

        {/* Right Column: Details Panel */}
        <div className="relative">
          <div className="sticky top-6">
            {!selectedUser ? (
              <Card className="flex h-64 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-400">
                <User size={48} className="mb-4 text-slate-200" />
                <p>Selecione um usuário da lista para ver os detalhes e gerenciar.</p>
              </Card>
            ) : (
              <Card className="overflow-hidden rounded-2xl border border-slate-200 shadow-card">
                <div className="bg-slate-50 px-6 py-6 border-b border-slate-100">
                  <div className="flex items-center gap-4">
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-xl font-bold text-meow-deep shadow-sm">
                      {selectedUser.email.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h2 className="text-lg font-black text-meow-charcoal">Detalhes do Usuário</h2>
                      <p className="text-sm text-meow-muted break-all">{selectedUser.email}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant={selectedUser.blockedAt ? 'danger' : 'success'}>
                          {selectedUser.blockedAt ? 'Bloqueado' : 'Conta Ativa'}
                        </Badge>
                        {selectedUser.role === 'ADMIN' && <Badge variant="pink">Admin Access</Badge>}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-6 space-y-6">
                  {/* Edit Form */}
                  <div className="space-y-4">
                    <h3 className="text-xs font-bold uppercase tracking-wide text-meow-muted">Dados de Acesso</h3>
                    <div className="grid gap-4">
                      <label className="space-y-1.5">
                        <span className="text-xs font-semibold text-slate-600">Email</span>
                        <Input
                          value={editForm.email}
                          onChange={(e) => setEditForm(prev => ({ ...prev, email: e.target.value }))}
                          className="bg-slate-50"
                        />
                      </label>
                      <label className="space-y-1.5">
                        <span className="text-xs font-semibold text-slate-600">Função</span>
                        <select
                          className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-slate-700 outline-none focus:border-meow-red/60 focus:ring-4 focus:ring-meow-red/15"
                          value={editForm.role}
                          onChange={(e) => setEditForm(prev => ({ ...prev, role: e.target.value as AdminUserRole }))}
                        >
                          <option value="USER">Comprador (Padrão)</option>
                          <option value="SELLER">Vendedor</option>
                          <option value="ADMIN">Administrador</option>
                        </select>
                      </label>
                    </div>
                    <div className="flex gap-3">
                      <Button
                        className="flex-1"
                        onClick={handleUpdate}
                        disabled={busyAction === 'update'}
                      >
                        {busyAction === 'update' ? <RefreshCw size={16} className="animate-spin mr-2" /> : <CheckCircle size={16} className="mr-2" />}
                        Salvar Alterações
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={() => {
                          setEditForm({
                            email: selectedUser.email,
                            role: selectedUser.role,
                          });
                        }}
                        disabled={busyAction === 'update'}
                      >
                        Restaurar
                      </Button>
                    </div>
                  </div>

                  <hr className="border-slate-100" />

                  <div className="space-y-4">
                    <h3 className="text-xs font-bold uppercase tracking-wide text-meow-muted">Dados pessoais</h3>
                    <div className="grid gap-3 text-xs text-slate-600">
                      <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                        <span className="block text-[10px] font-semibold uppercase text-slate-400">Nome completo</span>
                        <span className="mt-1 block text-sm font-bold text-meow-charcoal">
                          {selectedUser.fullName ?? 'Nao informado'}
                        </span>
                      </div>
                      <div className="grid gap-3 md:grid-cols-2">
                        <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                          <span className="block text-[10px] font-semibold uppercase text-slate-400">CPF</span>
                          <span className="mt-1 block text-sm font-bold text-meow-charcoal">
                            {selectedUser.cpf ?? 'Nao informado'}
                          </span>
                        </div>
                        <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                          <span className="block text-[10px] font-semibold uppercase text-slate-400">Nascimento</span>
                          <span className="mt-1 block text-sm font-bold text-meow-charcoal">
                            {selectedUser.birthDate ?? 'Nao informado'}
                          </span>
                        </div>
                      </div>
                      <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                        <span className="block text-[10px] font-semibold uppercase text-slate-400">Endereco</span>
                        <span className="mt-1 block text-sm font-bold text-meow-charcoal">
                          {selectedUser.addressStreet ? (
                            <>
                              {selectedUser.addressStreet}{selectedUser.addressNumber ? `, ${selectedUser.addressNumber}` : ''}
                              {selectedUser.addressComplement ? ` - ${selectedUser.addressComplement}` : ''}
                            </>
                          ) : (
                            'Nao informado'
                          )}
                        </span>
                        <span className="mt-1 block text-xs text-slate-500">
                          {selectedUser.addressDistrict ?? '-'} | {selectedUser.addressCity ?? '-'} - {selectedUser.addressState ?? '-'} | {selectedUser.addressZip ?? '-'}
                        </span>
                      </div>
                      <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                        <span className="block text-[10px] font-semibold uppercase text-slate-400">Pais</span>
                        <span className="mt-1 block text-sm font-bold text-meow-charcoal">
                          {selectedUser.addressCountry ?? 'Nao informado'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <hr className="border-slate-100" />

                  <div className="grid grid-cols-2 gap-4">
                    <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                      <div className="text-xs font-medium text-slate-500 mb-1 flex items-center gap-1.5">
                        <Calendar size={12} /> Criado em
                      </div>
                      <div className="text-sm font-bold text-meow-charcoal">
                        {new Date(selectedUser.createdAt).toLocaleDateString('pt-BR')}
                      </div>
                    </div>
                    <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                      <div className="text-xs font-medium text-slate-500 mb-1 flex items-center gap-1.5">
                        <RefreshCw size={12} /> Atualizado
                      </div>
                      <div className="text-sm font-bold text-meow-charcoal">
                        {new Date(selectedUser.updatedAt).toLocaleDateString('pt-BR')}
                      </div>
                    </div>
                  </div>

                  {/* Blocking Zone */}
                  <div className={`rounded-xl border p-4 ${selectedUser.blockedAt ? 'border-emerald-200 bg-emerald-50' : 'border-red-200 bg-red-50'}`}>
                    <h3 className={`text-sm font-bold mb-2 flex items-center gap-2 ${selectedUser.blockedAt ? 'text-emerald-800' : 'text-red-800'}`}>
                      {selectedUser.blockedAt ? <Shield size={16} /> : <Ban size={16} />}
                      {selectedUser.blockedAt ? 'Desbloquear Acesso' : 'Bloquear Acesso'}
                    </h3>

                    {selectedUser.blockedAt ? (
                      <div className="space-y-4">
                        <div className="rounded-lg bg-white/60 p-3 text-xs text-emerald-800">
                          <span className="font-bold">Motivo do bloqueio atual:</span>
                          <p className="mt-1 opacity-80">{selectedUser.blockedReason || 'Não informado.'}</p>
                        </div>
                        <Button
                          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white shadow-none border-0"
                          onClick={handleUnblock}
                          disabled={busyAction === 'unblock'}
                        >
                          {busyAction === 'unblock' ? 'Processando...' : 'Liberar Acesso do Usuário'}
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <p className="text-xs text-red-700 opacity-80">
                          O usuário será desconectado e impedido de fazer login.
                        </p>
                        <Textarea
                          placeholder="Descreva o motivo do bloqueio..."
                          className="bg-white border-red-200 focus:border-red-400 focus:ring-red-200"
                          value={actionReason}
                          onChange={(e) => setActionReason(e.target.value)}
                        />
                        <Button
                          className="w-full bg-red-600 hover:bg-red-700 text-white shadow-none border-0"
                          onClick={handleBlock}
                          disabled={busyAction === 'block' || !actionReason.trim()}
                        >
                          {busyAction === 'block' ? 'Bloqueando...' : 'Bloquear Usuário'}
                        </Button>
                      </div>
                    )}
                  </div>

                </div>
              </Card>
            )}
          </div>
        </div>
      </div>
    </AdminShell>
  );
};
