'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

import { ApiClientError } from '../../lib/api-client';
import {
  adminUsersApi,
  type AdminUser,
  type AdminUserRole,
  type AdminUserUpdatePayload,
} from '../../lib/admin-users-api';
import { useAuth } from '../auth/auth-provider';
import { AdminShell } from '../admin/admin-shell';
import { NotificationsBell } from '../notifications/notifications-bell';

const roleLabel: Record<AdminUserRole, string> = {
  USER: 'Buyer',
  SELLER: 'Seller',
  ADMIN: 'Admin',
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
      setSelectedUser(response.items[0] ?? null);
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

  const selectedStatus = useMemo(() => {
    if (!selectedUser) {
      return null;
    }
    return selectedUser.blockedAt ? 'Bloqueado' : 'Ativo';
  }, [selectedUser]);

  const applyUserUpdate = (updated: AdminUser) => {
    const matchesBlockedFilter =
      blockedFilter === 'all'
        ? true
        : blockedFilter === 'blocked'
          ? Boolean(updated.blockedAt)
          : !updated.blockedAt;
    const matchesRoleFilter = roleFilter === 'all' ? true : updated.role === roleFilter;
    const trimmedSearch = search.trim().toLowerCase();
    const matchesSearch = trimmedSearch.length === 0
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
            className="mt-4 inline-flex rounded-full border border-meow-red/30 px-6 py-2 text-sm font-bold text-meow-deep"
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
      <div className="rounded-2xl border border-meow-red/20 bg-white p-6 shadow-[0_10px_24px_rgba(216,107,149,0.12)]">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-black text-meow-charcoal">Usuarios</h1>
            <p className="mt-2 text-sm text-meow-muted">
              Bloqueie ou desbloqueie acesso quando necessario.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <NotificationsBell />
            <Link
              className="rounded-full border border-meow-red/30 px-4 py-2 text-xs font-bold text-meow-deep"
              href="/conta"
            >
              Voltar para conta
            </Link>
          </div>
        </div>
      </div>

      {error ? <div className="state-card error">{error}</div> : null}
      {notice ? <div className="state-card success">{notice}</div> : null}

      <div className="admin-users-grid">
        <div className="order-card">
          <div className="panel-header">
            <h2>Lista</h2>
            <button
              className="ghost-button"
              type="button"
              onClick={loadUsers}
              disabled={busyAction === 'load'}
            >
              {busyAction === 'load' ? 'Atualizando...' : 'Atualizar'}
            </button>
          </div>

          <div className="support-filters">
            <div className="form-field">
              <span className="summary-label">Role</span>
              <select
                className="form-input"
                value={roleFilter}
                onChange={(event) =>
                  setRoleFilter(event.target.value as AdminUserRole | 'all')
                }
              >
                <option value="all">Todos</option>
                <option value="USER">Buyers</option>
                <option value="SELLER">Sellers</option>
                <option value="ADMIN">Admins</option>
              </select>
            </div>
            <div className="form-field">
              <span className="summary-label">Status</span>
              <select
                className="form-input"
                value={blockedFilter}
                onChange={(event) =>
                  setBlockedFilter(event.target.value as 'all' | 'blocked' | 'active')
                }
              >
                <option value="all">Todos</option>
                <option value="active">Ativos</option>
                <option value="blocked">Bloqueados</option>
              </select>
            </div>
            <div className="form-field">
              <span className="summary-label">Busca</span>
              <input
                className="form-input"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Email"
              />
            </div>
          </div>

          {busyAction === 'load' ? (
            <div className="state-card">Carregando usuarios...</div>
          ) : null}

          {users.length === 0 && busyAction !== 'load' ? (
            <div className="state-card">Nenhum usuário encontrado.</div>
          ) : null}

          <div className="support-list">
            {users.map((item) => (
              <button
                className="support-row"
                key={item.id}
                type="button"
                onClick={() => {
                  setSelectedUser(item);
                  setActionReason('');
                }}
              >
                <div>
                  <strong>{item.email}</strong>
                  <span className="auth-helper">{roleLabel[item.role] ?? item.role}</span>
                </div>
                <div className="ticket-meta">
                  <span
                    className={`status-pill status-${item.blockedAt ? 'blocked' : 'active'}`}
                  >
                    {item.blockedAt ? 'Bloqueado' : 'Ativo'}
                  </span>
                  <small>{new Date(item.createdAt).toLocaleDateString('pt-BR')}</small>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="order-card">
          <div className="panel-header">
            <div>
              <h2>Menu do usuário</h2>
              {selectedUser ? (
                <p className="text-xs text-meow-muted">{selectedUser.email}</p>
              ) : null}
            </div>
          </div>
          {!selectedUser ? (
            <div className="state-card">Selecione um usuário.</div>
          ) : (
            <>
              <div className="seller-form">
                <label className="form-field">
                  Email
                  <input
                    className="form-input"
                    value={editForm.email}
                    onChange={(event) =>
                      setEditForm((prev) => ({ ...prev, email: event.target.value }))
                    }
                  />
                </label>
                <label className="form-field">
                  Role
                  <select
                    className="form-input"
                    value={editForm.role}
                    onChange={(event) =>
                      setEditForm((prev) => ({
                        ...prev,
                        role: event.target.value as AdminUserRole,
                      }))
                    }
                  >
                    <option value="USER">Buyer</option>
                    <option value="SELLER">Seller</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                </label>
              </div>

              <div className="form-actions">
                <button
                  className="admin-primary-button"
                  type="button"
                  onClick={handleUpdate}
                  disabled={busyAction === 'update'}
                >
                  {busyAction === 'update' ? 'Salvando...' : 'Salvar alteracoes'}
                </button>
                <button
                  className="ghost-button"
                  type="button"
                  onClick={() =>
                    setEditForm({
                      email: selectedUser.email,
                      role: selectedUser.role,
                    })
                  }
                  disabled={busyAction === 'update'}
                >
                  Descartar
                </button>
              </div>

              <div className="seller-section">
                <h3 className="text-sm font-bold text-meow-charcoal">Detalhes</h3>
                <div className="ticket-summary">
                  <div>
                    <span className="summary-label">Status</span>
                    <strong>{selectedStatus}</strong>
                  </div>
                  <div>
                    <span className="summary-label">Role</span>
                    <strong>{roleLabel[selectedUser.role] ?? selectedUser.role}</strong>
                  </div>
                  <div>
                    <span className="summary-label">Criado</span>
                    <strong>
                      {new Date(selectedUser.createdAt).toLocaleDateString('pt-BR')}
                    </strong>
                  </div>
                  <div>
                    <span className="summary-label">Atualizado</span>
                    <strong>
                      {new Date(selectedUser.updatedAt).toLocaleDateString('pt-BR')}
                    </strong>
                  </div>
                </div>

                {selectedUser.blockedReason ? (
                  <div className="state-card info">{selectedUser.blockedReason}</div>
                ) : null}

                {selectedUser.payoutBlockedAt ? (
                  <div className="state-card info">
                    Payout bloqueado: {selectedUser.payoutBlockedReason ?? 'Sem motivo.'}
                  </div>
                ) : null}
              </div>

              <div className="seller-section">
                {!selectedUser.blockedAt ? (
                  <>
                    <label className="form-field">
                      Motivo do bloqueio
                      <textarea
                        className="form-textarea"
                        rows={3}
                        value={actionReason}
                        onChange={(event) => setActionReason(event.target.value)}
                      />
                    </label>
                    <div className="order-actions">
                      <button
                        className="admin-primary-button"
                        type="button"
                        onClick={handleBlock}
                        disabled={!actionReason.trim() || busyAction === 'block'}
                      >
                        {busyAction === 'block' ? 'Bloqueando...' : 'Bloquear'}
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="order-actions">
                    <button
                      className="admin-primary-button"
                      type="button"
                      onClick={handleUnblock}
                      disabled={busyAction === 'unblock'}
                    >
                      {busyAction === 'unblock' ? 'Desbloqueando...' : 'Desbloquear'}
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </AdminShell>
  );
};
